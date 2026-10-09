# Issues para GitHub

--- ISSUE 1 ---
### [Performance] Listagem de jogadores faz filtro e paginação em memória no frontend
**Labels sugeridas:** performance + crítica

**Descrição do problema**
A rota de jogadores carrega o catálogo completo em memória e aplica busca/ordenação/filtro localmente antes de renderizar a página. Esse padrão bloqueia a UI e cresce quadraticamente com o volume de produtos.

**Evidência**
- `frontend/src/routes/players.index.tsx:33-58`
- `frontend/src/components/PlayerFilters.tsx:92-164`

Trecho relevante:
```ts
const { data: products, isLoading, isFetching, isError } = useProducts();
const { positions, filtered } = usePlayerFiltering(products, filters);
const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
```

**Impacto estimado**
Com 5.000 itens, cada render aplica filtro e ordenação sobre o conjunto inteiro, gerando uso intenso de CPU e memória e elevando o risco de timeout e congelamento da tela.

**Sugestão de correção**
Migrar o filtro e paginação para o backend (query params / page / page_size / search) e manter no frontend apenas a renderização da página atual.

**Critérios de aceite**
- [ ] A query da página usa paginação do backend e não carrega a coleção completa.
- [ ] O filtro por texto/posição/preço roda no backend ou em query auxiliar indexada.
- [ ] Medição de render: a página com 1.000+ itens fica responsiva e sem travamentos em dispositivos de referência.

--- ISSUE 2 ---
### [Performance] Serialização aninhada do jogador em cada item de produto e leilão
**Labels sugeridas:** performance + alta

**Descrição do problema**
Os serializers de produto e leilão expandem o objeto `player` completo em cada item da lista, incluindo todos os campos de `PlayerSerializer` e a geração de `photo_data_uri`, elevando payload e custo de CPU no backend.

**Evidência**
- `backend/products/serializers.py:7-31`
- `backend/fifa_data/serializers.py:7-35`
- `backend/auction/serializers.py:5-16`

Trecho relevante:
```py
class ProductListSerializer(serializers.ModelSerializer):
    player = serializers.SerializerMethodField()
    ...

class PlayerSerializer(serializers.ModelSerializer):
    photo_data_uri = serializers.SerializerMethodField()
    class Meta:
        model = Player
        fields = '__all__'
```

**Impacto estimado**
Lista de 500 produtos pode disparar dezenas de MB de payload e várias conversões de base64, aumentando latência e o tempo de resposta.

**Sugestão de correção**
Usar serializers leves para listagem (`id`, `common_name`, `overall_rating`, `potential`, `photo_url`) e manter o `PlayerSerializer` completo apenas em detalhes/endpoint específicos.

**Critérios de aceite**
- [ ] `/products/` retorna apenas campos essenciais da listagem.
- [ ] A API de detalhe continua completa para `GET /products/{id}/`.
- [ ] O payload de uma página com 24 itens cai consideravelmente em comparação ao formato atual.

--- ISSUE 3 ---
### [Performance] Polling redundante de leilões no frontend
**Labels sugeridas:** performance + média

**Descrição do problema**
O hook de leilões usa polling periódico para buscar todos os leilões em intervalos de 15 segundos, mesmo quando a tela principal não depende da atualização em tempo real.

**Evidência**
- `frontend/src/features/players/hooks.ts:35-44`

Trecho relevante:
```ts
export function useAuctions() {
  return useQuery({
    queryKey: ["auctions"],
    queryFn: () => apiListAll<Auction>("/auctions/"),
    refetchInterval: 15000,
  });
}
```

**Impacto estimado**
Em várias abas/rotas abertas, esse polling combina com listagem e filtros e aumenta tráfego desnecessário, DDoS de consulta e latência percebida.

**Sugestão de correção**
Usar polling apenas em telas que exigem atualização frequente, ou reduzir a frequência para telas ativas e substituir por eventos/websocket quando o fluxo exigir realtime.

**Critérios de aceite**
- [ ] A frequência de polling é reduzida ou condicionada ao componente ativo.
- [ ] O número de requisições de leilões por minuto diminui de forma mensurável.
- [ ] A página de jogadores continua a mostrar status de leilão sem exigir polling global.

--- FIM ISSUE 3 ---
