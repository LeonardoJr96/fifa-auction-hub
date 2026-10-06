import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, LoaderCircle, ShieldAlert } from "lucide-react";

const icons: Record<StatePanelKind, LucideIcon> = { loading: LoaderCircle, empty: Inbox, error: AlertTriangle, permission: ShieldAlert };
type StatePanelKind = "loading" | "empty" | "error" | "permission";

export function StatePanel({ kind, title, description, compact = false }: { kind: StatePanelKind; title: string; description?: string; compact?: boolean }) {
  const Icon = icons[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} aria-live="polite" className={`state-panel ${compact ? "min-h-32" : "min-h-56"}`}>
      <span className={`state-icon ${kind === "loading" ? "animate-spin" : ""}`}><Icon /></span>
      <div><p className="font-display font-semibold text-foreground">{title}</p>{description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}</div>
    </div>
  );
}