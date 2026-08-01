interface PaginationBarProps {
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  isLoading?: boolean;
}

const buttonClass =
  "rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

/** Navegação de páginas sincronizada com a URL. */
export function PaginationBar({
  page,
  pageCount,
  rangeStart,
  rangeEnd,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  isLoading = false,
}: PaginationBarProps) {
  if (total === 0) return null;

  return (
    <nav
      aria-label="Paginação de jogadores"
      aria-busy={isLoading}
      className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row"
    >
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground tabular-nums">{rangeStart}</span>–
        <span className="font-semibold text-foreground tabular-nums">{rangeEnd}</span> de{" "}
        <span className="font-semibold text-foreground tabular-nums">{total}</span> jogadores
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev || isLoading}
          className={buttonClass}
        >
          Anteriores
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext || isLoading}
          className={buttonClass}
        >
          Próximos
        </button>
      </div>
    </nav>
  );
}
