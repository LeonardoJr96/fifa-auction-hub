# Simplificar a página de Competições

## Problema

Ao clicar em uma competição, a tela pode abrir vazia: a página de detalhe sempre começa na aba "Classificação", mas essa aba só existe para ligas. Em drafts e copas, nenhum painel é exibido — parece que "nada aconteceu". A lista de competições também tem colunas demais e rótulos técnicos.

## Mudanças

### 1. Lista de competições (`/competitions`) — mais simples
- Reduzir a tabela para 4 colunas: **Competição**, **Tipo**, **Status**, **Times** (ex.: "8/16").
- Remover a coluna "Rodadas" e o rótulo técnico do modo de draft (Snake/Reverse/Linear) da linha.
- A linha inteira fica clicável (não só o nome), com o botão "Inscrever-se" mantido quando disponível.
- Texto de ajuda curto no topo: "Clique em uma competição para ver tabela, partidas e times."

### 2. Página da competição — abre sempre com conteúdo visível
- A aba inicial passa a ser escolhida pelo tipo da competição:
  - **Liga** → Classificação
  - **Copa** → Chaveamento
  - **Draft** → Draft (ou Partidas, se o draft já terminou)
- Se a aba escolhida não existir para aquele tipo, cai automaticamente na primeira aba disponível — nunca tela vazia.
- Renomear a aba "Visão geral" para "Resumo" e movê-la para depois da aba principal, reforçando a tabela como primeira coisa vista.

### 3. Estados claros
- Se a competição ainda não tem partidas/tabela (ex.: inscrições abertas), mostrar mensagem explicativa: "A tabela aparece quando a competição começar." em vez de painel vazio.

## Detalhes técnicos
- Arquivos: `frontend/src/routes/competitions.index.tsx` e `frontend/src/routes/competitions.$competitionId.tsx`.
- A aba inicial será derivada de `competition.competition_type` e `competition.status` (sem estado fixo "standings").
- Nenhuma mudança em API, hooks ou regras de negócio.
- Verificação: build + abrir `/competitions` e uma competição de cada tipo no navegador.
