import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Film, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";

export const Route = createFileRoute("/videos")({
  head: () => ({ meta: [
    { title: "Vídeos de futebol · ReverseDraft" },
    { name: "description", content: "Melhores momentos, análises e conteúdo das competições ReverseDraft." },
    { property: "og:title", content: "Vídeos de futebol · ReverseDraft" },
    { property: "og:description", content: "Melhores momentos, análises e conteúdo das competições ReverseDraft." },
  ] }), component: VideosPage,
});

type Video = { id: number; title: string; category: "Melhores momentos" | "Análise" | "Draft"; competition: string; duration: string; youtubeId: string };
const VIDEO_DEMOS: Video[] = [
  { id: 1, title: "Final decidida nos acréscimos", category: "Melhores momentos", competition: "Liga Reverse — Rodada 8", duration: "08:42", youtubeId: "dQw4w9WgXcQ" },
  { id: 2, title: "Como o meio-campo mudou a partida", category: "Análise", competition: "Copa Elite — Semifinal", duration: "12:18", youtubeId: "dQw4w9WgXcQ" },
  { id: 3, title: "As escolhas decisivas do draft", category: "Draft", competition: "Reverse Draft — Temporada 2", duration: "06:05", youtubeId: "dQw4w9WgXcQ" },
];

function VideosPage() {
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Todos"); const [selected, setSelected] = useState<Video | null>(null);
  const videos = useMemo(() => VIDEO_DEMOS.filter((video) => (category === "Todos" || video.category === category) && video.title.toLowerCase().includes(query.toLowerCase())), [query, category]);
  return <div className="page-container"><PageHeader eyebrow="Central de conteúdo" title="Vídeos" description="Melhores momentos, análises e histórias das competições." />
    <div className="filter-command"><label className="search-field"><Search /><span className="sr-only">Buscar vídeo</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título" /></label><div className="flex flex-wrap gap-2">{["Todos", "Melhores momentos", "Análise", "Draft"].map((item) => <Button key={item} variant={category === item ? "default" : "outline"} size="sm" onClick={() => setCategory(item)}>{item}</Button>)}</div></div>
    {videos.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{videos.map((video) => <article key={video.id} className="video-card"><button type="button" className="video-poster" onClick={() => setSelected(video)} aria-label={`Assistir ${video.title}`}><span className="video-lines" aria-hidden="true"/><span className="play-button"><Play /></span><span className="duration">{video.duration}</span></button><div className="p-5"><p className="eyebrow">{video.category}</p><h2 className="mt-2 font-display text-lg font-bold text-foreground">{video.title}</h2><p className="mt-2 text-sm text-muted-foreground">{video.competition}</p></div></article>)}</div> : <StatePanel kind="empty" title="Nenhum vídeo encontrado" description="Tente outra busca ou categoria." />}
    <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><Film className="size-4" /> Conteúdo demonstrativo preparado para a futura API de vídeos.</p>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-w-4xl overflow-hidden p-0"><DialogHeader className="p-5 pb-0"><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected?.competition}</DialogDescription></DialogHeader><div className="aspect-video bg-secondary"><iframe title={selected?.title ?? "Vídeo"} className="h-full w-full" src={selected ? `https://www.youtube-nocookie.com/embed/${selected.youtubeId}` : undefined} allowFullScreen /></div></DialogContent></Dialog>
  </div>;
}