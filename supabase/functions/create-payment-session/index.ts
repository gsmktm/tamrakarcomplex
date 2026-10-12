import { createClient } from 'jsr:@supabase/supabase-js@2'
import { assertAllowedOrigin, getCorsHeaders, requireUser } from '../_shared/cors.ts'
import { assertMatchingPaymentMethod } from '../_shared/paymentGuards.ts'

console.log('create-payment-session function loaded')

interface PaymentProviderRow {
  slug: string
  name: string
  is_enabled: boolean
  is_ready: boolean
  mode: 'sandbox' | 'production' | 'demo'
  merchant_code: string | null
  secret_key: string | null
  gateway_url: string | null
  config: Record<string, unknown> | null
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
      anonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { order_id, payment_method } = await req.json()

    if (!order_id) {
      throw new Error('Order ID is required')
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, user_id, total_amount, payment_status, payment_method, order_status')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // An authenticated customer may only initiate the method selected when
    // the server atomically created their order.
    assertMatchingPaymentMethod(order.payment_method, payment_method)

    if (order.payment_status !== 'pending') {
      throw new Error('Order payment already processed')
    }

    // COD: no gateway session needed — confirm the order. Handled before the
    // provider-registry lookup so cash checkout never depends on the
    // payment_providers migration having been applied.
    if (payment_method === 'cod') {
      // create_order_atomic_v2 already sets COD to 'confirmed'.
      // Avoid a redundant client-side RLS update that may silently match no
      // rows; only transition older pending COD orders when necessary.
      if (order.order_status !== 'confirmed') {
        const { data: confirmedOrders, error: updateError } = await supabaseClient
          .from('orders')
          .update({ order_status: 'confirmed' })
          .eq('id', order_id)
          .eq('user_id', user.id)
          .eq('payment_method', 'cod')
          .eq('payment_status', 'pending')
          .select('id')

        if (updateError || !confirmedOrders?.length) {
          throw new Error('Failed to confirm Cash on Delivery order')
        }
      }

      // Calculate commissions for COD — service-role client, matching
      // verify-payment (create_order_commissions is service-role only).
      const adminClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      )
      await adminClient.rpc('create_order_commissions', { p_order_id: order_id })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order confirmed for Cash on Delivery'
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Look up provider configuration (service role: includes credentials).
    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )
    const { data: providerRow, error: providerError } = await adminClient
      .rpc('get_payment_provider_for_checkout', { p_slug: payment_method })

    if (providerError || !providerRow) {
      throw new Error(`Payment method "${payment_method}" is not available`)
    }
    const provider = providerRow as unknown as PaymentProviderRow

    if (!provider.is_ready) {
      throw new Error(`Payment method "${provider.name}" is coming soon. Please choose another method.`)
    }

    // DEMO MODE: create a pending payment and let the client confirm via
    // verify-payment, which settles without contacting a real gateway.
    if (provider.mode === 'demo') {
      // Supersede any pending payment rows from earlier attempts so a retried
      // session never leaves orphans and verification settles exactly one row.
      await supabaseClient
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('order_id', order_id)
        .eq('provider', payment_method)
        .eq('status', 'pending')

      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          order_id: order_id,
          provider: payment_method,
          amount: order.total_amount,
          status: 'pending',
          provider_transaction_id: `demo-${order_id}-${Date.now()}`
        })

      if (paymentError) {
        throw new Error('Failed to create payment record')
      }

      const siteUrl = Deno.env.get('SITE_URL') ?? ''
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'demo',
          provider: payment_method,
          redirect_url: `${siteUrl}/order-success?oid=${order_id}&demo=1`
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    if (payment_method === 'esewa') {
      const ESEWA_MERCHANT_ID = provider.merchant_code ?? Deno.env.get('ESEWA_MERCHANT_ID')
      const ESEWA_SECRET_KEY = provider.secret_key ?? Deno.env.get('ESEWA_SECRET_KEY')
      const SITE_URL = Deno.env.get('SITE_URL')

      if (!ESEWA_MERCHANT_ID || !ESEWA_SECRET_KEY) {
        throw new Error('eSewa configuration missing')
      }

      // Pick the correct gateway host for the configured mode (no more
      // hardcoded sandbox in production).
      const config = provider.config ?? {}
      const sandboxUrl = (config.sandbox_url as string) ?? 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
      const prodUrl = (config.prod_url as string) ?? 'https://epay.esewa.com.np/api/epay/main/v2/form'
      const paymentUrl = provider.mode === 'production' ? prodUrl : sandboxUrl

      // Generate a unique transaction UUID for eSewa v2
      const transactionUuid = `${order_id}-${Date.now()}`

      const paymentData = {
        amount: order.total_amount,
        tax_amount: 0,
        total_amount: order.total_amount,
        transaction_uuid: transactionUuid,
        product_code: ESEWA_MERCHANT_ID,
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: `${SITE_URL}/order-success?oid=${order_id}`,
        failure_url: `${SITE_URL}/order-failed?oid=${order_id}`,
        signed_field_names: "total_amount,transaction_uuid,product_code"
      }

      // Generate signature for v2: total_amount,transaction_uuid,product_code
      const signatureString = `total_amount=${paymentData.total_amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`
      const signature = await generateEsewaSignature(signatureString, ESEWA_SECRET_KEY)

      // Supersede any pending payment rows from earlier attempts so a retried
      // session never leaves orphans and verification settles exactly one row.
      await supabaseClient
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('order_id', order_id)
        .eq('provider', 'esewa')
        .eq('status', 'pending')

      // Create payment record
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          order_id: order_id,
          provider: 'esewa',
          amount: order.total_amount,
          status: 'pending',
          provider_transaction_id: transactionUuid // Store our UUID to verify later
        })

      if (paymentError) {
        throw new Error('Failed to create payment record')
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_url: paymentUrl,
          payment_data: {
            ...paymentData,
            signature
          }
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    if (payment_method === 'khalti') {
      // Khalti ePayment: server-side initiate → hosted payment page → return
      // with pidx → server-side lookup verification.
      const KHALTI_SECRET_KEY = provider.secret_key ?? Deno.env.get('KHALTI_SECRET_KEY')
      const SITE_URL = Deno.env.get('SITE_URL')

      if (!KHALTI_SECRET_KEY || !SITE_URL) {
        throw new Error('Khalti configuration missing')
      }

      const config = provider.config ?? {}
      const sandboxBase = (config.sandbox_url as string) ?? 'https://a.khalti.com/api/v2'
      const prodBase = (config.prod_url as string) ?? 'https://khalti.com/api/v2'
      const baseUrl = provider.mode === 'production' ? prodBase : sandboxBase

      // Supersede any pending payment rows from earlier attempts.
      await supabaseClient
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('order_id', order_id)
        .eq('provider', 'khalti')
        .eq('status', 'pending')

      const initiateRes = await fetch(`${baseUrl}/epayment/initiate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        },
        body: JSON.stringify({
          return_url: `${SITE_URL}/order-success?oid=${order_id}&provider=khalti`,
          website_url: SITE_URL,
          amount: Math.round(Number(order.total_amount) * 100), // Khalti uses paisa
          purchase_order_id: order_id,
          purchase_order_name: `Tamrakar Order ${String(order_id).slice(0, 8)}`,
        }),
      })

      if (!initiateRes.ok) {
        const errText = await initiateRes.text()
        console.error('Khalti initiate failed', initiateRes.status, errText)
        throw new Error('Khalti payment could not be initiated')
      }

      const initiated = await initiateRes.json() as { pidx?: string; payment_url?: string }
      if (!initiated.pidx || !initiated.payment_url) {
        throw new Error('Khalti initiate returned an unexpected response')
      }

      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          order_id: order_id,
          provider: 'khalti',
          amount: order.total_amount,
          status: 'pending',
          provider_transaction_id: initiated.pidx
        })

      if (paymentError) {
        throw new Error('Failed to create payment record')
      }

      return new Response(
        JSON.stringify({
          success: true,
          redirect_url: initiated.payment_url
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    throw new Error(`Payment method "${provider.name}" is not integrated yet`)

  } catch (error) {
    console.error('Error in create-payment-session:', error)
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

async function generateEsewaSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}
