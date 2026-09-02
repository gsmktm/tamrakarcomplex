import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/common/SafeImage";
import { Smartphone } from "lucide-react";
import type { ModelListItem } from "@/services/mobileMasterService";

const BRAND_COLORS: Record<string, string> = {
  A: "from-blue-500/20 to-blue-400/10 text-blue-600",
  S: "from-indigo-500/20 to-indigo-400/10 text-indigo-600",
  X: "from-orange-500/20 to-orange-400/10 text-orange-600",
  O: "from-red-500/20 to-red-400/10 text-red-600",
  R: "from-yellow-500/20 to-yellow-400/10 text-yellow-600",
  V: "from-teal-500/20 to-teal-400/10 text-teal-600",
  I: "from-gray-500/20 to-gray-400/10 text-gray-600",
  N: "from-purple-500/20 to-purple-400/10 text-purple-600",
};
const defaultGradient = "from-muted to-muted/50 text-muted-foreground";

function ModelImagePlaceholder({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colors = BRAND_COLORS[initial] ?? defaultGradient;
  return (
    <div className={`w-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br ${colors.split(" ").slice(0, 2).join(" ")}`} style={{ minHeight: 180 }}>
      <span className={`text-5xl font-black select-none ${colors.split(" ")[2] ?? "text-muted-foreground"} opacity-30`}>{initial}</span>
      <Smartphone className="h-8 w-8 text-muted-foreground/20" />
    </div>
  );
}

interface ModelCardProps {
  model: ModelListItem;
  className?: string;
}

function SpecChip({ value }: { value: string }) {
  return (
    <span className="inline-block text-[11px] text-muted-foreground leading-tight">
      {value}
    </span>
  );
}

export function ModelCard({ model, className = '' }: ModelCardProps) {
  const price = model.min_price
    ? `रु ${model.min_price.toLocaleString('en-NP')}`
    : 'Price TBA';

  const specs = [
    model.spec_display,
    model.spec_processor,
    model.spec_camera,
    model.spec_battery,
  ].filter(Boolean) as string[];

  const storageLabel = model.storage_options?.join(' / ');

  return (
    <Link
      to={`/mobile/${model.slug}`}
      className={`group flex min-w-0 flex-col rounded-xl border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 overflow-hidden ${className}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden flex items-center justify-center aspect-square min-h-[150px] sm:min-h-[180px]">
        {model.image ? (
          <SafeImage
            src={model.image}
            alt={model.name}
            className="w-full object-contain p-4 group-hover:scale-[1.04] transition-transform duration-300"
            style={{ maxHeight: 200 }}
            aspect="square"
          />
        ) : (
          <div className="w-full group-hover:scale-[1.02] transition-transform duration-300">
            <ModelImagePlaceholder name={model.name} />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {model.is_upcoming && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Upcoming</Badge>
          )}
          {model.is_featured && (
            <Badge className="text-[10px] h-5 px-1.5 bg-amber-500 hover:bg-amber-500 text-white">Featured</Badge>
          )}
          {model.is_top_rated && (
            <Badge className="text-[10px] h-5 px-1.5 bg-blue-600 hover:bg-blue-600 text-white">Top Rated</Badge>
          )}
        </div>
        {/* Expert rating */}
        {model.expert_overall != null && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/95 border rounded-md px-2 py-0.5 text-xs font-semibold text-foreground shadow-sm">
            <span className="text-amber-500">★</span>
            <span>{model.expert_overall % 1 === 0 ? model.expert_overall : model.expert_overall.toFixed(1)}</span>
            <span className="text-muted-foreground font-normal">/10</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-col flex-1 p-3 gap-1.5">
        <div className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 break-words">
          {model.name}
        </div>

        {/* Spec chips — one per line like GBN */}
        {specs.length > 0 && (
          <div className="flex flex-col gap-0.5 border-t pt-1.5 mt-0.5">
            {specs.map((s, i) => <SpecChip key={i} value={s} />)}
          </div>
        )}

        {/* Storage options */}
        {storageLabel && (
          <div className="text-[11px] text-muted-foreground line-clamp-1">{storageLabel}</div>
        )}

        {/* Price */}
        <div className="mt-auto pt-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className={`text-sm font-bold leading-tight ${model.min_price ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {price}
          </span>
          {model.exchange_max_value && (
            <span className="w-fit text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded">
              Exchange रु{model.exchange_max_value.toLocaleString('en-NP')}
            </span>
          )}
        </div>

        {/* Ecosystem signals */}
        {(model.repair_available || model.unlocking_available) && (
          <div className="flex gap-1 flex-wrap pt-1 border-t mt-1">
            {model.repair_available && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">Repair</span>
            )}
            {model.unlocking_available && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">Unlock</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
