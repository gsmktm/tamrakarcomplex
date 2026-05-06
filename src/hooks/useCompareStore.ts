import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

export interface CompareProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: string;
  brand?: string;
  rating?: number;
}

interface CompareStore {
  items: CompareProduct[];
  addItem: (product: CompareProduct) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const { items } = get();
        if (items.find((item) => item.id === product.id)) {
          toast.error('Product already in comparison list');
          return;
        }
        if (items.length >= 4) {
          toast.error('You can compare up to 4 products at once');
          return;
        }
        set({ items: [...items, product] });
        toast.success(`${product.name} added to comparison`);
      },
      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: 'tamrakar-compare-storage',
    }
  )
);
