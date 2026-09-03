import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Send, Twitter, Users, Youtube, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { footerLinkGroups } from "@/data/siteNavigation";
import { getErrorMessage } from "@/lib/utils";
import { readAppSettings, readThemeSettings } from "@/lib/siteSettings";
import type { FooterConfig } from "@/types/app";
import logo from "@/assets/logo.png";

const emailSchema = z
  .string()
  .trim()
  .min(5, "Email must be at least 5 characters")
  .max(320, "Email must be less than 320 characters")
  .email("Please enter a valid email address");

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [contactInfo, setContactInfo] = useState(readAppSettings().contact_info);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  const [config, setConfig] = useState<FooterConfig>({
    showNewsletter: true,
    description:
      "Tamrakar Complex brings product discovery, price intelligence, instant selling, exchange, repair booking, and trusted store discovery into one Nepal-first gadget platform.",
    copyrightText: "© 2026 Tamrakar Complex. All rights reserved.",
    showSocialIcons: true,
    socialLinks: {
      facebook: "#",
      twitter: "#",
      instagram: "#",
      youtube: "#",
      linkedin: "#",
    },
  });

  useEffect(() => {
    const syncFooter = () => {
      try {
        const parsed = readThemeSettings();
        if (parsed.footerSettings) {
          setConfig(parsed.footerSettings);
        }
        setContactInfo(readAppSettings().contact_info);
      } catch {
        // Ignore malformed local theme customizations and keep current footer config.
      }
    };

    syncFooter();

    // Fetch total unique visitor count
    const fetchVisitorCount = async () => {
      try {
        const { count, error } = await supabase
          .from("visitor_logs")
          .select("*", { count: "exact", head: true })
          .eq("is_unique", true);
        
        if (!error && count !== null) {
          setVisitorCount(count);
        }
      } catch (e) {
        console.error("Failed to fetch visitor count:", e);
      }
    };

    fetchVisitorCount();

    window.addEventListener("theme-update", syncFooter);
    window.addEventListener("app-settings-update", syncFooter);
    return () => {
      window.removeEventListener("theme-update", syncFooter);
      window.removeEventListener("app-settings-update", syncFooter);
    };
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast({
        title: "Invalid email",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({ email: validation.data });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already subscribed",
            description: "This email is already on our list.",
          });
          setEmail("");
          return;
        }
        throw error;
      }

      toast({
        title: "Subscribed!",
        description: "You will now get news, price drops, and service updates.",
      });
      setEmail("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to subscribe. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-navy text-white/85">
      {config.showNewsletter && (
        <div className="border-b border-white/10">
          <div className="container py-12">
            <div className="mx-auto max-w-2xl text-center">
              <h3 className="mb-2 font-display text-2xl font-bold">Stay Ahead of the Gadget Market</h3>
              <p className="mb-6 text-white/65">
                Get product launches, price updates, trade-in opportunities, and repair tips in your inbox.
              </p>
              <form onSubmit={handleSubscribe} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                <Input
                  id="newsletter-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/20 bg-card/10 text-white placeholder:text-white/45"
                  required
                />
                <Button type="submit" className="hero-gradient shrink-0 gap-2 hover:opacity-90" disabled={loading}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {loading ? "..." : "Subscribe"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="container py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <Link to="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm p-1">
                <img src={logo} alt="Tamrakar Complex" width={32} height={32} className="h-7 w-7 object-contain" loading="lazy" />
              </div>
              <span className="font-display text-xl font-bold">
                Tamrakar<span className="text-primary">Complex</span>
              </span>
            </Link>
            <p className="mb-6 max-w-md text-sm text-white/65">{config.description}</p>

            <div className="mb-6 max-w-md">
              <h4 className="mb-3 font-display font-semibold">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-white/65">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{contactInfo.address}</span>
                </li>
                <li className="flex flex-wrap items-center gap-2 text-sm text-white/65">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${contactInfo.phone}`} className="transition-colors hover:text-primary">
                    {contactInfo.phone}
                  </a>
                  <a
                    href={`https://api.whatsapp.com/send?phone=${contactInfo.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 flex items-center gap-1 text-[#25D366] transition-colors hover:text-[#128C7E]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Chat</span>
                  </a>
                </li>
                <li className="flex items-center gap-2 text-sm text-white/65">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${contactInfo.email}`} className="break-all transition-colors hover:text-primary">
                    {contactInfo.email}
                  </a>
                </li>
              </ul>
            </div>

            {config.showSocialIcons ? (
              <div className="flex gap-2">
                {config.socialLinks.facebook && config.socialLinks.facebook !== "#" ? (
                  <a
                    href={config.socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-card/10 transition-colors hover:bg-primary hover:text-navy"
                  >
                    <Facebook className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Facebook</span>
                  </a>
                ) : null}
                {config.socialLinks.twitter && config.socialLinks.twitter !== "#" ? (
                  <a
                    href={config.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-card/10 transition-colors hover:bg-primary hover:text-navy"
                  >
                    <Twitter className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Twitter</span>
                  </a>
                ) : null}
                {config.socialLinks.instagram && config.socialLinks.instagram !== "#" ? (
                  <a
                    href={config.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-card/10 transition-colors hover:bg-primary hover:text-navy"
                  >
                    <Instagram className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Instagram</span>
                  </a>
                ) : null}
                {config.socialLinks.youtube && config.socialLinks.youtube !== "#" ? (
                  <a
                    href={config.socialLinks.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-card/10 transition-colors hover:bg-primary hover:text-navy"
                  >
                    <Youtube className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">YouTube</span>
                  </a>
                ) : null}
                {config.socialLinks.linkedin && config.socialLinks.linkedin !== "#" ? (
                  <a
                    href={config.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-card/10 transition-colors hover:bg-primary hover:text-navy"
                  >
                    <Linkedin className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">LinkedIn</span>
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          {footerLinkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="mb-4 font-display font-semibold">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-sm text-white/65 transition-colors hover:text-primary">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/50">
          <div>{config.copyrightText}</div>
          {visitorCount !== null && (
            <div className="flex items-center gap-2 bg-card/5 px-3 py-1 rounded-full border border-white/10">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">
                Total Visitors: <span className="text-white">{visitorCount.toLocaleString()}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
