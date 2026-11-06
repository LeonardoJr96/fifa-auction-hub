"""O quantum do Orion, calculado do grafo: a conta da Aula 17.

Uso, a partir desta pasta:

    python quantum.py                           # as quatro formas da aula
    python quantum.py --notificacoes-assincronas  # arestas para Notificacoes via fila
    python quantum.py --banco-unico             # todas as formas atras de um banco so
    python quantum.py --particao "Portal,Checkout|Catalogo|Pagamentos"
                                                # uma forma sua; o que sobrar fica junto

Este script nao usa o Mini-Orion: opera sobre o grafo do Marketplace Orion
inteiro, os dez componentes e as 17 arestas das Aulas 7 e 12 (`A -> B`
significa que A depende de B). As taxas de falha e de disponibilidade sao
as hipoteses de trabalho das Aulas 16 e 17, nao medicoes.
"""

import argparse
from dataclasses import dataclass
from itertools import combinations

# `A -> B`: A depende de B. As 17 arestas do grafo das Aulas 7 e 12.
ARESTAS: list[tuple[str, str]] = [
    # O Portal/API roteia as chamadas principais do frontend
    ("PortalAPI", "User"),          # Autenticação e saldo do usuário
    ("PortalAPI", "Auction"),       # Mercado de leilões e lances
    ("PortalAPI", "Competitions"),  # Ligas, copas e tabelas
    ("PortalAPI", "Team"),          # Elencos virtuais e formações

    # Fluxo de Leilão (Auction)
    ("Auction", "User"),            # Validação de quem está dando o lance
    ("Auction", "Payment"),         # Reserva/débito de saldo para o lance
    ("Auction", "FifaData"),        # Consulta aos atributos do card do jogador

    # Fluxo de Competições e Elencos
    ("Competitions", "Team"),       # Validação de elencos inscritos nas ligas
    ("Competitions", "Payment"),    # Premiações de campeonatos e inscrições
    ("Team", "FifaData"),           # Escalação de jogadores do catálogo

    # Fluxo de Pagamentos e Notificações
    ("Payment", "User"),            # Atualização direta do saldo do usuário
    ("Payment", "Social"),          # Notificação de cobrança/recibo de leilão
    ("Competitions", "Social"),     # Notificação de fim de partida/torneio
]

COMPONENTES = sorted({c for aresta in ARESTAS for c in aresta})

# Dois componentes que a conta trata de modo especial. Quem aplicar o script a
# outro grafo troca estes dois nomes, alem de ARESTAS e MODULOS.
ORIGEM_DO_FLUXO = "Auction"  # o componente cujas chamadas formam o caminho do fluxo medido
DESTINO_DA_FILA = "Social"  # quem recebe as arestas que podem passar por fila

# Os oito modulos de dominio da Aula 12.
MODULOS: dict[str, list[str]] = {
    "Mercado": ["PortalAPI", "Auction"],
    "GestaoElencos": ["Team", "FifaData"],
    "Competicoes": ["Competitions"],
    "Financeiro": ["Payment", "User"],
    "Notificacoes": ["Social"],
}

# Hipoteses de trabalho (Aulas 16 e 17): nao sao medicoes do Orion.
TAXA_DE_FALHA = 0.02  # por chamada remota, em campanha
DISPONIBILIDADE = 0.999  # mensal, de cada artefato implantavel
MINUTOS_NO_MES = 30 * 24 * 60

Forma = dict[str, str]  # componente -> artefato implantavel em que vive

def forma_monolito() -> Forma:
    """Monólito modular: 1 único artefato contendo todos os componentes."""
    return {comp: "Monolito" for comp in COMPONENTES}

def forma_extracao() -> Forma:
    """Extração do candidato (Payment) num serviço separado."""
    forma = forma_monolito()
    forma["Payment"] = "ServicoPagamentos"
    return forma

def forma_service_based() -> Forma:
    """Agrupamento por domínios segundo a constante MODULOS."""
    return {c: modulo for modulo, itens in MODULOS.items() for c in itens}

def forma_service_based_agrupado() -> Forma:
    """Como a service-based, mas agrupa Payment no mesmo artefato de Competitions."""
    forma = forma_service_based()
    forma["Payment"] = forma["Competitions"]
    return forma

def forma_microsservicos() -> Forma:
    """Microsserviços: cada componente num serviço separado."""
    return {c: c for c in COMPONENTES}

def forma_fluxo_negocio() -> Forma:
    """Forma por fluxo de negócio: agrupa componentes por fluxos principais.

    - Leilao: Auction, FifaData (fluxo de leilão)
    - Competicoes: Competitions, Team, Payment (fluxo de competições)
    - Portal: PortalAPI, User, Social (fluxo de portal/frontend)
    """
    return {
        "Auction": "Leilao",
        "FifaData": "Leilao",
        "Competitions": "Competicoes",
        "Team": "Competicoes",
        "Payment": "Competicoes",
        "PortalAPI": "Portal",
        "User": "Portal",
        "Social": "Portal",
    }

def forma_hibrida() -> Forma:
    """Forma híbrida: monolito modular com extração de pagamentos e notificações.

    - Core: Auction, PortalAPI, Competitions (núcleo do sistema)
    - Financeiro: Payment, User (serviço financeiro separado)
    - Notificacoes: Social (serviço de notificações separado)
    - Dados: FifaData, Team (serviço de dados)
    """
    return {
        "Auction": "Core",
        "PortalAPI": "Core",
        "Competitions": "Core",
        "Payment": "Financeiro",
        "User": "Financeiro",
        "Social": "Notificacoes",
        "FifaData": "Dados",
        "Team": "Dados",
    }

def forma_por_transacao() -> Forma:
    """Forma por transação: agrupa componentes por transações críticas.

    - Checkout: Auction, Payment, User (transação de compra/leilão)
    - Elencos: Team, FifaData (gestão de elencos)
    - Portal: PortalAPI, Competitions, Social (interações do portal)
    """
    return {
        "Auction": "Checkout",
        "Payment": "Checkout",
        "User": "Checkout",
        "Team": "Elencos",
        "FifaData": "Elencos",
        "PortalAPI": "Portal",
        "Competitions": "Portal",
        "Social": "Portal",
    }

def forma_de_particao(texto: str) -> Forma:
    """`A,B|C|D,E` vira tres artefatos; o que nao for citado fica junto."""
    forma: Forma = {}
    for n, grupo in enumerate(texto.split("|")):
        for componente in grupo.split(","):
            nome = componente.strip()
            if nome not in COMPONENTES:
                raise SystemExit(f"componente desconhecido: {nome!r}")
            forma[nome] = f"artefato-{n + 1}"
    for c in COMPONENTES:
        forma.setdefault(c, "resto")
    return forma

def arestas_remotas(forma: Forma) -> list[tuple[str, str]]:
    """Arestas cujas pontas vivem em artefatos diferentes."""
    return [(a, b) for a, b in ARESTAS if forma[a] != forma[b]]

def chamadas_diretas_de(forma: Forma, origem: str = ORIGEM_DO_FLUXO) -> int:
    """Chamadas remotas que `origem` faz diretamente a outros componentes."""
    return sum(1 for a, b in arestas_remotas(forma) if a == origem)

def artefatos_do_fechamento(forma: Forma, origem: str = ORIGEM_DO_FLUXO) -> int:
    """Artefatos que um fechamento de compra toca: o do `Checkout` e os que ele chama."""
    tocados = {forma[origem]} | {forma[b] for a, b in ARESTAS if a == origem}
    return len(tocados)

def quanta(
    forma: Forma,
    assincronas: set[tuple[str, str]] | None = None,
    banco_compartilhado: bool = True,
) -> int:
    """Conta os quanta: componentes ligados por artefato comum, por chamada sincrona
    OU por um banco compartilhado.

    Mesmo artefato: nao se implantam separados. Chamada sincrona: a disponibilidade
    e a escala de quem chama dependem de quem e chamado. Banco compartilhado: todos
    os componentes atras dele dependem do mesmo ponto de acoplamento, mesmo que
    nenhum chame o outro.
    """
    assincronas = assincronas or set()
    pai = {c: c for c in COMPONENTES}

    def raiz(c: str) -> str:
        while pai[c] != c:
            pai[c] = pai[pai[c]]
            c = pai[c]
        return c

    ligacoes = [(a, b) for a, b in COMPONENTES for b in COMPONENTES if forma[a] == forma[b]]
    ligacoes += [aresta for aresta in ARESTAS if aresta not in assincronas]
    if banco_compartilhado:
        ligacoes += [(COMPONENTES[0], c) for c in COMPONENTES[1:]]
    for a, b in ligacoes:
        pai[raiz(a)] = raiz(b)
    return len({raiz(c) for c in COMPONENTES})

def notificacoes_assincronas() -> set[tuple[str, str]]:
    """As arestas que chegam em `DESTINO_DA_FILA`, trocadas por fila."""
    return {(a, b) for a, b in ARESTAS if b == DESTINO_DA_FILA}

def p_ao_menos_uma_falha(chamadas: int, taxa: float = TAXA_DE_FALHA) -> float:
    return 1 - (1 - taxa) ** chamadas

def disponibilidade_em_serie(artefatos: int, base: float = DISPONIBILIDADE) -> float:
    return base**artefatos

@dataclass
class Linha:
    nome: str
    artefatos: int
    remotas: int
    diretas: int
    p_falha: float
    disponibilidade: float
    minutos: float
    quanta_sincrono: int
    quanta_com_fila: int

def avaliar(
    nome: str,
    forma: Forma,
    banco_compartilhado: bool = True,
    assincronas: set[tuple[str, str]] | None = None,
) -> Linha:
    if assincronas is None:
        assincronas = notificacoes_assincronas()

    tocados = artefatos_do_fechamento(forma)
    diretas = chamadas_diretas_de(forma)
    disp = disponibilidade_em_serie(tocados)

    return Linha(
        nome=nome,
        artefatos=len(set(forma.values())),
        remotas=len(arestas_remotas(forma)),
        diretas=diretas,
        p_falha=p_ao_menos_uma_falha(diretas),
        disponibilidade=disp,
        minutos=(1 - disp) * MINUTOS_NO_MES,
        quanta_sincrono=quanta(forma, banco_compartilhado=banco_compartilhado),
        quanta_com_fila=quanta(
            forma,
            assincronas=assincronas,
            banco_compartilhado=banco_compartilhado,
        ),
    )

def pct(x: float) -> str:
    return f"{100 * x:.1f}%".replace(".", ",")

def imprimir(linhas: list[Linha], notificacoes_assincronas: bool) -> None:
    print(f"Grafo: {len(COMPONENTES)} componentes, {len(ARESTAS)} arestas.")
    print(f"Hipoteses: falha de {pct(TAXA_DE_FALHA)} por chamada remota; "
          f"{pct(DISPONIBILIDADE)} de disponibilidade por artefato.\n")
    col = "quanta (fila)" if notificacoes_assincronas else "quanta (sinc.)"
    print(f"{'forma':26}{'artefatos':>10}{'arestas':>9}{'chamadas':>10}{'P(falha)':>10}"
          f"{'disponib.':>11}{'min/mes':>9}{col:>16}")
    for x in linhas:
        q = x.quanta_com_fila if notificacoes_assincronas else x.quanta_sincrono
        print(f"{x.nome:26}{x.artefatos:10d}{x.remotas:9d}{x.diretas:10d}{pct(x.p_falha):>10}"
              f"{pct(x.disponibilidade):>11}{x.minutos:9.0f}{q:16d}")
    print("\narestas = arestas remotas; chamadas = chamadas remotas diretas do Checkout;")
    print("disponib. e min/mes = artefatos tocados por um fechamento, em serie.")

def parse_aresta_str(arestas_str: str) -> set[tuple[str, str]]:
    """Converte 'Origem>Destino,A>B' em {('Origem', 'Destino'), ('A', 'B')}."""
    if not arestas_str.strip():
        return set()

    resultado = set()
    for par in arestas_str.split(","):
        if ">" in par:
            origem, destino = par.split(">")
            resultado.add((origem.strip(), destino.strip()))
    return resultado

def encontrar_melhor_reducao_quanta(forma: Forma, banco_compartilhado: bool = True) -> tuple[set[tuple[str, str]], int]:
    """Encontra o menor conjunto de arestas que, passando por fila, reduz o quanta.

    Estratégia: testa todas as combinações de arestas remotas, procurando o menor
    conjunto que reduz o quanta. Para formas com banco compartilhado, nenhum
    conjunto basta porque o banco já conecta tudo.

    Args:
        forma: A forma de implantação a ser analisada
        banco_compartilhado: Se True, considera que todos os componentes compartilham banco

    Returns:
        Tuple of (arestas_para_fila, novo_quanta) ou (set(), quanta_atual) se não reduz.
    """
    arestas = arestas_remotas(forma)
    quanta_atual = quanta(forma, banco_compartilhado=banco_compartilhado)

    # Com banco compartilhado, não há redução possível
    if banco_compartilhado:
        return set(), quanta_atual

    # Testa combinações crescentes de arestas
    for tamanho in range(1, len(arestas) + 1):
        for combo in combinations(arestas, tamanho):
            arestas_fila = set(combo)
            novo_quanta = quanta(forma, assincronas=arestas_fila, banco_compartilhado=False)
            if novo_quanta < quanta_atual:
                return arestas_fila, novo_quanta

    return set(), quanta_atual

def gerar_tabela_resumo(formas: list[tuple[str, Forma, bool]]) -> str:
    """Gera a tabela resumo com 4 situações para cada forma.

    Situações:
    1. Tudo síncrono (sem filas)
    2. Com filas (arestas que chegam em Social)
    3. Com banco compartilhado
    4. Com banco único (cada serviço tem seu próprio banco)

    Returns:
        String formatada com a tabela completa.
    """
    linhas = []
    linhas.append("=" * 120)
    linhas.append("TABELA RESUMO - QUANTA POR FORMA DE IMPLANTACAO")
    linhas.append("=" * 120)
    linhas.append("")
    linhas.append(f"{'Forma':<30} | {'Artefatos':>8} | {'Remotas':>8} | {'Diretas':>8} | "
                  f"{'Sinc.':>6} | {'Com Fila':>10} | {'Banco Comp.':>12} | {'Banco Unico':>12}")
    linhas.append("-" * 120)

    for nome, forma, banco in formas:
        artefatos = len(set(forma.values()))
        remotas = len(arestas_remotas(forma))
        diretas = chamadas_diretas_de(forma)

        # 1. Tudo síncrono
        q_sinc = quanta(forma, assincronas=set(), banco_compartilhado=banco)

        # 2. Com filas (arestas para Social)
        filas = notificacoes_assincronas()
        q_fila = quanta(forma, assincronas=filas, banco_compartilhado=banco)

        # 3. Com banco compartilhado
        q_banco_comp = quanta(forma, assincronas=set(), banco_compartilhado=True)

        # 4. Com banco único (cada serviço tem seu próprio banco)
        q_banco_unico = quanta(forma, assincronas=set(), banco_compartilhado=False)

        linhas.append(f"{nome:<30} | {artefatos:>8} | {remotas:>8} | {diretas:>8} | "
                        f"{q_sinc:>6} | {q_fila:>10} | {q_banco_comp:>12} | {q_banco_unico:>12}")

    linhas.append("")
    linhas.append("=" * 120)
    linhas.append("")
    linhas.append("OBSERVACOES:")
    linhas.append("- Estrututurais (lidos do grafo): artefatos, arestas remotas, chamadas diretas")
    linhas.append("- Dependem de hipotese: P(falha), disponibilidade, minutos fora do ar")
    linhas.append("- Quanta com banco compartilhado: todos os componentes atras do banco ficam ligados")
    linhas.append("- Quanta sem banco compartilhado: depende das arestas sincronas entre componentes")
    linhas.append("")

    return "\n".join(linhas)

def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__.split("\n")[0],
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python quantum.py                                    # as quatro formas principais
  python quantum.py --banco-unico                    # todos com banco por serviço
  python quantum.py --assincronas "Payment>Social"   # arestas específicas via fila
  python quantum.py --tabela                         # gera tabela resumo
        """
    )
    parser.add_argument(
        "--notificacoes-assincronas",
        action="store_true",
        help="troca por fila as arestas que chegam em DESTINO_DA_FILA",
    )
    parser.add_argument(
        "--assincronas",
        type=str,
        default="",
        help='Lista de arestas assíncronas separadas por vírgula no formato Origem>Destino (ex: "Payment>Social,Auction>User")',
    )
    parser.add_argument(
        "--banco-unico",
        action="store_true",
        help="todas as formas atrás de um banco só (os microsserviços, por padrão, têm um banco por serviço)",
    )
    parser.add_argument(
        "--particao",
        type=str,
        default="",
        help='forma própria, ex.: "PortalAPI,Auction|Payment,User"',
    )
    parser.add_argument(
        "--tabela",
        action="store_true",
        help="gera a tabela resumo com todas as formas e as 4 situações",
    )

    args = parser.parse_args()

    # Parse das arestas assíncronas
    assincronas_cli = parse_aresta_str(args.assincronas)

    # Se notificacoes-assincronas, usa as arestas padrão
    if args.notificacoes_assincronas and not assincronas_cli:
        assincronas_cli = notificacoes_assincronas()

    # Formas a serem analisadas
    formas = [
        ("monólito modular", forma_monolito(), True),
        ("extração do candidato", forma_extracao(), True),
        ("por domínio (service-based)", forma_service_based(), True),
        ("service-based agrupado", forma_service_based_agrupado(), True),
        ("microsserviços", forma_microsservicos(), False),
        ("por fluxo de negócio", forma_fluxo_negocio(), True),
        ("híbrida", forma_hibrida(), True),
        ("por transação", forma_por_transacao(), True),
    ]

    # Adiciona forma de partição se especificada
    if args.particao:
        formas.append(("particao customizada", forma_de_particao(args.particao), True))

    # Se solicitado, gera apenas a tabela
    if args.tabela:
        print(gerar_tabela_resumo(formas))
        return

    # Análise padrão
    imprimir(
        [
            avaliar(
                n,
                f,
                banco_compartilhado=(banco or args.banco_unico),
                assincronas=assincronas_cli,
            )
            for n, f, banco in formas
        ],
        notificacoes_assincronas=bool(assincronas_cli),
    )

    # Análise de redução de quanta
    if not args.assincronas and not args.notificacoes_assincronas:
        print("\n" + "=" * 60)
        print("ANALISE: Menor conjunto de arestas para reduzir quanta")
        print("=" * 60)

        for nome, forma, banco in formas:
            arestas_fila, novo_quanta = encontrar_melhor_reducao_quanta(forma)
            quanta_atual = quanta(forma, banco_compartilhado=banco)

            if novo_quanta < quanta_atual:
                print(f"\n{nome}:")
                print(f"  Quanta atual: {quanta_atual}")
                print(f"  Quanta com filas: {novo_quanta}")
                print(f"  Arestas para fila: {arestas_fila}")
            else:
                print(f"\n{nome}:")
                print(f"  Quanta atual: {quanta_atual}")
                print(f"  Nenhum conjunto de arestas reduz o quanta (banco compartilhado)")

if __name__ == "__main__":
    main()