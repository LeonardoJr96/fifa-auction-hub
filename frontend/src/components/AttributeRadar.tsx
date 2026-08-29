import { memo } from "react";

import { mainStats } from "@/components/StatBars";
import type { Player } from "@/types/api";

/** Radar hexagonal dos atributos principais, estilo SoFIFA. */
export const AttributeRadar = memo(function AttributeRadar({
  player,
  size = 240,
}: {
  player: Player;
  size?: number;
}) {
  const stats = mainStats(player);
  const count = stats.length;
  const center = size / 2;
  const radius = size / 2 - 28;

  const pointAt = (index: number, ratio: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return [center + Math.cos(angle) * radius * ratio, center + Math.sin(angle) * radius * ratio];
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const polygon = (ratio: number) =>
    stats.map((_, index) => pointAt(index, ratio).join(",")).join(" ");
  const dataPolygon = stats
    .map((stat, index) => pointAt(index, Math.min(1, (stat.value ?? 0) / 99)).join(","))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Radar de atributos">
      {rings.map((ratio) => (
        <polygon
          key={ratio}
          points={polygon(ratio)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1"
        />
      ))}
      {stats.map((_, index) => {
        const [x, y] = pointAt(index, 1);
        return (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={dataPolygon}
        fill="var(--color-rating-high)"
        fillOpacity="0.35"
        stroke="var(--color-rating-elite)"
        strokeWidth="2"
      />
      {stats.map((stat, index) => {
        const [x, y] = pointAt(index, 1.18);
        return (
          <text
            key={stat.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="700"
            fill="var(--color-muted-foreground)"
          >
            {stat.label} {stat.value ?? "—"}
          </text>
        );
      })}
    </svg>
  );
});
