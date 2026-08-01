import { statEntries } from "@/components/StatBars";
import { ratingBg } from "@/lib/rating";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/api";

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 78;

function point(index: number, count: number, radius: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)] as const;
}

/** Radar (hexágono/pentágono) dos atributos principais, estilo SoFIFA. */
export function AttributeRadar({ player }: { player: Player }) {
  const entries = statEntries(player);
  const count = entries.length;

  const ring = (factor: number) =>
    entries
      .map((_, index) => point(index, count, RADIUS * factor).join(","))
      .join(" ");

  const shape = entries
    .map((entry, index) =>
      point(index, count, (RADIUS * Math.min(100, Math.max(8, entry.value ?? 0))) / 100).join(","),
    )
    .join(" ");

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-52 w-52" role="img" aria-label="Radar de atributos">
        {[0.25, 0.5, 0.75, 1].map((factor) => (
          <polygon
            key={factor}
            points={ring(factor)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            className="text-border"
          />
        ))}
        {entries.map((_, index) => {
          const [x, y] = point(index, count, RADIUS);
          return (
            <line
              key={index}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border"
            />
          );
        })}
        <polygon points={shape} className="fill-pitch/35 stroke-pitch" strokeWidth={2} />
        {entries.map((entry, index) => {
          const [x, y] = point(index, count, RADIUS + 16);
          return (
            <text
              key={entry.label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px] font-bold"
            >
              {entry.label}
            </text>
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-1.5">
        {entries.map((entry) => (
          <span
            key={entry.label}
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
              ratingBg(entry.value),
            )}
          >
            {entry.label} {entry.value ?? "—"}
          </span>
        ))}
      </div>
    </div>
  );
}
