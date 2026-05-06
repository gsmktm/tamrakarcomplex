import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import type { OrderRow } from "@/types/app";

type PaymentStatus = "success" | "pending" | "failed";

type VerifyPaymentResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const oid = searchParams.get("oid") ?? searchParams.get("order_id") ?? searchParams.get("pid");
  const encodedData = searchParams.get("data");
  
  // Legacy params for backward compatibility
  const legacyRefId = searchParams.get("refId") ?? searchParams.get("ref_id") ?? searchParams.get("rid");
  const legacyAmount = searchParams.get("amt") ?? searchParams.get("amount");

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (oid) {
      const verifyAndFetchOrder = async () => {
        // ... existing order fetch
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", oid)
          .single();
        
        if (!orderError && orderData) {
          setOrder(orderData);
          if (orderData.payment_method === "esewa") {
            if (orderData.payment_status === "paid") {
              setPaymentStatus("success");
              setStatusMessage("Your eSewa payment has been verified.");
            } else {
              let verificationPayload: any = null;

              if (encodedData) {
                // eSewa v2: Decode base64 data
                try {
                  const decodedStr = atob(encodedData);
                  const decodedJson = JSON.parse(decodedStr);
                  verificationPayload = {
                    orderId: oid,
                    refId: decodedJson.transaction_uuid,
                    amount: decodedJson.total_amount,
                    transaction_data: decodedJson
                  };
                } catch (e) {
                  console.error("Failed to decode eSewa data", e);
                }
              } else if (legacyRefId && legacyAmount) {
                // Legacy eSewa fallback
                verificationPayload = {
                  orderId: oid,
                  refId: legacyRefId,
                  amount: legacyAmount,
                };
              }

              if (verificationPayload) {
                const { data: verifyData, error: verifyError } = await supabase.functions.invoke<VerifyPaymentResponse>(
                  "verify-payment",
                  {
                    body: verificationPayload,
                  },
                );

                if (verifyError || verifyData?.success === false) {
                  setPaymentStatus("failed");
                  setStatusMessage(verifyData?.error || verifyError?.message || "We could not verify your eSewa payment.");
                } else {
                  setPaymentStatus("success");
                  setStatusMessage(verifyData?.message || "Your eSewa payment has been verified.");
                }
              } else {
                setPaymentStatus("pending");
                setStatusMessage("We are waiting for eSewa verification details before confirming payment.");
              }
            }
          } else {
            setPaymentStatus("success");
            setStatusMessage("Your order has been placed successfully.");
          }
        } else {
          setPaymentStatus("failed");
          setStatusMessage("We could not find this order.");
        }
        setLoading(false);
      };
      verifyAndFetchOrder();
    } else {
      setPaymentStatus("failed");
      setStatusMessage("Missing order information.");
      setLoading(false);
    }
  }, [oid, encodedData, legacyRefId, legacyAmount]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEO title="Order Status" description="Check your recent order confirmation." url="/order-success" noindex />
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Order Status" description="Check your recent order confirmation." url="/order-success" noindex />
      <Header />
      <main className="container flex flex-1 flex-col items-center justify-center py-20 text-center">
        <div className={`mb-6 rounded-full p-6 ${
          paymentStatus === "success" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
        }`}>
          {paymentStatus === "success" ? <CheckCircle className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
        </div>
        <h1 className="mb-2 text-3xl font-bold">
          {paymentStatus === "success" ? "Order Confirmed" : paymentStatus === "failed" ? "Payment Not Verified" : "Payment Verification Pending"}
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          {statusMessage}{" "}
          {oid ? (
            <>
              Your order ID is <span className="font-mono font-semibold text-foreground">#{oid.slice(0, 8)}</span>.
            </>
          ) : null}
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild variant="outline">
            <Link to="/">Return Home</Link>
          </Button>
          {order ? (
            <Button asChild variant="secondary">
              <Link to="/user">View My Orders</Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/buy">Continue Shopping</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
