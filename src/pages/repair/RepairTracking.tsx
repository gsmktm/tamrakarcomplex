import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Loader2, CheckCircle2, Clock, Wrench, ShieldCheck, AlertCircle, ChevronRight, MapPin, Calendar, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { repairStatusLabel } from "@/services/repairService";

type DbError = { code?: string; message?: string };
type RepairTrackingRpcRow = {
  id: string;
  tracking_id: string;
  status: string;
  device_model: string;
  device_brand: string;
  issue_type: string;
  estimated_cost: number | null;
  final_cost: number | null;
  created_at: string;
  assigned_store: RepairRequest["stores"];
  repair_device: RepairRequest["repair_devices"];
};

function isSchemaMissingError(error: DbError | null | undefined) {
  const code = (error?.code as string | undefined) ?? "";
  const message = ((error?.message as string | undefined) ?? "").toLowerCase();
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    code === "42703" ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("could not find a relationship") ||
    message.includes("does not exist")
  );
}

function isTrackingIdColumnMissing(error: DbError | null | undefined) {
  const message = ((error?.message as string | undefined) ?? "").toLowerCase();
  const code = (error?.code as string | undefined) ?? "";
  return code === "42703" && message.includes("tracking_id");
}

interface RepairRequest {
  id: string;
  tracking_id: string;
  status: string;
  device_model: string;
  device_brand: string;
  issue_type: string;
  estimated_cost: number | null;
  final_cost: number | null;
  created_at: string;
  stores: {
    name: string;
    location: string;
    shop_no: string;
    phone: string;
  } | null;
  repair_devices: {
    name: string;
    image: string | null;
  } | null;
}

export default function RepairTracking() {
  const [searchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [repair, setRepair] = useState<RepairRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRepair = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Preferred (secure): single-row RPC. Works without public SELECT policy.
      const rpc = await supabase.rpc("get_repair_tracking", { p_tracking_id: id.toUpperCase() });
      if (!rpc.error) {
        const rows = Array.isArray(rpc.data) ? rpc.data : rpc.data ? [rpc.data] : [];
        const row = rows[0] as RepairTrackingRpcRow | undefined;
        if (!row) {
          setRepair(null);
          setError("We couldn't find a repair request with that tracking ID. Please check and try again.");
          return;
        }
        setRepair({
          id: row.id,
          tracking_id: row.tracking_id,
          status: row.status,
          device_model: row.device_model,
          device_brand: row.device_brand,
          issue_type: row.issue_type,
          estimated_cost: row.estimated_cost ?? null,
          final_cost: row.final_cost ?? null,
          created_at: row.created_at,
          stores: row.assigned_store ?? null,
          repair_devices: row.repair_device ?? null,
        });
        return;
      }

      // Fallback: direct join (requires RLS/policies + tracking_id column)
      if (rpc.error && !isSchemaMissingError(rpc.error)) throw rpc.error;

      const { data, error: fetchError } = await supabase
        .from("repair_requests")
        .select(
          `
            *,
            stores (
              name,
              location,
              shop_no,
              phone
            ),
            repair_devices (
              name,
              image
            )
          `,
        )
        .eq("tracking_id", id.toUpperCase())
        .single();

      if (fetchError) throw fetchError;
      setRepair(data as unknown as RepairRequest);
    } catch (err: unknown) {
      console.error(err);
      if (isTrackingIdColumnMissing(err)) {
        setError("Repair tracking is not enabled yet (missing tracking_id). Ask an admin to apply the latest Supabase migrations.");
      } else if (isSchemaMissingError(err)) {
        setError("Repair tracking is not configured on the database yet. Apply the Repair module migrations and try again.");
      } else {
        setError("We couldn't find a repair request with that tracking ID. Please check and try again.");
      }
      setRepair(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setTrackingId(id);
      fetchRepair(id);
    }
  }, [searchParams]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchRepair(trackingId);
  };

  const steps = [
    { id: 'new', label: 'Received', icon: CheckCircle2, description: 'We have received your request.' },
    { id: 'assigned', label: 'Assigned', icon: ShieldCheck, description: 'A repair store has accepted the lead.' },
    { id: 'inspection', label: 'Inspection', icon: Search, description: 'The device is being checked.' },
    { id: 'repairing', label: 'Repairing', icon: Wrench, description: 'A technician is working on it.' },
    { id: 'ready', label: 'Ready', icon: Smartphone, description: 'Ready for pickup or handover.' },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, description: 'The repair is complete.' },
  ];

  const normalizedStatus = repair?.status === "pending" ? "new" : repair?.status === "in_progress" ? "repairing" : repair?.status;
  const currentStepIndex = Math.max(0, steps.findIndex(s => s.id === normalizedStatus));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <SEO
        title="Track Your Repair Status"
        description="Enter your tracking ID to see the real-time status of your device repair at Tamrakar Complex."
        url="/repair/track"
      />
      <Header />

      <main className="flex-1 py-12">
        <div className="container max-w-3xl space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Track Your Repair</h1>
            <p className="text-lg text-muted-foreground">
              Enter the tracking ID provided in your confirmation email or SMS.
            </p>
          </div>

          <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <form onSubmit={handleTrack} className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    className="pl-12 h-14 text-lg rounded-xl border-slate-200 focus-visible:ring-primary"
                    placeholder="e.g. TR-A1B2C3"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8 rounded-xl font-bold" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Track Status"}
                </Button>
              </form>
              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle className="h-5 w-5" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {repair && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Status Stepper */}
              <Card className="border-slate-100 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">Repair Status</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">Tracking ID: {repair.tracking_id}</CardDescription>
                    </div>
                    <Badge className="bg-primary hover:bg-primary text-white px-4 py-1 rounded-full text-sm capitalize">
                      {repairStatusLabel(repair.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="relative flex justify-between">
                    {/* Progress Bar Background */}
                    <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-10" />
                    {/* Active Progress Bar */}
                    <div 
                      className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-1000 -z-10" 
                      style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                    />
                    
                    {steps.map((step, index) => {
                      const Icon = step.icon;
                      const isCompleted = index <= currentStepIndex;
                      const isActive = index === currentStepIndex;
                      
                      return (
                        <div key={step.id} className="flex flex-col items-center text-center space-y-3 min-w-0 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-500 bg-white",
                            isCompleted ? "border-primary text-primary" : "border-slate-200 text-slate-300",
                            isActive && "ring-4 ring-primary/20"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <p className={cn("font-bold text-sm", isCompleted ? "text-slate-900" : "text-slate-400")}>
                              {step.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-tight hidden md:block max-w-[120px]">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Details Grid */}
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-slate-100 shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      Device Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="h-16 w-16 bg-white rounded-lg p-2 border border-slate-100">
                        <img 
                          src={repair.repair_devices?.image || "/placeholder.svg"} 
                          alt={repair.device_model} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-bold">{repair.device_model}</p>
                        <p className="text-sm text-muted-foreground">{repair.device_brand}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Issue Type</p>
                        <p className="font-medium capitalize">{repair.issue_type?.replace('_', ' ')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Est. Cost</p>
                        <p className="font-bold text-primary">
                          {repair.estimated_cost ? `Rs. ${repair.estimated_cost}` : "Pending Quote"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Final Cost</p>
                        <p className="font-bold text-primary">
                          {repair.final_cost ? `Rs. ${repair.final_cost}` : "Not finalized"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Service Center
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {repair.stores ? (
                      <>
                        <div className="space-y-1">
                          <p className="font-bold text-lg">{repair.stores.name}</p>
                          <p className="text-sm text-muted-foreground">{repair.stores.location}</p>
                          <p className="text-sm text-muted-foreground">Shop No. {repair.stores.shop_no}</p>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Received: {format(new Date(repair.created_at), "MMM d, yyyy")}</span>
                          </div>
                          <Button variant="link" className="p-0 h-auto text-primary" asChild>
                            <a href={`tel:${repair.stores.phone}`}>Call Store</a>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-center space-y-3">
                        <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                          <Clock className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Assigning your repair to the best available service center...
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="bg-blue-600 text-white rounded-[2rem] p-10 flex flex-col md:flex-row items-center gap-8 justify-between shadow-xl shadow-blue-500/20">
                <div className="space-y-4 text-center md:text-left">
                  <h3 className="text-2xl font-bold">Need help with your repair?</h3>
                  <p className="text-blue-100 max-w-md">
                    Our support team is available 24/7 to answer any questions regarding your service status.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="rounded-full px-8 bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                    <Link to="/contact">Chat with Support</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
