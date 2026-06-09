import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, CreditCard } from "lucide-react";
import { mobileMasterService, EmiPlan } from "@/services/mobileMasterService";
import { toast } from "sonner";

const EMPTY: Partial<EmiPlan> = { bank_name: '', duration_months: 12, interest_rate: 0, processing_fee: 0, status: 'active' };

export default function EmiPlanManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmiPlan | null>(null);
  const [form, setForm] = useState<Partial<EmiPlan>>(EMPTY);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['all_emi_plans'],
    queryFn: () => mobileMasterService.getAllEmiPlans(),
  });

  const save = useMutation({
    mutationFn: (p: Partial<EmiPlan>) => mobileMasterService.upsertEmiPlan(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all_emi_plans'] });
      qc.invalidateQueries({ queryKey: ['emi_plans'] });
      setOpen(false);
      toast.success('EMI plan saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteEmiPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all_emi_plans'] });
      toast.success('EMI plan deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openAdd() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(p: EmiPlan) { setEditing(p); setForm(p); setOpen(true); }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">EMI Plans</h1>
          <p className="text-sm text-muted-foreground">Manage bank/NBFC EMI plans used for mobile pricing.</p>
        </div>
        <Button className="ml-auto gap-2" onClick={openAdd}><Plus className="h-4 w-4" />Add Plan</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank / NBFC</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Interest Rate</TableHead>
                  <TableHead>Processing Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(plans ?? []).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.bank_name}</TableCell>
                    <TableCell>{p.duration_months} months</TableCell>
                    <TableCell>{p.interest_rate}%</TableCell>
                    <TableCell>{p.processing_fee}%</TableCell>
                    <TableCell><Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => del.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!plans?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No EMI plans yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit EMI Plan' : 'Add EMI Plan'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>Bank / NBFC Name</Label>
              <Input value={form.bank_name ?? ''} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. NIC Asia Bank" />
            </div>
            <div>
              <Label>Duration (months)</Label>
              <Input type="number" value={form.duration_months ?? 12} onChange={e => setForm(f => ({ ...f, duration_months: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input type="number" step="0.01" value={form.interest_rate ?? 0} onChange={e => setForm(f => ({ ...f, interest_rate: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Processing Fee (%)</Label>
              <Input type="number" step="0.01" value={form.processing_fee ?? 0} onChange={e => setForm(f => ({ ...f, processing_fee: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.bank_name || save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
