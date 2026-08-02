import type { Player } from "@/types/api";

export type AccelerationType = "Explosivo" | "Alongado" | "Controlado" | null;

function num(player: Player, key: string): number | null {
  const raw = player[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw)))
    return Number(raw);
  return null;
}

const LABELS: Record<string, AccelerationType> = {
  explosive: "Explosivo",
  explosivo: "Explosivo",
  lengthy: "Alongado",
  alongado: "Alongado",
  controlled: "Controlado",
  controlado: "Controlado",
};

/**
 * Tipo de corrida (AcceleRATE) do jogador.
 * Usa o campo da API quando existir; senão calcula por altura/agilidade/força/aceleração.
 */
export function accelerationType(player: Player): AccelerationType {
  for (const key of ["acceleration_type", "accelerate", "accelerate_type", "run_type"]) {
    const raw = player[key];
    if (typeof raw === "string" && raw.trim() !== "") {
      return LABELS[raw.trim().toLowerCase()] ?? (raw as AccelerationType);
    }
  }

  const height = num(player, "height") ?? num(player, "height_cm");
  const agility = num(player, "agility");
  const strength = num(player, "strength");
  const acceleration = num(player, "acceleration") ?? num(player, "pac");
  if (height === null || agility === null || strength === null || acceleration === null) return null;

  if (agility - strength >= 20 && acceleration >= 80 && height <= 175) return "Explosivo";
  if (strength - agility >= 20 && acceleration >= 55 && height >= 188) return "Alongado";
  return "Controlado";
}

/** Classe de cor por tipo de corrida. */
export function accelerationBadgeClass(type: AccelerationType): string {
  if (type === "Explosivo") return "bg-rating-elite text-rating-foreground";
  if (type === "Alongado") return "bg-rating-mid text-rating-foreground";
  return "bg-secondary text-secondary-foreground";
}
