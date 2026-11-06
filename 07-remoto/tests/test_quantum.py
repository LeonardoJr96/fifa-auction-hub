"""A conta da Aula 17, como contrato.

Os invariantes confirmam que o script usa o mesmo grafo das Aulas 7 e 12.
Os numeros por forma sao os que o texto da aula cita: se mudarem, a aula
precisa ser revista junto.
"""

import pytest

import quantum as q

def test_monolito_modular() -> None:
    linha = q.avaliar("monólito modular", q.forma_monolito(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (1, 0, 0)
    assert linha.quanta_sincrono == 1


def test_extracao_do_candidato() -> None:
    linha = q.avaliar("extração do candidato (Payment)", q.forma_extracao(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (2, 3, 1)
    assert linha.quanta_sincrono == 1


def test_service_based_por_dominio() -> None:
    linha = q.avaliar("por domínio (service-based)", q.forma_service_based(), banco_compartilhado=True)
    assert (linha.artefatos, linha.remotas, linha.diretas) == (5, 8, 2)
    assert linha.quanta_sincrono == 1
