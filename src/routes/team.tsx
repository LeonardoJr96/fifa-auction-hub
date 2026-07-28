import { createFileRoute, Link } from "@tanstack/react-router";
import { playerPhotoSrc } from "@/lib/player-photo";
import { useState } from "react";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { useAuth } from "@/features/auth/AuthContext";
import { useChangeFormation, useRoster, useSetSlot, useTeam } from "@/features/team/hooks";
import type { Formation } from "@/types/api";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Meu time · ReverseDraft" },
      {
        name: "description",
        content: "Monte a escalação com os jogadores que você arrematou nos leilões.",
      },
      { property: "og:title", content: "Meu time · ReverseDraft" },
      { property: "og:description", content: "Monte a escalação com seus jogadores arrematados." },
    ],
  }),
  component: TeamPage,
});

const FORMATIONS: Formation[] = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"];

function TeamPage() {
  const { isAuthenticated } = useAuth();
  const team = useTeam(isAuthenticated);
  const roster = useRoster(isAuthenticated);
  const changeFormation = useChangeFormation();
  const setSlot = useSetSlot();
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Entre para ver seu time</h1>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (team.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="aspect-[3/4] max-h-[600px] animate-pulse rounded-xl bg-muted sm:aspect-[4/3]" />
      </div>
    );
  }

  if (team.isError || !team.data) {
    return (
      <p role="alert" className="mx-auto max-w-4xl px-4 py-10 text-sm text-destructive">
        {team.error instanceof Error ? team.error.message : "Não foi possível carregar seu time."}
      </p>
    );
  }

  const { formation, formation_layout: layout, slots } = team.data;
  const slotByCode = new Map(slots.map((slot) => [slot.slot_code, slot]));
  const lineupIds = new Set(slots.map((slot) => slot.player?.id).filter(Boolean) as number[]);

  const availableForSlot = (slotCode: string) =>
    (roster.data ?? []).filter(
      (player) => !lineupIds.has(player.id) || slotByCode.get(slotCode)?.player?.id === player.id,
    );

  function handleFormationChange(next: Formation) {
    if (next === formation) return;
    if (!window.confirm("Trocar a formação limpa a escalação atual. Continuar?")) return;
    changeFormation.mutate(next);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold tracking-tight text-foreground">Meu time</h1>
        <div className="flex flex-wrap gap-1 rounded-md border border-border p-1">
          {FORMATIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleFormationChange(option)}
              className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                option === formation
                  ? "bg-pitch text-pitch-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Campo */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-pitch-deep sm:aspect-[4/5]">
          <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-pitch-line" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pitch-line" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-[calc(100%-1.5rem)] -translate-x-1/2 border-t-2 border-pitch-line" />
          <div className="pointer-events-none absolute bottom-3 left-1/2 h-20 w-1/2 -translate-x-1/2 border-2 border-b-0 border-pitch-line" />
          <div className="pointer-events-none absolute top-3 left-1/2 h-20 w-1/2 -translate-x-1/2 border-2 border-t-0 border-pitch-line" />

          {layout.map((position) => {
            const slot = slotByCode.get(position.slot_code);
            const player = slot?.player ?? null;
            return (
              <button
                key={position.slot_code}
                type="button"
                onClick={() => setActiveSlot(position.slot_code)}
                style={{ left: `${position.x}%`, top: `${100 - position.y}%` }}
                className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              >
                {player ? (
                  <PlayerPhoto
                    src={playerPhotoSrc(player)}
                    alt={player.common_name}
                    className="h-11 w-11 border-2 border-gold bg-card"
                  />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-pitch-line text-lg font-bold text-pitch-line">
                    +
                  </span>
                )}
                <span className="max-w-full truncate rounded bg-pitch-deep/80 px-1 text-[10px] font-semibold text-pitch-foreground">
                  {player ? player.common_name : position.label || position.slot_code}
                </span>
              </button>
            );
          })}
        </div>

        {/* Elenco */}
        <aside className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Elenco comprado
          </h2>
          {roster.isLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {(roster.data ?? []).map((player) => (
                <li
                  key={player.id}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    lineupIds.has(player.id) ? "bg-pitch/10 font-semibold" : ""
                  }`}
                >
                  <PlayerPhoto
                    src={playerPhotoSrc(player)}
                    alt={player.common_name}
                    className="h-8 w-8 shrink-0"
                  />
                  <span className="truncate">{player.common_name}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {player.overall_rating}
                  </span>
                </li>
              ))}
              {(roster.data ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Você ainda não arrematou nenhum jogador.
                </li>
              ) : null}
            </ul>
          )}
        </aside>
      </div>

      {activeSlot ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 sm:items-center"
          onClick={() => setActiveSlot(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-foreground">
              Escalar em {activeSlot}
            </h2>
            <ul className="mt-3 max-h-72 space-y-1 overflow-auto">
              {availableForSlot(activeSlot).map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSlot.mutate({ slotCode: activeSlot, playerId: player.id });
                      setActiveSlot(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                  >
                    <PlayerPhoto
                      src={playerPhotoSrc(player)}
                      alt={player.common_name}
                      className="h-8 w-8 shrink-0"
                    />
                    <span className="truncate">{player.common_name}</span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {player.overall_rating}
                    </span>
                  </button>
                </li>
              ))}
              {availableForSlot(activeSlot).length === 0 ? (
                <li className="px-2 py-2 text-sm text-muted-foreground">
                  Nenhum jogador disponível.
                </li>
              ) : null}
            </ul>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSlot.mutate({ slotCode: activeSlot, playerId: null });
                  setActiveSlot(null);
                }}
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Esvaziar
              </button>
              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
