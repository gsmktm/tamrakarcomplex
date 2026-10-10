import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { getErrorMessage } from "@/lib/utils";
import { submitContactMessage } from "@/services/submissionService";
import { readAppSettings } from "@/lib/siteSettings";
import { normalizePhone } from "@/lib/security";
import { useSearchParams } from "react-router-dom";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export default function ContactUs() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactInfo, setContactInfo] = useState(readAppSettings().contact_info);
  const [searchParams] = useSearchParams();
  const requestedModel = searchParams.get("model")?.trim() ?? "";
  const requestedVariant = searchParams.get("variant")?.trim() ?? "";
  const isBuyingInquiry = searchParams.get("intent") === "buy" && Boolean(requestedModel);

  useEffect(() => {
    const sync = () => setContactInfo(readAppSettings().contact_info);
    window.addEventListener("app-settings-update", sync);
    return () => window.removeEventListener("app-settings-update", sync);
  }, []);

  const whatsappNumber = normalizePhone(contactInfo.whatsapp).replace(/[^0-9]/g, "");
  const mobileDigits = whatsappNumber.replace(/^977/, "");
  const displayMobile = `+977-${mobileDigits}`;
  const landline = contactInfo.phone || "+977-015351731";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: isBuyingInquiry ? `Buying request: ${requestedModel}` : "",
      message: isBuyingInquiry
        ? `I want to buy ${requestedModel}${requestedVariant ? ` (${requestedVariant})` : ""}. Please confirm stock, store, warranty, and final price.`
        : "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await submitContactMessage({
        name: values.name,
        email: values.email,
        subject: values.subject,
        message: values.message,
      });

      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We will get back to you shortly.",
      });
      form.reset();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Contact Tamrakar Complex"
        description="Reach Tamrakar Complex for gadget buying, selling, repair, and support inquiries in Nepal."
        url="/contact-us"
        keywords={["contact Tamrakar", "gadget support Nepal", "repair inquiry", "store inquiry"]}
      />
      <Header />

      <main className="flex-1 container py-10">
        <div className="grid gap-10 md:grid-cols-2 lg:mb-16">
          <div>
            <h1 className="mb-4 text-4xl font-bold">Contact Tamrakar Complex</h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Have questions about buying, selling, or repairing gadgets? Reach out to our dedicated support team. We're here to ensure you have the best experience at Nepal's premier gadget hub.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Visit Our Complex</h3>
                  <p className="text-muted-foreground">New Road TamrakarComplex , Kathmandu</p>
                  <p className="text-sm text-primary mt-2 font-medium">Located in the heart of Kathmandu's tech district.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">Customer Support</h3>
                  <p className="text-muted-foreground">Landline: {landline}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-muted-foreground">Mobile/WhatsApp: {displayMobile}</p>
                    <a
                      href={`https://api.whatsapp.com/send?phone=${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#25D366] text-white text-sm font-medium hover:bg-[#128C7E] transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat Now
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 italic">Available Sun-Fri, 10:00 AM - 7:00 PM</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Email Correspondence</h3>
                  <p className="text-muted-foreground">General: info@tamrakarcomplex.com</p>
                  <p className="text-muted-foreground">Support: support@tamrakarcomplex.com</p>
                  <p className="text-muted-foreground">Business: biz@tamrakarcomplex.com</p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-secondary/30 border border-secondary">
              <h3 className="text-lg font-bold mb-3">Our Operating Hours</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between border-b border-border pb-1">
                  <span>Sunday - Friday</span>
                  <span className="font-medium">10:00 AM - 8:00 PM</span>
                </li>
                <li className="flex justify-between border-b border-border pb-1">
                  <span>Saturday</span>
                  <span className="font-medium">11:00 AM - 6:00 PM</span>
                </li>
                <li className="flex justify-between text-muted-foreground">
                  <span>Public Holidays</span>
                  <span>Variable (Contact Us)</span>
                </li>
              </ul>
            </div>
          </div>

          <Card className="shadow-lg border-primary/10">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-2xl">
                {isBuyingInquiry ? `Buy ${requestedModel}` : "Send a Digital Inquiry"}
              </CardTitle>
              <CardDescription className="text-base">
                {isBuyingInquiry
                  ? "Send this request and our team will confirm availability and connect you with a suitable store."
                  : "Use the form below for marketplace assistance, store verification, or repair tracking inquiries."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inquiry Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Repair Status, Store Partnership" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please provide details about your inquiry..." 
                            className="min-h-[150px] resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full hero-gradient h-12 text-lg font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Submit Message
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-20 grid gap-12">
          <section>
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border bg-card">
                <h3 className="font-bold mb-2 text-lg">Where is Tamrakar Complex exactly?</h3>
                <p className="text-muted-foreground">We are located at New Road TamrakarComplex , Kathmandu. We are the landmark building easily recognized by our large tech-brand signage, situated directly across from the historical Dharahara area periphery.</p>
              </div>
              <div className="p-6 rounded-xl border bg-card">
                <h3 className="font-bold mb-2 text-lg">Can I book a repair online?</h3>
                <p className="text-muted-foreground">Yes, you can use our Service Desk portal to book a repair slot. Alternatively, you can message us here with your device details for a preliminary quote.</p>
              </div>
              <div className="p-6 rounded-xl border bg-card">
                <h3 className="font-bold mb-2 text-lg">Are all stores in the complex verified?</h3>
                <p className="text-muted-foreground">The digital platform features "Verified Stores" that have passed our trust and authenticity checks. Look for the verification badge on store profiles.</p>
              </div>
              <div className="p-6 rounded-xl border bg-card">
                <h3 className="font-bold mb-2 text-lg">Do you handle international shipping?</h3>
                <p className="text-muted-foreground">Currently, our marketplace and delivery services are focused within Nepal. We offer doorstep delivery in Kathmandu Valley and courier services for other major cities.</p>
              </div>
            </div>
          </section>

          <section className="bg-primary/5 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6">Partner With Us</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-3">For Store Owners</h3>
                <p className="text-muted-foreground mb-4">Want to list your store on the Tamrakar Complex digital platform? Reach out to our vendor relations team.</p>
                <a href="mailto:vendors@tamrakarcomplex.com" className="text-primary font-medium hover:underline">vendors@tamrakarcomplex.com</a>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">For Brands</h3>
                <p className="text-muted-foreground mb-4">Interested in advertising or setting up an official experience center? Contact our marketing department.</p>
                <a href="mailto:marketing@tamrakarcomplex.com" className="text-primary font-medium hover:underline">marketing@tamrakarcomplex.com</a>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">For Media</h3>
                <p className="text-muted-foreground mb-4">For press releases, tech collaborations, or media inquiries regarding the Nepal gadget market.</p>
                <a href="mailto:media@tamrakarcomplex.com" className="text-primary font-medium hover:underline">media@tamrakarcomplex.com</a>
              </div>
            </div>
          </section>

          <section className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">How to Reach Us by Transport</h2>
            <div className="max-w-3xl mx-auto space-y-4 text-muted-foreground text-lg">
              <p>
                <strong>Public Transport:</strong> Take any micro-bus or bus heading to Ratnapark or New Road Gate. From New Road Gate, it is a 5-minute walk towards Pako.
              </p>
              <p>
                <strong>Private Vehicle:</strong> Parking is available in the underground parking of Tamrakar Complex and adjacent municipal parking lots in New Road.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
