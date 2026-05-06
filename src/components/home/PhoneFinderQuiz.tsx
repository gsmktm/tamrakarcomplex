import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  {
    title: "What's your budget?",
    options: [
      { label: "Under 25k", value: "budget:low" },
      { label: "25k - 60k", value: "budget:mid" },
      { label: "Above 60k", value: "budget:high" },
      { label: "I don't mind", value: "budget:any" },
    ],
  },
  {
    title: "Primary use for your phone?",
    options: [
      { label: "Gaming & Performance", value: "use:gaming" },
      { label: "Photography & Video", value: "use:camera" },
      { label: "Long Battery Life", value: "use:battery" },
      { label: "Business & Productivity", value: "use:business" },
      { label: "Social Media & Media", value: "use:social" },
      { label: "Basic Daily Use", value: "use:normal" },
    ],
  },
  {
    title: "Preferred brand?",
    options: [
      { label: "Apple (iPhone)", value: "brand:apple" },
      { label: "Samsung", value: "brand:samsung" },
      { label: "Xiaomi / Redmi", value: "brand:xiaomi" },
      { label: "Vivo / OPPO", value: "brand:vivo-oppo" },
      { label: "Any Brand", value: "brand:any" },
    ],
  },
];

export const PhoneFinderQuiz = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleSelect = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[step] = value;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Finalize and redirect
      const budget = answers[0]?.split(":")[1];
      const brand = answers[2]?.split(":")[1];
      
      const params = new URLSearchParams();
      if (budget === "low") params.append("maxPrice", "25000");
      if (budget === "mid") { params.append("minPrice", "25000"); params.append("maxPrice", "60000"); }
      if (budget === "high") params.append("minPrice", "60000");
      
      if (brand && brand !== "any") {
        if (brand === "vivo-oppo") params.append("brand", "Vivo,OPPO");
        else params.append("brand", brand);
      }
      
      navigate(`/buy?${params.toString()}`);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <section className="py-20 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              Guided Choice
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight">Phone Finder Quiz</h2>
            <p className="text-muted-foreground text-lg">Not sure which phone to buy? Answer 3 quick questions to find your perfect match.</p>
          </div>

          <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 md:p-12 space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-primary">Step {step + 1} of {STEPS.length}</span>
                  <span className="text-muted-foreground">{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-bold">{STEPS[step].title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {STEPS[step].options.map((option) => (
                    <div
                      key={option.value}
                      className={`
                        cursor-pointer p-6 rounded-2xl border-2 transition-all flex items-center justify-between
                        ${answers[step] === option.value 
                          ? "border-primary bg-primary/5 shadow-md" 
                          : "border-muted hover:border-primary/30 hover:bg-muted/50"}
                      `}
                      onClick={() => handleSelect(option.value)}
                    >
                      <span className="font-semibold">{option.label}</span>
                      {answers[step] === option.value ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button 
                  variant="ghost" 
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
                <Button 
                  size="lg" 
                  className="px-8 rounded-xl"
                  disabled={!answers[step]}
                  onClick={handleNext}
                >
                  {step === STEPS.length - 1 ? "Show Recommendations" : "Continue"}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
