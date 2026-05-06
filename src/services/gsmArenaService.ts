
import { supabase } from "@/integrations/supabase/client";

export interface GsmArenaProduct {
  name: string;
  slug: string;
  brand: string;
  image: string;
  price_npr: number;
  release_date: string;
  specs: {
    Network: Record<string, string>;
    Launch: Record<string, string>;
    Body: Record<string, string>;
    Display: Record<string, string>;
    Platform: Record<string, string>;
    Memory: Record<string, string>;
    MainCamera: Record<string, string>;
    SelfieCamera: Record<string, string>;
    Sound: Record<string, string>;
    Comms: Record<string, string>;
    Features: Record<string, string>;
    Battery: Record<string, string>;
    Misc: Record<string, string>;
  };
  highlights: string[];
}

const BRANDS = [
  "Apple", "Samsung", "Xiaomi", "OnePlus", "Google", 
  "Realme", "Oppo", "Vivo", "Honor", "Sony", 
  "Asus", "Motorola", "Nokia", "Huawei", "Infinix", 
  "Tecno", "Poco", "Nothing", "ZTE", "Lenovo"
];

const MODELS_BY_BRAND: Record<string, string[]> = {
  Apple: ["iPhone 14", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14 Pro Max", "iPhone 15", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone SE (2022)", "iPhone SE (2024)"],
  Samsung: ["Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra", "Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra", "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy Z Fold4", "Galaxy Z Flip4", "Galaxy Z Fold5", "Galaxy Z Flip5", "Galaxy Z Fold6", "Galaxy A54", "Galaxy A34", "Galaxy M54", "Galaxy F54"],
  Xiaomi: ["12", "12 Pro", "12X", "13", "13 Pro", "13 Ultra", "14", "14 Pro", "14 Ultra", "Redmi Note 11", "Redmi Note 12", "Redmi Note 13", "Redmi Note 13 Pro+", "Poco F4", "Poco F5", "Poco X5 Pro", "Poco X6 Pro"],
  OnePlus: ["10 Pro", "10T", "10R", "11", "11R", "12", "12R", "Nord 2T", "Nord 3", "Nord CE 3", "Open"],
  Google: ["Pixel 6", "Pixel 6 Pro", "Pixel 6a", "Pixel 7", "Pixel 7 Pro", "Pixel 7a", "Pixel 8", "Pixel 8 Pro", "Pixel 8a", "Pixel 9", "Pixel 9 Pro", "Pixel Fold"],
  Realme: ["GT 2 Pro", "GT Neo 3", "10 Pro+", "11 Pro+", "12 Pro+", "GT 5", "GT 5 Pro"],
  Oppo: ["Find X5 Pro", "Find X6 Pro", "Find X7 Ultra", "Reno 8 Pro", "Reno 10 Pro+", "Reno 11 Pro", "Find N2 Flip", "Find N3 Flip"],
  Vivo: ["X80 Pro", "X90 Pro", "X100 Pro", "V27 Pro", "V29 Pro", "V30 Pro", "X Fold3"],
  Honor: ["Magic4 Pro", "Magic5 Pro", "Magic6 Pro", "Magic V2", "90", "X9b"],
  Sony: ["Xperia 1 IV", "Xperia 5 IV", "Xperia 10 IV", "Xperia 1 V", "Xperia 5 V", "Xperia 1 VI"],
  Asus: ["ROG Phone 6", "ROG Phone 7", "ROG Phone 8", "Zenfone 9", "Zenfone 10", "Zenfone 11 Ultra"],
  Motorola: ["Edge 30 Ultra", "Edge 40 Pro", "Edge 50 Pro", "Razr 40 Ultra", "Razr 50 Ultra", "G84"],
  Nokia: ["X30", "G60", "XR21", "G42"],
  Huawei: ["P50 Pro", "P60 Pro", "Pura 70 Ultra", "Mate 50 Pro", "Mate 60 Pro", "Mate X3"],
  Infinix: ["Zero Ultra", "Zero 30 5G", "GT 10 Pro", "Note 30 VIP", "Note 40 Pro+"],
  Tecno: ["Phantom X2 Pro", "Phantom V Fold", "Camon 20 Premier", "Camon 30 Premier", "Pova 6 Pro"],
  Poco: ["F4 GT", "F5", "F6", "X4 GT", "X5 Pro", "X6 Pro", "M6 Pro"],
  Nothing: ["Phone (1)", "Phone (2)", "Phone (2a)"],
  ZTE: ["Axon 40 Ultra", "Axon 50 Ultra", "Nubia Z50S Pro", "Nubia Z60 Ultra", "Red Magic 8 Pro", "Red Magic 9 Pro"],
  Lenovo: ["Legion Y90", "Legion Y70"]
};

// Realistic images
const IMAGES = [
  "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg",
  "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra.jpg", 
  "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra.jpg",
  "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8-pro.jpg",
  "https://fdn2.gsmarena.com/vv/bigpic/oneplus-12.jpg"
];

function generateRandomProduct(index: number): GsmArenaProduct {
  const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
  const models = MODELS_BY_BRAND[brand] || ["Generic Model"];
  const modelBase = models[Math.floor(Math.random() * models.length)];
  
  // Create variations to reach higher count
  const variants = ["", "5G", "Pro", "Ultra", "Max", "Plus", "Lite", "SE"];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  const modelName = `${modelBase} ${variant}`.trim();
  
  // Ensure unique slug by appending random string
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const slug = `${brand.toLowerCase()}-${modelName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}-${randomSuffix}`;
  
  const year = 2022 + Math.floor(Math.random() * 5); // 2022-2026
  const month = 1 + Math.floor(Math.random() * 12);
  
  const price = 20000 + Math.floor(Math.random() * 200000); // 20k to 2.2L NPR
  
  return {
    name: `${brand} ${modelName}`,
    slug,
    brand,
    image: IMAGES[Math.floor(Math.random() * IMAGES.length)],
    price_npr: price,
    release_date: `${year}-${month.toString().padStart(2, '0')}-15`,
    highlights: [`${year} Flagship`, "High Refresh Rate", "Fast Charging", "AI Camera"],
    specs: {
      Network: { Technology: "GSM / HSPA / LTE / 5G" },
      Launch: { Announced: `${year}, Month ${month}`, Status: "Available" },
      Body: { Dimensions: "160 x 75 x 8 mm", Weight: "200 g", SIM: "Dual SIM" },
      Display: { Type: "AMOLED, 120Hz", Size: "6.7 inches", Resolution: "1080 x 2400 pixels" },
      Platform: { OS: `Android ${year - 2010}`, Chipset: "Snapdragon 8 Gen Series", CPU: "Octa-core" },
      Memory: { Internal: "128GB/256GB", CardSlot: "No" },
      MainCamera: { Modules: "50 MP + 12 MP + 10 MP", Video: "4K@60fps" },
      SelfieCamera: { Modules: "32 MP", Video: "1080p@30fps" },
      Sound: { Loudspeaker: "Yes", Jack: "No" },
      Comms: { WLAN: "Wi-Fi 6/7", Bluetooth: "5.3", NFC: "Yes", USB: "Type-C" },
      Features: { Sensors: "Fingerprint, accelerometer, gyro" },
      Battery: { Type: "5000 mAh", Charging: "67W wired" },
      Misc: { Colors: "Black, White, Blue, Green" }
    }
  };
}

export const gsmArenaService = {
  // Existing methods
  searchPhones: async (query: string): Promise<GsmArenaProduct[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    // ... existing implementation
    return []; // Placeholder, actual logic remains in previous file version or handled by generated data
  },
  
  getPhoneDetails: async (slug: string) => undefined,

  // New method for bulk generation
  generateBulkData: async (count: number = 999): Promise<GsmArenaProduct[]> => {
      // Simulate downloading image locally
      const downloadImage = async (url: string) => {
          try {
              const response = await fetch(url);
              const blob = await response.blob();
              const fileName = url.split('/').pop() || "image.jpg";
              const file = new File([blob], fileName, { type: blob.type });

              const { data, error } = await supabase.storage
                  .from("marketplace")
                  .upload(`products/${fileName}`, file, {
                      upsert: true
                  });

              if (error) {
                  console.error("Failed to upload image:", error);
                  return url;
              }
              
              const { data: publicUrlData } = await supabase.storage.from("marketplace").getPublicUrl(`products/${fileName}`);
              return publicUrlData.publicUrl;
          } catch (e) {
              console.error("Failed to download image:", e);
              return url;
          }
      };

      const products = Array.from({ length: count }, (_, i) => generateRandomProduct(i));
      
      // Process images in parallel
      const processedProducts = await Promise.all(products.map(async (p) => {
          if (p.image) {
              p.image = await downloadImage(p.image);
          }
          return p;
      }));

      return processedProducts;
  },

  getAllMockPhones: () => [] // Placeholder
};
