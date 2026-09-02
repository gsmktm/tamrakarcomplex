import { useState } from "react";
import { 
  Smartphone, 
  Battery, 
  Zap, 
  Wifi, 
  Volume2, 
  Camera, 
  ShieldAlert, 
  Thermometer, 
  Search, 
  ChevronRight, 
  ArrowLeft,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useDiagnosticsBySymptom } from "@/hooks/useRepairDiagnostics";

const SYMPTOMS = [
  { id: "power", label: "Power & Startup", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "battery", label: "Battery & Charging", icon: Battery, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "screen", label: "Display & Touch", icon: Smartphone, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "audio", label: "Sound & Audio", icon: Volume2, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "connectivity", label: "Wifi & Network", icon: Wifi, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "camera", label: "Camera & Flash", icon: Camera, color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "heat", label: "Overheating", icon: Thermometer, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "security", label: "Software & Lock", icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10" },
];

export function DiagnosticsFlow() {
  const [step, setStep] = useState<"symptoms" | "diagnoses">("symptoms");
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);

  const { data: currentDiagnoses = [], isLoading } = useDiagnosticsBySymptom(selectedSymptom);

  const handleSymptomSelect = (id: string) => {
    setSelectedSymptom(id);
    setStep("diagnoses");
  };

  const handleBack = () => {
    setStep("symptoms");
    setSelectedSymptom(null);
  };

  return (
    <div className="space-y-8">
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4" role="status" aria-live="polite">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Smart Diagnostics...</p>
        </div>
      )}

      {!isLoading && step === "symptoms" ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-foreground">What's wrong with your device?</h3>
            <p className="text-muted-foreground">Select the primary issue to get an instant diagnosis and cost estimate.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SYMPTOMS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSymptomSelect(s.id)}
                className="group flex min-h-32 flex-col items-center p-6 bg-card rounded-[2rem] border-2 border-border hover:border-primary hover:shadow-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", s.bg, s.color)}>
                  <s.icon className="h-7 w-7" />
                </div>
                <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors text-center">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Symptoms
            </Button>
            <div className="h-4 w-px bg-border" />
            <h3 className="font-black text-foreground capitalize">
              {SYMPTOMS.find(s => s.id === selectedSymptom)?.label} Issues
            </h3>
          </div>

          <div className="grid gap-4">
            {currentDiagnoses.length > 0 ? (
              currentDiagnoses.map((d, i) => (
                <Card key={i} className="rounded-[2rem] border-border overflow-hidden group hover:border-primary/30 transition-all">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-8 flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            d.severity === "high" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                          )}>
                            {d.severity === "high" ? <AlertTriangle className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                          </div>
                          <h4 className="text-xl font-black text-foreground">{d.title}</h4>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Symptom</p>
                          <p className="text-muted-foreground font-medium">{d.symptom_description}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Expert Solution</p>
                          <p className="text-muted-foreground font-medium">{d.solution_description}</p>
                        </div>
                      </div>
                      <div className="bg-muted p-8 md:w-64 flex flex-col justify-center items-center text-center gap-4 border-l border-border">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Cost</p>
                          <p className="text-xl font-black text-primary">{d.cost_range}</p>
                        </div>
                        <Button className="w-full rounded-xl font-bold shadow-lg shadow-primary/20" asChild>
                          <Link to={`/repair/custom?issue=${encodeURIComponent(d.title)}`}>
                            Book Repair
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="p-12 text-center bg-card rounded-[3rem] border-4 border-dashed border-border space-y-4">
                <Search className="h-12 w-12 text-slate-200 mx-auto" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest">No common diagnoses found for this issue.</p>
                <Button className="rounded-xl font-bold" asChild>
                  <Link to="/repair/custom">Get Custom Quote</Link>
                </Button>
              </div>
            )}
          </div>
          
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Wrench className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Still not sure what's wrong?</h4>
                <p className="text-slate-400 text-sm">Bring your device for a free professional diagnostic check.</p>
              </div>
            </div>
            <Button size="lg" className="rounded-xl font-black px-8 h-12" asChild>
              <Link to="/repair/custom?issue=Diagnostics">Book Free Checkup</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
