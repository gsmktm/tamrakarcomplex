-- Create article categories enum
CREATE TYPE public.article_category AS ENUM (
  'mobile', 'laptop', 'tablet', 'audio', 'watch', 'gaming', 
  'news', 'review', 'comparison', 'guide', 'price'
);

-- Create articles table
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  image TEXT,
  category article_category NOT NULL DEFAULT 'news',
  category_label TEXT,
  author TEXT NOT NULL DEFAULT 'Tech Team',
  read_time TEXT DEFAULT '5 min read',
  featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand TEXT,
  price TEXT NOT NULL,
  price_value INTEGER,
  image TEXT,
  images TEXT[],
  rating DECIMAL(2,1) DEFAULT 4.0,
  reviews_count INTEGER DEFAULT 0,
  category TEXT NOT NULL,
  specs JSONB,
  highlights TEXT[],
  description TEXT,
  in_stock BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wishlist table
CREATE TABLE public.wishlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Articles: Public read access
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.articles;
CREATE POLICY "Anyone can view published articles" 
ON public.articles FOR SELECT 
USING (published = true);

-- Products: Public read access
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" 
ON public.products FOR SELECT 
USING (true);

-- Profiles: Public read, users can update own
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Comments: Public read, authenticated write
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments" 
ON public.comments FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" 
ON public.comments FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" 
ON public.comments FOR DELETE 
USING (auth.uid() = user_id);

-- Wishlist: Users can manage their own
DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlist;
CREATE POLICY "Users can view their own wishlist" 
ON public.wishlist FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their wishlist" ON public.wishlist;
CREATE POLICY "Users can add to their wishlist" 
ON public.wishlist FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their wishlist" ON public.wishlist;
CREATE POLICY "Users can remove from their wishlist" 
ON public.wishlist FOR DELETE 
USING (auth.uid() = user_id);

-- Newsletter: Anyone can subscribe
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" 
ON public.newsletter_subscribers FOR INSERT 
WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample articles
INSERT INTO public.articles (title, slug, excerpt, content, image, category, category_label, author, read_time, featured) VALUES
('Samsung Galaxy S26 Ultra launching soon with revolutionary AI features', 'samsung-galaxy-s26-ultra-launch', 'Samsung''s next flagship phone is set to redefine smartphone photography with advanced AI capabilities that bring professional-grade features to mobile photography.', 'Samsung is preparing to unveil the Galaxy S26 Ultra, and early leaks suggest it will be a game-changer. The device is expected to feature a 200MP main camera with AI-enhanced night mode, capable of capturing stunning low-light photos that rival DSLR cameras. The Snapdragon 8 Gen 5 processor promises 40% better performance and improved power efficiency. The display is rumored to be a 6.9-inch Dynamic AMOLED 2X with 1-120Hz adaptive refresh rate. Samsung''s new Galaxy AI suite will include real-time translation, AI photo editing, and smart assistant features that learn from your usage patterns.', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80', 'mobile', 'Samsung', 'Tech Team', '5 min read', true),
('OnePlus 15 Pro arrives in Nepal with Snapdragon 8 Gen 5', 'oneplus-15-pro-nepal-launch', 'The latest OnePlus flagship brings flagship performance at a competitive price point.', 'OnePlus has officially launched the OnePlus 15 Pro in Nepal, bringing their latest flagship smartphone to the Nepali market. Priced at Rs. 1,29,999, the device features the powerful Snapdragon 8 Gen 5 processor, a stunning 6.7-inch LTPO AMOLED display with 2K resolution, and a Hasselblad-tuned triple camera system.', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80', 'mobile', 'OnePlus', 'Gadget Reviewer', '4 min read', true),
('Apple MacBook Pro M4 Max Review: Worth the upgrade?', 'macbook-pro-m4-max-review', 'We tested Apple''s most powerful laptop to see if the performance gains justify the price.', 'The MacBook Pro M4 Max represents the pinnacle of Apple''s laptop lineup. Our extensive testing revealed incredible performance gains, with the M4 Max chip delivering up to 50% faster CPU performance and 70% faster GPU performance compared to the M3 Max. The new 16-inch Liquid Retina XDR display is brighter than ever, reaching 1600 nits peak HDR brightness.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', 'laptop', 'Apple', 'Tech Analyst', '8 min read', true),
('ASUS Laptops Price in Nepal 2026 [Updated List]', 'asus-laptops-price-nepal-2026', 'Complete guide to ASUS laptop prices including ROG, TUF, and Vivobook series.', 'Looking for ASUS laptops in Nepal? Here''s our comprehensive price guide covering all ASUS laptop series available in the Nepali market. From gaming powerhouses like ROG and TUF to everyday performers like Vivobook and Zenbook, we''ve compiled the latest prices from authorized dealers.', 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&q=80', 'price', 'Laptop Price', 'Price Team', '5 min read', false),
('Redmi Note 15 Pro officially launches with 200MP camera', 'redmi-note-15-pro-launch', 'Xiaomi''s mid-range champion gets a major camera upgrade.', 'Xiaomi has unveiled the Redmi Note 15 Pro with an impressive 200MP main camera, bringing flagship-level photography to the mid-range segment. The device features the Snapdragon 7s Gen 3 processor, a 6.67-inch AMOLED display with 120Hz refresh rate, and 67W fast charging support.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80', 'mobile', 'Redmi', 'News Desk', '3 min read', false),
('Best TWS Earbuds under Rs. 5000 in Nepal', 'best-tws-earbuds-under-5000', 'Top budget wireless earbuds that deliver great sound quality.', 'Finding the perfect TWS earbuds under Rs. 5000 can be challenging with so many options available. We''ve tested dozens of earbuds to bring you our top picks that offer the best combination of sound quality, battery life, and features in this budget segment.', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80', 'audio', 'Audio', 'Audio Expert', '6 min read', false),
('Apple Watch Series 11 coming with blood glucose monitoring', 'apple-watch-series-11-glucose', 'Long-awaited health feature finally ready for prime time.', 'Apple is reportedly finalizing the blood glucose monitoring feature for the Apple Watch Series 11. This non-invasive glucose monitoring technology has been in development for years and could revolutionize diabetes management for millions of users worldwide.', 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&q=80', 'watch', 'Apple', 'Health Tech', '4 min read', false),
('PlayStation 6 specs leaked: What to expect', 'playstation-6-specs-leak', 'Sony''s next-gen console rumored to feature groundbreaking ray tracing technology.', 'Leaked specifications suggest the PlayStation 6 will feature AMD''s next-generation RDNA 5 architecture with hardware-accelerated ray tracing that rivals high-end PC graphics cards. The console is expected to support 8K gaming and feature an ultra-fast SSD with 12GB/s read speeds.', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&q=80', 'gaming', 'Gaming', 'Gaming News', '5 min read', false),
('iPhone 17 Pro Max Price in Nepal 2026', 'iphone-17-pro-max-price-nepal', 'Complete pricing guide for Apple''s latest flagship in Nepal.', 'Apple''s iPhone 17 Pro Max has arrived in Nepal through authorized dealers. Here''s the complete price breakdown for all storage variants, along with EMI options available from various retailers.', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80', 'price', 'Mobile Price', 'Price Team', '3 min read', false),
('Best Gaming Laptops in Nepal under 2 Lakh', 'best-gaming-laptops-nepal-2-lakh', 'Top gaming laptops that offer great value for money.', 'If you''re looking for a gaming laptop in Nepal under Rs. 2 Lakh, you''re in luck. This price range offers some excellent options from ASUS ROG, MSI, Lenovo Legion, and more. We''ve compiled the best picks based on performance, display quality, and cooling efficiency.', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&q=80', 'guide', 'Laptop Guide', 'Gaming Expert', '7 min read', false);

-- Insert sample products
INSERT INTO public.products (name, slug, brand, price, price_value, image, category, rating, specs, highlights, featured) VALUES
('Samsung Galaxy S26 Ultra', 'samsung-galaxy-s26-ultra', 'Samsung', 'Rs. 1,89,999', 189999, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80', 'Smartphones', 4.8, '{"display": "6.9\" Dynamic AMOLED 2X", "processor": "Snapdragon 8 Gen 5", "ram": "16GB", "storage": "512GB", "battery": "5500mAh", "camera": "200MP + 50MP + 12MP + 10MP"}', ARRAY['200MP AI Camera', 'S Pen Included', 'Titanium Frame'], true),
('iPhone 17 Pro', 'iphone-17-pro', 'Apple', 'Rs. 1,99,999', 199999, 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&q=80', 'Smartphones', 4.9, '{"display": "6.3\" Super Retina XDR", "processor": "A18 Pro Bionic", "ram": "8GB", "storage": "256GB", "battery": "4500mAh", "camera": "48MP + 12MP + 12MP"}', ARRAY['A18 Pro Chip', 'ProMotion Display', 'USB-C Thunderbolt'], true),
('OnePlus 15 Pro', 'oneplus-15-pro', 'OnePlus', 'Rs. 1,29,999', 129999, 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&q=80', 'Smartphones', 4.6, '{"display": "6.7\" LTPO AMOLED", "processor": "Snapdragon 8 Gen 5", "ram": "16GB", "storage": "256GB", "battery": "5400mAh", "camera": "50MP + 48MP + 32MP"}', ARRAY['Hasselblad Camera', '100W Fast Charging', 'Alert Slider'], true),
('Redmi Note 15 Pro', 'redmi-note-15-pro', 'Xiaomi', 'Rs. 39,999', 39999, 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&q=80', 'Smartphones', 4.4, '{"display": "6.67\" AMOLED", "processor": "Snapdragon 7s Gen 3", "ram": "12GB", "storage": "256GB", "battery": "5100mAh", "camera": "200MP + 8MP + 2MP"}', ARRAY['200MP Camera', '67W Fast Charging', 'IP68 Rating'], true),
('Nothing Phone 3', 'nothing-phone-3', 'Nothing', 'Rs. 84,999', 84999, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80', 'Smartphones', 4.5, '{"display": "6.7\" LTPO OLED", "processor": "Snapdragon 8 Gen 3", "ram": "12GB", "storage": "256GB", "battery": "5000mAh", "camera": "50MP + 50MP"}', ARRAY['Glyph Interface 2.0', 'Nothing OS 3.0', 'Unique Design'], true),
('Realme GT 7 Pro', 'realme-gt-7-pro', 'Realme', 'Rs. 74,999', 74999, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80', 'Smartphones', 4.3, '{"display": "6.78\" AMOLED", "processor": "Snapdragon 8 Gen 3", "ram": "12GB", "storage": "256GB", "battery": "5800mAh", "camera": "50MP + 8MP + 2MP"}', ARRAY['120W Fast Charging', 'Dual Stereo Speakers', 'Gaming Mode'], true),
('ASUS ROG Strix G16', 'asus-rog-strix-g16', 'ASUS', 'Rs. 2,49,999', 249999, 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&q=80', 'Laptops', 4.7, '{"display": "16\" QHD 240Hz", "processor": "Intel Core i9-14900HX", "ram": "32GB DDR5", "storage": "1TB NVMe", "graphics": "RTX 4070", "battery": "90Wh"}', ARRAY['ROG Intelligent Cooling', 'Per-Key RGB', 'Dolby Atmos'], true),
('MacBook Pro 16 M4 Max', 'macbook-pro-16-m4-max', 'Apple', 'Rs. 5,99,999', 599999, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', 'Laptops', 4.9, '{"display": "16.2\" Liquid Retina XDR", "processor": "Apple M4 Max", "ram": "48GB", "storage": "1TB SSD", "graphics": "40-core GPU", "battery": "22 hours"}', ARRAY['M4 Max Chip', 'ProMotion Display', 'Studio Quality Mics'], true);