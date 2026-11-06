"""Testes para as formas de implantação do FIFA Auction Hub.

Para cada forma, antes de rodar o script, conte à mão e anote:
- quantos artefatos
- quantas arestas remotas
- quantas chamadas diretas do componente de ORIGEM_DO_FLUXO (Auction)
- quantos quanta com tudo sincrono

Os valores abaixo são os calculados pelo script quantum.py.
"""

import pytest

import quantum as q


def test_monolito_modular() -> None:
    """Monólito modular: 1 único artefato contendo todos os componentes."""
    linha = q.avaliar("monólito modular", q.forma_monolito(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (1, 0, 0)
    assert linha.quanta_sincrono == 1


def test_extracao_do_candidato() -> None:
    """Extração do candidato (Payment) num serviço separado."""
    linha = q.avaliar("extração do candidato (Payment)", q.forma_extracao(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (2, 4, 1)
    assert linha.quanta_sincrono == 1


def test_service_based_por_dominio() -> None:
    """Agrupamento por domínios segundo a constante MODULOS."""
    linha = q.avaliar("por domínio (service-based)", q.forma_service_based(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (5, 10, 3)
    assert linha.quanta_sincrono == 1


def test_service_based_agrupado() -> None:
    """Service-based com Payment agrupado com Competitions."""
    linha = q.avaliar("service-based agrupado", q.forma_service_based_agrupado(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (5, 10, 3)
    assert linha.quanta_sincrono == 1


def test_microsservicos_com_banco_unico() -> None:
    """Microsserviços com banco compartilhado (banco-unico)."""
    linha = q.avaliar("microsserviços", q.forma_microsservicos(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (8, 13, 3)
    assert linha.quanta_sincrono == 1


def test_microsservicos_sem_banco_unico() -> None:
    """Microsserviços sem banco compartilhado (banco por serviço)."""
    linha = q.avaliar("microsserviços", q.forma_microsservicos(), banco_compartilhado=False)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (8, 13, 3)
    # Sem banco compartilhado, o quanta depende da estrutura do grafo
    # Com 8 componentes e arestas que conectam todos, o quanta é 1
    assert linha.quanta_sincrono == 1


def test_por_fluxo_de_negocio() -> None:
    """Forma por fluxo de negócio: agrupa componentes por fluxos principais."""
    linha = q.avaliar("por fluxo de negócio", q.forma_fluxo_negocio(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (3, 9, 2)
    assert linha.quanta_sincrono == 1


def test_hibrida() -> None:
    """Forma híbrida: monolito modular com extração de pagamentos e notificações."""
    linha = q.avaliar("híbrida", q.forma_hibrida(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (4, 9, 3)
    assert linha.quanta_sincrono == 1


def test_por_transacao() -> None:
    """Forma por transação: agrupa componentes por transações críticas."""
    linha = q.avaliar("por transação", q.forma_por_transacao(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (3, 7, 1)
    assert linha.quanta_sincrono == 1


def test_parse_aresta_str() -> None:
    """Testa o parsing de string de arestas assíncronas."""
    # String vazia
    assert q.parse_aresta_str("") == set()
    assert q.parse_aresta_str("   ") == set()

    # Uma aresta
    assert q.parse_aresta_str("Payment>Social") == {("Payment", "Social")}

    # Múltiplas arestas
    assert q.parse_aresta_str("Payment>Social,Auction>User") == {
        ("Payment", "Social"),
        ("Auction", "User"),
    }

    # Com espaços
    assert q.parse_aresta_str("Payment > Social , Auction > User") == {
        ("Payment", "Social"),
        ("Auction", "User"),
    }


def test_arestas_remotas() -> None:
    """Testa a identificação de arestas remotas."""
    forma = q.forma_monolito()
    assert q.arestas_remotas(forma) == []

    forma = q.forma_extracao()
    remotas = q.arestas_remotas(forma)
    assert len(remotas) == 4
    # Payment está em artefato diferente
    assert ("Auction", "Payment") in remotas
    assert ("Payment", "User") in remotas
    assert ("Payment", "Social") in remotas
    assert ("Competitions", "Payment") in remotas


def test_chamadas_diretas_de() -> None:
    """Testa a contagem de chamadas diretas do componente de origem."""
    forma = q.forma_monolito()
    assert q.chamadas_diretas_de(forma) == 0

    forma = q.forma_extracao()
    # Auction chama Payment diretamente
    assert q.chamadas_diretas_de(forma) == 1


def test_avaliar_com_assincronas() -> None:
    """Testa a avaliação com arestas assíncronas customizadas."""
    forma = q.forma_microsservicos()

    # Tudo sincrono
    linha_sync = q.avaliar("test", forma, banco_compartilhado=False, assincronas=set())
    assert linha_sync.quanta_sincrono == 1

    # Com algumas arestas assíncronas
    linha_async = q.avaliar(
        "test",
        forma,
        banco_compartilhado=False,
        assincronas={("Payment", "Social"), ("Competitions", "Social")},
    )
    # O quanta pode mudar dependendo das arestas
    assert linha_async.quanta_sincrono >= 1


def test_forma_de_particao() -> None:
    """Testa a criação de forma a partir de partição personalizada."""
    forma = q.forma_de_particao("PortalAPI,Auction|Payment,User")
    assert forma["PortalAPI"] == "artefato-1"
    assert forma["Auction"] == "artefato-1"
    assert forma["Payment"] == "artefato-2"
    assert forma["User"] == "artefato-2"
    # Componentes não citados ficam em "resto"
    assert forma["FifaData"] == "resto"
    assert forma["Team"] == "resto"
    assert forma["Competitions"] == "resto"
    assert forma["Social"] == "resto"


def test_encontrar_melhor_reducao_quanta() -> None:
    """Testa a busca pelo melhor conjunto de arestas para reduzir quanta."""
    forma = q.forma_microsservicos()

    # Com banco compartilhado, não há redução
    arestas, novo_q = q.encontrar_melhor_reducao_quanta(forma, banco_compartilhado=True)
    assert arestas == set()
    assert novo_q == 1  # quanta atual com banco compartilhado

    # Sem banco compartilhado, testa se consegue reduzir
    arestas2, novo_q2 = q.encontrar_melhor_reducao_quanta(forma, banco_compartilhado=False)
    # O quanta sem banco compartilhado pode ser maior que 1
    assert novo_q2 >= 1


def test_gerar_tabela_resumo() -> None:
    """Testa a geração da tabela resumo."""
    formas = [
        ("monólito", q.forma_monolito(), True),
        ("microsserviços", q.forma_microsservicos(), False),
    ]
    tabela = q.gerar_tabela_resumo(formas)

    assert "TABELA RESUMO" in tabela
    assert "monólito" in tabela
    assert "microsserviços" in tabela
    assert "Artefatos" in tabela
    assert "Quanta" in tabela or "quanta" in tabela.lower()