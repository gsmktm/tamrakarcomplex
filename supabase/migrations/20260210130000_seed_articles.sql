
-- Seed data for articles (News and Reviews)
INSERT INTO public.articles (title, slug, excerpt, content, image, category, author, read_time, featured, published, views)
VALUES
('iPhone 16 Pro Max Review: The Best Gets Better', 'iphone-16-pro-max-review', 'The new iPhone 16 Pro Max brings significant camera upgrades and a new A18 Pro chip.', 'Full review content here...', 'https://images.unsplash.com/photo-1696446702347-16008892410a?w=800&q=80', 'review', 'Tech Team', '10 min read', true, true, 1500),
('Samsung Galaxy S24 Ultra vs iPhone 15 Pro Max', 's24-ultra-vs-iphone-15-pro-max', 'A comprehensive comparison between the two flagship giants.', 'Comparison content...', 'https://images.unsplash.com/photo-1706606992636-c035b530519b?w=800&q=80', 'comparison', 'Tech Team', '8 min read', true, true, 2000),
('Best Budget Phones Under 30000 in Nepal', 'best-budget-phones-under-30000', 'Looking for a budget phone? Here are our top picks for 2024.', 'Guide content...', 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=800&q=80', 'guide', 'Tech Team', '5 min read', false, true, 3000),
('Xiaomi 14 Ultra Launched in Nepal', 'xiaomi-14-ultra-launch-nepal', 'Xiaomi has officially launched its latest flagship, the Xiaomi 14 Ultra, in Nepal.', 'News content...', 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=800&q=80', 'news', 'Tech Team', '3 min read', false, true, 1200);
