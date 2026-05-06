import { useLocation } from "react-router-dom";

interface AdminModulePlaceholderProps {
  title: string;
}

export default function AdminModulePlaceholder({ title }: AdminModulePlaceholderProps) {
  const location = useLocation();

  return (
    <div className="rounded-xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Current route: {location.pathname}</p>
      <p className="mt-4 text-base">Module connected. Function pending.</p>
    </div>
  );
}
