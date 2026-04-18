import { cn } from "@/lib/utils";

export function Divider({ className, label }: { className?: string; label?: string }) {
  if (!label) return <div className={cn("divider my-4", className)} />;
  return (
    <div className={cn("flex items-center gap-3 my-4", className)}>
      <div className="flex-1 divider" />
      <span className="text-[11px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className="flex-1 divider" />
    </div>
  );
}
