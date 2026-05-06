import heroPhoneImg from "@/assets/hero-phone.jpg";

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  categoryColor: "mobile" | "laptop" | "tablet" | "audio" | "watch" | "gaming";
  author: string;
  date: string;
  readTime: string;
  featured?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  rating: number;
  category: string;
}

export const featuredArticles: Article[] = [
  {
    id: "1",
    title: "Samsung Galaxy S26 Ultra launching soon with revolutionary AI features",
    excerpt: "Samsung's next flagship phone is set to redefine smartphone photography with advanced AI capabilities.",
    image: heroPhoneImg,
    category: "Samsung",
    categoryColor: "mobile",
    author: "Tech Team",
    date: "Just now",
    readTime: "3 min read",
    featured: true,
  },
  {
    id: "2",
    title: "OnePlus 15 Pro arrives in Nepal with Snapdragon 8 Gen 5",
    excerpt: "The latest OnePlus flagship brings flagship performance at a competitive price point.",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
    category: "OnePlus",
    categoryColor: "mobile",
    author: "Gadget Reviewer",
    date: "2 hours ago",
    readTime: "4 min read",
  },
  {
    id: "3",
    title: "Apple MacBook Pro M4 Max Review: Worth the upgrade?",
    excerpt: "We tested Apple's most powerful laptop to see if the performance gains justify the price.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
    category: "Apple",
    categoryColor: "laptop",
    author: "Tech Analyst",
    date: "5 hours ago",
    readTime: "8 min read",
  },
];

export const latestNews: Article[] = [
  {
    id: "4",
    title: "ASUS Laptops Price in Nepal 2026 [Updated List]",
    excerpt: "Complete guide to ASUS laptop prices including ROG, TUF, and Vivobook series.",
    image: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&q=80",
    category: "Laptop Price",
    categoryColor: "laptop",
    author: "Price Team",
    date: "10 hours ago",
    readTime: "5 min read",
  },
  {
    id: "5",
    title: "Redmi Note 15 Pro officially launches with 200MP camera",
    excerpt: "Xiaomi's mid-range champion gets a major camera upgrade.",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
    category: "Redmi",
    categoryColor: "mobile",
    author: "News Desk",
    date: "12 hours ago",
    readTime: "3 min read",
  },
  {
    id: "6",
    title: "Best TWS Earbuds under Rs. 5000 in Nepal",
    excerpt: "Top budget wireless earbuds that deliver great sound quality.",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
    category: "Audio",
    categoryColor: "audio",
    author: "Audio Expert",
    date: "1 day ago",
    readTime: "6 min read",
  },
  {
    id: "7",
    title: "Apple Watch Series 11 coming with blood glucose monitoring",
    excerpt: "Long-awaited health feature finally ready for prime time.",
    image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&q=80",
    category: "Apple",
    categoryColor: "watch",
    author: "Health Tech",
    date: "1 day ago",
    readTime: "4 min read",
  },
  {
    id: "8",
    title: "PlayStation 6 specs leaked: What to expect",
    excerpt: "Sony's next-gen console rumored to feature groundbreaking ray tracing technology.",
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&q=80",
    category: "Gaming",
    categoryColor: "gaming",
    author: "Gaming News",
    date: "2 days ago",
    readTime: "5 min read",
  },
];

export const trendingArticles: Article[] = [
  {
    id: "t1",
    title: "iPhone 17 Pro Max Price in Nepal 2026",
    excerpt: "",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80",
    category: "Mobile Price",
    categoryColor: "mobile",
    author: "",
    date: "14 hours ago",
    readTime: "",
  },
  {
    id: "t2",
    title: "Best Gaming Laptops in Nepal under 2 Lakh",
    excerpt: "",
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&q=80",
    category: "Laptop Guide",
    categoryColor: "laptop",
    author: "",
    date: "1 day ago",
    readTime: "",
  },
  {
    id: "t3",
    title: "Samsung Galaxy Tab S10 Review: Best Android Tablet?",
    excerpt: "",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80",
    category: "Tablet",
    categoryColor: "tablet",
    author: "",
    date: "2 days ago",
    readTime: "",
  },
  {
    id: "t4",
    title: "Realme GT 7 Pro vs OnePlus 13R Comparison",
    excerpt: "",
    image: "https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400&q=80",
    category: "Comparison",
    categoryColor: "mobile",
    author: "",
    date: "3 days ago",
    readTime: "",
  },
  {
    id: "t5",
    title: "Sony WF-1000XM6 Review: Best ANC Earbuds",
    excerpt: "",
    image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&q=80",
    category: "Audio",
    categoryColor: "audio",
    author: "",
    date: "4 days ago",
    readTime: "",
  },
];

export const featuredProducts: Product[] = [
  {
    id: "p1",
    name: "Samsung Galaxy S26 Ultra",
    price: "Rs. 1,89,999",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80",
    rating: 4.8,
    category: "Smartphones",
  },
  {
    id: "p2",
    name: "iPhone 17 Pro",
    price: "Rs. 1,99,999",
    image: "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&q=80",
    rating: 4.9,
    category: "Smartphones",
  },
  {
    id: "p3",
    name: "OnePlus 15 Pro",
    price: "Rs. 1,29,999",
    image: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&q=80",
    rating: 4.6,
    category: "Smartphones",
  },
  {
    id: "p4",
    name: "Redmi Note 15 Pro",
    price: "Rs. 39,999",
    image: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&q=80",
    rating: 4.4,
    category: "Smartphones",
  },
  {
    id: "p5",
    name: "Nothing Phone 3",
    price: "Rs. 84,999",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80",
    rating: 4.5,
    category: "Smartphones",
  },
  {
    id: "p6",
    name: "Realme GT 7 Pro",
    price: "Rs. 74,999",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80",
    rating: 4.3,
    category: "Smartphones",
  },
];

export const categories = [
  { name: "Smartphones", icon: "📱", count: 245 },
  { name: "Laptops", icon: "💻", count: 128 },
  { name: "Tablets", icon: "📟", count: 56 },
  { name: "Earbuds", icon: "🎧", count: 89 },
  { name: "Smartwatches", icon: "⌚", count: 67 },
  { name: "Gaming", icon: "🎮", count: 34 },
  { name: "Cameras", icon: "📷", count: 42 },
  { name: "Drones", icon: "🚁", count: 18 },
];
