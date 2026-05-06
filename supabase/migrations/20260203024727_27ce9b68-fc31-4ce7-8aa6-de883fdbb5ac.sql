-- Add email format validation constraint
ALTER TABLE public.newsletter_subscribers
ADD CONSTRAINT email_format_check 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add email length constraint  
ALTER TABLE public.newsletter_subscribers
ADD CONSTRAINT email_length_check
CHECK (length(email) <= 320 AND length(email) >= 5);

-- Create rate limiting table for newsletter subscriptions
CREATE TABLE public.newsletter_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for IP lookup
CREATE INDEX idx_newsletter_rate_limits_ip ON public.newsletter_rate_limits(ip_address);

-- Enable RLS
ALTER TABLE public.newsletter_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access to rate limits table - only edge functions with service role can access