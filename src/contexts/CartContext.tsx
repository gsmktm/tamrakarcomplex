import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { Product } from "@/hooks/useProducts";
import { normalizeStoredCart, safeCartQuantity, MAX_CART_DISTINCT_ITEMS, MAX_CART_ITEM_QUANTITY } from "@/lib/cartState";
import { parseProductPrice } from "@/lib/utils";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? normalizeStoredCart(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {
      // Browsers can deny or exhaust local storage; keep cart usable in memory.
    }
  }, [cart]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    const amount = safeCartQuantity(quantity);
    if (!amount || !product?.id || !product.name) {
      toast.error("Invalid item or quantity");
      return;
    }
    if (product.in_stock === false || product.stock_quantity === 0) {
      toast.error("This item is currently unavailable");
      return;
    }
    setCart(previous => {
      const existing = previous.find(item => item.product.id === product.id);
      if (existing) {
        return previous.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(MAX_CART_ITEM_QUANTITY, item.quantity + amount) }
            : item
        );
      }
      if (previous.length >= MAX_CART_DISTINCT_ITEMS) return previous;
      return [...previous, { product, quantity: amount }];
    });
    toast.success("Cart updated");
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(previous => previous.filter(item => item.product.id !== productId));
    toast.info("Removed from cart");
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) return;
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    const validQuantity = Math.min(quantity, MAX_CART_ITEM_QUANTITY);
    setCart(previous =>
      previous.map(item =>
        item.product.id === productId ? { ...item, quantity: validQuantity } : item
      )
    );
  }, [removeFromCart]);

  // Stable callback: payment confirmation effects must not re-verify because
  // the cart provider happened to re-render.
  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem("cart");
    } catch {
      // State is already cleared even if browser storage is unavailable.
    }
  }, []);

  const cartTotal = useMemo(() => cart.reduce((total, item) => {
    const price = parseProductPrice(item.product.price_value, item.product.price);
    return total + (Number.isFinite(price) && price > 0 ? price * item.quantity : 0);
  }, 0), [cart]);

  const cartCount = useMemo(() =>
    cart.reduce((count, item) => count + item.quantity, 0), [cart]);

  const contextValue = useMemo(() => ({
    cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount,
  }), [cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount]);

  return (
    <CartContext.Provider
      value={contextValue}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
