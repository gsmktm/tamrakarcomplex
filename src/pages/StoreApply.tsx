import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Loader2, 
  Send, 
  Store, 
  CheckCircle2, 
  User, 
  Building2, 
  FileText, 
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/common/ImageUploader";
import { Progress } from "@/components/ui/progress";
import { submitStoreApplicationWithFlow } from "@/services/submissionService";
import { isValidEmail, isValidNepalPhone, normalizeEmail, normalizePhone, sanitizeText } from "@/lib/security";
import { cn } from "@/lib/utils";

type StoreApplyForm = {
  storeName: string;
  ownerName: string;
  phone: string;
  email: string;
  shopNo: string;
  location: string;
  businessType: string;
  message: string;
  logoUrl: string;
  licenseUrl: string;
  whatsapp: string;
  viber: string;
};

const initialForm: StoreApplyForm = {
  storeName: "",
  ownerName: "",
  phone: "",
  email: "",
  shopNo: "",
  location: "Inside Tamrakar Complex",
  businessType: "",
  message: "",
  logoUrl: "",
  licenseUrl: "",
  whatsapp: "",
  viber: "",
};

type Step = 1 | 2 | 3;

export default function StoreApply() {
  const [form, setForm] = useState<StoreApplyForm>(initialForm);
  const [step, setStep] = useState<Step>(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastApplicationId, setLastApplicationId] = useState<string | null>(null);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const email = normalizeEmail(form.email);
      const phone = normalizePhone(form.phone);

      // Validation
      if (!sanitizeText(form.storeName, 120)) throw new Error("Store name is required");
      if (!sanitizeText(form.ownerName, 120)) throw new Error("Owner name is required");
      if (!isValidNepalPhone(phone)) throw new Error("Enter a valid Nepal mobile number");
      if (!isValidEmail(email)) throw new Error("Enter a valid email address");

      // Call the complete flow with all functions
      const result = await submitStoreApplicationWithFlow({
        store_name: sanitizeText(form.storeName, 120),
        owner_name: sanitizeText(form.ownerName, 120),
        phone,
        email,
        shop_number: sanitizeText(form.shopNo, 80),
        location: sanitizeText(form.location, 200),
        business_type: sanitizeText(form.businessType, 120),
        message: sanitizeText(form.message, 1200),
        // Add new fields
        logo_url: form.logoUrl,
        license_url: form.licenseUrl,
        whatsapp: form.whatsapp,
        viber: form.viber,
      });

      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message || "Store application sent successfully!");
      setLastApplicationId(result.applicationId);
      setIsSubmitted(true);
      setForm(initialForm);
    },
    onError: (error: Error) => {
      console.error("Store application error:", error);
      toast.error(error.message || "Could not send your application");
    },
  });

  const updateField = (field: keyof StoreApplyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const nextStep = () => {
    if (step === 1) {
      if (!form.ownerName || !form.email || !form.phone) {
        toast.error("Please fill in all owner details");
        return;
      }
      if (!isValidEmail(form.email)) {
        toast.error("Please enter a valid email");
        return;
      }
      if (!isValidNepalPhone(normalizePhone(form.phone))) {
        toast.error("Please enter a valid Nepal phone number");
        return;
      }
    }
    if (step === 2) {
      if (!form.storeName || !form.shopNo || !form.businessType) {
        toast.error("Please fill in all store details");
        return;
      }
    }
    setStep((s) => (s + 1) as Step);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep((s) => (s - 1) as Step);
    window.scrollTo(0, 0);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < 3) {
      nextStep();
      return;
    }
    applyMutation.mutate();
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping duration-1000" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600 border-4 border-white shadow-lg">
                <CheckCircle2 className="h-12 w-12" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Thank You for Applying!</h1>
              <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                Your application to join the Tamrakar Complex Marketplace has been received.
              </p>
            </div>

            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="py-6 space-y-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Application Reference</span>
                  <code className="text-lg font-mono bg-background px-4 py-1 rounded-md border shadow-sm">
                    {lastApplicationId || "PENDING-ID"}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please keep this reference ID for any future inquiries regarding your application.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2 text-left">
              <div className="p-4 rounded-xl border bg-card shadow-sm space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold">What happens next?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our verification team will review your shop details and documents. This usually takes <strong>2-3 business days</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-card shadow-sm space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="font-bold">Check your inbox</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We've sent a confirmation message to your email. We'll also reach out via phone if we need more info.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Button size="lg" className="px-8" asChild>
                <Link to="/stores">Explore Other Stores</Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8" asChild>
                <Link to="/">Return to Home</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-8">
              Need immediate assistance? <Link to="/contact" className="underline underline-offset-4 hover:text-primary">Contact Support</Link>
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Apply as a Store | Tamrakar Complex"
        description="Register your shop for Tamrakar Complex store listings and marketplace access."
        url="/stores/apply"
      />
      <Header />

      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" asChild className="mb-8 hover:bg-transparent p-0">
            <Link to="/stores" className="flex items-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Stores
            </Link>
          </Button>

          <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
            <aside className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Store className="h-6 w-6" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Grow Your Business</h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Join the largest electronics hub in Nepal. Get discovered by thousands of customers daily.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Verified Badge</h3>
                    <p className="text-sm text-muted-foreground text-balance">Get a verification badge to build trust with potential buyers.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Store Dashboard</h3>
                    <p className="text-sm text-muted-foreground text-balance">Manage your products, offers, and repairs from a dedicated portal.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Lead Generation</h3>
                    <p className="text-sm text-muted-foreground text-balance">Receive direct inquiries for your products and services.</p>
                  </div>
                </div>
              </div>

              <Card className="bg-primary/5 border-none">
                <CardContent className="pt-6">
                  <p className="text-sm italic text-muted-foreground">
                    "Since joining Tamrakar Complex online, our store footfall has increased by 40%. The marketplace tools are easy to use!"
                  </p>
                  <p className="mt-4 text-sm font-semibold">— Owner, I-Fix Nepal</p>
                </CardContent>
              </Card>
            </aside>

            <div className="space-y-6">
              <div className="mb-8">
                <div className="flex justify-between mb-2 text-sm font-medium">
                  <span className={cn(step >= 1 ? "text-primary" : "text-muted-foreground")}>Personal Info</span>
                  <span className={cn(step >= 2 ? "text-primary" : "text-muted-foreground")}>Shop Details</span>
                  <span className={cn(step >= 3 ? "text-primary" : "text-muted-foreground")}>Verification</span>
                </div>
                <Progress value={(step / 3) * 100} className="h-2" />
              </div>

              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {step === 1 && <User className="h-5 w-5 text-primary" />}
                    {step === 2 && <Building2 className="h-5 w-5 text-primary" />}
                    {step === 3 && <FileText className="h-5 w-5 text-primary" />}
                    {step === 1 && "Owner Information"}
                    {step === 2 && "Store Information"}
                    {step === 3 && "Documents & Verification"}
                  </CardTitle>
                  <CardDescription>
                    {step === 1 && "Tell us about yourself so we can reach out."}
                    {step === 2 && "Enter your shop details as they should appear."}
                    {step === 3 && "Upload documents to speed up approval."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {step === 1 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="ownerName">Full Name</Label>
                          <Input 
                            id="ownerName" 
                            placeholder="e.g. Ram Bahadur" 
                            value={form.ownerName} 
                            onChange={(e) => updateField("ownerName", e.target.value)} 
                            required 
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input 
                              id="phone" 
                              placeholder="98XXXXXXXX" 
                              value={form.phone} 
                              onChange={(e) => updateField("phone", e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input 
                              id="email" 
                              type="email" 
                              placeholder="name@example.com" 
                              value={form.email} 
                              onChange={(e) => updateField("email", e.target.value)} 
                              required 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="storeName">Store Name</Label>
                          <Input 
                            id="storeName" 
                            placeholder="e.g. Tamrakar Mobile Center" 
                            value={form.storeName} 
                            onChange={(e) => updateField("storeName", e.target.value)} 
                            required 
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="shopNo">Shop No.</Label>
                            <Input 
                              id="shopNo" 
                              placeholder="e.g. G-12, 1st Floor" 
                              value={form.shopNo} 
                              onChange={(e) => updateField("shopNo", e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <select 
                              id="location" 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={form.location} 
                              onChange={(e) => updateField("location", e.target.value)}
                            >
                              <option value="Inside Tamrakar Complex">Inside Tamrakar Complex</option>
                              <option value="Outside / Surrounding">Outside / Surrounding</option>
                              <option value="Other Area in Kathmandu">Other Area in Kathmandu</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="whatsapp">WhatsApp (Optional)</Label>
                            <Input 
                              id="whatsapp" 
                              placeholder="98XXXXXXXX" 
                              value={form.whatsapp} 
                              onChange={(e) => updateField("whatsapp", e.target.value)} 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="viber">Viber (Optional)</Label>
                            <Input 
                              id="viber" 
                              placeholder="98XXXXXXXX" 
                              value={form.viber} 
                              onChange={(e) => updateField("viber", e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="businessType">Business Category</Label>
                          <Input 
                            id="businessType" 
                            placeholder="e.g. Retail, Wholesale, Repair Center" 
                            value={form.businessType} 
                            onChange={(e) => updateField("businessType", e.target.value)} 
                            required 
                          />
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Shop Logo / Profile Picture
                          </Label>
                          <ImageUploader 
                            value={form.logoUrl ? [form.logoUrl] : []} 
                            onChange={(urls) => updateField("logoUrl", urls[0] || "")}
                            folder="store-logos"
                          />
                          <p className="text-xs text-muted-foreground">This will be displayed in the store directory.</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Business Registration / License
                          </Label>
                          <ImageUploader 
                            value={form.licenseUrl ? [form.licenseUrl] : []} 
                            onChange={(urls) => updateField("licenseUrl", urls[0] || "")}
                            folder="store-licenses"
                          />
                          <p className="text-xs text-muted-foreground">Upload a clear photo of your business registration document.</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message to Review Team (Optional)</Label>
                          <Textarea 
                            id="message" 
                            placeholder="Tell us anything else that might help with your application..." 
                            value={form.message} 
                            onChange={(e) => updateField("message", e.target.value)} 
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      {step > 1 ? (
                        <Button type="button" variant="outline" onClick={prevStep}>
                          Previous
                        </Button>
                      ) : (
                        <div></div>
                      )}
                      
                      {step < 3 ? (
                        <Button type="button" onClick={nextStep} className="gap-2">
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button type="submit" className="gap-2" disabled={applyMutation.isPending}>
                          {applyMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Submit Application
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
