import { Button } from "@/components/ui/button";

interface PaymentMethodsLoadErrorProps {
  retrying: boolean;
  onRetry: () => void;
}

/** Keep checkout recoverable when the payment-provider registry cannot be read. */
export function PaymentMethodsLoadError({ retrying, onRetry }: PaymentMethodsLoadErrorProps) {
  return (
    <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-3">
      <p className="text-sm text-destructive">
        Payment options could not be loaded. Please try again before placing an order.
      </p>
      <Button type="button" variant="outline" size="sm" disabled={retrying} onClick={onRetry}>
        {retrying ? "Retrying payment options…" : "Retry payment options"}
      </Button>
    </div>
  );
}
