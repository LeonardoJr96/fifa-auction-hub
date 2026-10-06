# Redesign completo do ReverseDraft

## Objetivo
Transformar o produto em uma plataforma esportiva premium, centrada em competições, sem alterar regras de negócio, contratos da API, autenticação, paginação ou canais em tempo real.

## Direção aprovada
- **Visual:** “Premium competition dashboard”, com linguagem de transmissão esportiva e cabine de estádio.
- **Paleta:** fundo noturno, superfícies grafite, azul competitivo como ação principal e verde reservado a estados positivos/ao vivo.
- **Tipografia:** Sora em títulos e Manrope em textos e dados.
- **Composição:** navegação lateral contextual no desktop, navegação compacta no mobile, cabeçalhos editoriais e dados densos com poucas superfícies realmente necessárias.
- **Movimento:** transições curtas em abas, filtros, placares e atualizações ao vivo, respeitando redução de movimento.

## O que será construído

### 1. Design system e estrutura global
- Consolidar tokens semânticos de cor, tipografia, espaçamento, bordas, foco, elevação e estados em `styles.css`.
- Evoluir os componentes existentes de botão, badge, tabela, formulário, skeleton e feedback sem criar estilos paralelos.
- Criar o shell do produto com sidebar agrupada em **Principal**, **Conteúdo** e **Sistema**, topo contextual e navegação móvel acessível.
- Preservar integralmente `AuthProvider`, sessão JWT, `QueryClientProvider` e `<Outlet />`.

### 2. Navegação e arquitetura de conteúdo
- Reorganizar os destinos existentes: Leilões, Jogadores, Competições, Bolsa, Minha conta e Administração.
- Adicionar as experiências futuras solicitadas somente onde houver um caminho funcional: Vídeos com dados demonstrativos estruturados e estados completos.
- Não expor Campanhas/Social como funcionais enquanto o backend não tiver rotas públicas montadas.
- Garantir breadcrumbs e ligações válidas entre competição, partida, time e jogador quando os identificadores existirem na API.

### 3. Central de competição — prioridade máxima
- Reconstruir a página de competição com cabeçalho de liga, temporada/status, ações e abas: **Visão geral, Classificação, Partidas, Times, Jogadores, Estatísticas, Artilharia, Assistências, Draft, Chaveamento e Configurações** conforme tipo e permissão.
- Produzir a visão geral a partir dos dados reais disponíveis: andamento, participantes, partidas realizadas/restantes, gols, média, líder, melhor ataque/defesa, próximos jogos e resultados recentes.
- Derivar artilharia e assistências somente de `player_stats`; estados sem dados devem explicar o que falta, sem inventar métricas.
- Manter ações administrativas, inscrição, geração de confrontos e chaveamento nos fluxos atuais.

### 4. Classificação, partidas, times e jogadores
- Tornar a classificação escaneável, responsiva e ordenável, com posição, J/V/E/D, GP/GC/SG/Pts e marcações competitivas sem presumir regras não fornecidas.
- Redesenhar partidas por rodada no formato placar, com status, data, times e estatísticas registradas; manter formulários reais de resultado e simulação.
- Criar visões de times e elencos usando participantes e `competition rosters` reais.
- Preservar e aprimorar catálogo, banco completo de jogadores, filtros por URL, paginação, cache, imagens progressivas, ratings e AcceleRATE.

### 5. Draft, leilões e chaveamento
- Redesenhar Draft com estados aguardando/em andamento/finalizado/indisponível, ordem, pick atual, busca e histórico, mantendo o WebSocket e o cache atuais.
- Redesenhar leilões com status ao vivo, orçamento/preço, histórico e ações existentes, mantendo WebSocket com fallback de polling.
- Transformar o chaveamento em uma leitura visual de torneio, preservando a geração automática e os motivos de pendência existentes.

### 6. Vídeos e experiências futuras
- Criar página de Vídeos preparada para futura API, com busca, categorias, paginação, loading, empty e visualização em modal.
- Usar dados demonstrativos explicitamente isolados e tipados apenas nessa página, pois o backend ainda não possui o domínio de vídeos.
- Não criar campos FIFA inexistentes nem simular dados em telas que já possuem API real.

### 7. Estados, acessibilidade e responsividade
- Cobrir loading, vazio, erro, sucesso, desabilitado e permissão em todas as áreas tocadas.
- Garantir foco visível, teclado, labels, `aria-*`, contraste, áreas de toque e mensagens de erro úteis.
- Validar desktop, notebook, tablet e mobile; tabelas viram leitura compacta ou rolagem deliberada, sem sobreposição.

### 8. Validação
- Verificar metadados exclusivos em todas as rotas criadas ou alteradas.
- Rodar testes existentes ligados às regras preservadas e adicionar apenas testes de comportamento quando houver regra funcional nova.
- Inspecionar o preview com Playwright em desktop e mobile, incluindo navegação, filtros, abas, paginação, estados offline e ausência de sobreposição.
- Confirmar o build final no log do preview e corrigir qualquer erro antes da entrega.

## Restrições técnicas
- Manter TanStack Start/Router/Query, endpoints Django e chaves de cache existentes.
- Manter a normalização DRF (`count/next/previous/results`), tolerância a 404, invalidações cruzadas e persistência atual.
- Não alterar o backend nem regras de negócio neste redesign visual.
- Não montar Campanhas/Social: esses módulos existem no backend, mas ainda não estão publicados no URLconf/ASGI.
- Componentes de interação usarão o design system existente; nenhuma cor visual ficará hardcoded nas telas.
