import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowUpRight, CalendarClock, CheckCircle2, Image as ImageIcon, LayoutGrid,
  Megaphone, PauseCircle, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CAMPAIGN_PLACEMENTS, isCampaignRunning, safeCampaignImage, safeCampaignPath,
  type MarketingCampaign, type CampaignPlacement,
} from "@/hooks/useCampaignPlacement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

type Draft = {
  id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_text: string;
  placement: CampaignPlacement;
  festival_key: string;
  disclosure: string;
  is_sponsored: boolean;
  is_active: boolean;
  sort_order: number;
  starts_at: string;
  ends_at: string;
};

const templates = [
  { key: "tihar", title: "Tihar Festival Collection", subtitle: "Celebrate Tihar with hand-picked technology. Confirm prices and availability with each store.", image_url: "/festival/tihar-offer.svg", link_url: "/buy", start: "2026-11-07T00:00", end: "2026-11-13T00:00" },
  { key: "chhath", title: "Chhath Festival Collection", subtitle: "Explore devices and accessories for the festive season — offers appear only when approved by stores.", image_url: "/festival/chhath-offer.svg", link_url: "/buy", start: "2026-11-14T00:00", end: "2026-11-17T00:00" },
  { key: "dashain", title: "Dashain Device Collection", subtitle: "Discover festive technology and exchange options at Tamrakar Complex.", image_url: "/festival/dashain-offer.svg", link_url: "/sell-your-phone?mode=exchange", start: "", end: "" },
  { key: "new_year", title: "New Year Tech Picks", subtitle: "Start the year with practical technology — browse products and connect with local stores.", image_url: "/festival/new-year-offer.svg", link_url: "/buy", start: "", end: "" },
];

const blank: Draft = {
  title: "", subtitle: "", image_url: "", link_url: "/buy",
  button_text: "Explore devices", placement: "home_hero",
  festival_key: "general", disclosure: "Promotion", is_sponsored: false,
  is_active: false, sort_order: 0, starts_at: "", ends_at: "",
};

function dateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const two = (x: number) => String(x).padStart(2, "0");
  return date.getFullYear() + "-" + two(date.getMonth() + 1) + "-" + two(date.getDate()) +
    "T" + two(date.getHours()) + ":" + two(date.getMinutes());
}

function toIso(value: string) { return value ? new Date(value).toISOString() : null; }

function phase(banner: MarketingCampaign) {
  if (!banner.is_active) return "Draft / Paused";
  const now = Date.now();
  if (banner.starts_at && new Date(banner.starts_at).getTime() > now) return "Scheduled";
  if (banner.ends_at && new Date(banner.ends_at).getTime() <= now) return "Expired";
  return isCampaignRunning(banner) ? "Live" : "Check dates";
}

function toDraft(banner: MarketingCampaign): Draft {
  return {
    ...blank, ...banner, id: banner.id,
    subtitle: banner.subtitle || "", image_url: banner.image_url || "",
    link_url: banner.link_url || "", button_text: banner.button_text || "Explore devices",
    festival_key: banner.festival_key || "general", disclosure: banner.disclosure || "Promotion",
    is_sponsored: banner.is_sponsored === true,
    starts_at: dateInput(banner.starts_at), ends_at: dateInput(banner.ends_at),
  };
}

export default function CampaignManager() {
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [placement, setPlacement] = useState("all");

  const { data: banners = [], isLoading, error, refetch } = useQuery({
    queryKey: ["marketing-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketing_banners").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as MarketingCampaign[];
    },
    retry: false,
  });

  const save = useMutation({
    mutationFn: async (values: Draft) => {
      const title = values.title.trim();
      if (!title || title.length > 100) throw new Error("Enter a title with no more than 100 characters.");
      if (!safeCampaignPath(values.link_url)) throw new Error("Destination must be a safe site route such as /buy (external ad redirects are disabled).");
      if (!safeCampaignImage(values.image_url)) throw new Error("Choose a local image path or a HTTPS image URL.");
      const startMs = values.starts_at ? new Date(values.starts_at).getTime() : null;
      const endMs = values.ends_at ? new Date(values.ends_at).getTime() : null;
      if ((startMs !== null && !Number.isFinite(startMs)) || (endMs !== null && !Number.isFinite(endMs))) throw new Error("Use valid campaign dates.");
      if (startMs !== null && endMs !== null && endMs <= startMs) throw new Error("End time must be later than start time.");
      if (!CAMPAIGN_PLACEMENTS.some((item) => item.value === values.placement)) throw new Error("Select a supported placement.");
      const payload = {
        title, subtitle: values.subtitle.trim() || null,
        image_url: values.image_url.trim(),
        link_url: values.link_url.trim(),
        button_text: values.button_text.trim() || "Explore",
        placement: values.placement,
        festival_key: values.festival_key.trim() || "general",
        disclosure: values.is_sponsored ? "Sponsored" : "Promotion",
        is_sponsored: values.is_sponsored,
        is_active: values.is_active,
        sort_order: Number.isFinite(Number(values.sort_order)) ? Math.trunc(Number(values.sort_order)) : 0,
        starts_at: toIso(values.starts_at),
        ends_at: toIso(values.ends_at),
        updated_at: new Date().toISOString(),
      };
      const result = values.id
        ? await supabase.from("marketing_banners").update(payload).eq("id", values.id)
        : await supabase.from("marketing_banners").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["marketing-banners"] });
      client.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign saved");
      setDraft(null);
    },
    onError: (error: Error) => toast.error(error.message || "Could not save campaign. Confirm the database migration has been applied."),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("marketing_banners").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["marketing-banners"] });
      client.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["marketing-banners"] });
      client.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => banners.filter((banner) =>
    (placement === "all" || banner.placement === placement) &&
    (banner.title.toLowerCase().includes(search.trim().toLowerCase()) || (banner.festival_key || "").toLowerCase().includes(search.trim().toLowerCase()))
  ), [banners, placement, search]);

  const live = banners.filter((banner) => phase(banner) === "Live").length;
  const scheduled = banners.filter((banner) => phase(banner) === "Scheduled").length;
  const draftCount = banners.filter((banner) => phase(banner) === "Draft / Paused").length;

  const startTemplate = (template: (typeof templates)[number]) => {
    setDraft({
      ...blank, title: template.title, subtitle: template.subtitle,
      image_url: template.image_url, link_url: template.link_url,
      festival_key: template.key, placement: "home_hero",
      starts_at: template.start, ends_at: template.end,
    });
  };

  return (
    <div className="space-y-7 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-600"><Megaphone size={15} /> Marketing studio</div>
          <h1 className="text-3xl font-bold tracking-tight">Festival & campaign manager</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Create, schedule, preview and pause campaigns across shopping pages. Only approved offers should be published; campaigns never change product prices.</p>
        </div>
        <Button onClick={() => setDraft({ ...blank })} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"><Plus size={16} /> New campaign</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Campaigns", value: banners.length, icon: LayoutGrid },
          { label: "Currently live", value: live, icon: CheckCircle2 },
          { label: "Scheduled", value: scheduled, icon: CalendarClock },
          { label: "Draft / paused", value: draftCount, icon: PauseCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm" key={label}>
            <Icon className="h-5 w-5 text-orange-600" aria-hidden />
            <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3" aria-label="Festival campaign templates">
        <div className="flex items-end justify-between gap-3"><h2 className="text-xl font-bold">Start with a festival</h2><span className="text-xs text-muted-foreground">All templates start as unpublished drafts</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {templates.map((preset) => (
            <button key={preset.key} type="button" onClick={() => startTemplate(preset)} className="group overflow-hidden rounded-xl border border-border bg-card text-left hover:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500">
              <div className="relative h-24 bg-slate-900"><img src={preset.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /><span className="absolute inset-0 bg-gradient-to-r from-slate-950/70 to-transparent" /></div>
              <div className="flex items-center justify-between gap-2 p-3"><span className="font-bold text-sm">{preset.title}</span><Plus size={16} className="shrink-0 text-orange-500" /></div>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Existing campaigns" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Campaign library</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground"/><span className="sr-only">Search campaigns</span><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by title or festival" className="w-56 pl-9"/></label>
            <label><span className="sr-only">Filter by placement</span><select className="h-10 rounded-md border bg-background px-3 text-sm" value={placement} onChange={(e)=>setPlacement(e.target.value)}><option value="all">All placements</option>{CAMPAIGN_PLACEMENTS.map((p)=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          </div>
        </div>
        {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">Campaigns could not be loaded: {String((error as Error).message)}. Check database access and pending migrations. <button className="underline" onClick={()=>refetch()}>Retry</button></div>}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading campaign library…</p> : !filtered.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No campaigns match this view. Start with a festival template or create a new campaign.</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((banner) => {
              const status = phase(banner);
              return <article key={banner.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                  {safeCampaignImage(banner.image_url) ? <img src={banner.image_url} alt="" className="h-full w-full object-cover" loading="lazy"/> : <ImageIcon className="m-auto mt-8 text-white/60"/>}
                </div>
                <div className="min-w-[180px] flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{banner.title}</h3><Badge variant="outline">{status}</Badge>{banner.is_sponsored && <Badge>Sponsored</Badge>}</div>
                  <p className="text-xs text-muted-foreground">{CAMPAIGN_PLACEMENTS.find((p)=>p.value===banner.placement)?.label || banner.placement}</p>
                  <p className="text-xs text-muted-foreground">
                    {banner.starts_at ? format(new Date(banner.starts_at),"MMM d, yyyy p") : "No start time"} — {banner.ends_at ? format(new Date(banner.ends_at),"MMM d, yyyy p") : "No end time"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {safeCampaignPath(banner.link_url) && <Button variant="ghost" size="icon" asChild><a href={safeCampaignPath(banner.link_url)!} target="_blank" rel="noopener noreferrer" aria-label={"Preview destination for " + banner.title}><ArrowUpRight size={17}/></a></Button>}
                  <Button variant="outline" size="sm" onClick={()=>setDraft(toDraft(banner))} className="gap-2"><Pencil size={14}/> Edit</Button>
                  <Button variant="outline" size="sm" disabled={toggle.isPending} onClick={()=>toggle.mutate({id:banner.id,active:!banner.is_active})}>{banner.is_active ? "Pause" : "Enable"}</Button>
                  <Button variant="ghost" size="icon" disabled={remove.isPending} aria-label={"Delete " + banner.title} onClick={()=>{if(window.confirm("Permanently delete this campaign?")) remove.mutate(banner.id)}} className="text-destructive"><Trash2 size={17}/></Button>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      <Dialog open={Boolean(draft)} onOpenChange={(open)=>{if(!open) setDraft(null)}}>
        <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit promotion" : "Create festival promotion"}</DialogTitle>
            <DialogDescription>Save as draft first. Enable only after verifying the advertised claim with the store.</DialogDescription>
          </DialogHeader>
          {draft && <form onSubmit={(e)=>{e.preventDefault();save.mutate(draft)}} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="campaign-title">Campaign title *</Label><Input id="campaign-title" maxLength={100} required value={draft.title} onChange={(e)=>setDraft({...draft,title:e.target.value})}/></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="campaign-subtitle">Description and offer terms</Label><Input id="campaign-subtitle" maxLength={240} value={draft.subtitle} onChange={(e)=>setDraft({...draft,subtitle:e.target.value})}/></div>
              <div className="space-y-1.5"><Label htmlFor="campaign-placement">Placement *</Label><select id="campaign-placement" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.placement} onChange={(e)=>setDraft({...draft,placement:e.target.value as CampaignPlacement})}>{CAMPAIGN_PLACEMENTS.map((p)=><option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
              <div className="space-y-1.5"><Label htmlFor="campaign-festival">Festival / campaign key</Label><select id="campaign-festival" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.festival_key} onChange={(e)=>setDraft({...draft,festival_key:e.target.value})}><option value="general">General</option><option value="dashain">Dashain</option><option value="tihar">Tihar</option><option value="chhath">Chhath</option><option value="new_year">New Year</option></select></div>
              <div className="space-y-1.5"><Label htmlFor="campaign-image">Creative image (HTTPS or site path) *</Label><Input id="campaign-image" required value={draft.image_url} onChange={(e)=>setDraft({...draft,image_url:e.target.value})} placeholder="/festival/tihar-offer.svg"/></div>
              <div className="space-y-1.5"><Label htmlFor="campaign-link">On-site destination *</Label><Input id="campaign-link" required value={draft.link_url} onChange={(e)=>setDraft({...draft,link_url:e.target.value})} placeholder="/buy?brand=Apple"/></div>
              <div className="space-y-1.5"><Label htmlFor="campaign-cta">Button label</Label><Input id="campaign-cta" value={draft.button_text} onChange={(e)=>setDraft({...draft,button_text:e.target.value})} /></div>
              <div className="space-y-1.5"><Label htmlFor="campaign-order">Display order</Label><Input id="campaign-order" type="number" value={draft.sort_order} onChange={(e)=>setDraft({...draft,sort_order:Number(e.target.value)})}/></div>
              <div className="space-y-1.5"><Label htmlFor="campaign-start">Start ({Intl.DateTimeFormat().resolvedOptions().timeZone})</Label><Input id="campaign-start" type="datetime-local" value={draft.starts_at} onChange={(e)=>setDraft({...draft,starts_at:e.target.value})}/></div>
              <div className="space-y-1.5"><Label htmlFor="campaign-end">End ({Intl.DateTimeFormat().resolvedOptions().timeZone})</Label><Input id="campaign-end" type="datetime-local" value={draft.ends_at} onChange={(e)=>setDraft({...draft,ends_at:e.target.value})}/></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm"><span><strong className="block">Paid / sponsored advertisement</strong><small className="text-muted-foreground">Clearly disclose separately sponsored placement</small></span><Switch checked={draft.is_sponsored} onCheckedChange={(value)=>setDraft({...draft,is_sponsored:value})}/></label>
              <label className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm"><span><strong className="block">Enable campaign</strong><small className="text-muted-foreground">Publishes only during its schedule</small></span><Switch checked={draft.is_active} onCheckedChange={(value)=>setDraft({...draft,is_active:value})}/></label>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-slate-950 text-white">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs text-white/60"><ShieldCheck size={14}/> Preview · {draft.placement} · {draft.is_sponsored ? "Sponsored" : "Promotion"}</div>
              <div className="relative flex min-h-40 items-center overflow-hidden p-6">
                {safeCampaignImage(draft.image_url) && <img src={draft.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35"/>}
                <div className="relative z-10"><p className="text-[10px] font-bold uppercase tracking-widest text-orange-300">{draft.is_sponsored ? "Sponsored" : "Promotion"}</p><h3 className="mt-2 text-2xl font-black">{draft.title || "Campaign title"}</h3><p className="mt-2 max-w-lg text-sm text-white/75">{draft.subtitle}</p><span className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900">{draft.button_text || "Explore"}</span></div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={()=>setDraft(null)}><X size={16} className="mr-2"/> Cancel</Button>
              <Button type="submit" disabled={save.isPending} className="bg-orange-600 font-bold text-white hover:bg-orange-700"><CheckCircle2 size={16} className="mr-2"/>{save.isPending ? "Saving…" : draft.is_active ? "Save enabled campaign" : "Save draft"}</Button>
            </div>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
