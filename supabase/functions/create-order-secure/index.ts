import { createClient } from 'jsr:@supabase/supabase-js@2'
import { assertAllowedOrigin, getCorsHeaders, requireUser } from '../_shared/cors.ts'

console.log('create-order-secure function loaded')

const cleanText = (value: unknown, max = 500) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    assertAllowedOrigin(req)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    if (!supabaseUrl || !anonKey) {
      throw new Error('Server configuration missing')
    }

    await requireUser(req, supabaseUrl, anonKey)
    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    const {
      items,
      shipping_address,
      contact_info,
      payment_method,
      notes,
      idempotency_key,
    } = await req.json()

    // Validate required fields
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      throw new Error('Items are required')
    }

    if (!shipping_address || !contact_info) {
      throw new Error('Shipping address and contact info are required')
    }

    if (!payment_method || !['cod', 'esewa', 'khalti'].includes(payment_method)) {
      throw new Error('Valid payment method is required')
    }
    const safeItems = items.map((item: Record<string, unknown>) => ({
      product_id: cleanText(item.product_id, 40) || null,
      store_product_id: cleanText(item.store_product_id, 40) || null,
      catalog_product_id: cleanText(item.catalog_product_id, 40) || null,
      source_type: cleanText(item.source_type, 30) || 'product',
      quantity: Math.max(1, Math.min(10, Math.floor(Number(item.quantity) || 1))),
    }))
    if (safeItems.some((item) => !item.product_id && !item.store_product_id && !item.catalog_product_id)) {
      throw new Error('Each item must identify an inventory item')
    }

    const { data: order, error: orderError } = await userClient.rpc('create_order_atomic_v2', {
      p_payment_method: payment_method,
      p_shipping_address: {
        address: cleanText(shipping_address.address, 240),
        city: cleanText(shipping_address.city, 80),
      },
      p_contact_info: {
        name: cleanText(contact_info.name, 120),
        phone: cleanText(contact_info.phone, 20),
        email: cleanText(contact_info.email, 320),
      },
      p_items: safeItems,
      p_notes: cleanText(notes, 1000) || null,
      p_idempotency_key: cleanText(idempotency_key, 100),
    })
    if (orderError || !order?.id) throw new Error(orderError?.message || 'Failed to create order')

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          status: order.status,
          created_at: order.created_at,
          idempotent_replay: order.idempotent_replay,
        }
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in create-order-secure:', error)
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
