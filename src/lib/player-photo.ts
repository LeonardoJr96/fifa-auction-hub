import type { Player } from "@/types/api";

/**
 * A API pode devolver a foto em `photo_data_uri` (URL do CDN ou data URI),
 * `photo_base64` ou `photo_url`. Usa a primeira disponível.
 */
export function playerPhotoSrc(player: Player | null | undefined): string | null {
  if (!player) return null;
  const candidates = [player.photo_data_uri, player.photo_base64, player.photo_url];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}
