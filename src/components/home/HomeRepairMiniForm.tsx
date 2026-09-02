import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, MapPin, Smartphone, Send, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useRepairSubmit } from "@/hooks/useRepairSubmit";
import { useRepairDevices } from "@/hooks/useRepair";
import { useAuth } from "@/hooks/useAuth";
import { isValidNepalPhone } from "@/lib/security";
import { toast } from "sonner";

const PROBLEM_TYPES = [
  { label: "Screen Replacement", value: "screen" },
  { label: "Battery Problem", value: "battery" },
  { label: "Charging Issue", value: "charging" },
  { label: "Camera Repair", value: "camera" },
  { label: "Water Damage", value: "water_damage" },
  { label: "Software / Unlocking", value: "software" },
  { label: "Other Issues", value: "other" },
];

export const HomeRepairMiniForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const repairMutation = useRepairSubmit();
  
  const [formData, setFormData] = useState({
    device_brand: "",
    device_model: "",
    issue_type: "",
    phone: "",
    location: "",
  });

  const [trackCode, setTrackCode] = useState("");

  // Fetch repair devices from DB
  const { data: devices = [] } = useRepairDevices();

  // Unique brands derived from repair_devices table
  const brands = useMemo(() => {
    const brandSet = new Set(devices.map((d) => d.brand).filter(Boolean));
    return Array.from(brandSet).sort();
  }, [devices]);

  // Models filtered by selected brand
  const models = useMemo(() => {
    if (!formData.device_brand) return [];
    return devices
      .filter((d) => d.brand === formData.device_brand)
      .map((d) => d.name)
      .sort();
  }, [devices, formData.device_brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.device_brand || !formData.device_model || !formData.issue_type || !formData.phone) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!isValidNepalPhone(formData.phone)) {
      toast.error("Enter a valid Nepal mobile number (97/98 + 8 digits)");
      return;
    }

    try {
      const result = await repairMutation.mutateAsync({
        ...formData,
        name: user?.user_metadata?.full_name || user?.email || undefined,
        email: user?.email ?? null,
      });
      const trackingId = (result as { tracking_id?: string })?.tracking_id;
      toast.success(trackingId ? `Repair request submitted! Tracking: ${trackingId}` : "Repair request submitted successfully!");
      if (trackingId) {
        navigate(`/repair/track?id=${encodeURIComponent(trackingId)}`);
      }
      setFormData({
        device_brand: "",
        device_model: "",
        issue_type: "",
        phone: "",
        location: "",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    }
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackCode.trim()) {
      navigate(`/repair/track?id=${encodeURIComponent(trackCode.trim().toUpperCase())}`);
    }
  };

  return (
    <section className="py-20 bg-slate-900 text-white overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/10 -skew-x-12 translate-x-1/4" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary font-bold text-sm uppercase tracking-wider">
                <Wrench className="h-4 w-4" />
                Expert Repair Hub
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Broken Screen? <br />
                <span className="text-primary">We fix it in 60 mins.</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-lg">
                Book a professional repair service at Tamrakar Complex. 
                Certified technicians, genuine parts, and instant tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Certified Technicians",
                "Genuine Spare Parts",
                "6 Months Warranty",
                "Same Day Delivery",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium text-slate-300">{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 max-w-md">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Track Your Repair
              </h4>
              <form onSubmit={handleTrack} className="flex gap-2">
                <Input 
                  placeholder="Enter Tracking Code" 
                  className="bg-slate-900 border-slate-600 text-white h-12 rounded-xl"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                />
                <Button type="submit" className="h-12 px-6 rounded-xl font-bold">Track</Button>
              </form>
            </div>
          </div>

          <div className="bg-card rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-foreground">
            <h3 className="text-2xl font-black mb-8">Book Instant Repair</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">Device Brand</label>
                  <Select
                    value={formData.device_brand}
                    onValueChange={(v) => setFormData({ ...formData, device_brand: v, device_model: "" })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-border">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">Model Name</label>
                  <Select
                    value={formData.device_model}
                    onValueChange={(v) => setFormData({ ...formData, device_model: v })}
                    disabled={!formData.device_brand}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-border">
                      <SelectValue placeholder={formData.device_brand ? "Select Model" : "Select brand first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-muted-foreground">Problem Type</label>
                <Select 
                  value={formData.issue_type} 
                  onValueChange={(v) => setFormData({...formData, issue_type: v})}
                >
                  <SelectTrigger className="h-12 rounded-xl border-border">
                    <SelectValue placeholder="Select Issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBLEM_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">Phone Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="98XXXXXXXX" 
                      className="h-12 pl-11 rounded-xl border-border"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">Your Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="City / Area" 
                      className="h-12 pl-11 rounded-xl border-border"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 group"
                disabled={repairMutation.isPending}
              >
                {repairMutation.isPending ? "Submitting..." : "Submit Repair Request"}
                <Send className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <p className="text-center text-xs text-slate-400">
                By submitting, you agree to our repair terms and service policy.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
