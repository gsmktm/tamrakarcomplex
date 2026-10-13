import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentMethods, type CheckoutPaymentMethod } from "@/hooks/usePaymentMethods";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { getErrorMessage, parseProductPrice } from "@/lib/utils";
import { isValidEmail, isValidNepalPhone, normalizeEmail, normalizePhone, sanitizeText } from "@/lib/security";
import { secureGatewayUrl } from "@/lib/paymentRedirect";
import { checkoutIntentFingerprint, type CheckoutIntent } from "@/lib/checkoutIntent";

type CreateOrderSecureResponse = {
  success?: boolean;
  error?: string;
  order?: {
    id: string;
  };
};

type CreateSessionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  mode?: "demo" | "sandbox" | "production";
  redirect_url?: string;
  payment_url?: string;
  payment_data?: Record<string, string>;
};

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const checkoutIdempotencyKey = useRef({ signature: "", value: crypto.randomUUID() });
  const checkoutInFlight = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const { data: methods = [], isLoading: methodsLoading, isError: methodsError } = usePaymentMethods();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

  // Default to the first ready method (COD stays first via display_order).
  useEffect(() => {
    const firstReady = methods.find((m) => m.is_ready);
    if (firstReady && !methods.some((m) => m.slug === paymentMethod)) {
      setPaymentMethod(firstReady.slug);
    }
  }, [methods, paymentMethod]);

  const selectableMethods = useMemo(() => methods.filter((m) => m.is_ready), [methods]);
  const comingSoonMethods = useMemo(() => methods.filter((m) => !m.is_ready), [methods]);
  const selectedMethod = useMemo(
    () => selectableMethods.find((m) => m.slug === paymentMethod) ?? null,
    [selectableMethods, paymentMethod]
  );

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEO title="Checkout" description="Review your cart and complete your order." url="/checkout" noindex />
        <Header />
        <main className="flex-1 container py-10 text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <Button onClick={() => navigate("/buy")}>Browse Gadgets</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutInFlight.current) return;
    checkoutInFlight.current = true;
    setLoading(true);

    try {
      if (!selectedMethod) throw new Error("Please select a payment method.");
      if (!user) throw new Error("Please sign in before checkout.");
      const checkoutPhone = normalizePhone(formData.phone);
      const checkoutEmail = normalizeEmail(formData.email || user.email || "");
      if (!isValidNepalPhone(checkoutPhone)) throw new Error("Enter a valid Nepal mobile number.");
      if (checkoutEmail && !isValidEmail(checkoutEmail)) throw new Error("Enter a valid email address.");

      // Same checkout intent reuses a key after network failure. Changing
      // provider, quantities or shipping data creates a new server order key.
      const intent: CheckoutIntent = {
        payment_method: paymentMethod,
        shipping_address: {
          address: sanitizeText(formData.address, 240),
          city: sanitizeText(formData.city, 80),
        },
        contact_info: {
          name: sanitizeText(formData.fullName, 120),
          phone: checkoutPhone,
          email: checkoutEmail,
        },
        items: cart.map(item => ({
          product_id: item.product.id,
          source_type: item.product.source_type ?? "product",
          store_product_id: item.product.store_product_id ??
            (item.product.source_type === "store_product" ? item.product.id : null),
          quantity: item.quantity,
          store_id: item.product.store_id ?? null,
        })),
      };
      const fingerprint = checkoutIntentFingerprint(intent);
      if (checkoutIdempotencyKey.current.signature !== fingerprint) {
        checkoutIdempotencyKey.current = { signature: fingerprint, value: crypto.randomUUID() };
      }

      // 1. Secure checkout Edge Function recomputes price, stock and owner.
      const { data, error } = await supabase.functions.invoke<CreateOrderSecureResponse>("create-order-secure", {
        body: { ...intent, idempotency_key: checkoutIdempotencyKey.current.value },
      });

      if (error) throw error;
      if (!data?.success || !data.order?.id) {
        throw new Error(data?.error || "Order could not be created.");
      }

      const orderId = data.order.id;

      // 2. Handle Payment
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke<CreateSessionResponse>(
        "create-payment-session",
        { body: { order_id: orderId, payment_method: paymentMethod } }
      );
      if (sessionError) throw sessionError;
      if (sessionData?.success === false || !sessionData?.success) {
        throw new Error(sessionData?.error || "Payment session could not be created.");
      }

      if (selectedMethod.slug === "cod") {
        toast.success("Order placed successfully!");
        clearCart();
        navigate(`/order-success?oid=${orderId}`);
        return;
      }

      if (sessionData.mode === "demo") {
        // Demo mode: the gateway is bypassed; the success page settles the order
        // through verify-payment (which only auto-passes while the provider is
        // in demo mode). The cart is cleared on the success page only after
        // settlement is confirmed — same invariant as the real-gateway flow.
        navigate(sessionData.redirect_url ?? `/order-success?oid=${orderId}&demo=1`, { replace: true });
        return;
      }

      // Khalti-style hosted checkout: the gateway returns a payment_url to
      // redirect the customer to (GET navigation, no form POST).
      if (sessionData.redirect_url && !sessionData.payment_data) {
        const redirectUrl = secureGatewayUrl(sessionData.redirect_url);
        if (!redirectUrl) throw new Error("Payment gateway returned an unsafe redirect URL.");
        window.location.assign(redirectUrl);
        return;
      }

      if (sessionData.payment_url && sessionData.payment_data) {
        const formUrl = secureGatewayUrl(sessionData.payment_url);
        if (!formUrl) throw new Error("Payment gateway returned an unsafe payment URL.");
        const form = document.createElement("form");
        form.setAttribute("method", "POST");
        form.setAttribute("action", formUrl);

        for (const key in sessionData.payment_data) {
          const hiddenField = document.createElement("input");
          hiddenField.setAttribute("type", "hidden");
          hiddenField.setAttribute("name", key);
          hiddenField.setAttribute("value", String(sessionData.payment_data[key]));
          form.appendChild(hiddenField);
        }

        document.body.appendChild(form);
        form.submit();

        // Don't clear cart yet, wait for success
        return;
      }

      throw new Error("Payment session did not return a payable flow.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to place order"));
    } finally {
      checkoutInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Checkout"
        description="Review your order, enter shipping details, and complete checkout at Tamrakar Complex."
        url="/checkout"
        noindex
      />
      <Header />
      <main className="flex-1 container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                  />
                </div>
                {!user && (
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="98XXXXXXXX"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street, Chowk"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Kathmandu"
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              {methodsLoading ? (
                <p className="text-sm text-muted-foreground">Loading payment options…</p>
              ) : methodsError ? (
                <p role="alert" className="text-sm text-destructive">
                  Payment methods are unavailable. Please try checkout again shortly.
                </p>
              ) : selectableMethods.length === 0 ? (
                <p role="alert" className="text-sm text-muted-foreground">
                  There are no ready payment methods at the moment. No order has been submitted.
                </p>
              ) : (
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value)} className="space-y-3">
                  {selectableMethods.map((method) => (
                    <PaymentOption
                      key={method.slug}
                      method={method}
                      checked={paymentMethod === method.slug}
                    />
                  ))}
                  {comingSoonMethods.length > 0 && (
                    <div className="pt-2 space-y-2">
                      {comingSoonMethods.map((method) => (
                        <div
                          key={method.slug}
                          className="flex items-center space-x-2 border border-dashed p-3 rounded-md opacity-70"
                          aria-disabled="true"
                        >
                          <span className="h-4 w-4" aria-hidden />
                          <span className="flex-1 flex items-center gap-2 font-medium">
                            {method.icon_url ? (
                              <img src={method.icon_url} alt="" className="h-6" />
                            ) : null}
                            {method.name}
                          </span>
                          <Badge variant="outline">Coming soon</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </RadioGroup>
              )}
              {selectedMethod?.mode === "demo" && (
                <p className="mt-3 text-xs font-medium text-amber-600">
                  Test mode: this payment method is in demo mode and will complete instantly
                  without charging a real gateway.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="line-clamp-1 flex-1 pr-2">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="font-medium whitespace-nowrap">
                      NPR {(parseProductPrice(item.product.price_value, item.product.price) * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>NPR {cartTotal.toLocaleString()}</span>
              </div>
              <Button
                type="submit"
                form="checkout-form"
                className="w-full mt-4"
                size="lg"
                disabled={loading || methodsLoading || !selectedMethod}
              >
                {loading ? "Processing..." : `Place Order (NPR ${cartTotal.toLocaleString()})`}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Amounts shown are estimates. Your order is repriced and stock-checked securely before submission. By placing an order, you agree to our Terms of Service.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  );
}

function PaymentOption({
  method,
  checked,
}: {
  method: CheckoutPaymentMethod;
  checked: boolean;
}) {
  return (
    <div
      className={`flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-secondary/50 ${
        checked ? "border-primary" : ""
      }`}
    >
      <RadioGroupItem value={method.slug} id={method.slug} />
      <Label htmlFor={method.slug} className="flex-1 cursor-pointer font-medium flex items-center gap-2">
        {method.icon_url ? <img src={method.icon_url} alt="" className="h-6" /> : null}
        {method.name}
      </Label>
      {method.mode === "demo" && <Badge variant="outline">Test</Badge>}
    </div>
  );
}
