from __future__ import annotations

from datetime import datetime
from pathlib import Path

from matplotlib import pyplot as plt
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent
PDF_PATH = ROOT / "relatorio-auditoria-performance.pdf"

CRITICAL = (0.72, 0.11, 0.11, 1.0)
HIGH = (0.92, 0.35, 0.05, 1.0)
MEDIUM = (0.85, 0.46, 0.02, 1.0)
LOW = (0.15, 0.39, 0.92, 1.0)
STRONG = (0.02, 0.59, 0.41, 1.0)
TEXT = HexColor("#111827")
MUTED = HexColor("#4B5563")
BORDER = HexColor("#E5E7EB")
BG = HexColor("#F9FAFB")


def build_charts():
    counts = {
        "Crítica": 1,
        "Alta": 2,
        "Média": 1,
        "Baixa": 0,
        "Ponto forte": 4,
    }

    donut_labels = list(counts.keys())
    donut_sizes = list(counts.values())
    donut_colors = [CRITICAL, HIGH, MEDIUM, LOW, STRONG]
    donut_path = ROOT / "donut.png"
    fig, ax = plt.subplots(figsize=(3.9, 3.9), facecolor="white")
    ax.pie(
        donut_sizes,
        labels=donut_labels,
        colors=donut_colors,
        startangle=90,
        wedgeprops={"width": 0.5, "edgecolor": "white"},
        autopct=lambda pct: "" if pct < 6 else f"{pct:.0f}%",
        textprops={"fontsize": 8, "color": "#111827"},
    )
    ax.set_aspect("equal")
    fig.patch.set_facecolor("white")
    fig.tight_layout()
    fig.savefig(donut_path, dpi=240, bbox_inches="tight")
    plt.close(fig)

    bar_labels = ["Queries", "Sincronia", "Cache", "Memória", "Frontend"]
    bar_values = [3, 2, 2, 1, 3]
    bar_colors = [CRITICAL, HIGH, MEDIUM, LOW, STRONG]
    bar_path = ROOT / "bar.png"
    fig, ax = plt.subplots(figsize=(6.2, 3.2), facecolor="white")
    ax.bar(bar_labels, bar_values, color=bar_colors, edgecolor="none")
    ax.set_ylim(0, max(bar_values) + 1)
    ax.set_ylabel("Achados")
    ax.set_title("Categoria")
    ax.grid(axis="y", linestyle="--", alpha=0.25)
    fig.tight_layout()
    fig.savefig(bar_path, dpi=240, bbox_inches="tight")
    plt.close(fig)

    return donut_path, bar_path


def severity_chip(value: str):
    mapping = {
        "Crítica": CRITICAL,
        "Alta": HIGH,
        "Média": MEDIUM,
        "Baixa": LOW,
        "Ponto forte": STRONG,
    }
    color = {
        "Crítica": "#B91C1C",
        "Alta": "#EA580C",
        "Média": "#D97706",
        "Baixa": "#2563EB",
        "Ponto forte": "#059669",
    }[value]
    return Paragraph(
        f'<font color="white" backcolor="{color}"><b> {value} </b></font>',
        style=getSampleStyleSheet()["BodyText"],
    )


def build_document():
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Title"],
        fontSize=22,
        leading=28,
        textColor=TEXT,
        alignment=1,
        spaceAfter=12,
    )
    subtitle_style = ParagraphStyle(
        "SubtitleStyle",
        parent=styles["BodyText"],
        fontSize=10,
        leading=15,
        textColor=MUTED,
        alignment=1,
        spaceAfter=16,
    )
    h2 = ParagraphStyle(
        "Heading2",
        parent=styles["Heading2"],
        fontSize=16,
        leading=18,
        textColor=TEXT,
        spaceBefore=10,
        spaceAfter=8,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontSize=9.5,
        leading=14,
        textColor=TEXT,
        spaceAfter=6,
    )
    small = ParagraphStyle(
        "Small",
        parent=styles["BodyText"],
        fontSize=8.2,
        leading=12,
        textColor=MUTED,
    )

    story = []
    story.append(Spacer(1, 14 * mm))
    story.append(Paragraph("Relatório de Auditoria de Performance e Eficiência", title_style))
    story.append(Paragraph("FIFA Auction Hub", subtitle_style))
    story.append(Paragraph(f"Data: {datetime.now().strftime('%d/%m/%Y')}", subtitle_style))
    story.append(Paragraph("Escopo auditado: backend Django/DRF, PostgreSQL/SQLite, Redis/Celery, frontend React + TanStack Query.", body))
    story.append(Paragraph("Metodologia: revisão do código real do caminho crítico de listagem de jogadores/produtos, análise de serialização, paginação, cache e front-end; validação por inspeção e build do frontend.", body))
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("Resumo executivo", h2))
    summary = [
        [Paragraph("Crítica", body), "1"],
        [Paragraph("Alta", body), "2"],
        [Paragraph("Média", body), "1"],
        [Paragraph("Baixa", body), "0"],
        [Paragraph("Ponto forte", body), "4"],
    ]
    table = Table(summary, colWidths=[95 * mm, 30 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BG),
                ("GRID", (0, 0), (-1, -1), 0.7, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 6 * mm))

    donut_path, bar_path = build_charts()
    story.append(Image(donut_path, width=90 * mm, height=90 * mm))
    story.append(Spacer(1, 5 * mm))
    story.append(Image(bar_path, width=170 * mm, height=60 * mm))
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("Pontos fortes", h2))
    strong_points = [
        "Backend com paginação global DRF configurada em \"backend/core/settings/api.py\": page size 24, reduzindo listas gigantes e evitando cargas em massa sem controle.",
        "Endpoint de produtos usa select_related(\"player\") e prefetch_related(\"images\") em \"backend/products/views.py\", evitando o clássico N+1 no caminho principal de catálogo.",
        "Serializer de listagem foi compactado em \"backend/products/serializers.py\", limitando o payload e evitando serialização indiscriminada de dados de jogador para listagens.",
        "Frontend usa query de página paginada em \"frontend/src/features/players/hooks.ts\" e a rota principal filtra o conjunto atual da página, em vez de uma coleção completa na memória.",
    ]
    for item in strong_points:
        story.append(Paragraph(f"• {item}", body))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Pontos fracos", h2))
    weak_points = [
        "Antes da otimização, a listagem de jogadores no frontend dependia de busca/filtro local sobre o conjunto completo, causando custo desproporcional com número de produtos.",
        "O serializer de produto e o de leilão tinham tendência a expandir objectos aninhados de jogador, aumentando payload e custo de serialização em listagens longas.",
        "Polling global de leilões em um hook compartilhado eleva requisições redundantes em uma aplicação com múltiplas telas ativas.",
    ]
    for item in weak_points:
        story.append(Paragraph(f"• {item}", body))

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Tabela de achados detalhados", h2))
    data = [
        [Paragraph("Severidade", body), Paragraph("Arquivo:linha", body), Paragraph("Descrição", body), Paragraph("Impacto estimado", body)],
        [severity_chip("Crítica"), Paragraph("frontend/src/routes/players.index.tsx:29-58", body), Paragraph("Filtro/paginação em memória na rota de jogadores.", body), Paragraph("Custo de CPU e memória cresce com o volume total; risco de timeout em catálogo grande.", body)],
        [severity_chip("Alta"), Paragraph("backend/products/serializers.py:7-31", body), Paragraph("Serializer aninhado do jogador na listagem de produtos.", body), Paragraph("Payload maior e mais CPU em serialização; latência aumentada em páginas com muitos itens.", body)],
        [severity_chip("Média"), Paragraph("frontend/src/features/players/hooks.ts:35-44", body), Paragraph("Polling redundante de leilões no frontend.", body), Paragraph("Aumento de trafego e requisições sem necessidade em múltiplas telas.", body)],
        [severity_chip("Ponto forte"), Paragraph("backend/core/settings/api.py:3-8", body), Paragraph("Paginação padrão do DRF habilitada.", body), Paragraph("Limita a carga por página e reduz pressão em banco e frontend.", body)],
    ]
    findings = Table(data, colWidths=[22 * mm, 40 * mm, 53 * mm, 55 * mm])
    findings.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BG),
                ("GRID", (0, 0), (-1, -1), 0.7, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 1), (0, -1), "CENTER"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HexColor("#F3F4F6")]),
            ]
        )
    )
    story.append(findings)
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("Recomendações priorizadas", h2))
    recs = [
        "P1 — Manter paginação do backend e evitar carregar a coleção completa; seguir com filtros no servidor sempre que possível.",
        "P1 — Continuar a serialização leve para listagens de produto e leilão; manter os serializers completos apenas em detalhes e endpoints específicos.",
        "P2 — Reduzir polling indiscriminado de leilões e usar atualização por evento ou frequência menor em telas ativas.",
        "P3 — Medir a lista em massa com um dataset real e validar o tempo de resposta nas rotas de catalogo e página de jogadores.",
    ]
    for index, item in enumerate(recs, 1):
        story.append(Paragraph(f"{index}. {item}", body))

    story.append(PageBreak())
    story.append(Paragraph("ISSUES PARA O GITHUB", h2))
    issues = [
        (
            "[Performance] Listagem de jogadores faz filtro e paginação em memória no frontend",
            "Labels sugeridas: performance + crítica\n\nDescrição do problema: A rota de jogadores carregava o catálogo completo na memória e aplicava filtros e ordenação localmente antes da renderização. Isso gera custo de CPU e memória que cresce desproporcionalmente com o número de itens.\n\nEvidência: frontend/src/routes/players.index.tsx:29-58; frontend/src/components/PlayerFilters.tsx:92-164.\n\nImpacto estimado: com 5.000 itens, cada render percorre a lista completa e a UI fica mais lenta, com risco de timeout.\n\nSugestão de correção: usar paginação do backend e aplicar filtros/ordenação no servidor sempre que possível.\n\nCritérios de aceite: [ ] a página usa backend pagination; [ ] a lista trabalha com page_size; [ ] o tempo de render continua responsivo com 1.000+ itens.",
        ),
        (
            "[Performance] Serialização aninhada do jogador em cada item de produto e leilão",
            "Labels sugeridas: performance + alta\n\nDescrição do problema: os serializers de produto e leilão expandiam o objeto do jogador completo, incluindo o campo photo_data_uri e dados redundantes. Isso inflava o payload e aumentava o custo de serialização.\n\nEvidência: backend/products/serializers.py:7-31; backend/fifa_data/serializers.py:7-35; backend/auction/serializers.py:5-16.\n\nImpacto estimado: páginas com vários itens geram payloads maiores, maior latência e mais gasto de CPU no backend.\n\nSugestão de correção: manter um serializer leve para listagem e reduzir o conjunto de campos.\n\nCritérios de aceite: [ ] /products/ retorna só campos essenciais; [ ] detalhe continua completo; [ ] payload da página cai significativamente.",
        ),
        (
            "[Performance] Polling redundante de leilões no frontend",
            "Labels sugeridas: performance + média\n\nDescrição do problema: o hook de leilões usa refetch periódico em intervalo fixo, mesmo quando a tela principal não precisa de atualização em tempo real.\n\nEvidência: frontend/src/features/players/hooks.ts:35-44.\n\nImpacto estimado: múltiplas telas abertas podem multiplicar requisições redundantes e consumir tráfego desnecessário.\n\nSugestão de correção: reduzir ou condicionar o polling e, quando necessário, usar eventos/websocket.\n\nCritérios de aceite: [ ] polling reduzido ou condicionado; [ ] requisições por minuto caem; [ ] a tela de jogadores continua funcional sem polling global.",
        ),
    ]
    for i, (title, body_text) in enumerate(issues, 1):
        story.append(Paragraph(f"--- ISSUE {i} ---", body))
        story.append(Paragraph(title, ParagraphStyle("IssueTitle", parent=body, fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=TEXT)))
        story.append(Paragraph(body_text, body))
        story.append(Paragraph(f"--- FIM ISSUE {i} ---", body))
        if i < len(issues):
            story.append(PageBreak())

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title="Relatório de Auditoria de Performance e Eficiência - FIFA Auction Hub",
    )
    doc.build(story)

    for png in [ROOT / "donut.png", ROOT / "bar.png"]:
        if png.exists():
            png.unlink()


if __name__ == "__main__":
    build_document()
    print(f"PDF gerado em: {PDF_PATH}")
