import type { Player } from "@/types/api";
import { AUTH_URL } from "@/lib/api";

/**
 * Prioridade da foto (espelha o backend PlayerSerializer):
 *   1. /media/player_photos/...  → arquivo salvo localmente (backfill)
 *   2. data:image/png;base64,... → base64 embutido (photo_data_uri ou photo_base64)
 *   3. https://cdn.sofifa.net/.. → link externo (photo_url) — último recurso
 *
 * URLs relativas do Django (/media/...) são prefixadas com AUTH_URL para
 * carregar do backend e não do servidor Vite.
 */
export function playerPhotoSrc(player: Player | null | undefined): string | null {
  if (!player) return null;

  // photo_data_uri já contém a URL /media/... (prioridade 1) ou o base64 (prioridade 2)
  const primary = player.photo_data_uri;
  if (typeof primary === "string" && primary.trim() !== "") {
    return primary.startsWith("/") ? `${AUTH_URL}${primary}` : primary;
  }

  // base64 raw como segundo recurso
  const b64 = player.photo_base64;
  if (typeof b64 === "string" && b64.trim() !== "") {
    return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
  }

  // link externo como último recurso
  const ext = player.photo_url;
  if (typeof ext === "string" && ext.trim() !== "") return ext;

  return null;
}
