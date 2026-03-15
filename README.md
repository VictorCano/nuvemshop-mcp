# nuvemshop-mcp

[![Feito com ~90% IA](https://img.shields.io/badge/feito_com-~90%25_IA-blueviolet)](https://github.com/VictorCano/nuvemshop-mcp)
[![npm version](https://img.shields.io/npm/v/nuvemshop-mcp.svg)](https://npmjs.com/package/nuvemshop-mcp)

Servidor MCP para a API de e-commerce Nuvemshop/Tiendanube.

## Requisitos

- Node.js >= 18
- Uma loja Nuvemshop com token de acesso

## Instalação

```bash
npm install nuvemshop-mcp
```

## Configuração

### Claude Desktop

Adicione ao arquivo de configuração do Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "nuvemshop": {
      "command": "npx",
      "args": ["nuvemshop-mcp"],
      "env": {
        "USER_ACCESS_TOKEN": "seu_token_aqui",
        "STORE_ID": "seu_store_id"
      }
    }
  }
}
```

### Transporte HTTP

Para usar o transporte HTTP (compatível com a especificação MCP mais recente):

```bash
npx nuvemshop-mcp --http
```

Inicia na porta 3000 por padrão. Configurável com as variáveis de ambiente `MCP_HTTP_HOST` e `MCP_HTTP_PORT`.

## Ferramentas Disponíveis

### Loja (1)

| Ferramenta  | Descrição                                        | Status |
| ----------- | ------------------------------------------------ | ------ |
| `get_store` | Retorna informações da loja (plano, nome, moeda) | ✅     |

### Categorias (5)

| Ferramenta        | Descrição                        | Status |
| ----------------- | -------------------------------- | ------ |
| `list_categories` | Lista todas as categorias        | ✅     |
| `get_category`    | Busca uma categoria por ID       | ✅     |
| `create_category` | Cria uma nova categoria          | ✅     |
| `update_category` | Atualiza uma categoria existente | ✅     |
| `delete_category` | Remove uma categoria             | ✅     |

### Produtos (10)

| Ferramenta                | Descrição                                       | Status |
| ------------------------- | ----------------------------------------------- | ------ |
| `list_products`           | Lista produtos com filtros opcionais            | ✅     |
| `get_product`             | Busca um produto por ID                         | ✅     |
| `get_product_by_sku`      | Busca um produto pelo SKU                       | ✅     |
| `create_product`          | Cria um novo produto                            | ✅     |
| `update_product`          | Atualiza um produto existente                   | ✅     |
| `delete_product`          | Remove um produto                               | ✅     |
| `create_variant`          | Adiciona uma variante a um produto              | ✅     |
| `update_variant`          | Atualiza uma variante existente                 | ✅     |
| `delete_variant`          | Remove uma variante                             | ✅     |
| `bulk_update_stock_price` | Atualiza estoque e preço de múltiplas variantes | ✅     |

### Pedidos (5)

| Ferramenta     | Descrição                           | Status |
| -------------- | ----------------------------------- | ------ |
| `list_orders`  | Lista pedidos com filtros opcionais | ✅     |
| `get_order`    | Busca um pedido por ID              | ✅     |
| `close_order`  | Fecha um pedido                     | ✅     |
| `reopen_order` | Reabre um pedido fechado            | ✅     |
| `cancel_order` | Cancela um pedido                   | ✅     |

### Fulfillment (4)

| Ferramenta                 | Descrição                                     | Status |
| -------------------------- | --------------------------------------------- | ------ |
| `list_fulfillment_orders`  | Lista ordens de fulfillment de um pedido      | ✅     |
| `get_fulfillment_order`    | Busca uma ordem de fulfillment por ID         | ✅     |
| `update_fulfillment_order` | Atualiza o status de uma ordem de fulfillment | ✅     |
| `add_tracking_event`       | Adiciona evento de rastreamento a uma ordem   | ✅     |

### Clientes (5)

| Ferramenta        | Descrição                            | Status |
| ----------------- | ------------------------------------ | ------ |
| `list_customers`  | Lista clientes com filtros opcionais | ✅     |
| `get_customer`    | Busca um cliente por ID              | ✅     |
| `create_customer` | Cria um novo cliente                 | ✅     |
| `update_customer` | Atualiza um cliente existente        | ✅     |
| `delete_customer` | Remove um cliente                    | ✅     |

### Cupons (2)

| Ferramenta      | Descrição                      | Status |
| --------------- | ------------------------------ | ------ |
| `list_coupons`  | Lista cupons de desconto       | ✅     |
| `create_coupon` | Cria um novo cupom de desconto | ✅     |

## Exemplos

Alguns exemplos de prompts para usar com seu assistente de IA:

- "Liste meus produtos mais recentes"
- "Crie um cupom de 10% de desconto com o codigo PROMO10"
- "Mostre os pedidos pendentes de envio"
- "Qual o plano atual da minha loja?"

## Tecnologia

Construído com `@modelcontextprotocol/sdk`.

## Contribuindo

O desenvolvimento acontece no branch `develop`. Releases são feitas via PR para `main`. Merge em `main` publica automaticamente no npm via GitHub Actions. Para contribuir, crie seu branch a partir de `develop` e abra um PR para `develop`.

## Licença

MIT

---

Este projeto foi em sua maior parte (~90%) construído com assistência de IA.
