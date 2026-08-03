import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import {
  useAddCampaignAdmin,
  useCampaignAdmins,
  useCampaigns,
  useCreateMarketWindow,
  useDeleteListing,
  useMarketListings,
  useMarketWindowAction,
  useMarketWindows,
  useRemoveCampaignAdmin,
  useUpdateListing,
} from "@/features/campaigns/hooks";
import { formatMoney } from "@/lib/format";
import type { ListingType, MarketWindowMode } from "@/types/api";
import { RestrictedNotice } from "@/routes/admin.index";

export const Route = createFileRoute("/admin/campaigns")({
  head: () => ({
    meta: [
      { title: "Campanhas e mercado · Painel admin · ReverseDraft" },
      {
        name: "description",
        content: "Janelas de mercado, administradores de campanha e gestão de listagens.",
      },
      { property: "og:title", content: "Campanhas e mercado · Painel admin · ReverseDraft" },
      {
        property: "og:description",
        content: "Janelas de mercado, administradores de campanha e gestão de listagens.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCampaignsPage,
});

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function playerLabel(player: unknown): string {
  if (player && typeof player === "object" && "common_name" in (player as Record<string, unknown>)) {
    return String((player as { common_name?: string }).common_name ?? "—");
  }
  return `Jogador #${String(player)}`;
}

function AdminCampaignsPage() {
  const { isAuthenticated, isStaff } = useAuth();
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: windows } = useMarketWindows();
  const { data: listings, isLoading: loadingListings } = useMarketListings();
  const createWindow = useCreateMarketWindow();
  const windowAction = useMarketWindowAction();
  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();
  const addAdmin = useAddCampaignAdmin();
  const removeAdmin = useRemoveCampaignAdmin();

  const [campaignId, setCampaignId] = useState<number | undefined>(undefined);
  const admins = useCampaignAdmins(campaignId);
  const [adminUserId, setAdminUserId] = useState("");
  const [windowName, setWindowName] = useState("Janela de mercado");
  const [windowMode, setWindowMode] = useState<MarketWindowMode>("hybrid");
  const [windowCount, setWindowCount] = useState("10");
  const [editing, setEditing] = useState<{ id: number; price: string; type: ListingType } | null>(
    null,
  );

  const campaignWindows = useMemo(
    () => (windows ?? []).filter((window) => !campaignId || window.campaign === campaignId),
    [windows, campaignId],
  );
  const campaignWindowIds = useMemo(
    () => new Set(campaignWindows.map((window) => window.id)),
    [campaignWindows],
  );
  const campaignListings = useMemo(
    () =>
      (listings ?? []).filter((listing) => !campaignId || campaignWindowIds.has(listing.market_window)),
    [listings, campaignId, campaignWindowIds],
  );

  if (!isAuthenticated || !isStaff) return <RestrictedNotice />;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Campanhas e mercado</h1>
        <Link to="/admin" className="text-sm font-semibold text-primary hover:underline">
          ← Painel
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <label htmlFor="campaign" className="text-sm font-medium text-foreground">
          Campanha
        </label>
        <select
          id="campaign"
          value={campaignId ?? ""}
          onChange={(event) =>
            setCampaignId(event.target.value ? Number(event.target.value) : undefined)
          }
          className={`${inputClass} mt-1 max-w-sm`}
          disabled={loadingCampaigns}
        >
          <option value="">Todas as campanhas</option>
          {(campaigns ?? []).map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </section>

      {/* ADMINISTRADORES */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Administradores da campanha
        </h2>
        {campaignId === undefined ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Selecione uma campanha para gerenciar administradores.
          </p>
        ) : (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const userId = Number(adminUserId);
                if (!userId) return;
                addAdmin.mutate({ campaignId, userId }, { onSuccess: () => setAdminUserId("") });
              }}
              className="mt-3 flex flex-wrap items-end gap-2"
            >
              <div className="w-40">
                <label htmlFor="adminUserId" className="text-xs text-muted-foreground">
                  ID do usuário
                </label>
                <input
                  id="adminUserId"
                  type="number"
                  min={1}
                  value={adminUserId}
                  onChange={(event) => setAdminUserId(event.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <button
                type="submit"
                disabled={addAdmin.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Adicionar admin
              </button>
            </form>
            {admins.isError ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {errorText(admins.error, "Lista de administradores indisponível.")}
              </p>
            ) : !admins.data?.length ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum admin adicional.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {admins.data.map((admin) => (
                  <li key={admin.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="font-medium text-foreground">
                      {admin.username ?? `Usuário #${admin.user}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAdmin.mutate({ campaignId, userId: admin.user })}
                      disabled={removeAdmin.isPending}
                      className="rounded border border-destructive/40 px-3 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* JANELAS DE MERCADO */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Janelas de mercado
        </h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!campaignId) return;
            createWindow.mutate({
              campaignId,
              name: windowName,
              mode: windowMode,
              playerCount: Number(windowCount) || undefined,
              randomSelection: true,
            });
          }}
          className="mt-3 grid gap-3 sm:grid-cols-4"
        >
          <div className="sm:col-span-2">
            <label htmlFor="windowName" className="text-xs text-muted-foreground">
              Nome
            </label>
            <input
              id="windowName"
              value={windowName}
              onChange={(event) => setWindowName(event.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label htmlFor="windowMode" className="text-xs text-muted-foreground">
              Modo
            </label>
            <select
              id="windowMode"
              value={windowMode}
              onChange={(event) => setWindowMode(event.target.value as MarketWindowMode)}
              className={`${inputClass} mt-1`}
            >
              <option value="hybrid">Híbrido</option>
              <option value="auction">Leilão</option>
              <option value="market">Mercado</option>
            </select>
          </div>
          <div>
            <label htmlFor="windowCount" className="text-xs text-muted-foreground">
              Jogadores
            </label>
            <input
              id="windowCount"
              type="number"
              min={1}
              value={windowCount}
              onChange={(event) => setWindowCount(event.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div className="sm:col-span-4">
            <button
              type="submit"
              disabled={!campaignId || createWindow.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {createWindow.isPending ? "Criando…" : "Criar janela"}
            </button>
            {!campaignId ? (
              <span className="ml-3 text-xs text-muted-foreground">
                Selecione uma campanha primeiro.
              </span>
            ) : null}
          </div>
        </form>

        {!campaignWindows.length ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhuma janela cadastrada.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border text-sm">
            {campaignWindows.map((window) => (
              <li key={window.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{window.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {window.mode} · {window.is_open ? "Aberta" : "Fechada"} · campanha #
                    {window.campaign}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    windowAction.mutate({
                      windowId: window.id,
                      action: window.is_open ? "close" : "open",
                    })
                  }
                  disabled={windowAction.isPending}
                  className="rounded-md border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-accent disabled:opacity-50"
                >
                  {window.is_open ? "Fechar" : "Abrir"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* LISTAGENS */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Listagens ({campaignListings.length})
        </h2>
        {loadingListings ? (
          <div className="mt-3 h-16 animate-pulse rounded bg-muted" aria-busy="true" />
        ) : !campaignListings.length ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma listagem encontrada.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {campaignListings.map((listing) => (
              <li key={listing.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {playerLabel(listing.player)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {listing.listing_type} ·{" "}
                      {listing.price ? formatMoney(listing.price) : "sem preço"} ·{" "}
                      {listing.is_active ? "ativa" : "inativa"} · janela #{listing.market_window}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditing(
                          editing?.id === listing.id
                            ? null
                            : {
                                id: listing.id,
                                price: listing.price ?? "",
                                type: listing.listing_type,
                              },
                        )
                      }
                      className="rounded-md border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-accent"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateListing.mutate({
                          listingId: listing.id,
                          isActive: !listing.is_active,
                        })
                      }
                      disabled={updateListing.isPending}
                      className="rounded-md border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      {listing.is_active ? "Desativar" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteListing.mutate(listing.id)}
                      disabled={deleteListing.isPending}
                      className="rounded-md border border-destructive/40 px-3 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {editing?.id === listing.id ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateListing.mutate(
                        {
                          listingId: listing.id,
                          price: editing.price || undefined,
                          listingType: editing.type,
                        },
                        { onSuccess: () => setEditing(null) },
                      );
                    }}
                    className="mt-3 flex flex-wrap items-end gap-2"
                  >
                    <div className="w-40">
                      <label
                        htmlFor={`price-${listing.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Preço
                      </label>
                      <input
                        id={`price-${listing.id}`}
                        value={editing.price}
                        onChange={(event) =>
                          setEditing({ ...editing, price: event.target.value })
                        }
                        className={`${inputClass} mt-1`}
                      />
                    </div>
                    <div className="w-40">
                      <label
                        htmlFor={`type-${listing.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Tipo
                      </label>
                      <select
                        id={`type-${listing.id}`}
                        value={editing.type}
                        onChange={(event) =>
                          setEditing({ ...editing, type: event.target.value as ListingType })
                        }
                        className={`${inputClass} mt-1`}
                      >
                        <option value="direct">Direto</option>
                        <option value="auction">Leilão</option>
                        <option value="hybrid">Híbrido</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={updateListing.isPending}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                    >
                      Salvar
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {updateListing.isError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {errorText(updateListing.error, "Não foi possível atualizar a listagem.")}
          </p>
        ) : null}
        {deleteListing.isError ? (
          <p role="alert" className="mt-2 text-sm font-medium text-destructive">
            {errorText(deleteListing.error, "Não foi possível excluir a listagem.")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
