import { Check, Truck, Package, Clock, ShieldCheck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

interface OrderTrackingTimelineProps {
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export function OrderTrackingTimeline({ status, createdAt, updatedAt }: OrderTrackingTimelineProps) {
  const steps = [
    {
      id: "pending",
      label: "Order Placed",
      icon: Clock,
      description: "We've received your order.",
      color: "text-blue-500",
      bg: "bg-blue-500",
    },
    {
      id: "processing",
      label: "Processing",
      icon: Package,
      description: "Your items are being prepared.",
      color: "text-orange-500",
      bg: "bg-orange-500",
    },
    {
      id: "shipped",
      label: "Shipped",
      icon: Truck,
      description: "Order is on its way to you.",
      color: "text-purple-500",
      bg: "bg-purple-500",
    },
    {
      id: "delivered",
      label: "Delivered",
      icon: ShieldCheck,
      description: "Package has been delivered.",
      color: "text-green-500",
      bg: "bg-green-500",
    },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === status);
  const isCancelled = status === "cancelled";

  return (
    <div className="w-full py-8">
      {isCancelled ? (
        <div className="flex flex-col items-center justify-center p-8 bg-destructive/5 rounded-2xl border border-destructive/20 border-dashed">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <XIcon className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-destructive">Order Cancelled</h3>
          <p className="text-sm text-muted-foreground mt-1">This order was cancelled on {new Date(updatedAt).toLocaleDateString()}.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Progress Bar Background */}
          <div className="absolute top-5 left-0 w-full h-1 bg-muted rounded-full hidden md:block" />
          
          {/* Active Progress Bar */}
          <div 
            className="absolute top-5 left-0 h-1 bg-primary rounded-full transition-all duration-1000 hidden md:block" 
            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.id} className="flex md:flex-col items-center md:items-center gap-4 md:gap-4 group">
                  <div className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                    isCompleted ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground",
                    isCurrent && "ring-4 ring-primary/20 scale-110"
                  )}>
                    {isCompleted && index < currentStepIndex ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex flex-col md:text-center">
                    <span className={cn(
                      "text-sm font-bold transition-colors",
                      isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px]">
                      {isCompleted ? step.description : "Pending..."}
                    </span>
                    {isCompleted && (
                      <span className="text-[9px] font-mono mt-1 opacity-50">
                        {index === 0 ? new Date(createdAt).toLocaleDateString() : new Date(updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  );
}
