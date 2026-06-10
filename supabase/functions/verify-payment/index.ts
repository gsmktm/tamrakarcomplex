import { createClient } from 'jsr:@supabase/supabase-js@2'
import { assertAllowedOrigin, getCorsHeaders, requireUser } from '../_shared/cors.ts'

console.log('verify-payment function loaded')

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
    const transaction_data = body.transaction_data ?? {
      oid: body.orderId ?? body.order_id ?? body.oid,
      amt: body.amount ?? body.amt,
      refId: body.refId ?? body.ref_id ?? body.rid,
    }

    if (provider === 'esewa') {
      const { oid, amt, refId } = transaction_data

      if (!oid || !amt || !refId) {
        throw new Error('Missing required eSewa verification data')
      }

      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select('id, user_id, total_amount, payment_status')
        .eq('id', oid)
        .single()

      if (orderError || !order || order.user_id !== user.id) {
        throw new Error('Order not found')
      }

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

      if (Number(order.total_amount) !== Number(amt)) {
        throw new Error('Payment amount mismatch')
      }

      // Verify with eSewa API (in production, call eSewa verification endpoint)
      // For demo, we'll simulate verification
      const isVerified = await verifyEsewaPayment(oid, amt, refId)

      if (isVerified) {
        // Update payment record
        const { error: paymentError } = await supabaseClient
          .from('payments')
          .update({
            provider_transaction_id: refId,
            status: 'completed',
            verified_at: new Date().toISOString(),
            raw_response: transaction_data
          })
          .eq('order_id', oid)
          .eq('provider', 'esewa')

        if (paymentError) {
          throw new Error('Failed to update payment record')
        }

        // Update order — 'paid' marks money captured; store then confirms/packs.
        const { error: orderError } = await supabaseClient
          .from('orders')
          .update({
            payment_status: 'paid',
            order_status: 'paid'
          })
          .eq('id', oid)

        if (orderError) {
          throw new Error('Failed to update order status')
        }

        // Calculate commissions, then roll them into per-store payout rows
        await supabaseClient.rpc('create_order_commissions', { p_order_id: oid })
        await supabaseClient.rpc('create_order_payouts', { p_order_id: oid })

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
        // Mark payment as failed
        await supabaseClient
          .from('payments')
          .update({
            status: 'failed',
            raw_response: transaction_data
          })
          .eq('order_id', oid)
          .eq('provider', 'esewa')

        throw new Error('Payment verification failed')
      }
    }

    throw new Error('Unsupported payment provider')

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

async function verifyEsewaPayment(orderId: string, amount: string, refId: string): Promise<boolean> {
  // eSewa v2 Verification
  try {
    const product_code = Deno.env.get('ESEWA_MERCHANT_ID') ?? 'EPAYTEST'
    
    // In v2, refId is the transaction_uuid we sent
    const url = `https://rc-epay.esewa.com.np/api/epay/transaction/status/v2?product_code=${product_code}&total_amount=${amount}&transaction_uuid=${refId}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()

    // eSewa v2 response status: "COMPLETE", "PENDING", "FAILED"
    return result.status === 'COMPLETE'
  } catch (error) {
    console.error('eSewa verification error:', error)
    return false
  }
}
