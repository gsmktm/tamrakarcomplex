import { createClient } from 'jsr:@supabase/supabase-js@2'
import { assertAllowedOrigin, getCorsHeaders, requireUser } from '../_shared/cors.ts'

console.log('create-payment-session function loaded')

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
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    if (order.payment_status !== 'pending') {
      throw new Error('Order payment already processed')
    }

    if (payment_method === 'esewa') {
      // Generate eSewa payment session (v2)
      const ESEWA_MERCHANT_ID = Deno.env.get('ESEWA_MERCHANT_ID')
      const ESEWA_SECRET_KEY = Deno.env.get('ESEWA_SECRET_KEY')
      const SITE_URL = Deno.env.get('SITE_URL')

      if (!ESEWA_MERCHANT_ID || !ESEWA_SECRET_KEY) {
        throw new Error('eSewa configuration missing')
      }

      // Generate a unique transaction UUID for eSewa v2
      const transactionUuid = `${order_id}-${Date.now()}`

      const paymentData = {
        amount: order.total_amount,
        tax_amount: 0,
        total_amount: order.total_amount,
        transaction_uuid: transactionUuid,
        product_code: ESEWA_MERCHANT_ID, // Typically the merchant code
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: `${SITE_URL}/order-success?oid=${order_id}`,
        failure_url: `${SITE_URL}/order-failed?oid=${order_id}`,
        signed_field_names: "total_amount,transaction_uuid,product_code"
      }

      // Generate signature for v2: total_amount,transaction_uuid,product_code
      const signatureString = `total_amount=${paymentData.total_amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`
      const signature = await generateEsewaSignature(signatureString, ESEWA_SECRET_KEY)

      // Create payment record
      const { data: payment, error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          order_id: order_id,
          provider: 'esewa',
          amount: order.total_amount,
          status: 'pending',
          provider_transaction_id: transactionUuid // Store our UUID to verify later
        })
        .select()
        .single()

      if (paymentError) {
        throw new Error('Failed to create payment record')
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_url: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form', // Use sandbox for now
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

    // For COD, just mark as processing
    if (payment_method === 'cod') {
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          payment_method: 'cod',
          order_status: 'confirmed'
        })
        .eq('id', order_id)

      if (updateError) {
        throw new Error('Failed to update order for COD')
      }

      // Calculate commissions for COD
      await supabaseClient.rpc('create_order_commissions', { p_order_id: order_id })

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

    throw new Error('Unsupported payment method')

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
