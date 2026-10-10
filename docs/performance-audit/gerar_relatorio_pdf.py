#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do Relatório de Auditoria de Performance e Eficiência - ReverseDraft (FIFA Auction Hub)
Gera o relatório visual em PDF e os gráficos de severidade e categorias.
"""

import os
import sys
from pathlib import Path
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# Paleta oficial exigida
PALETTE = {
    "critica": colors.HexColor("#B91C1C"),
    "alta": colors.HexColor("#EA580C"),
    "media": colors.HexColor("#D97706"),
    "baixa": colors.HexColor("#2563EB"),
    "ponto_forte": colors.HexColor("#059669"),
    "dark": colors.HexColor("#0F172A"),
    "gray_text": colors.HexColor("#334155"),
    "light_bg": colors.HexColor("#F8FAFC"),
    "border": colors.HexColor("#E2E8F0"),
    "white": colors.HexColor("#FFFFFF"),
}

OUTPUT_DIR = Path(__file__).resolve().parent
PDF_PATH = OUTPUT_DIR / "relatorio-auditoria-performance.pdf"
CHARTS_DIR = OUTPUT_DIR / "charts"
CHARTS_DIR.mkdir(parents=True, exist_ok=True)


class NumberedCanvas(canvas.Canvas):
    """Canvas com numeração total de páginas de dois passos e cabeçalho/rodapé elegante."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Capa limpa

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Cabeçalho
        self.drawString(2 * cm, 28.3 * cm, "ReverseDraft · Auditoria de Performance e Eficiência")
        self.drawRightString(A4[0] - 2 * cm, 28.3 * cm, "Outubro/2026 · Confidencial")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(2 * cm, 28.1 * cm, A4[0] - 2 * cm, 28.1 * cm)

        # Rodapé
        self.line(2 * cm, 1.8 * cm, A4[0] - 2 * cm, 1.8 * cm)
        self.drawString(2 * cm, 1.3 * cm, "Relatório Técnico de Engenharia · Stack Django + TanStack React")
        self.drawRightString(A4[0] - 2 * cm, 1.3 * cm, f"Página {self._pageNumber} de {page_count}")
        self.restoreState()


def generate_charts():
    """Gera gráficos de rosca e barras usando matplotlib."""
    # 1. Gráfico de Rosca por Severidade
    labels_donut = ['Crítica', 'Alta', 'Média', 'Baixa', 'Pontos Fortes']
    sizes_donut = [2, 6, 5, 1, 5]
    colors_donut = ['#B91C1C', '#EA580C', '#D97706', '#2563EB', '#059669']

    fig, ax = plt.subplots(figsize=(4.8, 3.2), dpi=200)
    wedges, texts, autotexts = ax.pie(
        sizes_donut,
        labels=labels_donut,
        autopct='%1.0f%%',
        startangle=140,
        colors=colors_donut,
        pctdistance=0.75,
        textprops=dict(color="#0F172A", fontsize=8, weight='bold')
    )
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontsize(8)

    # Círculo central (rosca)
    centre_circle = plt.Circle((0, 0), 0.52, fc='white')
    fig.gca().add_artist(centre_circle)
    ax.axis('equal')
    ax.set_title("Distribuição por Severidade", fontsize=10, weight='bold', pad=12, color='#0F172A')
    plt.tight_layout()
    donut_path = CHARTS_DIR / "donut_severidade.png"
    plt.savefig(donut_path, transparent=False, facecolor='white')
    plt.close()

    # 2. Gráfico de Barras por Categoria
    categorias = [
        'Queries & Índices\n(Cat. 1)',
        'Trabalho Síncrono\n(Cat. 2)',
        'Cache & Invalidação\n(Cat. 3)',
        'Memória & CPU\n(Cat. 4)',
        'Frontend & Bundle\n(Cat. 5)'
    ]
    contagens = [5, 3, 2, 3, 3]
    bar_colors = ['#B91C1C', '#EA580C', '#D97706', '#2563EB', '#6366F1']

    fig, ax = plt.subplots(figsize=(5.6, 3.2), dpi=200)
    bars = ax.bar(categorias, contagens, color=bar_colors, width=0.55, edgecolor='#E2E8F0', linewidth=0.8)
    ax.set_ylabel("Qtd. de Achados", fontsize=8, color='#334155', weight='bold')
    ax.set_title("Achados Auditados por Categoria", fontsize=10, weight='bold', pad=12, color='#0F172A')
    ax.set_ylim(0, 6)
    ax.grid(axis='y', linestyle='--', alpha=0.4)
    ax.tick_params(axis='x', labelsize=7.5)
    ax.tick_params(axis='y', labelsize=8)

    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2, yval + 0.15, int(yval), ha='center', va='bottom', fontsize=8.5, weight='bold', color='#0F172A')

    plt.tight_layout()
    bar_path = CHARTS_DIR / "bar_categorias.png"
    plt.savefig(bar_path, transparent=False, facecolor='white')
    plt.close()

    return donut_path, bar_path


def build_pdf():
    donut_path, bar_path = generate_charts()

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm,
    )

    styles = getSampleStyleSheet()

    # Estilos customizados
    title_cover = ParagraphStyle(
        "CoverTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=30,
        textColor=PALETTE["dark"],
        alignment=0,
    )
    subtitle_cover = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#475569"),
    )
    h1 = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=PALETTE["dark"],
        spaceBefore=12,
        spaceAfter=8,
        keepWithNext=True,
    )
    h2 = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )
    body = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=PALETTE["gray_text"],
    )
    body_bold = ParagraphStyle(
        "BodyDarkBold",
        parent=body,
        fontName="Helvetica-Bold",
    )
    badge_crit = ParagraphStyle(
        "BadgeCrit",
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        textColor=colors.white,
        alignment=1,
    )
    badge_alta = ParagraphStyle(
        "BadgeAlta",
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        textColor=colors.white,
        alignment=1,
    )
    badge_med = ParagraphStyle(
        "BadgeMed",
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        textColor=colors.white,
        alignment=1,
    )
    badge_bx = ParagraphStyle(
        "BadgeBx",
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        textColor=colors.white,
        alignment=1,
    )
    code_inline = ParagraphStyle(
        "CodeInline",
        parent=body,
        fontName="Courier",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0F172A"),
    )
    code_block = ParagraphStyle(
        "CodeBlock",
        parent=body,
        fontName="Courier",
        fontSize=6.8,
        leading=9.2,
        textColor=colors.HexColor("#0F172A"),
    )

    story = []

    # =========================================================================
    # CAPA
    # =========================================================================
    story.append(Spacer(1, 1.8 * cm))
    tag_style = ParagraphStyle(
        "TagStyle",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=PALETTE["baixa"],
        textTransform="uppercase",
    )
    story.append(Paragraph("RELATÓRIO TÉCNICO DE AUDITORIA DE SISTEMA", tag_style))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Auditoria de Performance e<br/>Eficiência de Recursos", title_cover))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("<b>Projeto:</b> ReverseDraft (FIFA Auction Hub) · <b>Base:</b> 18.936 Jogadores", subtitle_cover))
    story.append(Spacer(1, 0.8 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=PALETTE["dark"], spaceAfter=18))

    meta_table_data = [
        [Paragraph("<b>Data da Auditoria:</b>", body), Paragraph("10 de Outubro de 2026", body)],
        [Paragraph("<b>Escopo Auditado:</b>", body), Paragraph("Backend (Django 6 + DRF + Celery), Banco de Dados (SQLite/PostgreSQL), Frontend (TanStack Start + React 19 + Vite), Cache & Infraestrutura", body)],
        [Paragraph("<b>Auditor Responsável:</b>", body), Paragraph("Senior Staff Software Engineer & Performance Specialist (Cursor / AGY)", body)],
        [Paragraph("<b>Status da Execução:</b>", body), Paragraph("Auditoria Completa (16 Achados Identificados, 5 Pontos Fortes Validados e Correção Imediata da Paginação de Jogadores)", body)],
    ]
    t_meta = Table(meta_table_data, colWidths=[4 * cm, 13 * cm])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_meta)

    story.append(Spacer(1, 1.2 * cm))

    # Nota Metodológica
    box_metodologia = [
        [Paragraph("<b>NOTA METODOLÓGICA E DIRETRIZES DA AUDITORIA</b>", body_bold)],
        [Paragraph(
            "Esta auditoria seguiu estritamente as regras de engenharia de software sênior (rules.mdc) "
            "e a skill <code>performance-optimization</code>. Nenhum achado é especulativo: todos os problemas "
            "foram constatados diretamente nos arquivos-fonte do projeto, com indicação exata de arquivo, linha e "
            "impacto algorítmico/mensurável. Foram auditadas as cinco categorias essenciais de eficiência: "
            "(1) Queries ineficientes e índices, (2) Trabalho síncrono bloqueante, (3) Camada de cache e invalidação, "
            "(4) Uso de memória e CPU, e (5) Frontend bundle, renders e requisições.",
            body
        )]
    ]
    t_box = Table(box_metodologia, colWidths=[17 * cm])
    t_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_box)

    story.append(PageBreak())

    # =========================================================================
    # RESUMO EXECUTIVO
    # =========================================================================
    story.append(Paragraph("1. Resumo Executivo e Diagnóstico da Stack", h1))
    story.append(HRFlowable(width="100%", thickness=0.8, color=PALETTE["border"], spaceAfter=10))

    # Tabela Stack Detectada
    stack_data = [
        [Paragraph("<b>Linguagem / Runtime</b>", body_bold), Paragraph("Python 3.12+ (Backend) / TypeScript 5.8+ (Frontend)", body)],
        [Paragraph("<b>Framework Backend</b>", body_bold), Paragraph("Django 6.0.7 + Django REST Framework 3.17.1 + Daphne (ASGI) / Gunicorn", body)],
        [Paragraph("<b>Banco & ORM</b>", body_bold), Paragraph("Django ORM com SQLite (ambiente dev) / PostgreSQL (produção)", body)],
        [Paragraph("<b>Filas & Background Jobs</b>", body_bold), Paragraph("Celery 5.6.2 + django-celery-beat 2.9.0 (apenas 1 task periódica configurada)", body)],
        [Paragraph("<b>Camada de Cache</b>", body_bold), Paragraph("Redis 7.2.0 via Docker, porém <b>SEM configuração de CACHES no Django settings</b>", body)],
        [Paragraph("<b>Frontend Framework</b>", body_bold), Paragraph("TanStack Start (React 19.2 + TanStack Router + TanStack Query 5.101 + Vite)", body)],
        [Paragraph("<b>Deploy & Servidores</b>", body_bold), Paragraph("Docker Compose (nginx, frontend, backend, redis, celery, celery-beat)", body)],
    ]
    t_stack = Table(stack_data, colWidths=[5 * cm, 12 * cm])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PALETTE["light_bg"]),
        ('GRID', (0,0), (-1,-1), 0.5, PALETTE["border"]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_stack)
    story.append(Spacer(1, 0.4 * cm))

    # Gráficos lado a lado
    chart_table_data = [
        [Image(str(donut_path), width=7.8 * cm, height=5.2 * cm),
         Image(str(bar_path), width=8.8 * cm, height=5.2 * cm)]
    ]
    t_charts = Table(chart_table_data, colWidths=[8.2 * cm, 8.8 * cm])
    t_charts.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_charts)

    story.append(Spacer(1, 0.4 * cm))

    # Tabela com Sumário de Métricas
    kpi_data = [
        [
            Paragraph("<b>TOTAL DE ACHADOS</b><br/><font size=14 color='#0F172A'><b>16</b></font>", body),
            Paragraph("<b>CRÍTICA</b><br/><font size=14 color='#B91C1C'><b>2</b></font>", body),
            Paragraph("<b>ALTA</b><br/><font size=14 color='#EA580C'><b>6</b></font>", body),
            Paragraph("<b>MÉDIA</b><br/><font size=14 color='#D97706'><b>5</b></font>", body),
            Paragraph("<b>BAIXA</b><br/><font size=14 color='#2563EB'><b>1</b></font>", body),
            Paragraph("<b>PONTOS FORTES</b><br/><font size=14 color='#059669'><b>5</b></font>", body),
        ]
    ]
    t_kpi = Table(kpi_data, colWidths=[2.8 * cm, 2.8 * cm, 2.8 * cm, 2.8 * cm, 2.8 * cm, 3 * cm])
    t_kpi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_kpi)

    story.append(Spacer(1, 0.5 * cm))

    # =========================================================================
    # PONTOS FORTES E PONTOS FRACOS
    # =========================================================================
    story.append(Paragraph("2. Pontos Fortes e Pontos Fracos (Gargalos Centrais)", h1))
    story.append(HRFlowable(width="100%", thickness=0.8, color=PALETTE["border"], spaceAfter=10))

    story.append(Paragraph("<b>PONTOS FORTES IDENTIFICADOS NO CÓDIGO (EVIDÊNCIAS DE BOAS PRÁTICAS):</b>", body_bold))
    pontos_fortes_text = (
        "• <b>Otimização de Imagens no Frontend (<code>PlayerPhoto.tsx:28-37</code>):</b> O componente implementa "
        "<code>loading='lazy'</code>, <code>decoding='async'</code>, dimensões explícitas (prevenindo layout shifts - CLS) e é memorizado com <code>React.memo</code>.<br/>"
        "• <b>Eager Loading nos Handlers Principais (<code>products/views.py</code> e <code>auction/views.py</code>):</b> "
        "Utilização de <code>select_related('player')</code> e <code>prefetch_related('images')</code> evitando N+1 nas listagens básicas.<br/>"
        "• <b>Compressão de Imagens WebP (<code>common/images.py:10-33</code>):</b> Conversão automática de fotos para WebP redimensionadas a 256x256 com qualidade 82.<br/>"
        "• <b>Cache Offline / Persistente no Frontend (<code>lib/query-persist.ts</code>):</b> Integração entre TanStack Query e <code>idb-keyval</code> para reter consultas em disco local.<br/>"
        "• <b>WebSocket Assíncrono com Daphne (<code>auction/consumers.py</code>):</b> Distribuição de lances em tempo real por Redis Channel Layer sem necessidade de polling HTTP agressivo."
    )
    story.append(Paragraph(pontos_fortes_text, body))

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("<b>PONTOS FRACOS E GARGALOS CENTRAIS DO SISTEMA:</b>", body_bold))
    pontos_fracos_text = (
        "• <b>Gargalo Central 1 (Catálogo 24 Jogadores):</b> A rota <code>players.index.tsx</code> utilizava paginação client-side sobre apenas o primeiro bloco retornado, escondendo 18.912 jogadores e impossibilitando a busca global. <i>(Solução completa implementada e verificada com paginação de 790 páginas no backend)</i>.<br/>"
        "• <b>Gargalo Central 2 (Processamento Síncrono de Mídia):</b> Importação massiva via HTTP POST bloqueia workers decodificando e convertendo fotos, com signal duplicando arquivos em disco.<br/>"
        "• <b>Gargalo Central 3 (N+1 e Writes em Leituras):</b> O endpoint <code>GET /api/v1/auctions/</code> itera até 50 leilões expirados executando transações e escritas no banco a cada requisição.<br/>"
        "• <b>Gargalo Central 4 (Ausência de Cache no Django):</b> O Redis está ativo no cluster, mas Django não possui <code>CACHES</code> configurado, gerando round-trips desnecessários ao banco."
    )
    story.append(Paragraph(pontos_fracos_text, body))

    story.append(PageBreak())

    # =========================================================================
    # TABELA DETALHADA DE ACHADOS POR CATEGORIA
    # =========================================================================
    story.append(Paragraph("3. Tabela Detalhada de Achados por Categoria", h1))
    story.append(HRFlowable(width="100%", thickness=0.8, color=PALETTE["border"], spaceAfter=10))

    headers_achados = [
        Paragraph("<b>Sev.</b>", body_bold),
        Paragraph("<b>Arquivo : Linha</b>", body_bold),
        Paragraph("<b>Descrição do Problema & Ineficiência</b>", body_bold),
        Paragraph("<b>Impacto Estimado</b>", body_bold),
    ]

    def make_badge(sev_str, style_bg):
        return Table([[Paragraph(f"<b>{sev_str}</b>", badge_crit)]], colWidths=[1.8 * cm])

    achados_rows = [
        # Cat 1
        [
            Table([[Paragraph("CRÍTICA", badge_crit)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['critica']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>players.index.tsx:43-60</code><br/><code>products/views.py:12-16</code>", code_inline),
            Paragraph("<b>Paginação client-side e ausência de busca global:</b> O frontend consumia hook com <code>select</code> descartando a contagem total de 18.936 jogadores e filtrando apenas 24 itens da página 1.", body),
            Paragraph("Impossibilidade de acessar 18.912 jogadores (790 páginas). Busca só encontrava atletas da 1ª página. <i>[CORRIGIDO]</i>", body),
        ],
        [
            Table([[Paragraph("ALTA", badge_alta)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['alta']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>campaigns/services.py:197-203</code>", code_inline),
            Paragraph("<b>N+1 na verificação de jogadores na janela de mercado:</b> Loop <code>for r in qs</code> dispara <code>MarketListing.filter().exists()</code> individualmente por atleta.", body),
            Paragraph("Gera até 501 queries sequenciais ao banco ao povoar mercado em campanhas com 20 elencos.", body),
        ],
        [
            Table([[Paragraph("ALTA", badge_alta)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['alta']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>auction/views.py:54-58</code>", code_inline),
            Paragraph("<b>N+1 e finalização síncrona dentro de GET:</b> <code>AuctionViewSet.list</code> itera até 50 leilões expirados chamando <code>maybe_finalize_user_auction</code>.", body),
            Paragraph("Gera de 100 a 200 queries e writes dentro de um endpoint de leitura, aumentando latência para todos os usuários.", body),
        ],
        [
            Table([[Paragraph("ALTA", badge_alta)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['alta']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>products/models.py:13-18</code><br/><code>fifa_data/models.py:468+</code>", code_inline),
            Paragraph("<b>Ausência de índices em colunas de filtro e ordenação:</b> <code>price</code>, <code>category</code>, <code>date_posted</code>, <code>overall_rating</code>, <code>time_ending</code> sem <code>db_index=True</code>.", body),
            Paragraph("Full Table Scans e ordenação em memória (filesort) sobre 18.936 registros em cada consulta com filtro.", body),
        ],
        [
            Table([[Paragraph("MÉDIA", badge_med)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['media']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>competitions/services/league.py:8-13</code>", code_inline),
            Paragraph("<b>N+1 em geração de entradas de competição:</b> Loop <code>for participant</code> executa <code>get_or_create</code> unitário em vez de <code>bulk_create</code>.", body),
            Paragraph("2N queries ao iniciar chaveamento de competições com múltiplos participantes.", body),
        ],
        # Cat 2
        [
            Table([[Paragraph("CRÍTICA", badge_crit)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['critica']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>fifa_data/views.py:148-156</code><br/><code>fifa_data/services.py:134</code>", code_inline),
            Paragraph("<b>Importação e processamento massivo de fotos síncrono no request:</b> <code>PlayerBulkImportView</code> decodifica base64 e comprime WebP dentro do POST.", body),
            Paragraph("Bloqueio de workers Gunicorn por 30s-2min, com risco de timeouts HTTP 504 e negação de serviço.", body),
        ],
        [
            Table([[Paragraph("ALTA", badge_alta)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['alta']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>fifa_data/models.py:876-905</code>", code_inline),
            Paragraph("<b>Duplicação síncrona de arquivos de mídia via post_save signal:</b> <code>sync_product</code> lê arquivo físico do disco e grava cópia em <code>product_images/</code>.", body),
            Paragraph("Duplica uso de disco para 18.936 jogadores e onera I/O de armazenamento a cada salvamento.", body),
        ],
        [
            Table([[Paragraph("MÉDIA", badge_med)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['media']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>user/views.py:40,62,85</code><br/><code>common/services.py:4</code>", code_inline),
            Paragraph("<b>Gravação síncrona de logs LGPD em transações de usuário:</b> <code>log_personal_data_access</code> executa <code>create()</code> síncrono no login, troca de senha e perfil.", body),
            Paragraph("Round-trip síncrono de escrita adicional em endpoints de alta frequência.", body),
        ],
        # Cat 3
        [
            Table([[Paragraph("ALTA", badge_alta)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['alta']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>core/settings/base.py</code><br/><code>core/settings/production.py</code>", code_inline),
            Paragraph("<b>Inexistência de CACHES no Django:</b> Dicionário <code>CACHES</code> não configurado, deixando o Redis ocioso para a camada de aplicação Django.", body),
            Paragraph("Incapacidade de cachear dados estáticos de tabelas de referência e páginas de alta demanda.", body),
        ],
        [
            Table([[Paragraph("MÉDIA", badge_med)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['media']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>products/views.py:9</code><br/><code>fifa_data/views.py:21</code>", code_inline),
            Paragraph("<b>Ausência de cabeçalhos Cache-Control / ETag em listagens:</b> Respostas de API sem cache HTTP em navegador ou proxies intermediários.", body),
            Paragraph("Toda navegação de rota revalida 100% dos dados mesmo quando inalterados.", body),
        ],
        # Cat 4
        [
            Table([[Paragraph("ALTA", badge_alta)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['alta']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>user/serializers.py:91-94</code>", code_inline),
            Paragraph("<b>Carregamento irrestrito de todo o histórico de lances:</b> <code>MeSerializer.get_bid_history</code> serializa todos os bids do usuário sem limite nem paginação.", body),
            Paragraph("Consumo excessivo de memória RAM por usuário e payload HTTP de vários megabytes em contas ativas.", body),
        ],
        [
            Table([[Paragraph("MÉDIA", badge_med)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['media']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>fifa_data/serializers.py:25-33</code>", code_inline),
            Paragraph("<b>Codificação sob demanda de fotos para Base64 Data URI:</b> <code>PlayerSerializer</code> converte arquivos binários em Base64 dentro do serializer.", body),
            Paragraph("Infla em 33% o payload e onera CPU do backend em serializações de múltiplos jogadores.", body),
        ],
        [
            Table([[Paragraph("BAIXA", badge_bx)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['baixa']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>competitions/services/league.py:65-74</code>", code_inline),
            Paragraph("<b>Criação iterativa de partidas sem bulk_create:</b> Loop de rodadas executa centenas de <code>Match.objects.create()</code> individuais.", body),
            Paragraph("Em ligas de 20 times (380 partidas), executa 380 round-trips de rede com o banco.", body),
        ],
        # Cat 5
        [
            Table([[Paragraph("ALTA", badge_alta)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['alta']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>PlayerFilters.tsx:290-298</code>", code_inline),
            Paragraph("<b>Ausência de debounce no input de busca:</b> Cada tecla acionava navegação de rota e refetch imediato na API de jogadores.", body),
            Paragraph("Digitar um nome de 15 letras gerava 15 requisições de rede quase simultâneas. <i>[CORRIGIDO COM DEBOUNCE 350ms]</i>", body),
        ],
        [
            Table([[Paragraph("ALTA", badge_alta)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['alta']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>players.index.tsx:46</code><br/><code>hooks.ts:69-78</code>", code_inline),
            Paragraph("<b>Chamada redundante a /auctions/ na listagem de jogadores:</b> A página de jogadores disparava busca paralela de leilões apenas para renderizar badges.", body),
            Paragraph("Duplica requisições HTTP na montagem da tela e não garantia leilões fora da página 1.", body),
        ],
        [
            Table([[Paragraph("MÉDIA", badge_med)]], colWidths=[1.8*cm], style=[('BACKGROUND', (0,0), (-1,-1), PALETTE['media']), ('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            Paragraph("<code>routes/__root.tsx</code><br/><code>assets/index-*.js</code>", code_inline),
            Paragraph("<b>Bundle inicial elevado sem code-splitting dinâmico de telas admin:</b> Bundle principal com 357 kB (gzip 112 kB) e dependências compartilhadas >600 kB.", body),
            Paragraph("Atraso no First Contentful Paint (FCP) em dispositivos móveis e redes de baixa largura.", body),
        ],
    ]

    t_achados = Table([headers_achados] + achados_rows, colWidths=[2.2 * cm, 4.2 * cm, 6.2 * cm, 4.4 * cm])
    t_achados.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_achados)

    story.append(PageBreak())

    # =========================================================================
    # RECOMENDAÇÕES PRIORIZADAS
    # =========================================================================
    story.append(Paragraph("4. Plano de Ação e Recomendações Priorizadas", h1))
    story.append(HRFlowable(width="100%", thickness=0.8, color=PALETTE["border"], spaceAfter=10))

    recs_data = [
        [
            Paragraph("<b>Prioridade</b>", body_bold),
            Paragraph("<b>Ação Recomendada</b>", body_bold),
            Paragraph("<b>Esforço / Ganho</b>", body_bold),
            Paragraph("<b>Status</b>", body_bold),
        ],
        [
            Paragraph("<font color='#B91C1C'><b>P1 (Crítica)</b></font>", body),
            Paragraph("<b>Paginação Real e Busca Backend de Jogadores:</b> Conectar filtros e busca no <code>ProductViewSet</code> com DRF PageNumberPagination e parâmetros de URL.", body),
            Paragraph("Baixo / <b>Enorme</b><br/>(Desbloqueia base de 18k)", body),
            Paragraph("<font color='#059669'><b>IMPLEMENTADO</b></font>", body),
        ],
        [
            Paragraph("<font color='#B91C1C'><b>P1 (Crítica)</b></font>", body),
            Paragraph("<b>Migração da Importação de Jogadores para Celery:</b> Mover a decodificação de base64 e salvamento de fotos para background job assíncrono.", body),
            Paragraph("Médio / <b>Alto</b><br/>(Elimina timeouts 504)", body),
            Paragraph("Pendente", body),
        ],
        [
            Paragraph("<font color='#EA580C'><b>P2 (Alta)</b></font>", body),
            Paragraph("<b>Criação de Índices em Colunas de Filtro e Ordenação:</b> Adicionar <code>db_index=True</code> em <code>price</code>, <code>category</code>, <code>date_posted</code>, <code>overall_rating</code>, <code>time_ending</code>.", body),
            Paragraph("Baixo / <b>Alto</b><br/>(Reduz CPU e filesort)", body),
            Paragraph("Pendente", body),
        ],
        [
            Paragraph("<font color='#EA580C'><b>P2 (Alta)</b></font>", body),
            Paragraph("<b>Finalização de Leilões em Celery Beat:</b> Remover a finalização síncrona dentro de <code>AuctionViewSet.list</code> e delegar para cron a cada 1 minuto.", body),
            Paragraph("Baixo / <b>Alto</b><br/>(Elimina writes em GET)", body),
            Paragraph("Pendente", body),
        ],
        [
            Paragraph("<font color='#EA580C'><b>P2 (Alta)</b></font>", body),
            Paragraph("<b>Configuração de Cache Redis no Django:</b> Configurar <code>CACHES</code> com <code>RedisCache</code> em <code>settings/base.py</code> para tabelas estáticas de referência.", body),
            Paragraph("Baixo / <b>Alto</b><br/>(Alivia o banco de dados)", body),
            Paragraph("Pendente", body),
        ],
        [
            Paragraph("<font color='#EA580C'><b>P2 (Alta)</b></font>", body),
            Paragraph("<b>Debounce no Input de Filtro do Frontend:</b> Aplicar buffer de digitação de 350ms para evitar chamadas de API por tecla.", body),
            Paragraph("Baixo / <b>Médio</b><br/>(Poupa rede do cliente)", body),
            Paragraph("<font color='#059669'><b>IMPLEMENTADO</b></font>", body),
        ],
        [
            Paragraph("<font color='#D97706'><b>P3 (Média)</b></font>", body),
            Paragraph("<b>Paginação no Histórico de Bids em /users/me/:</b> Limitar a 50 lances recentes ou disponibilizar endpoint paginado para o histórico.", body),
            Paragraph("Baixo / <b>Médio</b><br/>(Evita estouro de memória)", body),
            Paragraph("Pendente", body),
        ],
        [
            Paragraph("<font color='#D97706'><b>P3 (Média)</b></font>", body),
            Paragraph("<b>Substituição de Loops por bulk_create:</b> Aplicar <code>bulk_create</code> na geração de partidas e povoamento de mercados.", body),
            Paragraph("Baixo / <b>Médio</b><br/>(Reduz round-trips)", body),
            Paragraph("Pendente", body),
        ],
    ]
    t_recs = Table(recs_data, colWidths=[2.6 * cm, 8.4 * cm, 3.8 * cm, 2.2 * cm])
    t_recs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_recs)

    story.append(PageBreak())

    # =========================================================================
    # ISSUES PARA O GITHUB
    # =========================================================================
    story.append(Paragraph("5. Issues Acionáveis para o GitHub", h1))
    story.append(Paragraph(
        "Abaixo estão os textos completos prontos para copiar e colar no GitHub Issues, "
        "com evidências de código, impacto, sugestão de correção e critérios de aceite.",
        body
    ))
    story.append(HRFlowable(width="100%", thickness=0.8, color=PALETTE["border"], spaceAfter=10))

    issues_text = [
        # Issue 1
        """--- ISSUE 1 ---
### [Performance] Paginação server-side e filtros globais na base de 18.936 jogadores
**Labels:** `performance`, `critical`, `frontend`, `backend`

#### Descrição do Problema
O frontend em `players.index.tsx` utilizava uma paginação client-side sobre apenas o primeiro lote retornado pela API, ocultando 18.912 jogadores e impedindo a busca global de atletas fora da página 1. O backend não processava parâmetros de busca textual nem filtros de atributos.

#### Evidência
- `frontend/src/routes/players.index.tsx:43-60`
```tsx
const { data: pageData } = useProducts(page, pageSize);
const products = pageData?.results ?? []; // select do hook retornava array, invalidando .results
usePlayerFiltering(products, filters); // filtrava apenas 24 itens em memória
```
- `backend/products/views.py:12-16`
```python
def get_queryset(self):
    return Product.objects.select_related("player").prefetch_related("images").order_by("-date_posted")
```

#### Impacto Estimado
Inacessibilidade de 99,8% do banco de dados (790 páginas).

#### Correção Recomendada
1. Habilitar `StandardResultsSetPagination` (24 itens por página com `page_size` customizável).
2. Adicionar filtros de `search`/`q`, `position`, `minOverall`, `maxOverall`, `minAge`, `maxAge`, `foot`, `maxPrice` e ordenações no `ProductViewSet`.
3. Atualizar `useProductsPage` e `PlayerFilters` para enviar query parameters e exibir o contador global formatado.

#### Critérios de Aceite
- [x] Rota `/players` exibe contagem total real (ex: "18.936 jogadores encontrados · 24 por página").
- [x] Botões 'Próximo' e 'Anterior' carregam as páginas seguintes e anteriores via API.
- [x] Busca textual por "Messi" ou "Ronaldo" encontra todos os atletas correspondentes no banco.
- [x] Filtros por posição (ex: GK, ST) retornam apenas atletas da respectiva categoria paginados.
--- FIM ISSUE 1 ---""",

        # Issue 2
        """--- ISSUE 2 ---
### [Performance] Mover importação massiva de jogadores e decodificação de imagens para Celery
**Labels:** `performance`, `critical`, `backend`

#### Descrição do Problema
A view `PlayerBulkImportView` processa requisições HTTP POST contendo lotes massivos de jogadores do scraper SoFIFA. Todo o processamento (decodificação base64, conversão PIL para WebP, múltiplos `update_or_create` e duplicação em disco) roda de forma síncrona dentro da requisição.

#### Evidência
- `backend/fifa_data/views.py:151-156`
```python
def post(self, request):
    rows = request.data.get("players", [])
    players = import_players_bulk(rows)
    return Response({"imported": len(players)}, status=201)
```

#### Impacto Estimado
Bloqueio de workers por 30s a vários minutos, provocando timeouts HTTP 504 no Nginx/Gunicorn.

#### Correção Recomendada
Transformar `import_players_bulk` em uma Celery Task (`fifa_data.tasks.import_players_batch_task`). A view deve responder HTTP 202 Accepted com o `task_id` imediatamente.

#### Critérios de Aceite
- [ ] Endpoint `/api/v1/import/players/` responde em < 200ms com HTTP 202 Accepted.
- [ ] Processamento executado assincronamente pelo worker do Celery.
- [ ] Erros de processamento logados sem afetar a disponibilidade da API.
--- FIM ISSUE 2 ---""",

        # Issue 3
        """--- ISSUE 3 ---
### [Performance] Eliminar finalização síncrona de leilões expirados no GET /api/v1/auctions/
**Labels:** `performance`, `high`, `backend`

#### Descrição do Problema
Dentro do método `list()` de `AuctionViewSet`, a cada requisição de leitura da listagem de leilões, o código busca até 50 leilões expirados e executa `maybe_finalize_user_auction`, gerando queries de lances e updates de banco de dados em um método GET.

#### Evidência
- `backend/auction/views.py:54-58`
```python
def list(self, request, *args, **kwargs):
    expired = Auction.objects.filter(status=Status.OPEN, time_ending__lte=timezone.now())[:50]
    for auction in expired:
        maybe_finalize_user_auction(auction)
    return super().list(request, *args, **kwargs)
```

#### Impacto Estimado
Até 150-200 queries extras (incluindo writes e locks de transação) em um endpoint de leitura pública.

#### Correção Recomendada
1. Remover o bloco de finalização de dentro de `AuctionViewSet.list`.
2. Criar uma Celery Task periódica no `CELERY_BEAT_SCHEDULE` rodando a cada 1 minuto para finalizar leilões expirados.

#### Critérios de Aceite
- [ ] `GET /api/v1/auctions/` executa apenas a query de listagem paginada (zero escritas).
- [ ] Leilões que atingiram `time_ending` são finalizados automaticamente pelo Celery Beat.
--- FIM ISSUE 3 ---""",

        # Issue 4
        """--- ISSUE 4 ---
### [Performance] Adicionar índices de banco de dados em colunas de filtro e ordenação
**Labels:** `performance`, `high`, `database`

#### Descrição do Problema
Colunas amplamente utilizadas em cláusulas `WHERE`, `ORDER BY` e filtros de busca não possuem `db_index=True`, forçando a realização de Full Table Scans e filesorts na tabela de produtos (18.936+ linhas) e tabela de lances.

#### Evidência
- `backend/products/models.py:13-15`: `category`, `price`, `date_posted`
- `backend/fifa_data/models.py:468-520`: `overall_rating`, `potential`, `age`, `common_name`
- `backend/auction/models.py:23-25`: `status`, `time_ending`
- `backend/auction/models.py:32-36`: `Bid.bid_time`, `Bid.price`

#### Impacto Estimado
Degradação proporcional ao tamanho do banco de dados; consumo excessivo de I/O e CPU do PostgreSQL/SQLite.

#### Correção Recomendada
Criar migração Django adicionando índices simples e compostos:
```python
# Exemplo em Bid:
class Meta:
    indexes = [
        models.Index(fields=['auction', '-price', 'bid_time']),
        models.Index(fields=['user', '-bid_time']),
    ]
```

#### Critérios de Aceite
- [ ] Migração criada e executada sem falhas.
- [ ] `EXPLAIN` confirma Index Scan em vez de Seq Scan nas queries filtradas.
--- FIM ISSUE 4 ---""",

        # Issue 5
        """--- ISSUE 5 ---
### [Performance] Configurar camada de cache Redis no Django settings
**Labels:** `performance`, `high`, `backend`, `cache`

#### Descrição do Problema
O arquivo de configuração `base.py` e `production.py` não define o dicionário `CACHES`, deixando de aproveitar a instância Redis já em execução no Docker para armazenar dados de consulta frequente e baixa mutabilidade.

#### Evidência
- `backend/core/settings/base.py`: Ausência da chave `CACHES`.

#### Impacto Estimado
Requisições desnecessárias a tabelas de catálogo estáticas (posições, países, ligas, clubes) a cada carregamento de página.

#### Correção Recomendada
Adicionar em `backend/core/settings/base.py`:
```python
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://127.0.0.1:6379/1"),
        "TIMEOUT": 300,
    }
}
```

#### Critérios de Aceite
- [ ] `django.core.cache.cache.set()` e `get()` funcionam com o backend Redis.
- [ ] Endpoints de metadados utilizam cache com TTL de 1 hora.
--- FIM ISSUE 5 ---"""
    ]

    for issue in issues_text:
        issue_box = [
            [Paragraph(issue.replace("\n", "<br/>").replace("    ", "&nbsp;&nbsp;&nbsp;&nbsp;"), code_block)]
        ]
        t_iss = Table(issue_box, colWidths=[17 * cm])
        t_iss.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(t_iss)
        story.append(Spacer(1, 0.3 * cm))

    # Construção do documento
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Relatório PDF gerado com sucesso em: {PDF_PATH}")


if __name__ == "__main__":
    build_pdf()
