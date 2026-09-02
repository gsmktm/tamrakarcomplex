import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, ArrowLeft, Smartphone, MonitorSmartphone, BatteryCharging, Zap, Camera, Droplets, Cpu, HelpCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { getErrorMessage } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useRepairDevices } from "@/hooks/useRepair";
import { createRepairRequest } from "@/services/repairService";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^(97|98)\d{8}$/, "Enter a valid Nepal mobile number (97/98 + 8 digits)"),
  email: z.string().email().optional().or(z.literal("")),
  device_brand: z.string().min(1, "Brand is required"),
  device_model: z.string().min(1, "Model is required"),
  issue_type: z.enum(['screen', 'battery', 'charging', 'camera', 'water_damage', 'software', 'other']),
  description: z.string().min(10, "Please describe the issue"),
  preferred_date: z.date().optional(),
  guide_id: z.string().optional(),
  device_id: z.string().optional(),
});

const FALLBACK_BRANDS = [
  { id: "Apple", label: "Apple" },
  { id: "Samsung", label: "Samsung" },
  { id: "Xiaomi", label: "Xiaomi" },
  { id: "OnePlus", label: "OnePlus" },
  { id: "Oppo", label: "Oppo" },
  { id: "Vivo", label: "Vivo" },
  { id: "Realme", label: "Realme" },
  { id: "Google", label: "Google" },
  { id: "Other", label: "Other" },
];

const ISSUES = [
  { id: "screen", label: "Screen / Display", icon: MonitorSmartphone, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "battery", label: "Battery / Power", icon: BatteryCharging, color: "text-amber-500", bg: "bg-amber-50" },
  { id: "charging", label: "Charging Port", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50" },
  { id: "camera", label: "Camera Issues", icon: Camera, color: "text-purple-500", bg: "bg-purple-50" },
  { id: "water_damage", label: "Water Damage", icon: Droplets, color: "text-cyan-500", bg: "bg-cyan-50" },
  { id: "software", label: "Software / Boot", icon: Cpu, color: "text-green-500", bg: "bg-green-50" },
  { id: "other", label: "Other Problems", icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted" },
];

export default function CustomRepairRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const { data: devices } = useRepairDevices();

  const prefilledDevice = searchParams.get("device");
  const prefilledGuide = searchParams.get("guide");
  const prefilledIssue = searchParams.get("issue");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.user_metadata?.display_name || user?.user_metadata?.full_name || "",
      phone: user?.user_metadata?.phone || "",
      email: user?.email || "",
      device_brand: "",
      device_model: "",
      issue_type: "screen",
      description: prefilledIssue ? `Diagnosed issue: ${prefilledIssue}` : "",
    },
  });

  useEffect(() => {
    if (prefilledIssue) {
      const lowerIssue = prefilledIssue.toLowerCase();
      if (lowerIssue.includes("battery") || lowerIssue.includes("power")) form.setValue("issue_type", "battery");
      if (lowerIssue.includes("charging")) form.setValue("issue_type", "charging");
      if (lowerIssue.includes("camera")) form.setValue("issue_type", "camera");
      if (lowerIssue.includes("water")) form.setValue("issue_type", "water_damage");
      if (lowerIssue.includes("software") || lowerIssue.includes("diagnostics") || lowerIssue.includes("boot")) form.setValue("issue_type", "software");
    }

    if (prefilledDevice && devices) {
      const device = devices.find(d => d.slug === prefilledDevice);
      if (device) {
        form.setValue("device_brand", device.brand);
        form.setValue("device_model", device.name);
        form.setValue("device_id", device.id);
      }
    }
    if (prefilledGuide) {
      form.setValue("guide_id", prefilledGuide);
    }
  }, [prefilledDevice, prefilledGuide, prefilledIssue, devices, form]);

  // Dynamic brands from DB devices, with fallbacks
  const brands = useMemo(() => {
    if (!devices?.length) return FALLBACK_BRANDS;
    const dbBrands = Array.from(new Set(devices.map(d => d.brand).filter(Boolean)));
    if (dbBrands.length === 0) return FALLBACK_BRANDS;
    return dbBrands.map(b => ({ id: b, label: b }));
  }, [devices]);

  // Watch selected brand for model filtering
  const selectedBrand = form.watch("device_brand");

  // Models derived from DB devices filtered by selected brand
  const models = useMemo(() => {
    if (!devices?.length || !selectedBrand) return [];
    return devices.filter(d => d.brand === selectedBrand).map(d => d.name);
  }, [devices, selectedBrand]);

  // Reset model when brand changes (but not during initial prefilled-device load)
  useEffect(() => {
    if (selectedBrand && prefilledDevice) return;
    if (selectedBrand) form.setValue("device_model", "");
  }, [selectedBrand, prefilledDevice, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const repair = await createRepairRequest({
        user_id: user?.id ?? null,
        name: values.name,
        phone: values.phone,
        email: values.email || null,
        device_brand: values.device_brand,
        device_model: values.device_model,
        issue_type: values.issue_type,
        description: values.description,
        preferred_date: values.preferred_date ? values.preferred_date.toISOString() : null,
        guide_id: values.guide_id,
        device_id: values.device_id,
      });

      setTrackingId(repair.tracking_id || null);
      toast({
        title: "Request Submitted!",
        description: repair.tracking_id
          ? `Your tracking ID is ${repair.tracking_id}.`
          : "We will contact you shortly to confirm your appointment.",
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
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Book a Gadget Repair"
        description="Book smartphone diagnostics and repair service for screen, battery, charging, camera, and software issues."
        url="/repair/custom"
        keywords={["phone repair Nepal", "mobile service booking", "screen repair", "battery replacement"]}
      />
      <Header />
      <main className="container max-w-2xl flex-1 py-12">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 -ml-2 text-muted-foreground hover:text-primary">
          <Link to="/repair">
            <ArrowLeft className="h-4 w-4" />
            Back to Repair Hub
          </Link>
        </Button>
      </div>
      <Card className="border-border shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-primary h-2" />
        <CardHeader className="space-y-1 pb-8">
          <CardTitle className="text-3xl font-bold">Book a Professional Repair</CardTitle>
          <CardDescription className="text-lg">
            Expert repair service for your smartphone. Select your device and issue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trackingId && (
            <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-semibold text-green-900">Repair request submitted</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-2xl font-black text-green-700">{trackingId}</p>
                <Button asChild className="rounded-xl">
                  <Link to={`/repair/track?id=${encodeURIComponent(trackingId)}`}>Track Repair</Link>
                </Button>
              </div>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Nepal Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="98XXXXXXXX" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" className="h-11 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="device_brand"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-sm font-semibold">Select Device Brand</FormLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {brands.map((brand) => (
                        <div
                          key={brand.id}
                          onClick={() => field.onChange(brand.id)}
                          className={cn(
                            "relative cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all hover:bg-muted",
                            field.value === brand.id 
                              ? "border-primary bg-primary/5 shadow-sm" 
                              : "border-border bg-card"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-bold",
                            field.value === brand.id ? "text-primary" : "text-muted-foreground"
                          )}>
                            {brand.label}
                          </span>
                          {field.value === brand.id && (
                            <div className="absolute top-1 right-1">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="device_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Device Model</FormLabel>
                    <FormControl>
                      {models.length > 0 ? (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select your model..." />
                          </SelectTrigger>
                          <SelectContent>
                            {models.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                            <SelectItem value="Other">Other (specify below)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder={selectedBrand ? `e.g. ${selectedBrand} model name` : "Select a brand first"}
                          className="h-11 rounded-xl"
                          disabled={!selectedBrand}
                          {...field}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issue_type"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-sm font-semibold">What's the primary issue?</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {ISSUES.map((issue) => {
                        const Icon = issue.icon;
                        return (
                          <div
                            key={issue.id}
                            onClick={() => field.onChange(issue.id)}
                            className={cn(
                              "relative cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center space-y-3",
                              field.value === issue.id 
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md scale-[1.02]" 
                                : "border-border bg-card hover:border-border/80"
                            )}
                          >
                            <div className={cn("p-3 rounded-full", issue.bg, issue.color)}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <span className={cn(
                              "text-xs font-semibold leading-tight",
                              field.value === issue.id ? "text-primary" : "text-foreground"
                            )}>
                              {issue.label}
                            </span>
                            {field.value === issue.id && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Problem Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe what happened and any symptoms you've noticed..."
                        className="min-h-[120px] rounded-xl resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-semibold">Preferred Appointment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-11 pl-3 text-left font-normal rounded-xl border-border",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select a convenient date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Confirm Repair Booking
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      </main>
      <Footer />
    </div>
  );
}
