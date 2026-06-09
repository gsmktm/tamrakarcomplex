import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/common/SafeImage";
import type { ModelListItem } from "@/services/mobileMasterService";

interface ModelCardProps {
  model: ModelListItem;
  className?: string;
}

export function ModelCard({ model, className = '' }: ModelCardProps) {
  const displayPrice = model.min_price
    ? `NPR ${model.min_price.toLocaleString()}`
    : 'Price TBA';

  return (
    <Link
      to={`/mobile/${model.slug}`}
      className={`group block rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}
    >
      <div className="relative aspect-square bg-muted/30 overflow-hidden">
        <SafeImage
          src={model.image}
          alt={model.name}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          aspect="square"
        />
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {model.is_upcoming && <Badge variant="secondary" className="text-[10px] h-5">Upcoming</Badge>}
          {model.is_featured && <Badge className="text-[10px] h-5 bg-amber-500 hover:bg-amber-500">Featured</Badge>}
        </div>
        {model.expert_overall && (
          <div className="absolute bottom-2 right-2 bg-background/90 rounded-full px-1.5 py-0.5 text-xs font-bold text-primary border">
            {model.expert_overall}
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{model.brand_name}</div>
        <div className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {model.name}
        </div>
        <div className="pt-1">
          <span className="text-sm font-bold text-foreground">{displayPrice}</span>
        </div>
      </div>
    </Link>
  );
}
