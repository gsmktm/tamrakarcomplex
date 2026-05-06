import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  price: string;
  brand: string;
  category: string;
}

export default function PriceList() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, brand, category")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: string }) => {
      const priceValue = parseFloat(price.replace(/[^\d.]/g, "")) || 0;
      const { error } = await supabase
        .from("products")
        .update({ price, price_value: priceValue })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Price updated successfully");
      setEditingId(null);
    },
    onError: (error) => {
      toast.error("Failed to update price: " + error.message);
    },
  });

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditPrice(product.price);
  };

  const handleSave = () => {
    if (editingId) {
      updatePriceMutation.mutate({ id: editingId, price: editPrice });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditPrice("");
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Price List Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.brand || "-"}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <Input
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-32"
                      />
                    ) : (
                      product.price
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={updatePriceMutation.isPending}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => handleEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}