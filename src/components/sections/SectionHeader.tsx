import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  badge?: string;
  className?: string;
  titleClassName?: string;
}

export function SectionHeader({
  label,
  title,
  description,
  align = "left",
  badge,
  className,
  titleClassName,
}: SectionHeaderProps) {
  const alignment = align === "center" ? "text-center mx-auto items-center" : "text-left";

  return (
    <div className={cn("max-w-3xl", alignment, className)}>
      {badge && (
        <Badge variant="secondary" className="mb-4 h-6 px-3 text-[10px] font-bold uppercase tracking-widest">
          {badge}
        </Badge>
      )}
      {label && (
        <p className="text-caption text-primary mb-3">{label}</p>
      )}
      <h2 className={cn("text-display-lg", titleClassName)}>
        {title}
      </h2>
      {description && (
        <p className="text-body-lg mt-4 max-w-2xl">
          {description}
        </p>
      )}
    </div>
  );
}
