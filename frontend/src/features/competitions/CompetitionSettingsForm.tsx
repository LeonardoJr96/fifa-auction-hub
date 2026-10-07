import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useUpdateCompetitionSettings } from "@/features/competitions/hooks";
import type { Competition } from "@/types/api";

const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export function CompetitionSettingsForm({ competition }: { competition: Competition }) {
  const updateSettings = useUpdateCompetitionSettings(String(competition.id));
  const [winPoints, setWinPoints] = useState(String(competition.league_win_points));
  const [drawPoints, setDrawPoints] = useState(String(competition.league_draw_points));
  const [lossPoints, setLossPoints] = useState(String(competition.league_loss_points));
  const [winReward, setWinReward] = useState(competition.match_win_reward);
  const [drawReward, setDrawReward] = useState(competition.match_draw_reward);
  const [lossReward, setLossReward] = useState(competition.match_loss_reward);

  const rewardFields = [
    { label: "Vitória", value: winReward, onChange: setWinReward },
    { label: "Empate", value: drawReward, onChange: setDrawReward },
    { label: "Derrota", value: lossReward, onChange: setLossReward },
  ];
  const pointFields = [
    { label: "Vitória", value: winPoints, onChange: setWinPoints },
    { label: "Empate", value: drawPoints, onChange: setDrawPoints },
    { label: "Derrota", value: lossPoints, onChange: setLossPoints },
  ];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSettings.mutate({
      league_win_points: Number(winPoints),
      league_draw_points: Number(drawPoints),
      league_loss_points: Number(lossPoints),
      match_win_reward: winReward,
      match_draw_reward: drawReward,
      match_loss_reward: lossReward,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Premiação por partida (R$)
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {rewardFields.map((field) => (
            <label key={field.label} className="block space-y-1">
              <span className="text-sm text-muted-foreground">{field.label}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                className={inputClass}
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Novos valores valem para partidas com resultado registrado daqui em diante. Premiações já
          pagas não são alteradas ao corrigir placares ou mudar esta configuração.
        </p>
      </fieldset>

      {competition.competition_type === "league" ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Pontos da classificação</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {pointFields.map((field) => (
              <label key={field.label} className="block space-y-1">
                <span className="text-sm text-muted-foreground">{field.label}</span>
                <input
                  type="number"
                  min={0}
                  required
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {updateSettings.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {updateSettings.error instanceof Error
            ? updateSettings.error.message
            : "Não foi possível salvar as configurações."}
        </p>
      ) : null}
      {updateSettings.isSuccess ? (
        <p role="status" className="text-sm text-primary">
          Configurações salvas.
        </p>
      ) : null}
      <Button type="submit" disabled={updateSettings.isPending}>
        {updateSettings.isPending ? "Salvando…" : "Salvar configurações"}
      </Button>
    </form>
  );
}
