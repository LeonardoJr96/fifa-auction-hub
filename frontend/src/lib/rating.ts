/** Faixas de cor no estilo SoFIFA para valores de atributo (0-99). */
export function ratingBg(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return "bg-muted text-muted-foreground";
  const n = Number(value);
  if (n >= 85) return "bg-rating-elite text-rating-foreground";
  if (n >= 75) return "bg-rating-high text-rating-dark-foreground";
  if (n >= 65) return "bg-rating-mid text-rating-dark-foreground";
  if (n >= 50) return "bg-rating-low text-rating-dark-foreground";
  return "bg-rating-poor text-rating-foreground";
}

/** Cor de texto correspondente à faixa (para números sem fundo). */
export function ratingText(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return "text-muted-foreground";
  const n = Number(value);
  if (n >= 85) return "text-rating-elite";
  if (n >= 75) return "text-rating-high";
  if (n >= 65) return "text-rating-mid";
  if (n >= 50) return "text-rating-low";
  return "text-rating-poor";
}

/** Chip quadrado padrão SoFIFA. */
export function ratingChip(value: number | null | undefined): string {
  return `inline-flex min-w-7 items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${ratingBg(value)}`;
}
