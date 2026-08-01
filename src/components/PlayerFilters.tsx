import { useMemo } from "react";

import type { Product } from "@/types/api";

export interface PlayerFilterValues {
  q: string;
  position: string;
  minOverall: number;
  maxOverall: number;
  minPotential: number;
  minAge: number;
  maxAge: number;
  foot: string;
  maxPrice: number;
  sort: string;
}

export const defaultPlayerFilters: PlayerFilterValues = {
  q: "",
  position: "",
  minOverall: 0,
  maxOverall: 0,
  minPotential: 0,
  minAge: 0,
  maxAge: 0,
  foot: "",
  maxPrice: 0,
  sort: "default",
};

export const sortOptions = [
  { value: "default", label: "Padrão" },
  { value: "name", label: "Nome (A-Z)" },
  { value: "overall_desc", label: "Overall (maior)" },
  { value: "overall_asc", label: "Overall (menor)" },
  { value: "price_desc", label: "Preço (maior)" },
  { value: "price_asc", label: "Preço (menor)" },
  { value: "potential_desc", label: "Potencial (maior)" },
  { value: "age_asc", label: "Idade (menor)" },
  { value: "age_desc", label: "Idade (maior)" },
];

function playerName(product: Product) {
  return (product.player?.common_name || product.title || "").toLowerCase();
}

/** Aplica busca, filtros e ordenação sobre a lista de produtos. */
export function usePlayerFiltering(products: Product[] | undefined, filters: PlayerFilterValues) {
  const positions = useMemo(() => {
    const set = new Set<string>();
    for (const product of products ?? []) if (product.category) set.add(product.category);
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = filters?.q ?? "";
    const term = typeof q === "string" ? q.trim().toLowerCase() : "";
    const list = (products ?? []).filter((product) => {
      if (term && !playerName(product).includes(term)) return false;
      if (filters?.position && product.category !== filters.position) return false;
      const overall = product.player?.overall_rating ?? 0;
      if (filters?.minOverall && overall < filters.minOverall) return false;
      if (filters?.maxOverall && overall > filters.maxOverall) return false;
      const potential = product.player?.potential ?? 0;
      if (filters?.minPotential && potential < filters.minPotential) return false;
      const age = Number(product.player?.age ?? 0);
      if (filters?.minAge && age < filters.minAge) return false;
      if (filters?.maxAge && age && age > filters.maxAge) return false;
      if (filters?.foot && String(product.player?.foot ?? "") !== filters.foot) return false;
      if (filters?.maxPrice && Number(product.price) > filters.maxPrice) return false;
      return true;
    });

    const sorted = [...list];
    switch (filters?.sort) {
      case "name":
        sorted.sort((a, b) => playerName(a).localeCompare(playerName(b)));
        break;
      case "overall_desc":
        sorted.sort(
          (a, b) => (b.player?.overall_rating ?? 0) - (a.player?.overall_rating ?? 0),
        );
        break;
      case "overall_asc":
        sorted.sort(
          (a, b) => (a.player?.overall_rating ?? 0) - (b.player?.overall_rating ?? 0),
        );
        break;
      case "price_desc":
        sorted.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "price_asc":
        sorted.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "potential_desc":
        sorted.sort((a, b) => (b.player?.potential ?? 0) - (a.player?.potential ?? 0));
        break;
      case "age_asc":
        sorted.sort((a, b) => Number(a.player?.age ?? 999) - Number(b.player?.age ?? 999));
        break;
      case "age_desc":
        sorted.sort((a, b) => Number(b.player?.age ?? 0) - Number(a.player?.age ?? 0));
        break;
      default:
        break;
    }
    return sorted;
  }, [products, filters]);

  return { positions, filtered };
}

const inputClass =
  "rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

interface PlayerFiltersProps {
  values: PlayerFilterValues;
  positions: string[];
  onChange: (patch: Partial<PlayerFilterValues>) => void;
  onReset: () => void;
}

export function PlayerFilters({ values, positions, onChange, onReset }: PlayerFiltersProps) {
  const isDirty =
    values.q !== "" ||
    values.position !== "" ||
    values.minOverall !== 0 ||
    values.maxOverall !== 0 ||
    values.minPotential !== 0 ||
    values.minAge !== 0 ||
    values.maxAge !== 0 ||
    values.foot !== "" ||
    values.maxPrice !== 0 ||
    values.sort !== "default";

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Filtros
        </h2>
        {isDirty ? (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Buscar jogador
        <input
          type="search"
          value={values.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder="Nome do jogador"
          className={`${inputClass} w-56`}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Posição
        <select
          value={values.position}
          onChange={(event) => onChange({ position: event.target.value })}
          className={inputClass}
        >
          <option value="">Todas</option>
          {positions.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Overall mínimo
        <input
          type="number"
          min={0}
          max={99}
          value={values.minOverall || ""}
          onChange={(event) => onChange({ minOverall: Number(event.target.value) || 0 })}
          placeholder="0"
          className={`${inputClass} w-28`}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Overall máximo
        <input
          type="number"
          min={0}
          max={99}
          value={values.maxOverall || ""}
          onChange={(event) => onChange({ maxOverall: Number(event.target.value) || 0 })}
          placeholder="99"
          className={`${inputClass} w-28`}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Potencial mínimo
        <input
          type="number"
          min={0}
          max={99}
          value={values.minPotential || ""}
          onChange={(event) => onChange({ minPotential: Number(event.target.value) || 0 })}
          placeholder="0"
          className={`${inputClass} w-28`}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Idade mínima
        <input
          type="number"
          min={0}
          max={60}
          value={values.minAge || ""}
          onChange={(event) => onChange({ minAge: Number(event.target.value) || 0 })}
          placeholder="15"
          className={`${inputClass} w-24`}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Idade máxima
        <input
          type="number"
          min={0}
          max={60}
          value={values.maxAge || ""}
          onChange={(event) => onChange({ maxAge: Number(event.target.value) || 0 })}
          placeholder="45"
          className={`${inputClass} w-24`}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Pé preferido
        <select
          value={values.foot}
          onChange={(event) => onChange({ foot: event.target.value })}
          className={inputClass}
        >
          <option value="">Todos</option>
          <option value="1">Destro</option>
          <option value="2">Canhoto</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Preço máximo (€)
        <input
          type="number"
          min={0}
          step={100000}
          value={values.maxPrice || ""}
          onChange={(event) => onChange({ maxPrice: Number(event.target.value) || 0 })}
          placeholder="sem limite"
          className={`${inputClass} w-40`}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Ordenar por
        <select
          value={values.sort}
          onChange={(event) => onChange({ sort: event.target.value })}
          className={inputClass}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      </div>
    </div>
  );
}
