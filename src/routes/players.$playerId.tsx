import { createFileRoute, Link } from "@tanstack/react-router";
import { playerPhotoSrc } from "@/lib/player-photo";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { isGoalkeeper, StatBars } from "@/components/StatBars";
import { AttributeRadar } from "@/components/AttributeRadar";
import { ratingBg, ratingChip } from "@/lib/rating";
import { useAuctions, auctionProductId, usePlayer, useProducts } from "@/features/players/hooks";
import { formatMoney } from "@/lib/format";
import type { Player, PlayerRole } from "@/types/api";
import { isOpenAuction } from "@/lib/auction-status";

export const Route = createFileRoute("/players/$playerId")({
  head: () => ({
    meta: [
      { title: "Detalhes do jogador · ReverseDraft" },
      {
        name: "description",
        content: "Atributos completos do jogador: ataque, passe, drible, defesa, físico e goleiro.",
      },
      { property: "og:title", content: "Detalhes do jogador · ReverseDraft" },
      { property: "og:description", content: "Atributos completos do jogador no ReverseDraft." },
    ],
  }),
  component: PlayerDetailPage,
});

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Ataque",
    keys: [
      ["crossing", "Cruzamento"],
      ["finishing", "Finalização"],
      ["heading", "Cabeceio"],
      ["short_passing", "Passe curto"],
      ["volleys", "Voleio"],
      ["shot_power", "Força do chute"],
      ["long_shots", "Chutes de longe"],
      ["penalties", "Pênaltis"],
    ],
  },
  {
    title: "Passe",
    keys: [
      ["curve", "Efeito"],
      ["free_kick", "Faltas"],
      ["long_passing", "Passe longo"],
      ["vision", "Visão"],
    ],
  },
  {
    title: "Drible",
    keys: [
      ["dribbling", "Drible"],
      ["agility", "Agilidade"],
      ["balance", "Equilíbrio"],
      ["reactions", "Reação"],
      ["ball_control", "Controle de bola"],
      ["composure", "Frieza"],
      ["skill_moves", "Dribles especiais"],
    ],
  },
  {
    title: "Defesa",
    keys: [
      ["interceptions", "Interceptação"],
      ["marking", "Marcação"],
      ["positioning", "Posicionamento"],
      ["standing_tackle", "Desarme em pé"],
      ["sliding_tackle", "Carrinho"],
    ],
  },
  {
    title: "Físico",
    keys: [
      ["acceleration", "Aceleração"],
      ["sprint_speed", "Velocidade"],
      ["jumping", "Impulsão"],
      ["stamina", "Fôlego"],
      ["strength", "Força"],
      ["aggression", "Agressividade"],
      ["height", "Altura (cm)"],
      ["weight", "Peso (kg)"],
    ],
  },
  {
    title: "Goleiro",
    keys: [
      ["gk_diving", "Elasticidade"],
      ["gk_handling", "Manejo"],
      ["gk_kicking", "Chute"],
      ["gk_positioning", "Posicionamento"],
      ["gk_reflexes", "Reflexos"],
    ],
  },
];

/** foot: 1 = destro, 2 = canhoto. */
function footLabel(foot: unknown): string {
  if (foot === 1 || foot === "1") return "Destro";
  if (foot === 2 || foot === "2") return "Canhoto";
  return "Pé —";
}

/** Estrelas (perna ruim / dribles), de 1 a 5. */
function starLabel(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${"★".repeat(Math.min(5, n))}${"☆".repeat(Math.max(0, 5 - n))} (${n})`;
}

const NON_RATING_KEYS = new Set(["height", "weight", "skill_moves"]);

function readNumber(player: Player, key: string): number | null {
  const raw = player[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) return Number(raw);
  return null;
}

function readValue(player: Player, key: string): string {
  const raw = player[key];
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string" && raw.trim() !== "") return raw;
  return "—";
}

function PlayerDetailPage() {
  const { playerId } = Route.useParams();
  const { data: player, isLoading, isError, error } = usePlayer(playerId);
  const { data: products } = useProducts();
  const { data: auctions } = useAuctions();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !player) {
    return (
      <p role="alert" className="mx-auto max-w-4xl px-4 py-10 text-sm text-destructive">
        {error instanceof Error ? error.message : "Jogador não encontrado."}
      </p>
    );
  }

  const product = (products ?? []).find((item) => item.player?.id === player.id);
  const openAuction = (auctions ?? []).find(
    (auction) =>
      isOpenAuction(auction) && product !== undefined && auctionProductId(auction) === product.id,
  );
  const playstyles = Array.isArray(player.playstyles)
    ? (player.playstyles as unknown[]).filter((item): item is string => typeof item === "string")
    : [];
  const roles = Array.isArray(player.player_roles)
    ? (player.player_roles as unknown[]).filter(
        (item): item is PlayerRole =>
          typeof item === "object" && item !== null && "role" in item,
      )
    : [];
  const groups = isGoalkeeper(player)
    ? GROUPS
    : GROUPS.filter((group) => group.title !== "Goleiro");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <PlayerPhoto
          src={playerPhotoSrc(player)}
          alt={player.common_name}
          className="h-28 w-28 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {player.common_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {(player.positions ?? [player.best_position]).filter(Boolean).join(" · ") || "—"} ·{" "}
            {player.age} anos · {footLabel(player.foot)} · Perna ruim{" "}
            {starLabel(player.weak_foot)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              OVR
              <span className={`${ratingBg(player.overall_rating)} rounded px-2 py-1 text-sm font-bold tabular-nums`}>
                {player.overall_rating}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              POT
              <span className={`${ratingBg(player.potential)} rounded px-2 py-1 text-sm font-bold tabular-nums`}>
                {player.potential}
              </span>
            </span>
            {typeof player.international_reputation === "number" ? (
              <span className="text-muted-foreground">
                Reputação {player.international_reputation}★
              </span>
            ) : null}
            <span className="font-semibold text-foreground">{formatMoney(player.price)}</span>
          </p>
        </div>
        {openAuction ? (
          <Link
            to="/auctions/$auctionId"
            params={{ auctionId: String(openAuction.id) }}
            className="rounded-md bg-gold px-4 py-2 text-center text-sm font-bold text-gold-foreground"
          >
            Ver leilão
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Atributos principais
          </h2>
          <StatBars player={player} />
        </div>
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-3">
          <AttributeRadar player={player} />
        </div>
      </div>

      {playstyles.length || roles.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {playstyles.length ? (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Playstyles
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {playstyles.map((style) => (
                  <li
                    key={style}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground"
                  >
                    {style}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {roles.length ? (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Funções
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {roles.map((role, index) => (
                  <li key={`${role.role}-${index}`} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-foreground">{role.role}</span>
                    <span className="text-xs text-muted-foreground">
                      {[role.position, ...(role.focuses ?? [])].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              {group.keys.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  {NON_RATING_KEYS.has(key) ? (
                    <dd className="font-semibold tabular-nums text-foreground">
                      {readValue(player, key)}
                    </dd>
                  ) : (
                    <dd className={ratingChip(readNumber(player, key))}>
                      {readValue(player, key)}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
