import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";

interface ContentPageProps {
  slug?: string;
}

type ContentPageModel = {
  title: string;
  content: string | null;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
};

const fallbackPages: Record<string, { title: string; content: string; description: string }> = {
  "shipping-delivery": {
    title: "Shipping & Delivery Policy",
    description: "How delivery, pickup, charges, timing, and order confirmation work for Tamrakar Complex marketplace purchases.",
    content: `
      <section>
        <p className="text-sm text-muted-foreground mb-6">Last updated: July 27, 2026</p>
        <p className="mb-4"><strong>TamrakarComplex.com is a marketplace and product-discovery platform.</strong> Independent stores may sell and fulfil products. Tamrakar Complex is not a manufacturer or an authorized representative of every brand displayed on the website.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Order confirmation</h2>
        <p className="mb-4">A product is available for online purchase only when its page shows an active purchase option and current stock status. Reference prices and assisted purchase enquiries are not confirmed orders. The seller must confirm the exact variant, final price, stock, warranty, invoice availability, delivery area, and payment method before payment.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Delivery and pickup</h2>
        <p className="mb-4">Delivery coverage, courier, delivery time, and charges depend on the individual seller and destination. These details must be shown or confirmed before the customer completes payment. Store pickup may be offered when the seller confirms the collection location and time.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Delays and non-delivery</h2>
        <p className="mb-4">If an accepted order is delayed or not delivered, contact the fulfilling seller first and keep the order confirmation and payment record. You can also contact Tamrakar Complex through our Contact page so we can record and help route the complaint.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Questions before ordering</h2>
        <p>Do not pay until the seller has disclosed the full amount, including delivery charges. For help, visit <a href="/contact-us">Contact Us</a>.</p>
      </section>
    `,
  },
  "returns-refunds": {
    title: "Returns, Refunds & Cancellations",
    description: "Clear return, refund, cancellation, and dispute information for purchases made through Tamrakar Complex sellers.",
    content: `
      <section>
        <p className="text-sm text-muted-foreground mb-6">Last updated: July 27, 2026</p>
        <p className="mb-4"><strong>Returns and warranty terms are seller-specific.</strong> The seller must disclose the applicable return window, eligible condition, exclusions, warranty provider, and refund method before payment. Tamrakar Complex does not advertise a platform-wide return period where one has not been agreed by the fulfilling seller.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Before you pay</h2>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Confirm the exact model, colour, RAM/storage variant, condition, and included accessories.</li>
          <li>Ask who provides the warranty and obtain the warranty and invoice terms in writing.</li>
          <li>Confirm the seller's return deadline, restocking or delivery deductions, and refund processing method.</li>
        </ul>
        <h2 className="text-2xl font-bold mt-8 mb-4">Wrong, damaged, or undelivered orders</h2>
        <p className="mb-4">Notify the fulfilling seller promptly using the contact details on the order or store page. Keep packaging, photos, invoice, payment receipt, and communication records. Do not send a product back until the seller provides return instructions.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Cancellations and refunds</h2>
        <p className="mb-4">Cancellation is subject to the seller's disclosed terms and whether fulfilment has started. An approved refund is returned through the method agreed with the seller. Processing time depends on the seller and payment provider and must be communicated when the refund is approved.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Escalating a problem</h2>
        <p>If the seller does not respond or follow the terms disclosed before purchase, submit the order details through <a href="/contact-us">Contact Us</a>. Tamrakar Complex can document and route the dispute but cannot replace rights or obligations that belong to the independent seller.</p>
      </section>
    `,
  },
  "marketplace-disclosure": {
    title: "Marketplace & Pricing Disclosure",
    description: "Understand Tamrakar Complex product listings, reference prices, independent sellers, and purchase availability.",
    content: `
      <section>
        <p className="text-sm text-muted-foreground mb-6">Last updated: July 27, 2026</p>
        <p className="mb-4">TamrakarComplex.com combines a product information catalog, Nepal market price references, independent store listings, and selected online-purchase products.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Who sells the product?</h2>
        <p className="mb-4">Independent stores are responsible for their listings, stock, fulfilment, invoice, warranty, returns, and refunds unless a product page explicitly identifies Tamrakar Complex as the seller. Displaying a brand name or product does not imply a brand partnership or authorization.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Reference price versus purchasable offer</h2>
        <p className="mb-4">A “price in Nepal” may be a catalog reference and can change. It is not a confirmed offer unless the exact product page shows a working purchase option, in-stock status, final price, and seller. Assisted purchase buttons request confirmation; they do not guarantee stock or create an order.</p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Accuracy and corrections</h2>
        <p>We work to keep listing information current. Customers should report an incorrect price, seller identity, image, or availability through <a href="/contact-us">Contact Us</a>. Sellers must correct or remove inaccurate listings promptly.</p>
      </section>
    `,
  },
  "privacy-policy": {
    title: "Privacy Policy | Tamrakar Complex Official",
    description: "Official Privacy Policy for Tamrakar Complex. Learn how we protect your data, manage marketplace transactions, and ensure secure gadget repairs in Nepal.",
    content: `
      <section>
        <p className="text-sm text-muted-foreground mb-6">Last Updated: April 21, 2026 | Version 2.4</p>
        
        <p className="mb-4">At Tamrakar Complex, accessible from tamrakarcomplex.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Tamrakar Complex and how we use it. We are committed to maintaining the trust and confidence of all our users.</p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect and Process</h2>
        <p className="mb-4">We collect information to provide better services to all our users. The types of information we collect include:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li><strong>Personal Identification:</strong> Name, email address, phone number, and physical address provided during account registration or contact forms.</li>
          <li><strong>Device Information:</strong> For marketplace listings and repairs, we collect IMEI numbers, serial numbers, device models, and technical specifications.</li>
          <li><strong>Transaction Data:</strong> Details of products bought, sold, or repaired through our platform, including payment status and service history.</li>
          <li><strong>User-Generated Content:</strong> Photos of devices, condition descriptions, and reviews posted on our marketplace.</li>
          <li><strong>Technical Data:</strong> IP addresses, browser types, and usage patterns collected via log files and analytics tools.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">2. Detailed Use of Information</h2>
        <p className="mb-4">Beyond basic operations, your data helps us in:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li><strong>Marketplace Integrity:</strong> Verifying device ownership and condition to prevent the sale of stolen or counterfeit goods.</li>
          <li><strong>Repair Transparency:</strong> Providing real-time updates on repair status and maintaining a digital warranty record for replaced parts.</li>
          <li><strong>Personalized Discovery:</strong> Suggesting gadgets and stores based on your browsing history and preferences.</li>
          <li><strong>Security:</strong> Monitoring for fraudulent activities and ensuring the safety of our digital community.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">3. Data Sharing and Third-Party Services</h2>
        <p className="mb-4">We do not sell your personal data. We only share information with:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li><strong>Verified Stores:</strong> When you express interest in a product or book a repair, your contact info is shared with the specific vendor.</li>
          <li><strong>Service Providers:</strong> Logistics partners for delivery and cloud infrastructure providers for data storage.</li>
          <li><strong>Legal Authorities:</strong> When required by Nepalese law or to protect the rights and safety of our users.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">4. Log Files, Cookies, and Analytics</h2>
        <p className="mb-4">Tamrakar Complex follows a standard procedure of using log files. We use cookies to store information about visitors' preferences and the pages on the website that the visitor accessed. This information is used to optimize the users' experience by customizing our web page content based on visitors' browser type.</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">5. Security of Your Data</h2>
        <p className="mb-4">We implement industry-standard security measures to protect your data. This includes SSL encryption for all data transfers and secure, hashed storage for passwords. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">6. Your Rights and Choices</h2>
        <p className="mb-4">You have the right to:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Access and export your personal data held by us.</li>
          <li>Request correction of inaccurate information.</li>
          <li>Request deletion of your account and associated data (subject to legal retention requirements).</li>
          <li>Opt-out of marketing communications at any time.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">7. Contact Information</h2>
        <p className="mb-4">If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact our Data Protection Officer at <strong>privacy@tamrakarcomplex.com</strong>.</p>
      </section>
    `,
  },
  "terms-of-service": {
    title: "Terms of Service | Tamrakar Complex Usage Agreement",
    description: "Official Terms of Service for Tamrakar Complex. Covers marketplace rules, repair service agreements, valuation terms, and user conduct in Nepal.",
    content: `
      <section>
        <p className="text-sm text-muted-foreground mb-6">Last Updated: April 21, 2026 | Version 3.1</p>
        <p className="mb-6 italic text-lg">By using TamrakarComplex.com, you agree to these terms. Please read them carefully.</p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance and Scope</h2>
        <p className="mb-4">These Terms of Service govern your use of the Tamrakar Complex digital platform. This agreement applies to all visitors, users, and others who access or use the Service. Your access to the platform is conditioned on your acceptance of and compliance with these Terms.</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">2. Marketplace and Listing Regulations</h2>
        <p className="mb-4">Tamrakar Complex acts as a facilitator for gadget commerce. Users listing items on our marketplace agree to:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Provide 100% accurate descriptions and real photos of the actual device being sold.</li>
          <li>Disclose all known faults, repairs, or replacements (e.g., non-original screens or batteries).</li>
          <li>Ensure the device is not locked (iCloud/Google lock) and has been legally acquired.</li>
          <li>Maintain reasonable pricing in accordance with current market values in Nepal.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">3. Professional Repair Services</h2>
        <p className="mb-4">When submitting a device for repair through our platform:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li><strong>Data Responsibility:</strong> You must back up all data. We are not responsible for any data loss during the repair process.</li>
          <li><strong>Abandonment:</strong> Devices not picked up within 90 days of repair completion notification may be disposed of or sold to recover costs.</li>
          <li><strong>Warranty:</strong> Parts replaced carry a specific warranty (usually 3-6 months) which is voided by liquid damage, physical impact, or third-party tampering.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">4. Valuation and Buyback Estimates</h2>
        <p className="mb-4">The valuation tool provides an <em>estimate</em> based on your inputs. A final binding offer is only made after physical inspection by a verified technician at Tamrakar Complex. We reserve the right to refuse any device for buyback or exchange without providing a reason.</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">5. User Conduct and Prohibitions</h2>
        <p className="mb-4">Users are strictly prohibited from:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Posting fraudulent, misleading, or illegal content.</li>
          <li>Attempting to bypass platform security or scraping data.</li>
          <li>Harassing other users or store representatives.</li>
          <li>Using the platform for any activity that violates Nepalese cyber laws.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">6. Intellectual Property</h2>
        <p className="mb-4">All content on this platform, including the "Tamrakar Complex" brand, logo, UI design, and proprietary price algorithms, is the exclusive property of Tamrakar Complex. Unauthorized reproduction is strictly prohibited.</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">7. Termination</h2>
        <p className="mb-4">We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">8. Governing Law and Jurisdiction</h2>
        <p className="mb-4">These Terms shall be governed and construed in accordance with the laws of Nepal. Any disputes arising shall be subject to the exclusive jurisdiction of the courts in Kathmandu.</p>
      </section>
    `,
  },
  "about-us": {
    title: "About Tamrakar Complex | Nepal's Premier Gadget Destination",
    description: "Discover the history and digital mission of Tamrakar Complex, the landmark tech hub of Nepal. From physical store excellence to digital platform innovation.",
    content: `
      <section>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold mb-4">The Heart of Nepal's Tech Revolution</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Since the early days of mobile technology in Nepal, Tamrakar Complex has been the destination where innovation meets the consumer.</p>
        </div>

        <h2 className="text-2xl font-bold mb-4">Our Heritage</h2>
        <p className="mb-6">For over 20 years, the Tamrakar Complex building in Pako, New Road, has stood as the beating heart of Nepal's mobile and electronics market. It is the place where every new technology makes its debut in the country and where millions of Nepalese have found their first smartphones, laptops, and gadgets. We are more than a building; we are a landmark of progress.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <div className="p-6 border rounded-2xl text-center bg-secondary/20">
            <h3 className="text-3xl font-bold text-primary mb-2">20+</h3>
            <p className="text-sm font-medium">Years of Excellence</p>
          </div>
          <div className="p-6 border rounded-2xl text-center bg-secondary/20">
            <h3 className="text-3xl font-bold text-primary mb-2">200+</h3>
            <p className="text-sm font-medium">Verified Stores</p>
          </div>
          <div className="p-6 border rounded-2xl text-center bg-secondary/20">
            <h3 className="text-3xl font-bold text-primary mb-2">1M+</h3>
            <p className="text-sm font-medium">Happy Customers</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">The Digital Transformation</h2>
        <p className="mb-6">In 2024, we embarked on a mission to digitize this iconic tech hub. <strong>TamrakarComplex.com</strong> is the digital evolution of our physical presence. We recognized that while our physical stores offer unmatched variety, the modern consumer needs transparency, convenience, and trust—values that we can now provide at scale through our digital platform.</p>

        <h2 className="text-2xl font-bold mt-10 mb-6">Our Core Pillars</h2>
        <div className="space-y-8">
          <div className="flex gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">1</div>
            <div>
              <h3 className="text-xl font-bold mb-2">Price Transparency</h3>
              <p className="text-muted-foreground">We eliminate the "guessing game" of gadget shopping. Our platform provides daily updated prices for mobiles, laptops, and accessories, reflecting the real market rates in New Road.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">2</div>
            <div>
              <h3 className="text-xl font-bold mb-2">Curated Marketplace</h3>
              <p className="text-muted-foreground">Every listing on our marketplace is monitored for quality. We connect individual sellers with trusted buyback centers and genuine buyers, ensuring a safe transaction environment.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">3</div>
            <div>
              <h3 className="text-xl font-bold mb-2">Expert Technical Support</h3>
              <p className="text-muted-foreground">Leveraging the expertise of hundreds of on-site technicians, our digital service desk brings professional repair services to your fingertips, complete with tracking and warranty.</p>
            </div>
          </div>
        </div>

        <div className="my-16 p-8 bg-primary text-primary-foreground rounded-3xl">
          <h2 className="text-2xl font-bold mb-4 text-white">Our Commitment to Authenticity</h2>
          <p className="text-lg opacity-90 mb-6">In a market often flooded with grey products and inconsistent service, Tamrakar Complex stands for authenticity. By digitizing the operations of a physical landmark, we ensure that there is always a face and a physical location behind every digital transaction.</p>
          <p className="font-bold">We don't just sell gadgets; we build the future of tech commerce in Nepal.</p>
        </div>

        <h2 className="text-2xl font-bold mb-4">Visit Us</h2>
        <p className="mb-4">Experience the best of both worlds. Browse our collections online or visit us at our physical location to touch and feel the latest technology.</p>
        <p className="font-medium">New Road TamrakarComplex , Kathmandu</p>
      </section>
    `,
  },
};

export default function ContentPage({ slug: propSlug }: ContentPageProps) {
  const { slug: paramSlug } = useParams();
  const slug = propSlug || paramSlug;

  const { data: page, isLoading } = useQuery<ContentPageModel | null>({
    queryKey: ["content_page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (data) {
        return {
          title: data.title ?? "",
          content: data.content ?? null,
          description: (data as any).description ?? null,
          meta_title: (data as any).meta_title ?? null,
          meta_description: (data as any).meta_description ?? null,
          og_image: (data as any).og_image ?? null,
        };
      }

      const fallback = slug ? fallbackPages[slug] : null;
      return fallback ? { title: fallback.title, content: fallback.content, description: fallback.description } : null;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEO title="Page Not Found" description="The page you are looking for does not exist." noindex />
        <Header />
        <div className="container flex-1 py-20 text-center">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p className="mt-2 text-muted-foreground">The page you are looking for does not exist.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={page.meta_title || page.title}
        description={page.meta_description || page.description || page.title}
        image={page.og_image || undefined}
        url={slug ? `/${slug}` : undefined}
      />
      <Header />
      <main className="container max-w-4xl flex-1 py-10">
        <h1 className="mb-6 text-4xl font-bold">{page.title}</h1>
        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content || "") }} />
      </main>
      <Footer />
    </div>
  );
}
