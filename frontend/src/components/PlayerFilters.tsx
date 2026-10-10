import { useEffect, useMemo, useState } from "react";

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
  page: number;
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
  page: 1,
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

/** Lê os search params da URL e devolve valores parciais válidos. */
export function parsePlayerSearch(search: Record<string, unknown>): Partial<PlayerFilterValues> {
  const str = (value: unknown) => (typeof value === "string" && value !== "" ? value : undefined);
  const num = (value: unknown) => Number(value) || undefined;
  return {
    q: str(search.q),
    position: str(search.position),
    minOverall: num(search.minOverall),
    maxOverall: num(search.maxOverall),
    minPotential: num(search.minPotential),
    minAge: num(search.minAge),
    maxAge: num(search.maxAge),
    foot: str(search.foot),
    maxPrice: num(search.maxPrice),
    sort: str(search.sort),
    page: num(search.page),
  };
}

/** Remove chaves com valor padrão para manter a URL limpa e compartilhável. */
export function cleanPlayerSearch(values: PlayerFilterValues): Partial<PlayerFilterValues> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const fallback = defaultPlayerFilters[key as keyof PlayerFilterValues];
    if (value !== fallback && value !== "" && value !== 0) out[key] = value;
  }
  return out as Partial<PlayerFilterValues>;
}

const footLabels: Record<string, string> = { "1": "Destro", "2": "Canhoto" };

export interface FilterChip {
  key: keyof PlayerFilterValues;
  label: string;
}

/** Chips dos filtros aplicados (não inclui paginação). */
export function activeFilterChips(values: PlayerFilterValues): FilterChip[] {
  const chips: FilterChip[] = [];
  if (values.q) chips.push({ key: "q", label: `Busca: "${values.q}"` });
  if (values.position) chips.push({ key: "position", label: `Posição: ${values.position}` });
  if (values.minOverall) chips.push({ key: "minOverall", label: `OVR ≥ ${values.minOverall}` });
  if (values.maxOverall) chips.push({ key: "maxOverall", label: `OVR ≤ ${values.maxOverall}` });
  if (values.minPotential)
    chips.push({ key: "minPotential", label: `POT ≥ ${values.minPotential}` });
  if (values.minAge) chips.push({ key: "minAge", label: `Idade ≥ ${values.minAge}` });
  if (values.maxAge) chips.push({ key: "maxAge", label: `Idade ≤ ${values.maxAge}` });
  if (values.foot)
    chips.push({ key: "foot", label: `Pé: ${footLabels[values.foot] ?? values.foot}` });
  if (values.maxPrice)
    chips.push({
      key: "maxPrice",
      label: `Preço ≤ € ${values.maxPrice.toLocaleString("pt-BR")}`,
    });
  if (values.sort && values.sort !== "default") {
    const option = sortOptions.find((item) => item.value === values.sort);
    chips.push({ key: "sort", label: `Ordem: ${option?.label ?? values.sort}` });
  }
  return chips;
}

function playerName(product: Product) {
  return (product.player?.common_name || product.title || "").toLowerCase();
}

export const DEFAULT_POSITIONS = [
  "CAM", "CB", "CDM", "CF", "CM", "GK", "LB", "LM", "LW", "LWB", "RB", "RM", "RW", "RWB", "ST"
];

/** Aplica busca, filtros e ordenação sobre a lista de produtos. */
export function usePlayerFiltering(products: Product[] | undefined, filters: PlayerFilterValues) {
  const positions = useMemo(() => {
    const set = new Set<string>(DEFAULT_POSITIONS);
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

export function activeFilterCount(values: PlayerFilterValues): number {
  return activeFilterChips(values).length;
}

interface AppliedFiltersProps {
  values: PlayerFilterValues;
  onChange: (patch: Partial<PlayerFilterValues>) => void;
  onReset: () => void;
}

/** Chips dos filtros aplicados, cada um removível individualmente. */
export function AppliedFilters({ values, onChange, onReset }: AppliedFiltersProps) {
  const chips = activeFilterChips(values);
  if (chips.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Filtros aplicados
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() =>
            onChange({
              [chip.key]: defaultPlayerFilters[chip.key],
              page: 1,
            } as Partial<PlayerFilterValues>)
          }
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-accent"
          aria-label={`Remover filtro ${chip.label}`}
        >
          <span className="truncate">{chip.label}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            ×
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="rounded-full border border-input px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
      >
        Limpar tudo
      </button>
    </div>
  );
}

interface PlayerFiltersProps {
  values: PlayerFilterValues;
  positions: string[];
  onChange: (patch: Partial<PlayerFilterValues>) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export function PlayerFilters({
  values,
  positions,
  onChange,
  onReset,
  isLoading = false,
}: PlayerFiltersProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(values.q ?? "");
  const count = activeFilterCount(values);
  const isDirty = count > 0;
  const set = (patch: Partial<PlayerFilterValues>) => onChange({ ...patch, page: 1 });

  useEffect(() => {
    setSearchTerm(values.q ?? "");
  }, [values.q]);

  useEffect(() => {
    if (searchTerm === (values.q ?? "")) return;
    const timer = setTimeout(() => {
      set({ q: searchTerm });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, values.q]);

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span className="truncate">Filtros</span>
          {count > 0 ? (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground tabular-nums">
              {count}
            </span>
          ) : null}
          {isLoading ? (
            <span className="shrink-0 text-[11px] font-medium normal-case text-muted-foreground">
              atualizando...
            </span>
          ) : null}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {isDirty ? (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              Limpar filtros
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            className="rounded-md border border-input px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent sm:hidden"
          >
            {open ? "Ocultar" : "Filtrar"}
          </button>
        </div>
      </div>

      <div
        className={`${open ? "grid" : "hidden"} mt-3 grid-cols-2 gap-3 sm:mt-3 sm:flex sm:flex-wrap sm:items-end`}
      >
        <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Buscar jogador
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                set({ q: searchTerm });
              }
            }}
            placeholder="Nome do jogador"
            className={`${inputClass} w-full sm:w-56`}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Posição
          <select
            value={values.position}
            onChange={(event) => set({ position: event.target.value })}
            className={`${inputClass} w-full sm:w-auto`}
          >
            <option value="">Todas</option>
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Ordenar por
          <select
            value={values.sort}
            onChange={(event) => set({ sort: event.target.value })}
            className={`${inputClass} w-full sm:w-auto`}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Overall mínimo
          <input
            type="number"
            min={0}
            max={99}
            value={values.minOverall || ""}
            onChange={(event) => set({ minOverall: Number(event.target.value) || 0 })}
            placeholder="0"
            className={`${inputClass} w-full sm:w-28`}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Overall máximo
          <input
            type="number"
            min={0}
            max={99}
            value={values.maxOverall || ""}
            onChange={(event) => set({ maxOverall: Number(event.target.value) || 0 })}
            placeholder="99"
            className={`${inputClass} w-full sm:w-28`}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Potencial mínimo
          <input
            type="number"
            min={0}
            max={99}
            value={values.minPotential || ""}
            onChange={(event) => set({ minPotential: Number(event.target.value) || 0 })}
            placeholder="0"
            className={`${inputClass} w-full sm:w-28`}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Idade mínima
          <input
            type="number"
            min={0}
            max={60}
            value={values.minAge || ""}
            onChange={(event) => set({ minAge: Number(event.target.value) || 0 })}
            placeholder="15"
            className={`${inputClass} w-full sm:w-24`}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Idade máxima
          <input
            type="number"
            min={0}
            max={60}
            value={values.maxAge || ""}
            onChange={(event) => set({ maxAge: Number(event.target.value) || 0 })}
            placeholder="45"
            className={`${inputClass} w-full sm:w-24`}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Pé preferido
          <select
            value={values.foot}
            onChange={(event) => set({ foot: event.target.value })}
            className={`${inputClass} w-full sm:w-auto`}
          >
            <option value="">Todos</option>
            <option value="1">Destro</option>
            <option value="2">Canhoto</option>
          </select>
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Preço máximo (€)
          <input
            type="number"
            min={0}
            step={100000}
            value={values.maxPrice || ""}
            onChange={(event) => set({ maxPrice: Number(event.target.value) || 0 })}
            placeholder="sem limite"
            className={`${inputClass} w-full sm:w-40`}
          />
        </label>
      </div>
    </div>
  );
}
