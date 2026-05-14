import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Store, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Hash, 
  Briefcase,
  ExternalLink,
  FileCheck
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/utils";
import { completeFullStackStoreOnboarding, publishStore } from "@/services/submissionService";

interface StoreApplication {
  id: string;
  owner_name: string;
  contact_name: string; // Add this
  store_name: string;
  business_name: string; // Add this
  phone: string;
  email: string;
  location: string;
  shop_number: string | null;
  business_type: string | null;
  description: string | null; // Add this
  message: string | null;
  logo_url: string | null;
  license_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  created_at: string;
}

export default function StoreApplicationManager() {
  const [selectedApp, setSelectedApp] = useState<StoreApplication | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admin_store_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_applications")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Normalize data to handle potential schema variations
      return (data || []).map(app => ({
        ...app,
        owner_name: app.owner_name || app.contact_name,
        store_name: app.store_name || app.business_name,
        message: app.message || app.description
      })) as StoreApplication[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'needs_info' }) => {
      setIsProcessing(true);
      try {
        if (status === 'approved' && selectedApp) {
          // Check for existing store with same email or name to prevent duplicates
          const { data: existingStore } = await supabase
            .from("stores")
            .select("id")
            .or(`email.eq.${selectedApp.email},name.eq.${selectedApp.store_name}`)
            .maybeSingle();

          if (existingStore) {
            toast.warning("A store with this name or email already exists.");
          } else {
            // Find user by email to onboard
            const { data: userData, error: userError } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", selectedApp.email)
              .maybeSingle();

            if (userError) throw userError;

            if (userData) {
              // User exists, use the centralized onboarding function
              await completeFullStackStoreOnboarding(selectedApp, userData.id);
            } else {
              // User doesn't exist yet, create store and link by email
              const storeSlug = selectedApp.store_name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

              const { data: storeData, error: storeError } = await supabase
                .from("stores")
                .insert({
                  name: selectedApp.store_name,
                  slug: `${storeSlug}-${Math.floor(Math.random() * 1000)}`,
                  location: selectedApp.location,
                  shop_no: selectedApp.shop_number,
                  phone: selectedApp.phone,
                  email: selectedApp.email,
                  description: selectedApp.message,
                  logo_url: selectedApp.logo_url,
                  is_verified: true,
                  status: "pending_approval",
                  public_status: "draft",
                })
                .select()
                .single();

              if (storeError) throw storeError;
              
              toast.info("Store created. User not found, owner link will be manual or on signup.");
            }
          }
        }

        // Update application status
        const { error } = await supabase
          .from("store_applications")
          .update({ status })
          .eq("id", id);
        
        if (error) throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin_store_applications"] });
      toast.success(`Application ${variables.status}`);
      setSelectedApp(null);
    },
    onError: (error: unknown) => {
      toast.error(`Error updating application: ${getErrorMessage(error)}`);
      setIsProcessing(false);
    },
  });

  const handleApprove = () => {
    if (selectedApp) {
      updateStatusMutation.mutate({ id: selectedApp.id, status: 'approved' });
    }
  };

  const handleReject = () => {
    if (selectedApp) {
      updateStatusMutation.mutate({ id: selectedApp.id, status: 'rejected' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'needs_info':
        return <Badge className="bg-amber-500">Needs Info</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Applications</h1>
          <p className="text-muted-foreground">Review and approve new store registration requests.</p>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Store Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : applications?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No applications found.
                </TableCell>
              </TableRow>
            ) : (
              applications?.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="text-sm">
                    {format(new Date(app.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{app.store_name}</TableCell>
                  <TableCell>{app.owner_name}</TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedApp(app)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedApp && format(new Date(selectedApp.created_at), "PPPP")}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <Store className="h-3 w-3 mr-1" /> Store Name
                  </Label>
                  <p className="font-semibold">{selectedApp.store_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <User className="h-3 w-3 mr-1" /> Owner Name
                  </Label>
                  <p className="font-semibold">{selectedApp.owner_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <Mail className="h-3 w-3 mr-1" /> Email
                  </Label>
                  <p>{selectedApp.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <Phone className="h-3 w-3 mr-1" /> Phone
                  </Label>
                  <p>{selectedApp.phone}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <MapPin className="h-3 w-3 mr-1" /> Location
                  </Label>
                  <p>{selectedApp.location}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <Hash className="h-3 w-3 mr-1" /> Shop Number
                  </Label>
                  <p>{selectedApp.shop_number || "N/A"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <Briefcase className="h-3 w-3 mr-1" /> Business Type
                  </Label>
                  <p>{selectedApp.business_type || "N/A"}</p>
                </div>
                {(selectedApp as any).whatsapp && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase flex items-center">
                      WhatsApp
                    </Label>
                    <p>{(selectedApp as any).whatsapp}</p>
                  </div>
                )}
                {(selectedApp as any).viber && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase flex items-center">
                      Viber
                    </Label>
                    <p>{(selectedApp as any).viber}</p>
                  </div>
                )}
              </div>

              {selectedApp.message && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Message</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {selectedApp.message}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <FileCheck className="h-3 w-3 mr-1" /> Shop Logo
                  </Label>
                  {selectedApp.logo_url ? (
                    <div className="relative group aspect-square w-32 rounded-lg border overflow-hidden bg-muted">
                      <img src={selectedApp.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      <a 
                        href={selectedApp.logo_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-5 w-5 text-white" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No logo uploaded</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center">
                    <FileCheck className="h-3 w-3 mr-1" /> Business License
                  </Label>
                  {selectedApp.license_url ? (
                    <div className="relative group aspect-video w-full rounded-lg border overflow-hidden bg-muted">
                      <img src={selectedApp.license_url} alt="License" className="w-full h-full object-cover" />
                      <a 
                        href={selectedApp.license_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-5 w-5 text-white" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No license uploaded</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t mt-2">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                {getStatusBadge(selectedApp.status)}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
            {selectedApp?.status !== 'approved' && selectedApp?.status !== 'rejected' && (
              <>
                <Button 
                  variant="outline" 
                  className="text-amber-600 hover:bg-amber-50"
                  onClick={() => updateStatusMutation.mutate({ id: selectedApp!.id, status: 'needs_info' })}
                  disabled={isProcessing}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Needs Info
                </Button>
                <Button 
                  variant="outline" 
                  className="text-destructive hover:bg-destructive/10"
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Application
                </Button>
                <Button 
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve & Create Store
                </Button>
              </>
            )}
            {selectedApp?.status === 'approved' && (
              <Button 
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    // Get the store for this application
                    const { data: store, error: storeError } = await supabase
                      .from("stores")
                      .select("id")
                      .eq("email", selectedApp.email)
                      .maybeSingle();
                    
                    if (storeError || !store) {
                      toast.error("Store not found for this application");
                      return;
                    }

                    // Get current user ID for audit log
                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    if (userError || !user) {
                      toast.error("Could not get current user");
                      return;
                    }

                    await publishStore(store.id, user.id);
                    toast.success("Store published successfully!");
                    queryClient.invalidateQueries({ queryKey: ["admin_store_applications"] });
                    setSelectedApp(null);
                  } catch (error) {
                    toast.error(`Failed to publish store: ${getErrorMessage(error)}`);
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Publish Store
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelectedApp(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
