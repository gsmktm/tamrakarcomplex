-- Seed chatbot knowledge base with 120 Q&A pairs for TamrakarComplex.com
-- Covers: location, contact, products, repair, exchange, unlock, brands, SEO redirects, packages

INSERT INTO public.chatbot_training_items (question, answer, category, keywords, priority, is_active)
VALUES

-- === LOCATION & CONTACT ===
(
  'Where is Tamrakar Complex located?',
  'Tamrakar Complex is located at New Road, Kathmandu, Nepal — the central gadget and mobile shopping hub of the city. Easy to reach from Ratna Park. Visit us for mobiles, laptops, repair, and accessories.',
  'location', ARRAY['location','address','where','new road','kathmandu','map'], 10, true
),
(
  'What is Tamrakar Complex address?',
  'Tamrakar Complex, New Road, Kathmandu, Nepal. You can find us on Google Maps by searching "Tamrakar Complex New Road Kathmandu".',
  'location', ARRAY['address','new road','kathmandu','find'], 10, true
),
(
  'What is Tamrakar Complex contact number?',
  'You can reach Tamrakar Complex at +977-015351731. For shop-specific numbers, please login or send a contact request from the store page.',
  'contact', ARRAY['contact','phone','number','call','+977'], 10, true
),
(
  'What is Tamrakar Complex email?',
  'The website email is info@tamrakarcomplex.com. Use it for shop listing, product inquiry, repair questions, or business support.',
  'contact', ARRAY['email','info','contact','message'], 10, true
),
(
  'What are Tamrakar Complex opening hours?',
  'Most shops at Tamrakar Complex are open 10:00 AM to 7:00 PM, Sunday to Friday. Hours may vary by store and during public holidays. Please call before visiting on holidays.',
  'location', ARRAY['opening','hours','time','open','close','schedule'], 10, true
),
(
  'How do I get to Tamrakar Complex from Ratna Park?',
  'Tamrakar Complex is a short 10-minute walk from Ratna Park, Kathmandu. Head towards New Road gate — the complex is one of the main gadget buildings in that area.',
  'location', ARRAY['ratna park','how to reach','directions','walk','transport'], 15, true
),
(
  'Does Tamrakar Complex have a map?',
  'Yes! Search "Tamrakar Complex New Road Kathmandu" on Google Maps for directions, photos, and reviews. You can also find the location link on our Contact page.',
  'location', ARRAY['map','google maps','directions','navigate'], 15, true
),

-- === STORE DIRECTORY & CONTACT PERMISSIONS ===
(
  'How can I see a shop contact number?',
  'Store contact numbers are protected. Login to your account and if the store package allows, you can view the number directly. Otherwise, send a contact request from the store page.',
  'store', ARRAY['shop','contact','number','phone','view','permission'], 10, true
),
(
  'Why is the store contact hidden?',
  'Contact numbers are protected to prevent spam. Guest users cannot see direct contacts. Please login or send a contact request — the shop will respond to your inquiry.',
  'store', ARRAY['hidden','contact','login','permission','why'], 15, true
),
(
  'I am logged in but still cannot see the contact number.',
  'Contact visibility depends on the store package. Gold and Diamond stores show contact to logged-in users. Free or Silver stores may require you to send a contact request instead.',
  'store', ARRAY['logged in','contact','visible','package','gold','diamond','silver'], 15, true
),
(
  'How do I contact a specific shop?',
  'Search the shop name on our Store Directory. If contact is visible, it will show. Otherwise click "Request Contact" to send an inquiry — the shop will reach out to you.',
  'store', ARRAY['contact','shop','specific','request','inquiry','directory'], 15, true
),
(
  'What is a featured store?',
  'A featured store gets top placement on the website, homepage visibility, verified badge, and priority in product recommendations. Customers can reach featured stores more easily.',
  'store', ARRAY['featured','store','what is','visibility','badge'], 20, true
),
(
  'What is a verified store?',
  'A verified store has been checked by the Tamrakar Complex admin team. Verified stores display a trust badge and are more reliable for purchases and service.',
  'store', ARRAY['verified','store','badge','trust','reliable'], 20, true
),

-- === STORE PACKAGES ===
(
  'What is the Free store package?',
  'The Free package gives basic store listing, limited product uploads, and contact visible only to logged-in users by admin permission. Lower search priority.',
  'package', ARRAY['free','package','listing','basic','store'], 20, true
),
(
  'What is the Silver store package?',
  'Silver package offers more product listings than Free, contact visibility to logged-in users if enabled, and normal search priority.',
  'package', ARRAY['silver','package','store','listing'], 20, true
),
(
  'What is the Gold store package?',
  'Gold package gives higher search ranking, WhatsApp/contact button for logged-in users, more product listings, and better chatbot recommendation priority.',
  'package', ARRAY['gold','package','store','whatsapp','ranking'], 20, true
),
(
  'What is the Diamond store package?',
  'Diamond is the top store package. It gives highest ranking, featured listing, direct contact visibility if admin allows, homepage visibility, verified badge, and priority chatbot recommendations.',
  'package', ARRAY['diamond','package','store','top','featured','homepage'], 20, true
),

-- === SHOP REGISTRATION ===
(
  'How can I list my shop on Tamrakar Complex?',
  'Shop owners can list their store on TamrakarComplex.com by contacting us at info@tamrakarcomplex.com or calling +977-015351731. We have packages from Free to Diamond with different features.',
  'registration', ARRAY['list','shop','register','add','owner'], 20, true
),
(
  'Can I advertise my mobile shop?',
  'Yes! Mobile shops, repair centers, accessories sellers, and laptop stores can apply for featured placement or advertising on TamrakarComplex.com. Contact us for package details.',
  'registration', ARRAY['advertise','mobile shop','featured','promotion','package'], 20, true
),
(
  'Can shop owners upload products?',
  'Yes, shop owners can upload product details depending on their package. Product name, price, photos, stock, warranty, and contact must be accurate. Admin approval may be required.',
  'registration', ARRAY['upload','product','shop owner','listing','admin'], 20, true
),

-- === MOBILE PHONES & PRICE ===
(
  'What is the mobile price list?',
  'You can check the full mobile price list on TamrakarComplex.com under Mobile Prices. Prices are updated regularly and cover Samsung, Apple, Xiaomi, Realme, OnePlus, Vivo, Oppo, and more.',
  'product', ARRAY['mobile','price','list','all brands','phones'], 10, true
),
(
  'What phones are available at Tamrakar Complex?',
  'Tamrakar Complex shops carry a wide range: iPhone, Samsung, Xiaomi, Redmi, OnePlus, Realme, Vivo, Oppo, Nothing, Honor, Infinix, and budget brands. Check our price list for available models.',
  'product', ARRAY['phones','available','brands','models','stock'], 10, true
),
(
  'Can I compare phones?',
  'Yes! Use the Compare feature on TamrakarComplex.com to compare phones by price, RAM, storage, camera, battery, display, processor, warranty, and seller offers.',
  'product', ARRAY['compare','phones','comparison','specs','features'], 15, true
),
(
  'What phone should I buy under Rs. 20,000?',
  'Under Rs. 20,000, good options include Redmi Note and A-series, Realme Narzo, Samsung Galaxy A-series, and POCO M-series. Check our price list for updated availability and specs.',
  'product', ARRAY['under 20000','budget','best phone','cheap','20000'], 15, true
),
(
  'What phone should I buy under Rs. 30,000?',
  'Under Rs. 30,000, popular choices include Samsung Galaxy A35/A55, Redmi Note 13 Pro, Realme 12 Pro, OnePlus Nord CE, and Nothing Phone. Check current prices and stock on our price list.',
  'product', ARRAY['under 30000','30000','mid range','best phone','budget'], 15, true
),
(
  'What phone should I buy under Rs. 50,000?',
  'Under Rs. 50,000, consider Samsung Galaxy S23, iPhone 13, OnePlus 12R, Google Pixel 7a, or Xiaomi 13. Compare specs, warranty, and EMI on our product pages.',
  'product', ARRAY['under 50000','50000','mid flagship','best phone'], 15, true
),
(
  'What is the best flagship phone in Nepal?',
  'Top flagships available in Nepal include iPhone 16 Pro Max, Samsung Galaxy S24 Ultra, Google Pixel 9 Pro, and OnePlus 12. Check verified prices and availability at Tamrakar Complex.',
  'product', ARRAY['flagship','best phone','premium','top','high end'], 15, true
),
(
  'What gaming phones are available?',
  'Gaming phones available in Nepal include ASUS ROG Phone, Samsung Galaxy A series with high refresh rate, Redmi Note gaming variants, and POCO X-series. Ask for stock and price.',
  'product', ARRAY['gaming','game phone','rog','poco','gaming phone','refresh rate'], 20, true
),

-- === iPHONE ===
(
  'What is the iPhone price in Nepal?',
  'iPhone prices in Nepal vary by model. iPhone 15 starts around NPR 120,000–140,000. iPhone 16 Pro Max can reach NPR 230,000+. Check our Apple price page for updated verified prices.',
  'iphone', ARRAY['iphone','price','nepal','apple','cost'], 10, true
),
(
  'Can I buy iPhone in Nepal from Tamrakar Complex?',
  'Yes. Many shops inside Tamrakar Complex sell iPhones. Always check: model number, region (HK/US/IN), warranty (official vs shop), iCloud status, Face ID, True Tone, and VAT bill.',
  'iphone', ARRAY['buy iphone','nepal','purchase','iphone','where'], 10, true
),
(
  'Is there an Apple official store in Nepal?',
  'Apple does not operate an official Apple Store in Nepal. Tamrakar Complex has authorized resellers and trusted sellers of Apple products. Always verify warranty before buying.',
  'iphone', ARRAY['apple store','official','nepal','authorized','reseller'], 10, true
),
(
  'What should I check before buying an iPhone?',
  'Before buying an iPhone check: model number, region lock, iCloud status (Find My OFF), Face ID working, True Tone, battery health (above 85%), VAT bill, box, warranty card, and shop reputation.',
  'iphone', ARRAY['check','before buying','iphone','tips','warranty','imei'], 10, true
),
(
  'Can I get iPhone on EMI?',
  'iPhone EMI may be available through selected sellers or bank finance partners. Confirm: down payment, interest rate, tenure, documents required, total cost, and warranty terms.',
  'iphone', ARRAY['iphone','emi','installment','finance','monthly'], 15, true
),
(
  'Is iPhone warranty available in Nepal?',
  'iPhone warranty availability depends on the region and seller. Official warranty (international or local) covers manufacturing defects. Always ask: is this official warranty or shop warranty?',
  'iphone', ARRAY['iphone','warranty','official','coverage','repair'], 15, true
),
(
  'Do you sell refurbished iPhones?',
  'Some sellers may offer refurbished iPhones. Before buying, check battery health, Face ID, iCloud status, Find My, display quality, camera, all speakers, and ask for bill and warranty.',
  'iphone', ARRAY['refurbished','used iphone','second hand','iphone','condition'], 15, true
),

-- === SAMSUNG ===
(
  'What is Samsung phone price in Nepal?',
  'Samsung prices in Nepal range from budget A-series (Rs. 20,000–35,000) to flagship S-series (Rs. 100,000+). Check our Samsung price page for verified, updated prices.',
  'samsung', ARRAY['samsung','price','nepal','galaxy','s series','a series'], 10, true
),
(
  'Is Samsung warranty available at Tamrakar Complex?',
  'Warranty depends on the shop and product. Always ask: official Samsung warranty or shop warranty? For official warranty claims, also verify through Samsung Nepal service center.',
  'samsung', ARRAY['samsung','warranty','official','claim','service'], 15, true
),
(
  'Do you repair Samsung phones?',
  'Yes. Samsung repair services are available at repair shops inside Tamrakar Complex. For official warranty repair, check Samsung Nepal authorized service. For out-of-warranty repair, ask local shops.',
  'samsung', ARRAY['samsung','repair','fix','screen','battery'], 15, true
),
(
  'Is Samsung EMI available?',
  'Samsung EMI may be available through selected sellers and bank partners. Ask the store about model, down payment, tenure, interest, and documents required.',
  'samsung', ARRAY['samsung','emi','installment','monthly','finance'], 20, true
),
(
  'What is Samsung Galaxy S24 Ultra price in Nepal?',
  'Samsung Galaxy S24 Ultra price in Nepal varies by storage (256GB/512GB/1TB) and condition. Check our Samsung price page for the latest verified price from Tamrakar Complex stores.',
  'samsung', ARRAY['s24 ultra','samsung','price','256gb','flagship'], 15, true
),

-- === LAPTOP ===
(
  'Can I buy a laptop at Tamrakar Complex?',
  'Yes. Some shops inside and near Tamrakar Complex sell laptops including Lenovo, Dell, Asus, Acer, HP, Apple MacBook. Availability varies by stock — please check or inquire.',
  'laptop', ARRAY['laptop','buy','lenovo','dell','asus','acer','hp'], 10, true
),
(
  'What is the best laptop for students in Nepal?',
  'Good student laptops in Nepal include Lenovo IdeaPad, Asus VivoBook, HP Pavilion, and Acer Aspire. Look for: 8GB RAM minimum, SSD, battery life above 6 hours, and warranty.',
  'laptop', ARRAY['student','laptop','best','lenovo','asus','hp','budget'], 15, true
),
(
  'What is the best gaming laptop in Nepal?',
  'Gaming laptops available in Nepal include ASUS ROG, Lenovo Legion, HP Omen, and MSI. Check GPU, RAM, display refresh rate, cooling, warranty, and price before buying.',
  'laptop', ARRAY['gaming laptop','rog','legion','omen','msi','gpu'], 15, true
),
(
  'Do you sell Lenovo laptops?',
  'Lenovo laptops may be available through shops in or near Tamrakar Complex. Check processor, generation, RAM, SSD, display, warranty, and price. Ask for stock availability.',
  'laptop', ARRAY['lenovo','laptop','ideapad','thinkpad','legion','price'], 15, true
),
(
  'What is MacBook price in Nepal?',
  'MacBook Air M2 starts around NPR 175,000+ and MacBook Pro M3 from NPR 220,000+. Prices vary by RAM, SSD, and chip. Check current stock and pricing at Tamrakar Complex shops.',
  'laptop', ARRAY['macbook','macbook air','macbook pro','apple','laptop','price','m2','m3'], 15, true
),

-- === iPAD & ACCESSORIES ===
(
  'Do you sell iPad?',
  'iPads may be available through listed shops. Search iPad models on our site to compare storage, display size, cellular vs Wi-Fi, Apple Pencil support, warranty, and price.',
  'product', ARRAY['ipad','tablet','apple','buy','price'], 15, true
),
(
  'Do you sell Apple Watch?',
  'Apple Watch availability depends on shops and stock. Check series, size, GPS vs cellular, warranty, and price. Always verify iCloud and activation lock status for used watches.',
  'product', ARRAY['apple watch','watch','smartwatch','series','gps'], 20, true
),
(
  'Do you sell AirPods?',
  'AirPods and wireless earbuds may be available from accessory shops. Check model (AirPods 2/3/Pro), warranty, and whether they are official or grey market.',
  'product', ARRAY['airpods','earbuds','wireless','bluetooth','earphones'], 20, true
),
(
  'Do you sell accessories?',
  'Yes. Many shops sell mobile covers, tempered glass, chargers, cables, power banks, earbuds, smartwatches, keyboards, mice, stands, and other gadget accessories.',
  'product', ARRAY['accessories','cover','charger','cable','power bank','earbuds','glass'], 15, true
),
(
  'Do you sell PC and computer parts?',
  'Some shops may offer desktop PCs, RAM, SSD, keyboards, mice, monitors, and other computer accessories. Search or inquire for current stock availability.',
  'product', ARRAY['pc','computer','desktop','ram','ssd','parts','accessories'], 20, true
),

-- === EXCHANGE & SELL ===
(
  'Can I exchange my old phone?',
  'Yes! Many shops at Tamrakar Complex offer phone exchange. To get a quote, share your phone model, storage, battery health, physical condition, box, bill, and repair history.',
  'exchange', ARRAY['exchange','old phone','trade in','swap','upgrade'], 10, true
),
(
  'Can I sell my used phone?',
  'Yes. You can request a valuation for your used phone. Final price depends on model, storage, battery health, display, camera, body condition, IMEI, and original box/bill.',
  'sell', ARRAY['sell','used phone','second hand','cash','valuation'], 10, true
),
(
  'How much will I get for my old phone?',
  'Valuation depends on your phone model, storage, condition, battery health, and current market demand. Submit a sell/exchange request on TamrakarComplex.com for an estimate.',
  'sell', ARRAY['valuation','price','old phone','how much','estimate','resale'], 10, true
),
(
  'What should I check before selling my phone?',
  'Before selling: backup all data, log out of accounts (iCloud/Google), remove SIM and memory card, reset to factory settings, note battery health, and collect original box and bill.',
  'sell', ARRAY['before selling','checklist','icloud','logout','reset','data'], 15, true
),

-- === REPAIR ===
(
  'Do you repair phones?',
  'Yes. Repair services at Tamrakar Complex cover screen, battery, charging port, speaker, camera, microphone, software, water damage, and more. Always ask for repair warranty before proceeding.',
  'repair', ARRAY['repair','fix','phone','service','broken'], 10, true
),
(
  'How much does phone repair cost?',
  'Repair cost depends on model and issue. Screen replacement starts from Rs. 2,000+. Battery replacement from Rs. 1,500+. Prices vary by brand and parts availability. Ask shops for a quote.',
  'repair', ARRAY['repair','cost','price','how much','screen','battery'], 10, true
),
(
  'Do you repair iPhones?',
  'Yes. iPhone repair services are available for screen replacement, battery, charging port, back glass, camera, Face ID, speaker, and software issues. Ask for repair warranty and parts quality.',
  'repair', ARRAY['iphone','repair','screen','battery','face id','camera'], 10, true
),
(
  'What is iPhone screen replacement price in Nepal?',
  'iPhone screen replacement price varies by model. iPhone 11 screen from Rs. 8,000+. iPhone 14/15 Pro from Rs. 18,000+. Original vs compatible parts affect price and quality.',
  'repair', ARRAY['iphone','screen','replacement','price','cost','display'], 10, true
),
(
  'What is iPhone battery replacement price?',
  'iPhone battery replacement varies by model — generally Rs. 3,000–8,000. Ask whether it is original Apple battery or compatible. Always check health after replacement.',
  'repair', ARRAY['iphone','battery','replacement','price','health'], 10, true
),
(
  'Do you repair Samsung phones?',
  'Samsung repair (screen, battery, charging, camera, software) is available at repair shops. For official warranty repair, check Samsung Nepal authorized center. For out-of-warranty, ask local shops.',
  'repair', ARRAY['samsung','repair','screen','battery','camera'], 10, true
),
(
  'Do you repair water damaged phones?',
  'Some shops handle water damage repair, but success is not guaranteed. Switch off immediately, do not charge, remove SIM/case, and visit a repair shop as soon as possible.',
  'repair', ARRAY['water damage','repair','wet phone','liquid','flood'], 15, true
),
(
  'Do you repair charging issues?',
  'Yes. Charging issue repair includes: cable/adapter check, port cleaning, charging IC check, board-level diagnosis, and battery test. Cost depends on root cause.',
  'repair', ARRAY['charging','port','cable','adapter','not charging'], 15, true
),
(
  'Do you repair display and touch issues?',
  'Display and touch repair is available for iPhone, Samsung, Xiaomi, Oppo, Vivo, OnePlus, and most popular brands. Parts availability may affect repair time.',
  'repair', ARRAY['display','touch','screen','digitizer','not working'], 15, true
),
(
  'Do you repair Google Pixel phones?',
  'Some shops may handle Google Pixel repair. Parts availability can vary. Share your model and issue for availability and cost estimate.',
  'repair', ARRAY['google','pixel','repair','service','parts'], 20, true
),
(
  'Do you do data recovery?',
  'Some repair shops offer data recovery for phones with software failure or physical damage. Success depends on damage type. Do not attempt to charge or turn on a damaged phone before consulting a technician.',
  'repair', ARRAY['data recovery','backup','lost data','deleted','recovery'], 20, true
),

-- === MAC REPAIR ===
(
  'Do you repair MacBook?',
  'MacBook repair depends on available shops. Services may include battery, display, keyboard, trackpad, logic board, SSD, charging port, software, and water damage. Ask for diagnosis, parts source, data safety, and warranty.',
  'mac', ARRAY['macbook','repair','mac','apple laptop','fix'], 10, true
),
(
  'What is MacBook repair price in Nepal?',
  'MacBook repair price depends on issue: battery replacement NPR 8,000–15,000+, display from NPR 20,000+, logic board repair from NPR 15,000+. Share model and issue for a quote.',
  'mac', ARRAY['macbook','repair','price','cost','battery','display','logic board'], 10, true
),
(
  'Can you repair Mac M1 or M2?',
  'Mac M1/M2 repair is complex due to chip-level integration. Software issues and SSD replacement may be possible. Logic board repair requires specialized equipment. Share your issue for options.',
  'mac', ARRAY['mac m1','mac m2','m3','repair','chip','silicon'], 15, true
),
(
  'Is Mac mini available in Nepal?',
  'Mac mini availability depends on stock at listed shops. Check chip version (M2/M4), RAM, SSD, and warranty before buying. Ask about import channel and warranty type.',
  'mac', ARRAY['mac mini','m4','m2','nepal','buy','price'], 20, true
),

-- === MOBILE UNLOCK ===
(
  'Can you unlock my phone?',
  'We only guide legal carrier SIM unlock. We cannot help with iCloud bypass, Google FRP bypass, password bypass, or stolen phone unlock. If your phone belongs to you, request unlock from your carrier officially.',
  'unlock', ARRAY['unlock','sim','carrier','locked phone'], 10, true
),
(
  'Can you unlock an AT&T phone?',
  'For AT&T unlock: your device must be paid off, not reported stolen, and meet AT&T eligibility criteria. Request the unlock directly from AT&T — a shop can only guide you through the official process.',
  'unlock', ARRAY['att','at&t','unlock','carrier','sim','eligible'], 10, true
),
(
  'Can you unlock a T-Mobile phone?',
  'T-Mobile unlock depends on payment status, account standing, and device policy. Use the official T-Mobile unlock request — shops can only assist with the legal SIM unlock process.',
  'unlock', ARRAY['t-mobile','unlock','sim','carrier','eligible'], 10, true
),
(
  'Can you unlock an iPhone without password?',
  'No. We do not help bypass iPhone passcode, iCloud, Find My, or stolen-device lock. If the phone is yours, use Apple ID account recovery or visit Apple Support with proof of purchase.',
  'unlock', ARRAY['iphone','unlock','password','passcode','bypass','icloud'], 10, true
),
(
  'Can you bypass Google FRP or Gmail lock?',
  'No. We do not bypass Google FRP, Gmail lock, or Android lock screen. If the device is yours, recover your Google account through Google''s official recovery process or visit an authorized service center.',
  'unlock', ARRAY['frp','google','gmail','bypass','android','lock','account'], 10, true
),
(
  'Are free unlock tools safe?',
  'No. Free unlock code generators, APK bypass tools, and online bypass services are usually scams or malware. Never share IMEI or personal data on such sites. Use official carrier unlock only.',
  'unlock', ARRAY['free unlock','tool','safe','scam','generator','apk'], 10, true
),
(
  'What should I check before buying an unlocked phone?',
  'Check: IMEI validity, carrier lock status (use official checker), blacklist status, battery health, display, camera, speaker, charging port, and bill. For iPhone, also check iCloud and Find My status.',
  'unlock', ARRAY['unlocked phone','imei','check','buy','blacklist'], 15, true
),

-- === EMI ===
(
  'Is EMI available at Tamrakar Complex?',
  'Some sellers may offer EMI or bank finance. EMI depends on: bank, card, shop policy, product price, and customer eligibility. Ask the seller about interest, down payment, tenure, and documents.',
  'emi', ARRAY['emi','installment','monthly','finance','bank','credit'], 10, true
),
(
  'Which banks offer EMI for phones in Nepal?',
  'Several Nepali banks offer EMI on electronics through their credit cards and schemes. Ask the seller which banks are partnered and what the interest rate and tenure is for your preferred model.',
  'emi', ARRAY['bank','emi','credit card','loan','finance','nepal'], 15, true
),
(
  'Is EMI interest free?',
  'EMI interest depends on the bank and offer. Some banks run 0% EMI promotions for specific models. Always confirm total cost, processing fee, and terms before committing.',
  'emi', ARRAY['emi','interest free','0%','zero interest','promotion'], 15, true
),

-- === WARRANTY & AUTHENTICITY ===
(
  'How do I know if a phone is original?',
  'Check: IMEI on box/settings/dial *#06#, compare serial number, verify model on brand website, check display quality, camera output, Face ID or fingerprint accuracy, and ask for VAT bill.',
  'warranty', ARRAY['original','genuine','fake','check','imei','authentic'], 10, true
),
(
  'What is the difference between official and grey market phones?',
  'Official phones have local/international warranty and proper import. Grey market phones are imported without official documentation — cheaper but may have warranty, repair, and customs issues.',
  'warranty', ARRAY['official','grey market','warranty','difference','import'], 10, true
),
(
  'Is VAT bill important when buying a phone?',
  'Yes. A VAT bill is proof of purchase, required for warranty claims, and shows the phone is legally imported. Always insist on a VAT bill — no bill often means grey market or stolen phone risk.',
  'warranty', ARRAY['vat','bill','warranty','legal','invoice','receipt'], 10, true
),
(
  'What should I ask before buying a phone?',
  'Ask: Is it official warranty? Is it seal pack or opened? Is a VAT bill included? What is the return policy? Are accessories original? Who handles warranty repair? What is the warranty period?',
  'warranty', ARRAY['before buying','checklist','questions','official','warranty','seal'], 10, true
),

-- === ONLINE SHOPPING & DELIVERY ===
(
  'Is online shopping available on Tamrakar Complex?',
  'TamrakarComplex.com helps you browse products and connect with verified sellers. For final purchase, delivery, payment, and warranty — confirm directly with the seller or shop.',
  'shopping', ARRAY['online shopping','buy online','order','delivery','website'], 10, true
),
(
  'Is cash on delivery available?',
  'Cash on Delivery depends on the individual seller. Confirm COD availability, delivery charge, return policy, and warranty process with the shop before placing any order.',
  'shopping', ARRAY['cod','cash on delivery','payment','delivery'], 15, true
),
(
  'Can I get delivery outside Kathmandu?',
  'Delivery outside Kathmandu depends on the seller and courier partners. Ask the shop about delivery areas, courier charge, delivery time, and COD availability for your location.',
  'shopping', ARRAY['delivery','outside kathmandu','courier','province','shipping'], 15, true
),
(
  'Is the price negotiable at Tamrakar Complex?',
  'Some shops offer negotiable prices, especially for cash purchase or bulk orders. Others follow fixed pricing. Compare price, warranty, and accessories across shops before negotiating.',
  'shopping', ARRAY['negotiate','price','discount','bargain','deal'], 20, true
),
(
  'Why is Tamrakar price different from official store price?',
  'Price can differ because of warranty type, import channel, VAT, shop promotion, stock age, and market conditions. Always ask: official, grey, used, or refurbished? Bill included?',
  'shopping', ARRAY['price difference','official','why','cheaper','expensive','compare'], 20, true
),

-- === USED & REFURBISHED ===
(
  'Are refurbished phones available?',
  'Yes. Some sellers offer refurbished or used phones. Before buying: check battery health, display, Face ID/fingerprint, camera, speaker, charging, IMEI, iCloud status, and ask for bill/warranty.',
  'used', ARRAY['refurbished','used','second hand','reconditioned','pre-owned'], 10, true
),
(
  'Is it safe to buy a used phone?',
  'It can be safe if you check carefully. Verify IMEI, battery health, display quality, Face ID/fingerprint, iCloud status for iPhone, Google FRP cleared for Android, and get a receipt.',
  'used', ARRAY['used phone','safe','risk','second hand','check','tips'], 10, true
),

-- === BRANDS — OnePlus, Xiaomi, Realme, etc. ===
(
  'Do you have OnePlus phones?',
  'OnePlus phones may be available from listed shops. Check model, RAM, storage, warranty, and price. OnePlus Nepal offers good mid-range and flagship options.',
  'product', ARRAY['oneplus','nord','buy','price','nepal'], 20, true
),
(
  'Do you have Xiaomi or Redmi phones?',
  'Yes. Xiaomi and Redmi are popular brands at Tamrakar Complex. Check the latest Redmi Note, Xiaomi 13 series, POCO series prices on our mobile price page.',
  'product', ARRAY['xiaomi','redmi','poco','mi','price','nepal'], 20, true
),
(
  'Do you have Oppo or Vivo phones?',
  'Oppo and Vivo phones may be available. Check model, camera specs, battery, warranty, and official price. Both brands are available through listed sellers.',
  'product', ARRAY['oppo','vivo','reno','v series','price'], 20, true
),
(
  'Do you have Realme phones?',
  'Realme offers budget-friendly to mid-range phones popular in Nepal. Check Realme GT, Narzo, and C-series on our price page for latest specs and prices.',
  'product', ARRAY['realme','narzo','gt','c series','budget','price'], 20, true
),
(
  'Do you have Nothing Phone?',
  'Nothing Phone may be available from select sellers. Check model, Glyph interface, specs, warranty, and price. Share your interest and we can help find a seller.',
  'product', ARRAY['nothing phone','nothing','glyph','transparent','unique'], 25, true
),

-- === SEO REDIRECT — GadgetByte Nepal ===
(
  'GadgetByte Nepal contact number?',
  'We are not GadgetByte Nepal. But if you are looking for phone price, laptop price, repair, exchange, or shop contact in Kathmandu — TamrakarComplex.com can help. What are you looking for?',
  'redirect', ARRAY['gadgetbyte','gadgetsbyte','nepal','contact','number'], 10, true
),
(
  'GadgetByte Nepal mobile price or laptop price?',
  'We are TamrakarComplex.com, not GadgetByte. You can check mobile and laptop prices from verified sellers here. Search your model or browse the price list — we will help you find the best deal.',
  'redirect', ARRAY['gadgetbyte','mobile price','laptop price','price list'], 10, true
),
(
  'GadgetByte Nepal reviews?',
  'TamrakarComplex.com is a marketplace and store directory, not a review site. For buying, compare price, warranty, and seller trust here. What product are you looking to buy?',
  'redirect', ARRAY['gadgetbyte','reviews','nepal','tech review'], 15, true
),

-- === SEO REDIRECT — Apple Store Nepal ===
(
  'Apple Store Nepal appointment?',
  'There is no official Apple Store in Nepal. For Tamrakar Complex shops, no appointment is needed — just walk in. For Apple authorized service, call the provider first to check availability.',
  'redirect', ARRAY['apple store','appointment','booking','nepal','official'], 10, true
),
(
  'Apple Store Nepal opening hours?',
  'TamrakarComplex.com is not the official Apple Store. Tamrakar shops are generally open 10 AM–7 PM, Sun–Fri. For specific Apple seller hours, call the shop directly before visiting.',
  'redirect', ARRAY['apple store','hours','opening','time','nepal'], 10, true
),
(
  'Authorized Apple store in Nepal?',
  'Apple has authorized resellers in Nepal but no company-owned Apple Store. Tamrakar Complex has trusted sellers for iPhone, iPad, MacBook, and Apple accessories. Always verify warranty before purchasing.',
  'redirect', ARRAY['authorized','apple store','nepal','reseller','official'], 10, true
),

-- === SEO REDIRECT — Samsung Nepal / Mac Repair ===
(
  'Samsung Nepal service center?',
  'Tamrakar Complex has mobile repair shops but is not the Samsung official service center. For official Samsung warranty claims, verify through Samsung Nepal. For out-of-warranty repair, ask our listed shops.',
  'redirect', ARRAY['samsung','service center','nepal','official','warranty'], 10, true
),
(
  'Mac Repair Nepal?',
  'MacBook repair services may be available through specialist shops at or near Tamrakar Complex. Share your Mac model and issue — we can help you find a repair option and cost estimate.',
  'redirect', ARRAY['mac repair','macbook','nepal','service','fix'], 10, true
),
(
  'iPhone repair Nepal or near me?',
  'iPhone repair services are available at Tamrakar Complex, New Road, Kathmandu. Services include screen, battery, Face ID, charging port, and software repair. Contact repair shops from our directory.',
  'redirect', ARRAY['iphone repair','near me','nepal','kathmandu','service'], 10, true
),

-- === RELIABILITY & TRUST ===
(
  'Is Tamrakar Complex reliable?',
  'Tamrakar Complex has many independent shops. Reliability depends on the individual seller. Always check: VAT bill, warranty, product condition, seller reviews, and after-sales policy before buying.',
  'trust', ARRAY['reliable','trustworthy','safe','legit','shops'], 10, true
),
(
  'How can I verify a shop before buying?',
  'Check if the shop is verified or featured on TamrakarComplex.com. Ask for VAT bill, warranty card, and return policy. Compare prices across shops and read customer reviews.',
  'trust', ARRAY['verify','shop','before buying','check','safe','reliable'], 10, true
),
(
  'What if I have a problem after purchase?',
  'Contact the shop with your VAT bill and warranty card. If unresolved, contact TamrakarComplex.com support at info@tamrakarcomplex.com or call +977-015351731 for assistance.',
  'trust', ARRAY['problem','after purchase','complaint','return','refund','support'], 10, true
),

-- === CHATBOT & GENERAL ===
(
  'What can this chatbot help with?',
  'I can help with: mobile price, laptop price, iPhone and Samsung questions, repair service, exchange, sell your phone, EMI, warranty, shop contact, Tamrakar Complex location, and buying advice. Just ask!',
  'general', ARRAY['chatbot','help','what can','assistant','support'], 10, true
),
(
  'I typed "tamrakar complexity" — what did you mean?',
  'If you are looking for Tamrakar Complex at New Road, Kathmandu — you are in the right place! We can help with mobile phones, laptops, accessories, repair, exchange, and shop location.',
  'general', ARRAY['tamrakar complexity','typo','complex','new road'], 20, true
),
(
  'Is this GadgetByte Nepal, Apple Store, or Samsung Nepal?',
  'No — this is TamrakarComplex.com, Nepal''s digital marketplace for gadget shops at Tamrakar Complex, New Road, Kathmandu. We can help you find phones, laptops, repair, exchange, and shop contacts.',
  'general', ARRAY['gadgetbyte','apple store','samsung','is this','which site'], 10, true
),
(
  'Namaste! Hello!',
  'Namaste! Welcome to Tamrakar Complex. How can I help you today? You can ask about mobile price, laptop price, iPhone, Samsung, Apple products, repair, exchange, EMI, accessories, or shop location.',
  'general', ARRAY['namaste','hello','hi','hey','salam','greet'], 5, true
),
(
  'Thank you!',
  'You are welcome! If you need anything else — mobile price, repair, exchange, or shop contact — just ask. Namaste from Tamrakar Complex!',
  'general', ARRAY['thank you','thanks','dhanyabad','shukriya'], 5, true
)

ON CONFLICT DO NOTHING;
