ARESTAS = [
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

ORIGEM_DO_FLUXO = "Auction"  # Coordena o mercado e a movimentação principal
DESTINO_DA_FILA = "Social"   # Módulo assíncrono que recebe notificações (WebSockets/Feed)

MODULOS = {
    "Mercado": ["PortalAPI", "Auction"],
    "GestaoElencos": ["Team", "FifaData"],
    "Competicoes": ["Competitions"],
    "Financeiro": ["Payment", "User"],
    "Notificacoes": ["Social"],
}