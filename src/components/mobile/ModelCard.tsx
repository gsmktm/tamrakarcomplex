import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/common/SafeImage";
import type { ModelListItem } from "@/services/mobileMasterService";

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
      className={`group flex flex-col rounded-xl border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 overflow-hidden ${className}`}
    >
      {/* Image */}
      <div className="relative bg-muted/20 flex items-center justify-center" style={{ minHeight: 180 }}>
        <SafeImage
          src={model.image}
          alt={model.name}
          className="w-full object-contain p-4 group-hover:scale-[1.04] transition-transform duration-300"
          style={{ maxHeight: 200 }}
          aspect="square"
        />
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
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <div className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
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
          <div className="text-[11px] text-muted-foreground">{storageLabel}</div>
        )}

        {/* Price */}
        <div className="mt-auto pt-1.5">
          <span className={`text-sm font-bold ${model.min_price ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {price}
          </span>
        </div>
      </div>
    </Link>
  );
}
