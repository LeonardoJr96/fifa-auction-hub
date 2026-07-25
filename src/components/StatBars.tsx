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
  { key: "gkdiving", label: "DIV" },
  { key: "gkhandling", label: "HAN" },
  { key: "gkkicking", label: "KIC" },
  { key: "gkreflexes", label: "REF" },
  { key: "gkspeed", label: "SPD" },
  { key: "gkpositioning", label: "POS" },
] as const;

function readStat(player: Player, key: string): number | null {
  const raw = player[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) return Number(raw);
  return null;
}

export function isGoalkeeper(player: Player): boolean {
  return player.pac === null && player.sho === null && player.dri === null;
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
