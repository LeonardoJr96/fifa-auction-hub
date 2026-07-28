import type { Player } from "@/types/api";

const KEYS = [
  { key: "pac", label: "PAC" },
  { key: "sho", label: "SHO" },
  { key: "pas", label: "PAS" },
  { key: "dri", label: "DRI" },
  { key: "def_rating", label: "DEF" },
  { key: "phy", label: "PHY" },
] as const;

const GK_KEYS = [
  { key: "gk_diving", label: "DIV" },
  { key: "gk_handling", label: "HAN" },
  { key: "gk_kicking", label: "KIC" },
  { key: "gk_reflexes", label: "REF" },
  { key: "gk_positioning", label: "POS" },
] as const;

function readStat(player: Player, key: string): number | null {
  const raw = player[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) return Number(raw);
  return null;
}

export function isGoalkeeper(player: Player): boolean {
  if (player.best_position === "GK") return true;
  if (Array.isArray(player.positions) && player.positions.includes("GK")) return true;
  return readStat(player, "gk_diving") !== null && (player.pac ?? 0) === 0;
}

/** Barras dos 6 atributos calculados (ou atributos de GK para goleiros). */
export function StatBars({ player }: { player: Player }) {
  const goalkeeper = isGoalkeeper(player);
  const entries = (goalkeeper ? GK_KEYS : KEYS).map((entry) => ({
    label: entry.label,
    value: readStat(player, entry.key),
  }));

  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
      {entries.map((entry) => (
        <div key={entry.label}>
          <div className="flex items-baseline justify-between text-[11px] font-semibold tracking-wide">
            <dt className="text-muted-foreground">{entry.label}</dt>
            <dd className="tabular-nums text-foreground">{entry.value ?? "—"}</dd>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-pitch transition-[width] duration-500"
              style={{ width: `${Math.min(100, entry.value ?? 0)}%` }}
            />
          </div>
        </div>
      ))}
    </dl>
  );
}
