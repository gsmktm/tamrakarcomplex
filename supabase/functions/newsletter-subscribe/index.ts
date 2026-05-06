import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts";

const jsonHeaders = (req: Request) => ({ ...getCorsHeaders(req), "Content-Type": "application/json" });

// Email validation regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// List of common disposable email domains to block
const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakemailgenerator.com', 'getnada.com',
  'trashmail.com', 'maildrop.cc', 'discard.email', 'tempail.com'
];

// Rate limit settings
const RATE_LIMIT_WINDOW_MINUTES = 60;
const MAX_ATTEMPTS_PER_WINDOW = 5;

interface SubscribeRequest {
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    console.log(`[newsletter-subscribe] Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: jsonHeaders(req) }
    );
  }

  try {
    assertAllowedOrigin(req);
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    console.log(`[newsletter-subscribe] Request from IP: ${clientIP}`);

    // Parse request body
    const body: SubscribeRequest = await req.json();
    const email = body.email?.trim()?.toLowerCase();

    // Validate email presence
    if (!email) {
      console.log('[newsletter-subscribe] Missing email');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: jsonHeaders(req) }
      );
    }

    // Validate email length
    if (email.length < 5 || email.length > 320) {
      console.log(`[newsletter-subscribe] Invalid email length: ${email.length}`);
      return new Response(
        JSON.stringify({ error: 'Email must be between 5 and 320 characters' }),
        { status: 400, headers: jsonHeaders(req) }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      console.log(`[newsletter-subscribe] Invalid email format: ${email}`);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: jsonHeaders(req) }
      );
    }

    // Check for disposable email domains
    const emailDomain = email.split('@')[1];
    if (DISPOSABLE_DOMAINS.includes(emailDomain)) {
      console.log(`[newsletter-subscribe] Disposable email blocked: ${emailDomain}`);
      return new Response(
        JSON.stringify({ error: 'Please use a permanent email address' }),
        { status: 400, headers: jsonHeaders(req) }
      );
    }

    // Initialize Supabase client with service role for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const { data: rateLimit } = await supabase
      .from('newsletter_rate_limits')
      .select('*')
      .eq('ip_address', clientIP)
      .gte('first_attempt_at', windowStart)
      .single();

    if (rateLimit && rateLimit.attempt_count >= MAX_ATTEMPTS_PER_WINDOW) {
      console.log(`[newsletter-subscribe] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
        { status: 429, headers: jsonHeaders(req) }
      );
    }

    // Update or insert rate limit record
    if (rateLimit) {
      await supabase
        .from('newsletter_rate_limits')
        .update({ 
          attempt_count: rateLimit.attempt_count + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', rateLimit.id);
    } else {
      // Clean up old records first
      await supabase
        .from('newsletter_rate_limits')
        .delete()
        .lt('first_attempt_at', windowStart);
      
      await supabase
        .from('newsletter_rate_limits')
        .insert({ ip_address: clientIP });
    }

    // Insert subscriber
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({ email });

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`[newsletter-subscribe] Duplicate email: ${email}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'You are already subscribed to our newsletter!' 
          }),
          { status: 200, headers: jsonHeaders(req) }
        );
      }
      
      console.error(`[newsletter-subscribe] Insert error:`, insertError);
      throw insertError;
    }

    console.log(`[newsletter-subscribe] Successfully subscribed: ${email}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thank you for subscribing to our newsletter!' 
      }),
      { status: 200, headers: jsonHeaders(req) }
    );

  } catch (error) {
    console.error('[newsletter-subscribe] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to subscribe. Please try again.' }),
      { status: 500, headers: jsonHeaders(req) }
    );
  }
});
