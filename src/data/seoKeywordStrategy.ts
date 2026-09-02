export type SeoKeywordCluster = {
  id: string;
  name: string;
  intent: "local" | "price" | "category" | "comparison" | "support";
  priority: "High" | "Medium" | "Low";
  targetPath: string;
  primaryKeyword: string;
  keywords: string[];
  contentAngle: string;
  titleTemplate: string;
  metaDescription: string;
  articleIdeas: Array<{
    title: string;
    slug: string;
    category: "price" | "guide" | "comparison" | "news";
    brief: string;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  internalLinks: Array<{ label: string; href: string }>;
};

export const mobilePriceFaqs = [
  {
    question: "Where can I check the latest mobile price in Nepal?",
    answer:
      "You can check updated mobile prices, specs, variants, and verified store offers on Tamrakar Complex mobile price pages. Prices should be rechecked with the store before purchase because offers and stock can change.",
  },
  {
    question: "Which phone brands are listed for Nepal buyers?",
    answer:
      "Tamrakar Complex covers popular brands such as Apple, Samsung, Xiaomi, Redmi, OnePlus, Realme, Vivo, Oppo, Nothing, Honor, and other phones available through Nepal retailers.",
  },
  {
    question: "Can I find phones by budget in Nepal?",
    answer:
      "Yes. Buyers can compare phones under common budget ranges such as Rs. 10,000, Rs. 15,000, Rs. 20,000, Rs. 25,000, Rs. 30,000, and higher flagship ranges.",
  },
  {
    question: "Do listed prices include EMI or installment options?",
    answer:
      "Product pages can show cash price, store offers, and EMI plans when a verified store or admin has added those purchase details.",
  },
];

export const seoKeywordClusters: SeoKeywordCluster[] = [
  {
    id: "mobile-price-nepal",
    name: "Mobile Price Nepal",
    intent: "price",
    priority: "High",
    targetPath: "/cat/mobiles",
    primaryKeyword: "mobile price in Nepal",
    keywords: [
      "mobile price in Nepal",
      "mobile price in Nepal 2026",
      "latest mobile price in Nepal",
      "mobile price list in Nepal",
      "all mobile price in Nepal",
      "mobile phone price in Nepal",
      "price of mobile in Nepal",
    ],
    contentAngle:
      "Keep this as the main evergreen price hub with updated prices, brand links, budget links, EMI notes, and FAQ schema.",
    titleTemplate: "Mobile Price in Nepal 2026 | Latest Phone Price List",
    metaDescription:
      "Compare latest mobile price in Nepal by brand, budget, specs, stock, store offers, and EMI options from verified Tamrakar Complex sellers.",
    articleIdeas: [
      {
        title: "Mobile Price in Nepal 2026: Latest Price List by Brand and Budget",
        slug: "mobile-price-in-nepal-2026",
        category: "price",
        brief:
          "Pillar article with brand sections, budget table, buying tips, EMI explanation, warranty notes, and links to phone detail pages.",
      },
      {
        title: "Best Mobile Phones Under Rs. 30,000 in Nepal",
        slug: "best-mobile-phones-under-30000-nepal",
        category: "guide",
        brief:
          "Rank phones by display, camera, battery, processor, software support, and store availability. Link each phone to its product/model page.",
      },
    ],
    faqs: mobilePriceFaqs,
    internalLinks: [
      { label: "Mobile price hub", href: "/cat/mobiles" },
      { label: "Buy smartphones", href: "/cat/mobiles?tab=buy&category=Smartphones" },
      { label: "Verified stores", href: "/stores" },
    ],
  },
  {
    id: "tamrakar-complex-local",
    name: "Tamrakar Complex Local",
    intent: "local",
    priority: "High",
    targetPath: "/stores",
    primaryKeyword: "Tamrakar Complex",
    keywords: [
      "Tamrakar Complex",
      "Tamrakar Complex New Road",
      "Tamrakar Complex location",
      "Tamrakar Complex map",
      "Tamrakar Complex address",
      "Tamrakar Complex phone number",
      "mobile shops in Tamrakar Complex",
    ],
    contentAngle:
      "Build trust for local search with address, map, store directory, opening hours, contact options, photos, and store-level pages.",
    titleTemplate: "Tamrakar Complex New Road | Mobile Shops, Map and Store Directory",
    metaDescription:
      "Find Tamrakar Complex New Road location, mobile shops, store contacts, opening hours, maps, repair services, and electronics offers.",
    articleIdeas: [
      {
        title: "Tamrakar Complex New Road: Mobile Shops, Location, Map and Buying Guide",
        slug: "tamrakar-complex-new-road-mobile-shops-location-map",
        category: "guide",
        brief:
          "Local evergreen guide covering where it is, how to reach, what to buy, store verification, repair, EMI, and buyer safety tips.",
      },
      {
        title: "Best Mobile Shops in Tamrakar Complex for Phones, Repairs and Accessories",
        slug: "best-mobile-shops-tamrakar-complex",
        category: "guide",
        brief:
          "Directory-led article that links to verified store profiles, explains services, and avoids unverified claims.",
      },
    ],
    faqs: [
      {
        question: "Where is Tamrakar Complex located?",
        answer:
          "Tamrakar Complex is known as a mobile and electronics market around New Road, Kathmandu. Store profile pages should show exact contact details and map links for each verified shop.",
      },
      {
        question: "What can I buy at Tamrakar Complex?",
        answer:
          "Buyers commonly look for mobile phones, laptops, tablets, accessories, repair services, exchange options, and store offers.",
      },
      {
        question: "How should I choose a store inside Tamrakar Complex?",
        answer:
          "Compare verified store profiles, warranty terms, price, stock, EMI availability, ratings, and after-sales service before buying.",
      },
    ],
    internalLinks: [
      { label: "Store directory", href: "/stores" },
      { label: "Mobile prices", href: "/cat/mobiles" },
      { label: "Repair services", href: "/repair" },
    ],
  },
  {
    id: "budget-mobile-nepal",
    name: "Budget Phone Searches",
    intent: "category",
    priority: "High",
    targetPath: "/cat/mobiles?tab=buy&category=Smartphones",
    primaryKeyword: "mobile price in Nepal under 30000",
    keywords: [
      "mobile price in Nepal under 10000",
      "mobile price in Nepal under 15000",
      "mobile price in Nepal under 20000",
      "mobile price in Nepal under 25000",
      "mobile price in Nepal under 30000",
      "best mobile price in Nepal",
      "5G mobile price in Nepal",
    ],
    contentAngle:
      "Create budget pages and articles with comparison tables, pros/cons, buying advice, and current store availability.",
    titleTemplate: "Best Mobile Phones Under Rs. {budget} in Nepal",
    metaDescription:
      "Compare best phones under Rs. {budget} in Nepal by performance, camera, battery, display, warranty, store stock, and EMI options.",
    articleIdeas: [
      {
        title: "Best Phones Under Rs. 20,000 in Nepal",
        slug: "best-phones-under-20000-nepal",
        category: "guide",
        brief:
          "Budget guide for entry buyers with minimum RAM/storage, battery, repair support, and value picks.",
      },
      {
        title: "Best 5G Phones in Nepal by Budget",
        slug: "best-5g-phones-nepal-by-budget",
        category: "guide",
        brief:
          "Organize 5G phones by price bracket and explain bands, performance, battery, warranty, and long-term software support.",
      },
    ],
    faqs: [
      {
        question: "Which budget phone is best in Nepal?",
        answer:
          "The best budget phone depends on camera, battery, gaming, software updates, and after-sales support. Compare phones by price bracket instead of choosing by brand alone.",
      },
      {
        question: "Are 5G phones worth buying in Nepal?",
        answer:
          "A 5G phone can be worth buying if it also has strong battery life, performance, display quality, and software support in your budget.",
      },
    ],
    internalLinks: [
      { label: "Smartphones", href: "/cat/mobiles?tab=buy&category=Smartphones" },
      { label: "EMI plans", href: "/cat/mobiles" },
      { label: "Sell your phone", href: "/sell-your-phone" },
    ],
  },
  {
    id: "iphone-price-nepal",
    name: "iPhone Price and Buying Nepal",
    intent: "price",
    priority: "High",
    targetPath: "/cat/mobiles/apple",
    primaryKeyword: "iPhone Nepal price",
    keywords: [
      "iPhone Nepal",
      "iPhone Nepal price",
      "buy iPhone in Nepal",
      "iPhone Nepal price list",
      "iPhone Nepal best price",
      "cheapest iPhone in Nepal",
      "iPhone Nepal availability",
      "iPhone Nepal exchange offer",
      "iPhone Nepal warranty",
      "iPhone Nepal installment plan",
    ],
    contentAngle:
      "Build an Apple/iPhone price hub with model-wise prices, variants, warranty notes, EMI/installment options, exchange value, and verified store offers.",
    titleTemplate: "iPhone Price in Nepal 2026 | Buy Apple iPhone from Verified Stores",
    metaDescription:
      "Check iPhone price in Nepal, Apple model availability, storage variants, warranty, exchange offers, EMI plans, and verified Tamrakar Complex store deals.",
    articleIdeas: [
      {
        title: "iPhone Price in Nepal 2026: Latest Apple iPhone Price List",
        slug: "iphone-price-in-nepal-2026",
        category: "price",
        brief:
          "Evergreen Apple price post with model-wise table, storage variants, warranty, availability, exchange, and links to each iPhone detail page.",
      },
      {
        title: "How to Buy an iPhone in Nepal: Warranty, PTA/MDMS, EMI and Exchange Checklist",
        slug: "how-to-buy-iphone-in-nepal-warranty-emi-exchange",
        category: "guide",
        brief:
          "Buying guide covering invoice, warranty, genuine accessories, MDMS/registration checks, EMI cost, exchange valuation, and store confirmation.",
      },
    ],
    faqs: [
      {
        question: "Where can I buy an iPhone in Nepal?",
        answer:
          "You can compare iPhone prices and contact verified stores through Tamrakar Complex before visiting or placing an order. Always confirm storage variant, warranty, and final invoice price.",
      },
      {
        question: "Do iPhones in Nepal have warranty?",
        answer:
          "Warranty depends on the seller and model source. Ask the store for invoice, warranty duration, activation status, and service terms before buying.",
      },
      {
        question: "Can I buy an iPhone on EMI in Nepal?",
        answer:
          "Some stores can offer EMI or installment options when configured in the product page. Check down payment, tenure, processing fee, and final payable amount.",
      },
    ],
    internalLinks: [
      { label: "Apple phones", href: "/cat/mobiles/apple" },
      { label: "Mobile price hub", href: "/cat/mobiles" },
      { label: "Verified stores", href: "/stores" },
      { label: "Exchange phone", href: "/sell-your-phone" },
    ],
  },
  {
    id: "apple-iphone-comparison-nepal",
    name: "Apple iPhone Comparison Nepal",
    intent: "comparison",
    priority: "High",
    targetPath: "/cat/mobiles/apple",
    primaryKeyword: "Apple iPhone comparison",
    keywords: [
      "Apple iPhone Nepal",
      "Apple iPhone comparison",
      "Apple iPhone near me",
      "Apple iPhone Nepal price",
      "Apple iPhone Nepal availability",
      "Apple iPhone Nepal buying guide",
      "Apple iPhone Nepal specs",
      "Apple iPhone Nepal warranty check",
      "Apple phone in Nepal",
    ],
    contentAngle:
      "Create comparison content that helps buyers choose between iPhone models by camera, chipset, battery, display, storage, warranty, and resale value.",
    titleTemplate: "Apple iPhone Comparison in Nepal | Which iPhone Should You Buy?",
    metaDescription:
      "Compare Apple iPhone models in Nepal by price, specs, camera, battery, storage, warranty, availability, and verified local store offers.",
    articleIdeas: [
      {
        title: "Apple iPhone Comparison in Nepal: Which iPhone Should You Buy?",
        slug: "apple-iphone-comparison-nepal",
        category: "comparison",
        brief:
          "Model comparison guide with use-case recommendations for camera, gaming, battery, compact size, long updates, and value resale.",
      },
      {
        title: "New vs Refurbished iPhone in Nepal: Price, Warranty and Risk Checklist",
        slug: "new-vs-refurbished-iphone-nepal",
        category: "comparison",
        brief:
          "Balanced comparison of new, used, and refurbished iPhones with battery health, parts, activation lock, invoice, and warranty checks.",
      },
    ],
    faqs: [
      {
        question: "Which iPhone is best to buy in Nepal?",
        answer:
          "The best iPhone depends on your budget and priorities. Compare camera, battery, storage, chipset, warranty, and resale value before choosing.",
      },
      {
        question: "Is a refurbished iPhone safe to buy in Nepal?",
        answer:
          "A refurbished iPhone can be safe only when battery health, parts, activation lock, invoice, warranty, and seller reputation are clearly verified.",
      },
    ],
    internalLinks: [
      { label: "Apple phones", href: "/cat/mobiles/apple" },
      { label: "Compare phones", href: "/cat/mobiles" },
      { label: "Tech guides", href: "/stores/article?category=guide" },
    ],
  },
  {
    id: "macbook-price-nepal",
    name: "MacBook Price Nepal",
    intent: "price",
    priority: "High",
    targetPath: "/cat/mobiles?tab=buy&category=Laptops",
    primaryKeyword: "MacBook Nepal price",
    keywords: [
      "MacBook Nepal",
      "MacBook Nepal price",
      "MacBook Air price in Nepal",
      "MacBook Pro price in Nepal",
      "MacBook Air M4 in Nepal",
      "MacBook Nepal availability",
      "MacBook Nepal buy online",
      "MacBook Nepal price list",
      "MacBook Nepal student discount",
      "MacBook Nepal warranty",
      "Apple MacBook Pro 16-inch price in Nepal",
    ],
    contentAngle:
      "Build laptop/MacBook price content with Air vs Pro differences, chip/RAM/storage options, student buying advice, warranty, keyboard, and verified store stock.",
    titleTemplate: "MacBook Price in Nepal 2026 | MacBook Air and Pro Price List",
    metaDescription:
      "Compare MacBook Air and MacBook Pro price in Nepal with M-series chips, RAM, storage, warranty, student offers, and verified store availability.",
    articleIdeas: [
      {
        title: "MacBook Price in Nepal 2026: MacBook Air and Pro Price List",
        slug: "macbook-price-in-nepal-2026",
        category: "price",
        brief:
          "Evergreen MacBook price post with model table, chip/RAM/storage variants, warranty, student notes, and links to laptop product listings.",
      },
      {
        title: "MacBook Air vs MacBook Pro in Nepal: Which One Should Students and Creators Buy?",
        slug: "macbook-air-vs-macbook-pro-nepal",
        category: "comparison",
        brief:
          "Buyer guide comparing Air and Pro for students, office work, coding, design, video editing, battery, ports, and long-term value.",
      },
    ],
    faqs: [
      {
        question: "Where can I check MacBook price in Nepal?",
        answer:
          "Use Tamrakar Complex laptop listings to compare MacBook Air and MacBook Pro prices, then confirm stock, warranty, keyboard, and final invoice with the store.",
      },
      {
        question: "Which MacBook is best for students in Nepal?",
        answer:
          "Most students should compare MacBook Air models first because they balance battery life, portability, and performance. Creators may need MacBook Pro for sustained workloads.",
      },
      {
        question: "Should I check keyboard and warranty before buying a MacBook?",
        answer:
          "Yes. Confirm keyboard layout, charger, battery cycle count for used units, invoice, warranty terms, and service support before purchase.",
      },
    ],
    internalLinks: [
      { label: "Laptop listings", href: "/cat/mobiles?tab=buy&category=Laptops" },
      { label: "Laptop price page", href: "/laptop-price" },
      { label: "Verified stores", href: "/stores" },
    ],
  },
  {
    id: "gadgetbyte-alternative",
    name: "GadgetByte Alternative Intent",
    intent: "comparison",
    priority: "Medium",
    targetPath: "/stores/article?category=comparison",
    primaryKeyword: "GadgetByte Nepal alternative",
    keywords: [
      "GadgetByte Nepal",
      "GadgetByte Nepal laptop",
      "GadgetByte Nepal mobile price",
      "GadgetByte Nepal price list",
      "GadgetByte Nepal review",
      "GadgetByte Nepal contact",
    ],
    contentAngle:
      "Use fair comparison and alternative content only. Do not impersonate another brand or stuff competitor keywords; answer where Tamrakar is different: verified stores, local buying, stock, EMI, repair, and marketplace.",
    titleTemplate: "Tamrakar Complex vs Gadget News Sites: Buying Phones Locally in Nepal",
    metaDescription:
      "Compare Nepal gadget research sites with Tamrakar Complex buying tools for verified stores, live prices, EMI, repair, exchange, and local availability.",
    articleIdeas: [
      {
        title: "Gadget Research vs Local Store Buying in Nepal: How to Check Price, Stock and Warranty",
        slug: "gadget-research-vs-local-store-buying-nepal",
        category: "comparison",
        brief:
          "Balanced article explaining how buyers can use reviews for research and Tamrakar store pages for price, stock, contact, warranty, and EMI confirmation.",
      },
      {
        title: "How to Verify Mobile Price, Warranty and Store Offers in Nepal",
        slug: "verify-mobile-price-warranty-store-offers-nepal",
        category: "guide",
        brief:
          "Practical trust article with checklist, invoice/warranty questions, EMI checks, and warning signs before purchase.",
      },
    ],
    faqs: [
      {
        question: "Should competitor names be used in SEO pages?",
        answer:
          "Use competitor terms only in honest comparison or alternative pages. The page should be balanced, useful, and clearly from Tamrakar Complex.",
      },
      {
        question: "What should a comparison page include?",
        answer:
          "Include transparent criteria such as price freshness, product coverage, store verification, warranty information, EMI availability, and local buying support.",
      },
    ],
    internalLinks: [
      { label: "Tech news", href: "/stores/article" },
      { label: "Mobile prices", href: "/cat/mobiles" },
      { label: "Store directory", href: "/stores" },
    ],
  },
  {
    id: "iphone-store-nepal",
    name: "iPhone Store Nepal",
    intent: "local",
    priority: "High",
    targetPath: "/cat/mobiles/apple",
    primaryKeyword: "iPhone store Nepal",
    keywords: [
      "iPhone store Nepal",
      "iPhone store Nepal price list",
      "iPhone store Nepal contact number",
      "iPhone store Nepal location",
      "iPhone store Nepal Kathmandu",
      "buy iPhone in Nepal",
      "buy iPhone online in Nepal",
      "iPhone price in Nepal",
      "iPhone 16 in Nepal",
      "iPhone 15 pro max price Nepal",
      "Apple store in Nepal",
      "iphone store near me",
      "iphone store near me repair",
      "iphone store nepal online shopping",
      "iphone store nepal address",
    ],
    contentAngle:
      "Position Tamrakar Complex as the authoritative verified iPhone buying destination in Nepal. Cover price, stock, warranty, EMI, repair, and in-store service. Use local schema (address, hours, phone). Never impersonate Apple Inc. — use 'authorized reseller' and 'genuine stock' framing.",
    titleTemplate: "iPhone Store Nepal | Buy Apple iPhone at Tamrakar Complex",
    metaDescription:
      "Shop iPhone in Nepal at Tamrakar Complex. Check iPhone 15, iPhone 16 price in Nepal, availability, EMI plans, genuine warranty, and repair services in Kathmandu.",
    articleIdeas: [
      {
        title: "iPhone Price in Nepal 2026: Complete List with Specs and Where to Buy",
        slug: "iphone-price-nepal-2026",
        category: "price",
        brief:
          "Comprehensive iPhone price list for Nepal covering all models from iPhone 13 to iPhone 16 Pro Max. Include storage variants, color options, EMI plans, and links to buy at Tamrakar Complex stores.",
      },
      {
        title: "How to Buy iPhone in Nepal: Genuine vs Grey Market — What You Need to Know",
        slug: "how-to-buy-iphone-nepal-genuine-vs-grey",
        category: "guide",
        brief:
          "Practical guide explaining warranty differences, IMEI checks, bill verification, and why buying from a verified store at Tamrakar Complex protects buyers.",
      },
      {
        title: "iPhone Repair in Nepal: Screen, Battery, and Water Damage Fix at Tamrakar Complex",
        slug: "iphone-repair-nepal-tamrakar-complex",
        category: "guide",
        brief:
          "Service guide covering screen replacement, battery service, charging port repair, and data recovery with pricing and turnaround times.",
      },
    ],
    faqs: [
      {
        question: "Where can I buy an iPhone in Nepal with genuine warranty?",
        answer:
          "You can buy iPhones with genuine warranty at verified stores inside Tamrakar Complex, New Road, Kathmandu. These stores provide official warranty cards, tax invoice, and after-sales support.",
      },
      {
        question: "What is the iPhone price in Nepal in 2026?",
        answer:
          "iPhone prices in Nepal vary by model and storage. iPhone 15 starts around NPR 130,000 and iPhone 16 Pro Max reaches NPR 230,000+. Check the Tamrakar Complex Apple price page for up-to-date verified pricing.",
      },
      {
        question: "Is there an Apple Store in Nepal?",
        answer:
          "Apple does not operate an official Apple Store in Nepal. However, authorized resellers and verified stores at Tamrakar Complex New Road sell genuine iPhones with warranty and service support.",
      },
      {
        question: "Can I get an iPhone repaired in Nepal?",
        answer:
          "Yes. Tamrakar Complex has experienced technicians for iPhone screen replacement, battery service, software issues, and water damage repair. Walk in or book online.",
      },
    ],
    internalLinks: [
      { label: "Apple iPhone price list", href: "/cat/mobiles/apple" },
      { label: "Phone repair", href: "/repair" },
      { label: "Store directory", href: "/stores" },
      { label: "Sell your phone", href: "/sell-your-phone" },
    ],
  },
  {
    id: "tamrakar-complex-location",
    name: "Tamrakar Complex Local SEO",
    intent: "local",
    priority: "High",
    targetPath: "/stores",
    primaryKeyword: "Tamrakar Complex",
    keywords: [
      "Tamrakar Complex",
      "Tamrakar Complex New Road",
      "Tamrakar Complex Kathmandu",
      "Tamrakar Complex location",
      "Tamrakar Complex map",
      "Tamrakar Complex address",
      "Tamrakar Complex phone number",
      "Tamrakar Complex opening hours",
      "Tamrakar Complex mobile shop",
      "Gizmo store Tamrakar Complex",
      "electronics market Kathmandu New Road",
      "mobile shopping complex Nepal",
    ],
    contentAngle:
      "Local SEO hub for Tamrakar Complex. Optimize for Google Maps, near-me searches, and voice queries. Include full NAP (Name, Address, Phone), opening hours, map embed link, and list of store categories. Use LocalBusiness schema with GeoCoordinates.",
    titleTemplate: "Tamrakar Complex New Road Kathmandu | Mobile and Electronics Hub Nepal",
    metaDescription:
      "Tamrakar Complex at New Road, Kathmandu is Nepal's leading mobile and electronics marketplace. Find verified stores, iPhone, Samsung, laptops, repair shops, and more.",
    articleIdeas: [
      {
        title: "Tamrakar Complex New Road: The Complete Guide to Nepal's Mobile Hub",
        slug: "tamrakar-complex-new-road-guide",
        category: "guide",
        brief:
          "Location guide with floor map, store categories, brands available, parking, hours, and contact details. Target near-me and location-based queries.",
      },
      {
        title: "Best Mobile Shops at Tamrakar Complex Kathmandu: Where to Buy, Repair, and Sell",
        slug: "best-mobile-shops-tamrakar-complex-kathmandu",
        category: "guide",
        brief:
          "Curated guide to the top verified stores at Tamrakar Complex by category: Apple, Samsung, repair, budget phones, laptop, and accessories.",
      },
    ],
    faqs: [
      {
        question: "Where is Tamrakar Complex located?",
        answer:
          "Tamrakar Complex is located at New Road, Kathmandu, Nepal — the central electronics and mobile shopping hub of the city. It is easily accessible by public transport and is a 10-minute walk from Ratna Park.",
      },
      {
        question: "What are Tamrakar Complex opening hours?",
        answer:
          "Most stores at Tamrakar Complex open from 10:00 AM to 7:00 PM, Sunday through Friday. Hours may vary by store and during festivals.",
      },
      {
        question: "What can I buy at Tamrakar Complex?",
        answer:
          "Tamrakar Complex has stores selling mobile phones, iPhones, Samsung, laptops, tablets, accessories, smartwatches, repair parts, and second-hand gadgets.",
      },
    ],
    internalLinks: [
      { label: "Browse stores", href: "/stores" },
      { label: "Mobile prices", href: "/cat/mobiles" },
      { label: "Repair hub", href: "/repair" },
    ],
  },
  {
    id: "gadgetsbyte-nepal-traffic",
    name: "GadgetsByte Nepal — Research Traffic",
    intent: "comparison",
    priority: "Medium",
    targetPath: "/stores/article",
    primaryKeyword: "GadgetsByte Nepal",
    keywords: [
      "GadgetsByte Nepal",
      "gadgetbyte nepal",
      "gadgetbyte nepal mobile price",
      "gadgetbyte nepal laptop",
      "gadgetbyte nepal price list",
      "gadgetbyte nepal contact number",
      "gadgetbyte nepal location",
      "gadgetbyte nepal review",
      "gadgetsbyte nepal latest news",
      "gadgetsbyte nepal mobile phones",
      "gadgetsbyte nepal ipad",
      "gadgetsbyte nepal 4k tv",
    ],
    contentAngle:
      "Attract readers who research on gadget news sites but need a local buying destination. Publish honest tech reviews, price comparisons, and buying guides. Never copy or imitate GadgetsByte content. Differentiate on verified store stock, EMI, local warranty, and physical buying support at Tamrakar Complex.",
    titleTemplate: "Tech News and Mobile Price Updates from Tamrakar Complex Nepal",
    metaDescription:
      "Latest mobile price updates, gadget reviews, buying guides, and tech news from Tamrakar Complex Nepal. Verified prices, local store stock, and EMI options included.",
    articleIdeas: [
      {
        title: "Mobile Price in Nepal This Week: Updated Price List from Verified Stores",
        slug: "mobile-price-nepal-this-week",
        category: "price",
        brief:
          "Weekly price update article covering top-selling phones with current store prices, any price drops, and EMI availability. Publish every Monday for freshness signal.",
      },
      {
        title: "Best Phones to Buy in Nepal Right Now: Staff Picks from Tamrakar Complex",
        slug: "best-phones-buy-nepal-right-now",
        category: "guide",
        brief:
          "Monthly curated list of best value phones across budget segments with verified availability at Tamrakar Complex stores.",
      },
    ],
    faqs: [
      {
        question: "Where can I find the latest gadget news and mobile prices in Nepal?",
        answer:
          "Tamrakar Complex publishes weekly price updates, gadget news, and buying guides. All prices are verified with physical stores inside Tamrakar Complex, Kathmandu.",
      },
      {
        question: "Which is the best place to check mobile prices in Nepal?",
        answer:
          "Tamrakar Complex offers verified mobile prices directly from physical stores, making it reliable for comparing price, stock, and EMI before you buy.",
      },
    ],
    internalLinks: [
      { label: "Tech news", href: "/stores/article" },
      { label: "Mobile price list", href: "/cat/mobiles" },
      { label: "Store directory", href: "/stores" },
    ],
  },
];

export const seoAeoSignals = {
  required: [
    "TL;DR block (2-3 sentence direct answer) immediately after H1",
    "Definition sentence for the primary keyword on first mention",
    "FAQ section with minimum 4 question-answer pairs",
    "At least one bullet or numbered list",
    "FAQPage schema markup",
  ],
  recommended: [
    "Comparison table for product or category pages",
    "HowTo schema for step-by-step guide pages",
    "BreadcrumbList schema on all pages",
    "Article schema on news and guide pages",
    "LocalBusiness schema on store and location pages",
    "Video or image with alt text and caption",
  ],
  snippetTargets: [
    { question: "What is the iPhone price in Nepal?", format: "paragraph", targetPath: "/cat/mobiles/apple" },
    { question: "Where is Tamrakar Complex located?", format: "paragraph", targetPath: "/stores" },
    { question: "How to sell your phone in Nepal?", format: "list", targetPath: "/sell-your-phone" },
    { question: "How to repair a mobile phone in Nepal?", format: "list", targetPath: "/repair" },
    { question: "What is the best mobile under 30000 in Nepal?", format: "list", targetPath: "/cat/mobiles" },
    { question: "What mobile brands are available in Nepal?", format: "list", targetPath: "/cat/mobiles" },
  ],
};

export const seoContentRules = [
  "One page should target one primary keyword cluster, not every keyword in the file.",
  "Put current price, date, author, store verification, and internal links near the top of money pages.",
  "Use FAQPage, BreadcrumbList, Article, Product, and ItemList schema where the page content actually supports it.",
  "Avoid fake locations, random A-Z variants, and unrelated autosuggest noise.",
  "Competitor keywords should be used only for fair comparison or alternative guides.",
  "Refresh price pages whenever stock, price, or EMI data changes.",
  "Add TL;DR block after H1 for AEO and AI engine citation eligibility.",
  "Include FAQ section with 4+ Q&A pairs on every pillar page for PAA dominance.",
  "Use LocalBusiness schema with full NAP (name, address, phone) on all store and location pages.",
  "Target featured snippets with 40-60 word direct-answer paragraphs under question headers.",
  "Publish a weekly price update article (every Monday) for freshness signal on mobile price queries.",
];
