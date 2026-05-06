import { useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please login to book a repair");
      navigate(`/auth?redirect=/repair`);
      return;
    }

    if (!formData.device_brand || !formData.device_model || !formData.issue_type || !formData.phone) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await repairMutation.mutateAsync(formData);
      toast.success("Repair request submitted successfully!");
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
      navigate(`/repair-tracking?code=${trackCode.trim()}`);
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

          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-slate-900">
            <h3 className="text-2xl font-black mb-8">Book Instant Repair</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">Device Brand</label>
                  <Input 
                    placeholder="e.g. iPhone, Samsung" 
                    className="h-12 rounded-xl border-slate-200"
                    value={formData.device_brand}
                    onChange={(e) => setFormData({...formData, device_brand: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">Model Name</label>
                  <Input 
                    placeholder="e.g. 15 Pro, S23 Ultra" 
                    className="h-12 rounded-xl border-slate-200"
                    value={formData.device_model}
                    onChange={(e) => setFormData({...formData, device_model: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500">Problem Type</label>
                <Select 
                  value={formData.issue_type} 
                  onValueChange={(v) => setFormData({...formData, issue_type: v})}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select Issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBLEM_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">Phone Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="98XXXXXXXX" 
                      className="h-12 pl-11 rounded-xl border-slate-200"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">Your Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="City / Area" 
                      className="h-12 pl-11 rounded-xl border-slate-200"
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
