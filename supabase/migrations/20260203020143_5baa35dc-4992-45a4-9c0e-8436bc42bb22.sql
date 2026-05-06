-- Add brand column to products if not exists (already have it)
-- Add guides table for buying guides
CREATE TABLE IF NOT EXISTS public.guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  image TEXT,
  category TEXT NOT NULL DEFAULT 'mobile', -- 'mobile' or 'laptop'
  guide_type TEXT NOT NULL DEFAULT 'buying', -- 'buying', 'comparison', 'tips'
  author TEXT NOT NULL DEFAULT 'Tech Team',
  read_time TEXT DEFAULT '5 min read',
  published BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  end_date TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_votes table to track user votes
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create comparisons table for saved comparisons
CREATE TABLE IF NOT EXISTS public.comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product1_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product2_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;

-- Guides policies (public read)
DROP POLICY IF EXISTS "Anyone can view published guides" ON public.guides;
CREATE POLICY "Anyone can view published guides" 
ON public.guides 
FOR SELECT 
USING (published = true);

-- Polls policies
DROP POLICY IF EXISTS "Anyone can view active polls" ON public.polls;
CREATE POLICY "Anyone can view active polls" 
ON public.polls 
FOR SELECT 
USING (active = true);

-- Poll votes policies
DROP POLICY IF EXISTS "Anyone can view poll votes count" ON public.poll_votes;
CREATE POLICY "Anyone can view poll votes count" 
ON public.poll_votes 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.poll_votes;
CREATE POLICY "Authenticated users can vote" 
ON public.poll_votes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Comparisons policies
DROP POLICY IF EXISTS "Anyone can view comparisons" ON public.comparisons;
CREATE POLICY "Anyone can view comparisons" 
ON public.comparisons 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Anyone can create comparisons" ON public.comparisons;
CREATE POLICY "Anyone can create comparisons" 
ON public.comparisons 
FOR INSERT 
WITH CHECK (true);

-- Add trigger for guides updated_at
CREATE TRIGGER update_guides_updated_at
BEFORE UPDATE ON public.guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample guides
INSERT INTO public.guides (title, slug, excerpt, image, category, guide_type, author) VALUES
('Best Mobile Phones Under Rs. 30,000 in Nepal', 'best-phones-under-30000-nepal', 'Looking for affordable smartphones? Here are the best options under Rs. 30,000.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', 'mobile', 'buying', 'Tech Team'),
('Best Mobile Phones Under Rs. 50,000 in Nepal', 'best-phones-under-50000-nepal', 'Mid-range smartphones with the best value for money.', 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800', 'mobile', 'buying', 'Tech Team'),
('Best Laptops for Students in Nepal 2026', 'best-laptops-students-nepal', 'Top laptop picks for students at every budget.', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', 'laptop', 'buying', 'Tech Team'),
('Best Gaming Laptops Under Rs. 1,50,000', 'best-gaming-laptops-nepal', 'High-performance gaming laptops for serious gamers.', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800', 'laptop', 'buying', 'Tech Team'),
('Smartphones with Best Camera in Nepal', 'best-camera-phones-nepal', 'Capture stunning photos with these camera-focused smartphones.', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', 'mobile', 'buying', 'Tech Team'),
('Best Budget Laptops Under Rs. 80,000', 'best-laptops-under-80000-nepal', 'Affordable laptops that deliver great performance.', 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800', 'laptop', 'buying', 'Tech Team');

-- Insert sample poll
INSERT INTO public.polls (question, options, end_date, total_votes) VALUES
('Which laptop brand do you trust the MOST?', '[{"text": "Lenovo", "votes": 1250}, {"text": "Asus", "votes": 980}, {"text": "Dell", "votes": 875}, {"text": "Acer", "votes": 720}, {"text": "Apple", "votes": 600}]', '2026-02-28', 4425);