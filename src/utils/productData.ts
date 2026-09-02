import { LATEST_MOBILE_BUYING_PRICES } from "@/data/latestMobileBuyingPrices";

export interface ProductData {
  id: number;
  brand: string;
  model: string;
  image: string;
  retail_npr?: number; // Nepal retail price for exchange calculation
}

// Nepal market devices 2025-2026 — used as fallback when catalog_products DB is empty
// Updated with comprehensive pricing from Nepal market
const BASE_PRODUCTS: ProductData[] = [
  // ── APPLE ──
  { id: 300001, brand: "Apple", model: "iPhone 13 (128GB)",          retail_npr: 80399,  image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300002, brand: "Apple", model: "iPhone 14 (128GB)",          retail_npr: 93499,  image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300003, brand: "Apple", model: "iPhone 15 (128GB)",          retail_npr: 110999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300004, brand: "Apple", model: "iPhone 16e (128GB)",         retail_npr: 102299, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300005, brand: "Apple", model: "iPhone 16 (128GB)",          retail_npr: 141499, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300006, brand: "Apple", model: "iPhone 17e (256GB)",         retail_npr: 127799, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300007, brand: "Apple", model: "iPhone 17e (512GB)",         retail_npr: 168999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300008, brand: "Apple", model: "iPhone 17 (256GB)",          retail_npr: 167999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300009, brand: "Apple", model: "iPhone 17 (512GB)",          retail_npr: 208999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300010, brand: "Apple", model: "iPhone Air (256GB)",         retail_npr: 183999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300011, brand: "Apple", model: "iPhone Air (512GB)",         retail_npr: 224999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300012, brand: "Apple", model: "iPhone Air (1TB)",           retail_npr: 265999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300013, brand: "Apple", model: "iPhone 17 Pro (256GB)",      retail_npr: 228999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300014, brand: "Apple", model: "iPhone 17 Pro (512GB)",      retail_npr: 269999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300015, brand: "Apple", model: "iPhone 17 Pro (1TB)",        retail_npr: 309999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300016, brand: "Apple", model: "iPhone 17 Pro Max (256GB)",  retail_npr: 248999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300017, brand: "Apple", model: "iPhone 17 Pro Max (512GB)",  retail_npr: 289999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300018, brand: "Apple", model: "iPhone 17 Pro Max (1TB)",    retail_npr: 330999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: 300019, brand: "Apple", model: "iPhone 17 Pro Max (2TB)",    retail_npr: 411999, image: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },

  // ── SAMSUNG ──
  { id: 300101, brand: "Samsung", model: "Galaxy A07 (4+64GB)",       retail_npr: 18999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300102, brand: "Samsung", model: "Galaxy A07 (4+128GB)",      retail_npr: 22499,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300103, brand: "Samsung", model: "Galaxy A07 (6+128GB)",      retail_npr: 26499,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300104, brand: "Samsung", model: "Galaxy M17 5G (6+128GB)",   retail_npr: 32999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300105, brand: "Samsung", model: "Galaxy A17 5G (6+128GB)",   retail_npr: 33999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300106, brand: "Samsung", model: "Galaxy A17 5G (8+128GB)",   retail_npr: 36999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300107, brand: "Samsung", model: "Galaxy A17 5G (8+256GB)",   retail_npr: 44999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300108, brand: "Samsung", model: "Galaxy M36 5G (8+128GB)",   retail_npr: 41999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300109, brand: "Samsung", model: "Galaxy M36 5G (8+256GB)",   retail_npr: 47999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300110, brand: "Samsung", model: "Galaxy A36 5G (8+128GB)",   retail_npr: 53999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300111, brand: "Samsung", model: "Galaxy A36 5G (8+256GB)",   retail_npr: 59999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300112, brand: "Samsung", model: "Galaxy A36 5G (12+256GB)",  retail_npr: 65999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300113, brand: "Samsung", model: "Galaxy A37 5G (8+128GB)",   retail_npr: 64999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300114, brand: "Samsung", model: "Galaxy A37 5G (8+256GB)",   retail_npr: 72999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300115, brand: "Samsung", model: "Galaxy A37 5G (12+256GB)",  retail_npr: 79999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300116, brand: "Samsung", model: "Galaxy A56 5G (8+256GB)",   retail_npr: 71999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300117, brand: "Samsung", model: "Galaxy A56 5G (12+256GB)",  retail_npr: 77999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300118, brand: "Samsung", model: "Galaxy A57 5G (8+256GB)",   retail_npr: 84999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300119, brand: "Samsung", model: "Galaxy A57 5G (12+256GB)",  retail_npr: 89999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300120, brand: "Samsung", model: "Galaxy S25 FE (8+256GB)",   retail_npr: 107999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300121, brand: "Samsung", model: "Galaxy S25 Ultra (12+256GB)",retail_npr: 184999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300122, brand: "Samsung", model: "Galaxy S25 Ultra (12+512GB)",retail_npr: 199999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300123, brand: "Samsung", model: "Galaxy S25 Ultra (12GB+1TB)",retail_npr: 234999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300124, brand: "Samsung", model: "Galaxy S26 (12GB + 256GB)",  retail_npr: 133999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300125, brand: "Samsung", model: "Galaxy S26+ (12GB + 256GB)", retail_npr: 182999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300126, brand: "Samsung", model: "Galaxy S26 Ultra (12+256GB)",retail_npr: 212999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300127, brand: "Samsung", model: "Galaxy S26 Ultra (12+512GB)",retail_npr: 242999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300128, brand: "Samsung", model: "Galaxy S26 Ultra (16+1TB)",  retail_npr: 292999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300129, brand: "Samsung", model: "Galaxy Z Flip 7 (12+256GB)",retail_npr: 154999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300130, brand: "Samsung", model: "Galaxy Z Fold 7 (12+256GB)",retail_npr: 244999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { id: 300131, brand: "Samsung", model: "Galaxy Z Fold 7 (12+512GB)",retail_npr: 259999, image: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },

  // ── XIAOMI ──
  { id: 300201, brand: "Xiaomi", model: "Redmi A5 (3+64GB)",          retail_npr: 14999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300202, brand: "Xiaomi", model: "Redmi A5 (4+128GB)",         retail_npr: 16999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300203, brand: "Xiaomi", model: "Redmi A7 (3+64GB)",          retail_npr: 15999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300204, brand: "Xiaomi", model: "Redmi 15C (4+128GB)",        retail_npr: 19999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300205, brand: "Xiaomi", model: "Redmi 15C (6+128GB)",        retail_npr: 21999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300206, brand: "Xiaomi", model: "Redmi 15C (8+256GB)",        retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300207, brand: "Xiaomi", model: "Redmi 15 (6+128GB)",         retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300208, brand: "Xiaomi", model: "Redmi 15 (8+256GB)",         retail_npr: 27999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300209, brand: "Xiaomi", model: "Redmi Note 15 4G (6+128GB)", retail_npr: 33999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300210, brand: "Xiaomi", model: "Redmi Note 15 4G (8+256GB)", retail_npr: 39999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300211, brand: "Xiaomi", model: "Redmi Note 15 5G (8+256GB)", retail_npr: 43999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300212, brand: "Xiaomi", model: "Redmi Note 15 5G (12+512GB)",retail_npr: 49999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300213, brand: "Xiaomi", model: "Redmi Note 15 Pro 5G (8+256GB)", retail_npr: 53999, image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300214, brand: "Xiaomi", model: "Redmi Note 15 Pro 5G (12+512GB)", retail_npr: 59999, image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300215, brand: "Xiaomi", model: "Redmi Note 15 Pro+ (8+256GB)", retail_npr: 63999, image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300216, brand: "Xiaomi", model: "Redmi Note 15 Pro+ (12+512GB)", retail_npr: 69999, image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300217, brand: "Xiaomi", model: "Xiaomi 17 Ultra (16+512GB)", retail_npr: 199999, image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },

  // ── POCO ──
  { id: 300301, brand: "POCO", model: "POCO X7 Pro (12/512GB)",       retail_npr: 59999,  image: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg" },
  { id: 300302, brand: "POCO", model: "POCO X8 Pro (8/256GB)",        retail_npr: 63999,  image: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg" },
  { id: 300303, brand: "POCO", model: "POCO X8 Pro (12/256GB)",       retail_npr: 73999,  image: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg" },
  { id: 300304, brand: "POCO", model: "POCO F7 (12/512GB)",           retail_npr: 69999,  image: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg" },
  { id: 300305, brand: "POCO", model: "POCO X8 Pro Max (12/256GB)",   retail_npr: 79999,  image: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg" },
  { id: 300306, brand: "POCO", model: "POCO X8 Pro Max (12/512GB)",   retail_npr: 89999,  image: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg" },
  { id: 300307, brand: "POCO", model: "POCO F8 Pro (12/512GB)",       retail_npr: 99999,  image: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg" },

  // ── HONOR ──
  { id: 300401, brand: "Honor", model: "Honor Play10 (3+64GB)",       retail_npr: 12499,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300402, brand: "Honor", model: "Honor Play10 (4+128GB)",      retail_npr: 14999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300403, brand: "Honor", model: "Honor X5c (4+64GB)",           retail_npr: 15999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300404, brand: "Honor", model: "Honor X5c Plus (4+128GB)",    retail_npr: 17999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300405, brand: "Honor", model: "Honor X6c (6+128GB)",         retail_npr: 19999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300406, brand: "Honor", model: "Honor X6c (6+256GB)",         retail_npr: 21999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300407, brand: "Honor", model: "Honor X7d (8+256GB)",         retail_npr: 30999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300408, brand: "Honor", model: "Honor X7d (8+512GB)",         retail_npr: 32999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300410, brand: "Honor", model: "Honor X8d (8+128GB)",         retail_npr: 39999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300411, brand: "Honor", model: "Honor X8d (8+256GB)",         retail_npr: 43999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300412, brand: "Honor", model: "Honor X9d (8+256GB)",         retail_npr: 54999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300413, brand: "Honor", model: "Honor X9d (12+256GB)",        retail_npr: 59999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300414, brand: "Honor", model: "Honor 600 Lite (8+256GB)",    retail_npr: 59999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300415, brand: "Honor", model: "Honor 600 (12+256GB)",        retail_npr: 67999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300416, brand: "Honor", model: "Honor 600 Pro (12+512GB)",    retail_npr: 88480,  image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300417, brand: "Honor", model: "Honor Magic 8 Pro (12+512GB)",retail_npr: 199999, image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },
  { id: 300418, brand: "Honor", model: "Honor Magic V5 (16+512GB)",   retail_npr: 266999, image: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg" },

  // ── VIVO ──
  { id: 300503, brand: "Vivo", model: "Vivo Y05 (4+64GB)",            retail_npr: 16999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300504, brand: "Vivo", model: "Vivo Y05 (4+128GB)",           retail_npr: 19499,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300508, brand: "Vivo", model: "Vivo Y11d (4+128GB)",          retail_npr: 21499,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300509, brand: "Vivo", model: "Vivo Y11d (6+128GB)",          retail_npr: 26999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300514, brand: "Vivo", model: "Vivo Y31d (6+128GB)",          retail_npr: 29499,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300515, brand: "Vivo", model: "Vivo Y31d (8+128GB)",          retail_npr: 33999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300516, brand: "Vivo", model: "Vivo Y31d (8+256GB)",          retail_npr: 38999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300529, brand: "Vivo", model: "Vivo Y21 5G (6+128GB)",        retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300519, brand: "Vivo", model: "Vivo V60 Lite 4G (8+256GB)",   retail_npr: 43499,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300521, brand: "Vivo", model: "Vivo V60 Lite 5G (12+256GB)",  retail_npr: 51999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300530, brand: "Vivo", model: "Vivo V70 FE (8+256GB)",        retail_npr: 59999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300523, brand: "Vivo", model: "Vivo V60 5G (12+256GB)",       retail_npr: 74999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300524, brand: "Vivo", model: "Vivo V60 5G (12+512GB)",       retail_npr: 79999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300525, brand: "Vivo", model: "Vivo V70 5G (12+256GB)",       retail_npr: 83999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300526, brand: "Vivo", model: "Vivo V70 5G (12+512GB)",       retail_npr: 94999,  image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  { id: 300528, brand: "Vivo", model: "Vivo X300 Pro (16+512GB)",     retail_npr: 179999, image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },

  // ── NOTHING ──
  { id: 300603, brand: "Nothing", model: "CMF Phone 2 Pro (8+128GB)", retail_npr: 38999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300604, brand: "Nothing", model: "CMF Phone 2 Pro (8+256GB)", retail_npr: 44999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300605, brand: "Nothing", model: "Nothing Phone (3a) Lite (8+128GB)", retail_npr: 38999, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300606, brand: "Nothing", model: "Nothing Phone (3a) Lite (8+256GB)", retail_npr: 44499, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300609, brand: "Nothing", model: "Nothing Phone (2a) Plus (8+256GB)", retail_npr: 49999, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300610, brand: "Nothing", model: "Nothing Phone (2a) Plus (12+256GB)", retail_npr: 53999, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300614, brand: "Nothing", model: "Nothing Phone (4a) (8+128GB)", retail_npr: 58499, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300615, brand: "Nothing", model: "Nothing Phone (4a) (8+256GB)", retail_npr: 63999, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300616, brand: "Nothing", model: "Nothing Phone (4a) (12+256GB)", retail_npr: 69999, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300619, brand: "Nothing", model: "Nothing Phone (4a) Pro (12+256GB)", retail_npr: 86999, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300620, brand: "Nothing", model: "Nothing Phone (3) (12+256GB)",    retail_npr: 99999, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },
  { id: 300621, brand: "Nothing", model: "Nothing Phone (3) (16+512GB)",    retail_npr: 114999, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png" },

  // ── ONEPLUS ──
  { id: 300701, brand: "OnePlus", model: "OnePlus Nord CE 5 (8+256GB)", retail_npr: 53999,  image: "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg" },
  { id: 300702, brand: "OnePlus", model: "OnePlus Nord 5 (8+256GB)",     retail_npr: 73999,  image: "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg" },
  { id: 300703, brand: "OnePlus", model: "OnePlus Nord 5 (12+512GB)",    retail_npr: 79999,  image: "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg" },
  { id: 300704, brand: "OnePlus", model: "OnePlus 13R (12+256GB)",       retail_npr: 83999,  image: "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg" },
  { id: 300705, brand: "OnePlus", model: "OnePlus 15R (12+256GB)",       retail_npr: 98499,  image: "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg" },
  { id: 300706, brand: "OnePlus", model: "OnePlus 15R (12+512GB)",       retail_npr: 106999, image: "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg" },
  { id: 300709, brand: "OnePlus", model: "OnePlus 15 (16+512GB)",        retail_npr: 169999, image: "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg" },

  // ── REALME ──
  { id: 300801, brand: "Realme", model: "Note 60x (4/64GB)",             retail_npr: 13999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300802, brand: "Realme", model: "Note 70 (4/64GB)",              retail_npr: 15499,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300803, brand: "Realme", model: "Note 70 (4/128GB)",             retail_npr: 20999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300804, brand: "Realme", model: "Realme C71 (4/128GB)",          retail_npr: 20999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300805, brand: "Realme", model: "Realme C71 (6/128GB)",          retail_npr: 25999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300806, brand: "Realme", model: "Realme C75 (8/128GB)",          retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300807, brand: "Realme", model: "Realme C75 (8/256GB)",          retail_npr: 26999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300816, brand: "Realme", model: "Realme C85 (6/128GB)",           retail_npr: 22999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300817, brand: "Realme", model: "Realme C85 (8/256GB)",           retail_npr: 27999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300818, brand: "Realme", model: "Realme C85 Pro (8/256GB)",       retail_npr: 32999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300808, brand: "Realme", model: "Realme 14T (8/256GB)",          retail_npr: 36999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300809, brand: "Realme", model: "Realme 15T (8/256GB)",          retail_npr: 39999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300810, brand: "Realme", model: "Realme 15T (12/512GB)",         retail_npr: 49999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300811, brand: "Realme", model: "Realme 14 (12/256GB)",          retail_npr: 49999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300812, brand: "Realme", model: "Realme 15 Pro (12/256GB)",      retail_npr: 66999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300813, brand: "Realme", model: "Realme 15 Pro (12/512GB)",      retail_npr: 71999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300814, brand: "Realme", model: "Realme GT8 Pro (16/512GB)",     retail_npr: 149999, image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },
  { id: 300815, brand: "Realme", model: "Realme GT8 Pro Aston Martin (16/512GB)", retail_npr: 159999, image: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg" },

  // ── OPPO ──
  { id: 300901, brand: "OPPO", model: "OPPO A5x 4G (4/64GB)",            retail_npr: 16999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300902, brand: "OPPO", model: "OPPO A5x 4G (4/128GB)",           retail_npr: 19499,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300903, brand: "OPPO", model: "OPPO A5x 4G (6/128GB)",           retail_npr: 21999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300914, brand: "OPPO", model: "OPPO A6c (4/64GB)",              retail_npr: 18999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300915, brand: "OPPO", model: "OPPO A6c (4/128GB)",             retail_npr: 20999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300904, brand: "OPPO", model: "OPPO A5 4G (6/128GB)",            retail_npr: 22999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300905, brand: "OPPO", model: "OPPO A5 4G (8/128GB)",            retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300906, brand: "OPPO", model: "OPPO A5 Pro 4G (8/256GB)",        retail_npr: 32999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300907, brand: "OPPO", model: "OPPO A6X 4G (6/128GB)",           retail_npr: 32499,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300908, brand: "OPPO", model: "OPPO A6 (8/256GB)",               retail_npr: 42499,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300909, brand: "OPPO", model: "OPPO A6 Pro 4G (8/256GB)",        retail_npr: 48999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300910, brand: "OPPO", model: "OPPO Reno 14F (12/512GB)",        retail_npr: 57999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300911, brand: "OPPO", model: "OPPO Reno 15 F (12/512GB)",       retail_npr: 69999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300912, brand: "OPPO", model: "OPPO Reno 15 (12/512GB)",         retail_npr: 89999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },
  { id: 300913, brand: "OPPO", model: "OPPO Find N5 (16/512GB)",         retail_npr: 249999, image: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg" },

  // ── INFINIX ──
  { id: 301101, brand: "Infinix", model: "Infinix Smart 10 (4+64GB)",      retail_npr: 14999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301102, brand: "Infinix", model: "Infinix Smart 10 Plus (4+128GB)", retail_npr: 15999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301103, brand: "Infinix", model: "Infinix Hot 60i (4+128GB)",      retail_npr: 16999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301104, brand: "Infinix", model: "Infinix Hot 60i (6+128GB)",      retail_npr: 18999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301117, brand: "Infinix", model: "Infinix Smart 20 (4+64GB)",      retail_npr: 17999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301118, brand: "Infinix", model: "Infinix Smart 20 (4+128GB)",     retail_npr: 19999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301119, brand: "Infinix", model: "Infinix Hot 70 (6+128GB)",       retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301120, brand: "Infinix", model: "Infinix Hot 70 (8+256GB)",       retail_npr: 29999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301109, brand: "Infinix", model: "Infinix GT 30 Pro (8+256GB)",    retail_npr: 47999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301111, brand: "Infinix", model: "Infinix Note Edge (8+128GB)",    retail_npr: 41999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301112, brand: "Infinix", model: "Infinix Note Edge (8+256GB)",    retail_npr: 47999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301113, brand: "Infinix", model: "Infinix Note 60 (8+128GB)",      retail_npr: 45999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301114, brand: "Infinix", model: "Infinix Note 60 (8+256GB)",      retail_npr: 51999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301115, brand: "Infinix", model: "Infinix Note 60 Pro (8+256GB)",  retail_npr: 59999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },
  { id: 301116, brand: "Infinix", model: "Infinix Note 60 Pro (12+256GB)", retail_npr: 66999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png" },

  // ── MOTOROLA ──
  { id: 301201, brand: "Motorola", model: "Moto G04s (4/64GB)",           retail_npr: 12599,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301202, brand: "Motorola", model: "Moto G05 (4/64GB)",            retail_npr: 13499,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301211, brand: "Motorola", model: "Moto G06 Power (4/128GB)",     retail_npr: 14999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301203, brand: "Motorola", model: "Moto G35 (4/128GB)",           retail_npr: 19999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301204, brand: "Motorola", model: "Moto G45 (8/128GB)",           retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301205, brand: "Motorola", model: "Moto G64 (8/128GB)",           retail_npr: 27499,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301206, brand: "Motorola", model: "Moto G64 (12/256GB)",          retail_npr: 30999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301212, brand: "Motorola", model: "Moto G57 Power (8/128GB)",     retail_npr: 32999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301207, brand: "Motorola", model: "Moto G85 (8/128GB)",           retail_npr: 34499,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301208, brand: "Motorola", model: "Moto G85 (12/256GB)",          retail_npr: 37499,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301209, brand: "Motorola", model: "Moto G96 (8/256GB)",           retail_npr: 44999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },
  { id: 301210, brand: "Motorola", model: "Moto Edge 50 Fusion (12/256GB)",retail_npr: 46999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg" },

  // ── ZTE / NUBIA ──
  { id: 301301, brand: "ZTE", model: "Blade A35e (2/64GB)",               retail_npr: 10499,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301302, brand: "ZTE", model: "Blade A55 (4/64GB)",                retail_npr: 11999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301303, brand: "ZTE", model: "Blade A55 (4/128GB)",               retail_npr: 12999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301304, brand: "ZTE", model: "Blade A75 (4/256GB)",               retail_npr: 13999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301305, brand: "ZTE", model: "Nubia A36 (4/64GB)",                retail_npr: 15999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301306, brand: "ZTE", model: "Nubia A56 (4/128GB)",               retail_npr: 16999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301307, brand: "ZTE", model: "Nubia V70 Max (6/128GB)",           retail_npr: 15999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301308, brand: "ZTE", model: "Nubia V70 (8/128GB)",               retail_npr: 16999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301309, brand: "ZTE", model: "Nubia V70 (8/256GB)",               retail_npr: 18999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301310, brand: "ZTE", model: "Nubia V80 Max (8/128GB)",           retail_npr: 23999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301311, brand: "ZTE", model: "Nubia V80 Max (8/256GB)",           retail_npr: 26999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301312, brand: "ZTE", model: "Nubia V80 Design (8/128GB)",        retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301313, brand: "ZTE", model: "Nubia V80 Design (8/256GB)",        retail_npr: 27999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301314, brand: "ZTE", model: "Nubia Air (8/256GB)",               retail_npr: 33999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301315, brand: "ZTE", model: "Nubia Neo 3 GT (12/256GB)",         retail_npr: 36999,  image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },
  { id: 301316, brand: "ZTE", model: "RedMagic 11 Pro (16/512GB)",       retail_npr: 164999, image: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg" },

  // ── TECNO ──
  { id: 301501, brand: "Tecno", model: "Spark Go 2 (3+64GB)",             retail_npr: 11499,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301502, brand: "Tecno", model: "Spark Go 2 (4+64GB)",             retail_npr: 13499,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301503, brand: "Tecno", model: "Spark Go 2 (4+128GB)",            retail_npr: 14499,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301504, brand: "Tecno", model: "Spark Go 3 (4+64GB)",             retail_npr: 15999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301505, brand: "Tecno", model: "Spark Go 3 (4+128GB)",            retail_npr: 16999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301506, brand: "Tecno", model: "Spark 30C (6+128GB)",             retail_npr: 16490,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301507, brand: "Tecno", model: "Spark 30C (8+256GB)",             retail_npr: 19990,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301508, brand: "Tecno", model: "Spark 30 (8+256GB)",              retail_npr: 22490,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301509, brand: "Tecno", model: "Spark 40 (6+128GB)",              retail_npr: 18999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301510, brand: "Tecno", model: "Spark 40 (8+256GB)",              retail_npr: 24999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301514, brand: "Tecno", model: "Spark 50 (8+256GB)",              retail_npr: 28999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301515, brand: "Tecno", model: "Spark 50 (12+256GB)",             retail_npr: 33999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301511, brand: "Tecno", model: "Spark 40 Pro (8+256GB)",          retail_npr: 31799,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301512, brand: "Tecno", model: "Pova 6 (12+256GB)",               retail_npr: 34990,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },
  { id: 301513, brand: "Tecno", model: "Pova Curve 2 5G (8+256GB)",       retail_npr: 47999,  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png" },

  // ── GOOGLE PIXEL ──
  { id: 301901, brand: "Google", model: "Pixel 8a (8+128GB)",            retail_npr: 82999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { id: 301902, brand: "Google", model: "Pixel 8a (8+256GB)",            retail_npr: 92999,  image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { id: 301903, brand: "Google", model: "Pixel 9 (12+128GB)",            retail_npr: 139999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { id: 301904, brand: "Google", model: "Pixel 9 (12+256GB)",            retail_npr: 154999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { id: 301905, brand: "Google", model: "Pixel 9 Pro (16+256GB)",        retail_npr: 209999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { id: 301906, brand: "Google", model: "Pixel 9 Pro (16+512GB)",        retail_npr: 229999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { id: 301907, brand: "Google", model: "Pixel 9 Pro XL (16+256GB)",     retail_npr: 239999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { id: 301908, brand: "Google", model: "Pixel 9 Pro XL (16+512GB)",     retail_npr: 259999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { id: 301909, brand: "Google", model: "Pixel 9 Pro Fold (16+512GB)",   retail_npr: 299999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },

  // ── NOKIA ──
  { id: 302001, brand: "Nokia", model: "Nokia C12 (2+64GB)",             retail_npr: 11499,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },
  { id: 302002, brand: "Nokia", model: "Nokia C32 (4+64GB)",             retail_npr: 15499,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },
  { id: 302003, brand: "Nokia", model: "Nokia C32 (4+128GB)",            retail_npr: 17499,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },
  { id: 302004, brand: "Nokia", model: "Nokia G22 (4+64GB)",             retail_npr: 18999,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },
  { id: 302005, brand: "Nokia", model: "Nokia G22 (4+128GB)",            retail_npr: 21499,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },
  { id: 302006, brand: "Nokia", model: "Nokia G42 5G (6+128GB)",         retail_npr: 29999,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },
  { id: 302007, brand: "Nokia", model: "Nokia X30 5G (8+128GB)",         retail_npr: 49999,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },
  { id: 302008, brand: "Nokia", model: "Nokia XR21 (6+128GB)",           retail_npr: 54999,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },
  { id: 302009, brand: "Nokia", model: "Nokia G400 5G (4+64GB)",         retail_npr: 27999,  image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg" },

  // ── HUAWEI ──
  { id: 302101, brand: "Huawei", model: "Huawei Nova 12 (8+256GB)",      retail_npr: 74999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Huawei_logo_2018.svg" },
  { id: 302102, brand: "Huawei", model: "Huawei Nova 12 Pro (12+512GB)",  retail_npr: 99999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Huawei_logo_2018.svg" },
  { id: 302103, brand: "Huawei", model: "Huawei P60 Pro (12+512GB)",      retail_npr: 189999, image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Huawei_logo_2018.svg" },
  { id: 302104, brand: "Huawei", model: "Huawei Pura 70 Ultra (16+512GB)", retail_npr: 249999, image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Huawei_logo_2018.svg" },
  { id: 302105, brand: "Huawei", model: "Huawei Mate 60 Pro (12+512GB)",   retail_npr: 229999, image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Huawei_logo_2018.svg" },
  { id: 302106, brand: "Huawei", model: "Huawei Mate X5 (16+512GB)",       retail_npr: 289999, image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Huawei_logo_2018.svg" },
  { id: 302107, brand: "Huawei", model: "Huawei Pocket 2 (12+512GB)",      retail_npr: 179999, image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Huawei_logo_2018.svg" },

  // ── SONY XPERIA ──
  { id: 302201, brand: "Sony", model: "Xperia 10 VI (8+128GB)",           retail_npr: 52999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Sony_Logo_2022.svg" },
  { id: 302202, brand: "Sony", model: "Xperia 10 VI (8+256GB)",           retail_npr: 62999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Sony_Logo_2022.svg" },
  { id: 302203, brand: "Sony", model: "Xperia 5 V (8+256GB)",             retail_npr: 89999,  image: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Sony_Logo_2022.svg" },
  { id: 302204, brand: "Sony", model: "Xperia 1 VI (12+256GB)",           retail_npr: 179999, image: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Sony_Logo_2022.svg" },
  { id: 302205, brand: "Sony", model: "Xperia 1 VI (12+512GB)",           retail_npr: 199999, image: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Sony_Logo_2022.svg" },
  { id: 302206, brand: "Sony", model: "Xperia Pro-I (12+512GB)",          retail_npr: 249999, image: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Sony_Logo_2022.svg" },

  // ── ASUS ──
  { id: 302301, brand: "Asus", model: "Zenfone 11 Ultra (16+512GB)",      retail_npr: 129999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Asus_Logo.svg" },
  { id: 302302, brand: "Asus", model: "ROG Phone 8 (12+256GB)",           retail_npr: 159999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Asus_Logo.svg" },
  { id: 302303, brand: "Asus", model: "ROG Phone 8 (16+512GB)",           retail_npr: 179999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Asus_Logo.svg" },
  { id: 302304, brand: "Asus", model: "ROG Phone 8 Pro (16+512GB)",       retail_npr: 209999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Asus_Logo.svg" },
  { id: 302305, brand: "Asus", model: "ROG Phone 8 Pro (24+1TB)",         retail_npr: 249999, image: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Asus_Logo.svg" },

  // ── LENOVO ──
  { id: 302401, brand: "Lenovo", model: "ThinkPhone (8+256GB)",            retail_npr: 89999,  image: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Lenovo_logo_2015.svg" },
  { id: 302402, brand: "Lenovo", model: "Legion Y70 (12+256GB)",          retail_npr: 109999, image: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Lenovo_logo_2015.svg" },
  { id: 302403, brand: "Lenovo", model: "Legion Phone Duel 2 (16+512GB)",  retail_npr: 149999, image: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Lenovo_logo_2015.svg" },

  // ── XIAOMI (add missing models) ──
  { id: 300218, brand: "Xiaomi", model: "Redmi A7 Pro (4+128GB)",         retail_npr: 18999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300219, brand: "Xiaomi", model: "Xiaomi 17T (8+256GB)",            retail_npr: 79999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
  { id: 300220, brand: "Xiaomi", model: "Xiaomi 17T (12+512GB)",           retail_npr: 89999,  image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg" },
];

const normalizeCatalogKey = (brand: string, model: string) => {
  const normalizedBrand = brand.trim().toLowerCase();
  const normalizedModel = model
    .trim()
    .toLowerCase()
    .replace(new RegExp(`^${normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`), "")
    .replace(/\s*(?:\+|\/)\s*/g, "+")
    .replace(/\s+/g, " ");

  return `${normalizedBrand}:${normalizedModel}`;
};

const baseByBrand = new Map(
  BASE_PRODUCTS.map((product) => [product.brand.toLowerCase(), product]),
);
const latestKeys = new Set(
  LATEST_MOBILE_BUYING_PRICES.map((product) => normalizeCatalogKey(product.brand, product.model)),
);

const latestProducts: ProductData[] = LATEST_MOBILE_BUYING_PRICES.map((product, index) => ({
  id: 400000 + index,
  brand: product.brand,
  model: product.model,
  retail_npr: product.price,
  image: baseByBrand.get(product.brand.toLowerCase())?.image ?? "",
}));

// Put the supplied list first so current variants and prices win in offline
// valuation, while retaining older devices that are not part of this update.
export const PRODUCTS: ProductData[] = [
  ...latestProducts,
  ...BASE_PRODUCTS.filter(
    (product) => !latestKeys.has(normalizeCatalogKey(product.brand, product.model)),
  ),
];

export function estimateDevicePrice(device: ProductData, condition: string, defects: string[] = []): number {
  let basePrice = device.retail_npr || 20000;
  
  // Apply condition multiplier
  const conditionMultipliers: Record<string, number> = {
    "Excellent": 0.85,
    "Good": 0.70,
    "Average": 0.55,
    "Poor": 0.40
  };
  
  basePrice = basePrice * (conditionMultipliers[condition] || 0.70);
  
  // Deduct for defects
  const defectDeductions: Record<string, number> = {
    "Screen Crack": 5000,
    "Battery Issues": 3000,
    "Camera Issues": 4000,
    "Buttons Issues": 1500,
    "No Box/Charger": 2000
  };
  
  defects.forEach(defect => {
    basePrice -= (defectDeductions[defect] || 1000);
  });
  
  return Math.max(1000, Math.round(basePrice));
}
