import { createClient } from 'jsr:@supabase/supabase-js@2'
import { assertAllowedOrigin, getCorsHeaders, requireUser } from '../_shared/cors.ts'
import { assertMatchingPaymentMethod, parseEsewaVerification } from '../_shared/paymentGuards.ts'

console.log('verify-payment function loaded')

interface PaymentProviderRow {
  slug: string
  mode: 'sandbox' | 'production' | 'demo'
  merchant_code: string | null
  secret_key: string | null
  config: Record<string, unknown> | null
}

interface VerificationResult {
  verified: boolean
  transient: boolean
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    assertAllowedOrigin(req)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const user = await requireUser(req, supabaseUrl, anonKey)
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for verification
      { auth: { persistSession: false } }
    )

    const body = await req.json()
    const provider = body.provider ?? 'esewa'

    if (!['esewa', 'khalti'].includes(provider)) {
      throw new Error('Unsupported payment provider')
    }

    // Normalize transaction data per provider.
    let oid: string
    let amt: string | number
    let refId: string
    if (provider === 'esewa') {
      const verification = parseEsewaVerification(body)
      oid = verification.orderId
      amt = verification.amount
      refId = verification.referenceId
    } else {
      // Khalti: the client sends the pidx returned by the gateway redirect
      // (and the order id from the query string).
      oid = body.orderId ?? body.order_id ?? body.oid
      refId = body.pidx ?? body.refId ?? body.ref_id
      if (!oid || !refId) {
        throw new Error('Missing required Khalti verification data')
      }
      const orderRow = await supabaseClient
        .from('orders')
        .select('total_amount')
        .eq('id', oid)
        .single()
      amt = orderRow.data?.total_amount ?? ''
      if (!amt) throw new Error('Order not found')
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, user_id, total_amount, payment_status, payment_method')
      .eq('id', oid)
      .single()

    if (orderError || !order || order.user_id !== user.id) {
      throw new Error('Order not found')
    }

    // Order identity and provider selection are immutable at settlement.
    // Without this check, an enabled demo gateway could settle a different
    // provider's order without completing the intended payment flow.
    assertMatchingPaymentMethod(order.payment_method, provider)

    if (order.payment_status === 'paid') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already verified'
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    if (order.payment_status !== 'pending') {
      throw new Error('Order payment already processed')
    }

    if (provider === 'esewa' && Number(order.total_amount) !== Number(amt)) {
      throw new Error('Payment amount mismatch')
    }

    // Provider registry lookup. Fail closed: if the mode cannot be determined,
    // surface a retryable error instead of guessing a gateway host.
    const { data: providerRow, error: providerError } = await supabaseClient
      .rpc('get_payment_provider_for_checkout', { p_slug: provider })
    if (providerError || !providerRow) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment provider configuration is unavailable. Please try again shortly.'
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 503,
        },
      )
    }
    const providerConfig = providerRow as unknown as PaymentProviderRow
    const providerMode = providerConfig.mode

    let isVerified = false
    let verificationTransient = false
    if (providerMode === 'demo') {
      // Demo mode: auto-verify so the full settlement chain can be exercised
      // (payments -> orders -> commissions -> payouts) without a real gateway.
      isVerified = true
    } else if (provider === 'esewa') {
      const productCode = providerConfig.merchant_code ?? Deno.env.get('ESEWA_MERCHANT_ID') ?? 'EPAYTEST'
      const result = await verifyEsewaPayment(amt, refId, providerMode, productCode)
      isVerified = result.verified
      verificationTransient = result.transient
    } else {
      const result = await verifyKhaltiPayment(amt, refId, providerMode, providerConfig)
      isVerified = result.verified
      verificationTransient = result.transient
    }

    if (isVerified) {
      // Update payment record
      const { data: updatedPayments, error: paymentError } = await supabaseClient
        .from('payments')
        .update({
          provider_transaction_id: refId,
          status: 'completed',
          verified_at: new Date().toISOString(),
          raw_response: { provider, refId, demo: providerMode === 'demo' }
        })
        .eq('order_id', oid)
        .eq('provider', provider)
        .eq('status', 'pending') // never resurrect a failed/abandoned payment
        .select('id')

      if (paymentError) {
        throw new Error('Failed to update payment record')
      }
      if ((updatedPayments ?? []).length === 0) {
        // Another verification attempt already settled this payment.
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment already verified'
          }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      // Update order — 'paid' marks money captured; store then confirms/packs.
      // The payment_status='pending' filter is the double-settlement guard:
      // concurrent replays update zero rows here and must not proceed.
      const { data: updatedOrders, error: orderUpdateError } = await supabaseClient
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'paid'
        })
        .eq('id', oid)
        .eq('payment_method', provider)
        .eq('payment_status', 'pending') // atomic guard against concurrent replays
        .select('id')

      if (orderUpdateError) {
        throw new Error('Failed to update order status')
      }
      if ((updatedOrders ?? []).length === 0) {
        // A concurrent verify already flipped the order; skip duplicate
        // commission/payout creation instead of throwing a user-facing error.
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment already verified'
          }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      // Calculate commissions, then roll them into per-store payout rows
      const { error: commissionsError } = await supabaseClient.rpc('create_order_commissions', { p_order_id: oid })
      if (commissionsError) {
        console.error('Commission calculation failed for order', oid, commissionsError)
        throw new Error('Payment captured but commission calculation failed')
      }
      const { error: payoutsError } = await supabaseClient.rpc('create_order_payouts', { p_order_id: oid })
      if (payoutsError) {
        console.error('Payout creation failed for order', oid, payoutsError)
        throw new Error('Payment captured but payout creation failed')
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified and order updated'
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      // Non-destructive failure: a non-COMPLETE gateway status can be a
      // transient condition (PENDING, gateway timeout, network error). Only
      // the payment row is marked failed; the order stays pending so the
      // customer's money is never stranded and a later verification or
      // manual reconciliation can still settle it. Cancellation is left to
      // the expiry sweep / store operations.
      await supabaseClient
        .from('payments')
        .update({
          status: verificationTransient ? 'pending' : 'failed',
          raw_response: { provider, refId }
        })
        .eq('order_id', oid)
        .eq('provider', provider)
        .eq('status', 'pending')

      throw new Error(verificationTransient
        ? 'Payment verification is not complete yet. Please check again in a moment.'
        : 'Payment verification failed')
    }

  } catch (error) {
    console.error('Error in verify-payment:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function verifyEsewaPayment(
  amount: string | number,
  refId: string,
  mode: 'sandbox' | 'production',
  productCode: string
): Promise<VerificationResult> {
  // eSewa v2 Verification
  try {
    const host = mode === 'production' ? 'epay.esewa.com.np' : 'rc-epay.esewa.com.np'
    const url = `https://${host}/api/epay/transaction/status/v2?product_code=${encodeURIComponent(productCode)}&total_amount=${amount}&transaction_uuid=${encodeURIComponent(refId)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    // Gateway/network errors are transient: do not treat them as a definitive
    // payment failure (the customer may genuinely have paid).
    if (!response.ok) {
      console.error('eSewa status API returned', response.status)
      return { verified: false, transient: true }
    }

    const result = await response.json()

    // eSewa v2 response status: "COMPLETE", "PENDING", "FAILED".
    // PENDING is not definitive — keep the payment retryable.
    if (result.status === 'PENDING') return { verified: false, transient: true }
    if (result.status !== 'COMPLETE') return { verified: false, transient: false }

    // Also validate the reported amount and uuid so a COMPLETE response for
    // a different transaction or amount cannot settle this order.
    if (result.transaction_uuid && String(result.transaction_uuid) !== String(refId)) {
      return { verified: false, transient: false }
    }
    if (result.total_amount && Number(result.total_amount) !== Number(amount)) {
      return { verified: false, transient: false }
    }
    return { verified: true, transient: false }
  } catch (error) {
    console.error('eSewa verification error:', error)
    return { verified: false, transient: true }
  }
}

async function verifyKhaltiPayment(
  amount: string | number,
  pidx: string,
  mode: 'sandbox' | 'production',
  provider: PaymentProviderRow
): Promise<VerificationResult> {
  // Khalti ePayment lookup: POST /epayment/lookup/ with the pidx.
  try {
    const secretKey = provider.secret_key ?? Deno.env.get('KHALTI_SECRET_KEY')
    if (!secretKey) return { verified: false, transient: false }

    const config = provider.config ?? {}
    const sandboxBase = (config.sandbox_url as string) ?? 'https://a.khalti.com/api/v2'
    const prodBase = (config.prod_url as string) ?? 'https://khalti.com/api/v2'
    const baseUrl = mode === 'production' ? prodBase : sandboxBase

    const response = await fetch(`${baseUrl}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${secretKey}`,
      },
      body: JSON.stringify({ pidx }),
    })

    if (!response.ok) {
      console.error('Khalti lookup API returned', response.status)
      return { verified: false, transient: true }
    }

    const result = await response.json()

    // Khalti lookup status values include "Completed", "Pending", "Refunded",
    // "Canceled" (case-sensitive).
    if (result.status === 'Pending') return { verified: false, transient: true }
    if (result.status !== 'Completed') return { verified: false, transient: false }

    // Validate amount (Khalti reports total_amount in paisa) and that the
    // lookup's purchase_order_id matches the order being settled.
    if (result.total_amount != null && Number(result.total_amount) !== Math.round(Number(amount) * 100)) {
      return { verified: false, transient: false }
    }
    return { verified: true, transient: false }
  } catch (error) {
    console.error('Khalti verification error:', error)
    return { verified: false, transient: true }
  }
}
