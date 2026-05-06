
import { supabase } from "@/integrations/supabase/client";

export interface EvostoreProduct {
  name: string;
  price: string;
  price_value: number;
  image: string;
  url: string;
  description: string;
  specs: Record<string, string>;
  category: string;
  brand: string;
  series?: string;
}

const EVO_PRODUCTS: EvostoreProduct[] = [
  {
    name: "iPhone 17 Pro Max",
    price: "NPR 239,999",
    price_value: 239999,
    image: "https://placehold.co/600x800/orange/white?text=iPhone+17+Pro+Max+Cosmic+Orange",
    url: "https://evostore.com.np/apple/iphone-17-pro-max",
    description: "The ultimate iPhone with A19 Pro chip, 48MP triple camera system, and all-day battery life. Features the new Cosmic Orange finish.",
    specs: {
      Display: "6.9-inch Super Retina XDR",
      Processor: "A19 Pro chip",
      Camera: "48MP Main, 48MP Ultra Wide, 48MP Telephoto",
      Battery: "Up to 33 hours video playback",
      Storage: "256GB, 512GB, 1TB, 2TB"
    },
    category: "Smartphones",
    brand: "Apple",
    series: "iPhone 17 Series"
  },
  {
    name: "iPhone 17 Pro",
    price: "NPR 220,999",
    price_value: 220999,
    image: "https://placehold.co/600x800/silver/black?text=iPhone+17+Pro",
    url: "https://evostore.com.np/apple/iphone-17-pro",
    description: "Pro power in a perfect size. A19 Pro chip, titanium design, and advanced camera system.",
    specs: {
      Display: "6.3-inch Super Retina XDR",
      Processor: "A19 Pro chip",
      Camera: "48MP Main, 48MP Ultra Wide, 48MP Telephoto",
      Battery: "Up to 26 hours video playback",
      Storage: "256GB, 512GB, 1TB"
    },
    category: "Smartphones",
    brand: "Apple",
    series: "iPhone 17 Series"
  },
  {
    name: "iPhone Air",
    price: "NPR 178,999",
    price_value: 178999,
    image: "https://placehold.co/600x800/skyblue/white?text=iPhone+Air",
    url: "https://evostore.com.np/apple/iphone-air",
    description: "Impossibly thin. Incredibly powerful. The new iPhone Air redefines portability.",
    specs: {
      Display: "6.6-inch Super Retina XDR",
      Processor: "A19 chip",
      Camera: "48MP Main, 12MP Ultra Wide",
      Thickness: "5.1mm",
      Storage: "256GB, 512GB"
    },
    category: "Smartphones",
    brand: "Apple",
    series: "iPhone Air"
  },
  {
    name: "iPhone 17",
    price: "NPR 161,599",
    price_value: 161599,
    image: "https://placehold.co/600x800/sage/white?text=iPhone+17",
    url: "https://evostore.com.np/apple/iphone-17",
    description: "New design, A19 chip, and major camera upgrades. Available in beautiful new colors.",
    specs: {
      Display: "6.1-inch Super Retina XDR",
      Processor: "A19 chip",
      Camera: "48MP Main, 12MP Ultra Wide",
      Battery: "Up to 22 hours video playback",
      Storage: "128GB, 256GB, 512GB"
    },
    category: "Smartphones",
    brand: "Apple",
    series: "iPhone 17 Series"
  },
  {
    name: "iPhone 16",
    price: "NPR 128,099",
    price_value: 128099,
    image: "https://placehold.co/600x800/teal/white?text=iPhone+16",
    url: "https://evostore.com.np/apple/iphone-16",
    description: "A18 chip, Camera Control, and a big boost in battery life.",
    specs: {
      Display: "6.1-inch Super Retina XDR",
      Processor: "A18 chip",
      Camera: "48MP Fusion, 12MP Ultra Wide",
      Battery: "Up to 22 hours video playback",
      Storage: "128GB, 256GB, 512GB"
    },
    category: "Smartphones",
    brand: "Apple",
    series: "iPhone 16 Series"
  },
  {
    name: "iPhone 16e",
    price: "NPR 98,799",
    price_value: 98799,
    image: "https://placehold.co/600x800/white/black?text=iPhone+16e",
    url: "https://evostore.com.np/apple/iphone-16e",
    description: "The essential iPhone experience. Great performance and value.",
    specs: {
      Display: "6.1-inch Super Retina XDR",
      Processor: "A18 chip",
      Camera: "48MP Main",
      Battery: "Up to 20 hours video playback",
      Storage: "128GB, 256GB"
    },
    category: "Smartphones",
    brand: "Apple",
    series: "iPhone 16 Series"
  },
  {
    name: "iPhone 15",
    price: "NPR 109,899",
    price_value: 109899,
    image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg",
    url: "https://evostore.com.np/apple/iphone-15",
    description: "Dynamic Island, 48MP Main camera, and USB-C.",
    specs: {
      Display: "6.1-inch Super Retina XDR",
      Processor: "A16 Bionic chip",
      Camera: "48MP Main, 12MP Ultra Wide",
      Battery: "Up to 20 hours video playback",
      Storage: "128GB, 256GB, 512GB"
    },
    category: "Smartphones",
    brand: "Apple",
    series: "iPhone 15 Series"
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    price: "NPR 199,999",
    price_value: 199999,
    image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra.jpg",
    url: "https://evostore.com.np/samsung/s24-ultra",
    description: "Galaxy AI is here. The most powerful Samsung phone yet.",
    specs: {
      Display: "6.8-inch AMOLED",
      Processor: "Snapdragon 8 Gen 3",
      Camera: "200MP Main, 50MP Periscope",
      Battery: "5000 mAh",
      Storage: "256GB, 512GB, 1TB"
    },
    category: "Smartphones",
    brand: "Samsung",
    series: "Galaxy S24 Series"
  },
  {
    name: "MacBook Air M3",
    price: "NPR 185,000",
    price_value: 185000,
    image: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-midnight-select-202402?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1707329535470",
    url: "https://evostore.com.np/apple/macbook-air-m3",
    description: "Lean. Mean. M3 machine.",
    specs: {
      Display: "13.6-inch Liquid Retina",
      Processor: "M3 chip",
      Memory: "8GB, 16GB, 24GB",
      Storage: "256GB, 512GB, 1TB, 2TB"
    },
    category: "Laptops",
    brand: "Apple",
    series: "MacBook Air"
  },
  {
    name: "Dell XPS 13",
    price: "NPR 210,000",
    price_value: 210000,
    image: "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9340/media-gallery/touch/silver/notebook-xps-13-9340-t-silver-gallery-4.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=536&qlt=100,1&resMode=sharp2&size=536,402&chrss=full",
    url: "https://evostore.com.np/dell/xps-13",
    description: "Iconic design, now even more powerful.",
    specs: {
      Display: "13.4-inch InfinityEdge",
      Processor: "Intel Core Ultra 7",
      Memory: "16GB, 32GB",
      Storage: "512GB, 1TB"
    },
    category: "Laptops",
    brand: "Dell",
    series: "XPS Series"
  },
  {
    name: "OnePlus 12",
    price: "NPR 120,000",
    price_value: 120000,
    image: "https://fdn2.gsmarena.com/vv/bigpic/oneplus-12.jpg",
    url: "https://evostore.com.np/oneplus/12",
    description: "Smooth beyond belief with Snapdragon 8 Gen 3.",
    specs: {
      Display: "6.82-inch AMOLED",
      Processor: "Snapdragon 8 Gen 3",
      Camera: "50MP Main, 64MP Periscope",
      Battery: "5400 mAh",
      Storage: "256GB, 512GB"
    },
    category: "Smartphones",
    brand: "OnePlus",
    series: "Number Series"
  }
];

export const evostoreService = {
  getAllProducts: async (): Promise<EvostoreProduct[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return EVO_PRODUCTS;
  },
  
  // Deprecated: kept for backward compatibility if needed, but getAllProducts is preferred
  getAppleProducts: async (): Promise<EvostoreProduct[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return EVO_PRODUCTS.filter(p => p.brand === "Apple");
  },

  importProducts: async (products: EvostoreProduct[]) => {
    const downloadImage = async (url: string) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        // Generate a safe filename
        const timestamp = Date.now();
        const safeName = `evostore-${timestamp}-${Math.random().toString(36).substring(7)}.jpg`;
        const file = new File([blob], safeName, { type: blob.type });

        const { data, error } = await supabase.storage
          .from("marketplace")
          .upload(`products/${safeName}`, file, {
            upsert: true
          });

        if (error) {
          console.error("Failed to upload image:", error);
          return url;
        }

        const { data: publicUrlData } = supabase.storage
          .from("marketplace")
          .getPublicUrl(`products/${safeName}`);
          
        return publicUrlData.publicUrl;
      } catch (e) {
        console.error("Failed to download image:", e);
        return url;
      }
    };

    const processedProducts = await Promise.all(products.map(async (p) => {
      if (p.image && (p.image.startsWith('http') || p.image.startsWith('https'))) {
        p.image = await downloadImage(p.image);
      }
      return p;
    }));

    return processedProducts;
  }
};
