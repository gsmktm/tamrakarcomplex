import { createClient } from 'jsr:@supabase/supabase-js@2'
import { assertAllowedOrigin, getCorsHeaders, requireUser } from '../_shared/cors.ts'
import { resolveInitialOrderStatus } from '../_shared/commerce.ts'

console.log('create-order-secure function loaded')

const cleanText = (value: unknown, max = 500) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

const cleanJsonObject = (value: Record<string, unknown> | null | undefined) =>
  Object.fromEntries(
    Object.entries(value ?? {}).map(([key, entry]) => [key, cleanText(entry)])
  )

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    assertAllowedOrigin(req)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceRoleKey) {
      throw new Error('Server configuration missing')
    }

    const user = await requireUser(req, supabaseUrl, anonKey)
    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    const {
      items,
      shipping_address,
      contact_info,
      payment_method,
      notes
    } = await req.json()

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required')
    }

    if (!shipping_address || !contact_info) {
      throw new Error('Shipping address and contact info are required')
    }

    if (!payment_method || !['cod', 'esewa', 'khalti', 'fonepay', 'bank'].includes(payment_method)) {
      throw new Error('Valid payment method is required')
    }

    // Calculate total and validate items
    const { data: limited } = await userClient.rpc('check_rate_limit', {
      p_bucket: 'checkout',
      p_identifier: user.id,
      p_max_attempts: 10,
      p_window_seconds: 3600,
    })
    if (limited === false) {
      throw new Error('Checkout rate limit exceeded')
    }

    let totalAmount = 0
    const validatedItems = []

    for (const item of items) {
      if (!item.product_id && !item.catalog_product_id) {
        throw new Error('Each item must have product_id or catalog_product_id')
      }

      // Get product details and validate stock/price
      let productData
      if (item.catalog_product_id) {
        const { data, error } = await supabaseClient
          .from('catalog_products')
          .select('id, name, price_npr, is_active, verified')
          .eq('id', item.catalog_product_id)
          .eq('is_active', true)
          .eq('verified', true)
          .single()

        if (error || !data) {
          throw new Error(`Product ${item.catalog_product_id} not found or unavailable`)
        }
        productData = data
      } else {
        const { data, error } = await supabaseClient
          .from('products')
          .select('id, name, price_value, price, in_stock, store_id')
          .eq('id', item.product_id)
          .single()

        if (error || !data || data.in_stock === false) {
          throw new Error(`Product ${item.product_id} not found or unavailable`)
        }
        // store_id mandatory for store-sold products so the payout routes correctly
        if (!data.store_id) {
          throw new Error(`Product ${data.name} is missing a store assignment`)
        }
        productData = {
          id: data.id,
          name: data.name,
          price_npr: Number(data.price_value || String(data.price ?? '').replace(/[^0-9.]/g, '')),
          store_id: data.store_id,
        }
      }

      const quantity = item.quantity || 1
      const price = productData.price_npr

      if (price <= 0) {
        throw new Error(`Invalid price for product ${productData.name}`)
      }

      const itemTotal = price * quantity
      totalAmount += itemTotal

      validatedItems.push({
        product_id: item.product_id,
        catalog_product_id: item.catalog_product_id,
        store_inventory_id: item.store_inventory_id,
        store_id: productData.store_id ?? item.store_id ?? null, // catalog (house) items may be null
        product_name: productData.name,
        product_sku: item.sku,
        quantity,
        unit_price: price,
        total_price: itemTotal
      })
    }

    // COD orders are immediately actionable by the store; online orders wait for payment.
    const initialOrderStatus = resolveInitialOrderStatus(payment_method)
    const initialPaymentStatus = 'pending'

    // Create order atomically
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: totalAmount,
        payment_method,
        order_status: initialOrderStatus,
        payment_status: initialPaymentStatus,
        shipping_address: cleanJsonObject(shipping_address),
        contact_info: cleanJsonObject(contact_info),
        notes: cleanText(notes, 1000)
      })
      .select()
      .single()

    if (orderError) {
      throw new Error('Failed to create order')
    }

    // Create order items
    const orderItemsData = validatedItems.map(item => ({
      order_id: order.id,
      ...item
    }))

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItemsData)

    if (itemsError) {
      // If items creation fails, delete the order
      await supabaseClient.from('orders').delete().eq('id', order.id)
      throw new Error('Failed to create order items')
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          total_amount: totalAmount,
          payment_method,
          status: order.order_status,
          created_at: order.created_at
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
