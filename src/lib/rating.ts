/** Faixas de cor no estilo SoFIFA para valores de atributo (0-99). */
export function ratingBg(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return "bg-muted text-muted-foreground";
  const n = Number(value);
  if (n >= 85) return "bg-rating-elite text-rating-foreground";
  if (n >= 75) return "bg-rating-high text-rating-foreground";
  if (n >= 65) return "bg-rating-mid text-rating-foreground";
  if (n >= 50) return "bg-rating-low text-rating-foreground";
  return "bg-rating-poor text-rating-foreground";
}
