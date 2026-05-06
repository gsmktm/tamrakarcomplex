import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { getErrorMessage, parseProductPrice } from "@/lib/utils";
import { isValidEmail, isValidNepalPhone, normalizeEmail, normalizePhone, sanitizeText } from "@/lib/security";

type PaymentMethod = "cod" | "esewa";

const ESEWA_ENABLED = import.meta.env.VITE_ESEWA_ENABLED === "true";

type CreateOrderSecureResponse = {
  success?: boolean;
  error?: string;
  order?: {
    id: string;
  };
};

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

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
    setLoading(true);

    try {
      if (paymentMethod === "esewa" && !ESEWA_ENABLED) {
        throw new Error("eSewa is not enabled in this deployment yet. Please use Cash on Delivery for now.");
      }
      if (!user) throw new Error("Please sign in before checkout.");
      const checkoutPhone = normalizePhone(formData.phone);
      const checkoutEmail = normalizeEmail(formData.email || user.email || "");
      if (!isValidNepalPhone(checkoutPhone)) throw new Error("Enter a valid Nepal mobile number.");
      if (checkoutEmail && !isValidEmail(checkoutEmail)) throw new Error("Enter a valid email address.");

      // 1. Create order + items through the secure edge function so price, stock,
      // rate limit, and commission-critical item fields are validated server-side.
      const { data, error } = await supabase.functions.invoke<CreateOrderSecureResponse>("create-order-secure", {
        body: {
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
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            store_id: item.product.store_id ?? null,
          })),
        },
      });

      if (error) throw error;
      if (!data?.success || !data.order?.id) {
        throw new Error(data?.error || "Order could not be created.");
      }

      const orderId = data.order.id;

      // 2. Handle Payment
      if (paymentMethod === "esewa") {
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke("create-payment-session", {
          body: { order_id: orderId, payment_method: "esewa" },
        });
        if (sessionError) throw sessionError;
        if (!sessionData?.payment_url || !sessionData?.payment_data) {
          throw new Error("Payment session could not be created.");
        }
        
        const form = document.createElement("form");
        form.setAttribute("method", "POST");
        form.setAttribute("action", sessionData.payment_url);

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
      } else {
        // COD
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke("create-payment-session", {
          body: { order_id: orderId, payment_method: "cod" },
        });
        if (sessionError) throw sessionError;
        if (sessionData?.success === false) {
          throw new Error(sessionData.error || "Order payment setup could not be completed.");
        }

        toast.success("Order placed successfully!");
        clearCart();
        navigate(`/order-success?oid=${orderId}`);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to place order"));
    } finally {
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
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} className="space-y-3">
                {ESEWA_ENABLED ? (
                  <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-secondary/50">
                    <RadioGroupItem value="esewa" id="esewa" />
                    <Label htmlFor="esewa" className="flex-1 cursor-pointer font-medium flex items-center gap-2">
                      <img src="https://esewa.com.np/common/images/esewa_logo.png" alt="eSewa" className="h-6" />
                      eSewa Mobile Wallet
                    </Label>
                  </div>
                ) : null}
                <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-secondary/50">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex-1 cursor-pointer font-medium">
                    Cash on Delivery (COD)
                  </Label>
                </div>
              </RadioGroup>
              {!ESEWA_ENABLED ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Online payment is hidden until a signed eSewa gateway is configured for this deployment.
                </p>
              ) : null}
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
                disabled={loading}
              >
                {loading ? "Processing..." : `Place Order (NPR ${cartTotal.toLocaleString()})`}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                By placing this order, you agree to our Terms of Service.
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
