import { memo } from "react";

import { ratingBg } from "@/lib/rating";
import { cn } from "@/lib/utils";
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

export function statEntries(player: Player) {
  const goalkeeper = isGoalkeeper(player);
  return (goalkeeper ? GK_KEYS : KEYS).map((entry) => ({
    label: entry.label,
    value: readStat(player, entry.key),
  }));
}

/** Chips de atributo no estilo SoFIFA: valor colorido + sigla. */
export const StatBars = memo(function StatBars({ player }: { player: Player }) {
  const entries = statEntries(player);

  return (
    <dl className="grid grid-cols-3 gap-1.5">
      {entries.map((entry) => (
        <div
          key={entry.label}
          className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-1.5 py-1"
        >
          <dd
            className={cn(
              "min-w-7 rounded px-1 py-0.5 text-center text-[11px] font-bold tabular-nums",
              ratingBg(entry.value),
            )}
          >
            {entry.value ?? "—"}
          </dd>
          <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground">
            {entry.label}
          </dt>
        </div>
      ))}
    </dl>
  );
});
