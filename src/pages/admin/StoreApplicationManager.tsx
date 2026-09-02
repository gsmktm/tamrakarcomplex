import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STORE_APPLICATIONS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  FileCheck,
  FileText,
  AlertCircle,
  Database,
  RefreshCw,
  Search,
  CreditCard,
  ShieldCheck,
  Clock3
} from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
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
  requested_package_slug?: string | null;
  billing_cycle?: string | null;
  linked_store_id?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
}

function isSchemaMissingError(error: unknown) {
  const message = getErrorMessage(error);
  const code = (error as any)?.code;
  return (
    code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("store_applications")
  );
}

export default function StoreApplicationManager() {
  const [selectedApp, setSelectedApp] = useState<StoreApplication | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewPackage, setReviewPackage] = useState("free");
  const [reviewBillingCycle, setReviewBillingCycle] = useState("monthly");
  const queryClient = useQueryClient();

  const openApplication = (application: StoreApplication) => {
    setSelectedApp(application);
    setReviewNotes(application.review_notes || "");
    setReviewPackage(application.requested_package_slug || "free");
    setReviewBillingCycle(application.billing_cycle || "monthly");
  };

  const { data: packages = [] } = useQuery({
    queryKey: ["store-application-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_packages").select("id,name,slug,price").order("price");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: applications, isLoading, error: applicationsError, refetch } = useQuery({
    queryKey: ["admin_store_applications"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("store_applications")
          .select(STORE_APPLICATIONS_COLUMNS.join(","))
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Normalize data to handle potential schema variations
        return (data || []).map(app => ({
          ...app,
          owner_name: app.owner_name || app.contact_name || "Unknown owner",
          store_name: app.store_name || app.business_name || "Untitled store",
          message: app.message || app.description
        })) as StoreApplication[];
      } catch (err) {
        handleSupabaseError(err, "StoreApplicationManager: Failed to fetch applications");
        throw err;
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'needs_info' }) => {
      setIsProcessing(true);
      try {
        const { data, error } = await (supabase.rpc as any)("review_store_application", {
          p_application_id: id,
          p_status: status,
          p_review_notes: reviewNotes.trim() || null,
          p_package_slug: reviewPackage,
          p_billing_cycle: reviewBillingCycle,
        });
        if (error) throw error;
        return data;
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin_store_applications"] });
      toast.success(variables.status === "approved" ? "Application approved and onboarding created" : variables.status === "needs_info" ? "Information request recorded" : "Application rejected with review record");
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
      if (!reviewNotes.trim()) { toast.error("Add a rejection reason before rejecting this application"); return; }
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

  const filteredApplications = (applications ?? []).filter((application) => {
    if (statusFilter !== "all" && application.status !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    return !query || [application.store_name, application.owner_name, application.email, application.phone, application.location, application.shop_number]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
  });

  const pendingApplications = (applications ?? []).filter((application) => application.status === "pending");
  const overduePendingCount = pendingApplications.filter((application) => differenceInCalendarDays(new Date(), new Date(application.created_at)) >= 3).length;

  const getReviewReadiness = (application: StoreApplication) => {
    const missing = [
      !application.email && "email",
      !application.phone && "phone",
      !application.location && "location",
      !application.logo_url && "logo",
      !application.license_url && "license",
    ].filter(Boolean) as string[];
    return { missing, ready: missing.length === 0 };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Applications</h1>
          <p className="text-muted-foreground">Verify applications, record decisions, create owner access and control package activation.</p>
        </div>
        <Button asChild variant="outline"><Link to="/stores/apply" target="_blank"><ExternalLink className="mr-2 h-4 w-4" />Open public application</Link></Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: "Pending review", value: pendingApplications.length, icon: Clock3, filter: "pending" }, { label: "Needs information", value: applications?.filter((item) => item.status === "needs_info").length ?? 0, icon: AlertCircle, filter: "needs_info" }, { label: "Approved", value: applications?.filter((item) => item.status === "approved").length ?? 0, icon: CheckCircle, filter: "approved" }, { label: "Paid plan requests", value: applications?.filter((item) => item.requested_package_slug && item.requested_package_slug !== "free").length ?? 0, icon: CreditCard, filter: "all" }].map(({ label, value, icon: Icon, filter }) => <button type="button" onClick={() => setStatusFilter(filter)} key={label} className="rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-center justify-between"><div className="text-2xl font-black">{value}</div><Icon className="h-5 w-5 text-primary" /></div><div className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div></button>)}
      </div>

      {statusFilter === "pending" && !isLoading && !applicationsError && (
        <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2"><Clock3 className="h-5 w-5 text-blue-600" /></div>
              <div>
                <h2 className="font-bold">{pendingApplications.length ? `${pendingApplications.length} application${pendingApplications.length === 1 ? "" : "s"} awaiting review` : "Pending queue is clear"}</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {pendingApplications.length ? "Open each application, verify its contact details and documents, confirm the requested package, then approve it or request the exact missing information." : "New store applications will appear here automatically. No admin action is required right now."}
                </p>
              </div>
            </div>
            {overduePendingCount > 0 && <Badge variant="destructive" className="w-fit px-3 py-1.5">{overduePendingCount} waiting 3+ days</Badge>}
          </div>
          {pendingApplications.length > 0 && <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3"><div className="rounded-lg border bg-background/70 px-3 py-2"><strong>1. Verify</strong><span className="ml-1 text-muted-foreground">identity, phone and location</span></div><div className="rounded-lg border bg-background/70 px-3 py-2"><strong>2. Check</strong><span className="ml-1 text-muted-foreground">logo and business license</span></div><div className="rounded-lg border bg-background/70 px-3 py-2"><strong>3. Decide</strong><span className="ml-1 text-muted-foreground">approve, request info or reject</span></div></div>}
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-2xl border bg-card p-4">
        <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search store, owner, email, phone, location or shop…" className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All applications</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="needs_info">Needs information</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {applicationsError && isSchemaMissingError(applicationsError) ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-lg border bg-muted/20 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Database className="h-5 w-5 text-amber-600" />
              </div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold">Store applications table is not installed</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The frontend is ready, but the connected Supabase database is missing <span className="font-mono">public.store_applications</span>.
                    Apply the migration below, then retry after the schema cache reloads.
                  </p>
                </div>
                <div className="rounded-md border bg-background p-3 text-sm">
                  <div className="font-medium">Migration file</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    supabase/migrations/20260629002000_repair_store_applications_table.sql
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/suadmin/store-network">Open Store Network Flow</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="font-semibold">Application Approval Flow</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                "1. Customer submits store application.",
                "2. Admin reviews owner, location, phone, logo, and license.",
                "3. Approve creates draft store and verifies duplicate name/email.",
                "4. Assign store admin and permissions.",
                "5. Publish only after profile, package, and public status are ready.",
              ].map((item) => (
                <div key={item} className="rounded-md border bg-muted/20 px-3 py-2">{item}</div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!applicationsError || !isSchemaMissingError(applicationsError) ? (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Store Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Requested plan</TableHead>
              <TableHead>Review readiness</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : applicationsError ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40">
                  <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-3 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div>
                      <p className="font-medium">Could not load store applications</p>
                      <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(applicationsError)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12">
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-full bg-muted p-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium">No matching store applications</h3>
                      <p className="text-sm text-muted-foreground">
                        Try another status or search. New public submissions appear here automatically.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="text-sm">
                    {format(new Date(app.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{app.store_name}</TableCell>
                  <TableCell>{app.owner_name}</TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell><div className="font-medium capitalize">{app.requested_package_slug || "free"}</div><div className="text-xs text-muted-foreground capitalize">{app.billing_cycle || "monthly"}</div></TableCell>
                  <TableCell>{(() => { const readiness = getReviewReadiness(app); const age = Math.max(0, differenceInCalendarDays(new Date(), new Date(app.created_at))); return <div><Badge variant={readiness.ready ? "outline" : "secondary"} className={readiness.ready ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" : ""}>{readiness.ready ? "Ready to review" : `${readiness.missing.length} item${readiness.missing.length === 1 ? "" : "s"} missing`}</Badge><div className={`mt-1 text-xs ${age >= 3 && app.status === "pending" ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{age === 0 ? "Submitted today" : `${age} day${age === 1 ? "" : "s"} waiting`}</div>{!readiness.ready && <div className="mt-1 max-w-44 text-xs text-muted-foreground">{readiness.missing.join(", ")}</div>}</div>; })()}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openApplication(app)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {app.status === "pending" ? "Review" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      ) : null}

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

              <div className="rounded-2xl border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><div><div className="font-bold">Review decision</div><div className="text-xs text-muted-foreground">The package and notes below are stored with the decision and audit trail.</div></div></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Approved package</Label><Select value={reviewPackage} onValueChange={setReviewPackage} disabled={selectedApp.status === "approved"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{packages.map((item) => <SelectItem key={item.id} value={item.slug || "free"}>{item.name} · Rs. {Number(item.price || 0).toLocaleString()}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Billing cycle</Label><Select value={reviewBillingCycle} onValueChange={setReviewBillingCycle} disabled={selectedApp.status === "approved"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Review notes / information required / rejection reason</Label><Textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} maxLength={3000} rows={4} disabled={selectedApp.status === "approved"} placeholder="Document verification, duplicate checks, missing information, decision reason and follow-up…" /></div>
                </div>
                {reviewPackage !== "free" && selectedApp.status !== "approved" && <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200"><CreditCard className="h-4 w-4 shrink-0" /><span>Approval creates a private store and pending subscription. Public visibility and paid features activate only after payment verification.</span></div>}
                {selectedApp.linked_store_id && <Button asChild variant="outline" size="sm"><Link to={`/suadmin/stores?store=${selectedApp.linked_store_id}`}>Open linked store <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
            {selectedApp?.status !== 'approved' && selectedApp?.status !== 'rejected' && (
              <>
                <Button 
                  variant="outline" 
                  className="text-amber-600 hover:bg-amber-50"
                  onClick={() => { if (!reviewNotes.trim()) { toast.error("Describe the information required"); return; } updateStatusMutation.mutate({ id: selectedApp!.id, status: 'needs_info' }); }}
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
              <Button asChild variant="outline"><Link to="/suadmin/subscriptions"><CreditCard className="mr-2 h-4 w-4" />Review subscription/payment</Link></Button>
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
