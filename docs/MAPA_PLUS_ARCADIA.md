# Arcádia Plus - Mapa Completo dentro do Arcádia Suite

## O que é o Plus?

O **Arcádia Plus** é o **Motor de Execução Fiscal e Operacional** da plataforma Arcádia Suite. Enquanto o Arcádia Suite pensa, governa e orienta, o Plus executa, registra e obedece. É um ERP completo construído em Laravel/PHP que serve como backend fiscal para emissão de documentos eletrônicos (NF-e, NFC-e, CT-e, MDF-e) e operações comerciais.

---

## Posição na Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ARCÁDIA SUITE (Cérebro)                          │
│                    Express.js - Porta 5000                          │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  SOE - Sistema Operacional Empresarial                     │    │
│   │  Domínios: Pessoas, Produtos, Vendas, Financeiro, Fiscal   │    │
│   │  Decisão + Governança + IA                                 │    │
│   └────────────────────┬───────────────────────────────────────┘    │
│                        │                                             │
│                        │  SSO + Proxy (/plus)                       │
│                        ▼                                             │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ARCÁDIA PLUS (Motor de Execução)                          │    │
│   │  Laravel/PHP - Porta 8080                                  │    │
│   │  Execução: NFe, NFCe, CTe, MDFe, PDV, Estoque, OS         │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   Outros Motores:                                                    │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│   │Contábil  │ │ Fiscal   │ │   BI     │ │Automação │ │  Comm    ││
│   │  8003    │ │  8002    │ │  8004    │ │  8005    │ │  8006    ││
│   │ Python   │ │ Python   │ │ Python   │ │ Python   │ │ Node.js  ││
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

---

## Integração Suite ↔ Plus

### 1. Proxy Reverso (`server/plus/proxy.ts`)

O Arcádia Suite atua como gateway. Todas as requisições para `/plus/*` são redirecionadas para o Laravel na porta 8080:

```
Navegador → /plus/vendas → Suite (5000) → Proxy → Laravel (8080/vendas)
Navegador → /plus/nfe    → Suite (5000) → Proxy → Laravel (8080/nfe)
```

**Comportamentos do proxy:**
- `/plus` ou `/plus/` → redireciona para `/empresas` (home do Laravel)
- `/plus/home` → redireciona para `/empresas`
- Headers `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-Prefix` repassados
- Respostas Location reescritas para manter o prefixo `/plus`
- Timeout: 60 segundos
- Status endpoint: `GET /api/plus/status`

### 2. SSO - Single Sign-On (`plus/app/Http/Controllers/Auth/SsoController.php`)

Login unificado: o usuário entra pelo Arcádia Suite e é autenticado automaticamente no Plus.

```
┌─────────────────┐     Token JWT (Base64)      ┌──────────────────┐
│  Arcádia Suite   │ ──────────────────────────▶ │   Arcádia Plus    │
│  (Node.js)       │   sig = HMAC-SHA256         │   (Laravel)       │
│                  │   ts = timestamp             │                  │
│  Gera token com: │                             │  Valida:          │
│  - email         │                             │  - iss = arcadia  │
│  - name          │                             │  - aud = plus     │
│  - role          │                             │  - timestamp ±5m  │
│  - username      │                             │  - HMAC signature │
└─────────────────┘                              └──────────────────┘
                                                          │
                                                          ▼
                                                 Auto-cria usuário
                                                 se não existir
```

**Segurança SSO:**
- Segredo compartilhado: `SSO_SECRET` (variável de ambiente)
- Expiração do token: 5 minutos (300 segundos)
- Assinatura: HMAC-SHA256
- Validação de issuer (`arcadia-suite`) e audience (`arcadia-plus`)
- Provisionamento automático: se o email não existe no Plus, cria o usuário

### 3. Launcher (`server/plus/launcher.ts`)

O Suite inicia o Laravel automaticamente na inicialização:

```
Suite inicia → Verifica PHP disponível → spawn php artisan serve --port=8080
                                            │
                                    ┌───────┴───────┐
                                    │ PHP existe?   │
                                    ├── Sim → Inicia│
                                    └── Não → Pula  │
```

**Verificações:**
- `which php` - PHP instalado?
- `plus/artisan` existe?
- Timeout: 15 segundos para iniciar

---

## Números do Plus

| Métrica | Quantidade |
|---------|-----------|
| Controllers | 376 |
| Models | 320 |
| Services | 12 |
| Views (Blade) | 1.194 |
| Migrations | 260 |
| Rotas Web | 912 |
| Rotas API | 634 |
| **Total de Rotas** | **1.546** |

---

## Módulos do Plus - Detalhamento Completo

### 1. FISCAL - Documentos Eletrônicos

O coração do Plus. Emissão e gestão de todos os documentos fiscais brasileiros.

#### NF-e (Nota Fiscal Eletrônica)
| Componente | Arquivo |
|-----------|---------|
| Controller Web | `NfeController.php` |
| Controller API | `API/NFeController.php` |
| Painel API | `API/NFePainelController.php` |
| Service | `NFeService.php` |
| Service API | `NFeServiceApi.php` |
| Model | `Nfe.php`, `ItemNfe.php`, `FaturaNfe.php` |
| Views | `nfe/*.blade.php` |
| XML | `NfeXmlController.php` |
| Entrada XML | `NfeEntradaXmlController.php`, `NfeImportaXmlController.php` |

**Funcionalidades NF-e:**
- Emissão, cancelamento, carta de correção
- Importação de XML de entrada
- Download de XML/DANFE
- Manifesto do destinatário (DFe)
- Inutilização de numeração
- Contingência offline

#### NFC-e (Nota Fiscal do Consumidor)
| Componente | Arquivo |
|-----------|---------|
| Controller Web | `NfceController.php` |
| Controller API | `API/NFCeController.php` |
| Painel API | `API/NFCePainelController.php` |
| Service | `NFCeService.php` |
| Service API | `NFCeServiceApi.php` |
| Model | `Nfce.php`, `ItemNfce.php`, `FaturaNfce.php` |
| Views | `nfce/*.blade.php` |
| Contingência | `NfceContigenciaController.php` |
| Impressão | `ImprimirNfceController.php` |

#### CT-e (Conhecimento de Transporte)
| Componente | Arquivo |
|-----------|---------|
| Controller Web | `CteController.php` |
| Controller API | `API/CTeController.php` |
| CT-e OS | `CteOsController.php`, `API/CTeOsPainelController.php` |
| Service | `CTeService.php`, `CTeOsService.php` |
| Model | `Cte.php`, `MedidaCte.php`, `ComponenteCte.php` |
| Views | `cte/*.blade.php` |

#### MDF-e (Manifesto de Documentos Fiscais)
| Componente | Arquivo |
|-----------|---------|
| Controller Web | `MdfeController.php` |
| Controller API | `API/MdfeController.php` |
| Service | `MDFeService.php` |
| Model | `Mdfe.php`, `Percurso.php`, `UnidadeCarga.php` |
| Views | `mdfe/*.blade.php` |

#### Nota de Serviço (NFS-e)
| Componente | Arquivo |
|-----------|---------|
| Controller Web | `NotaServicoController.php` |
| Controller API | `API/NotaServicoController.php` |
| Config | `NotaServicoConfigController.php` |
| Webhook | `API/NfseWebHookController.php` |

#### Configurações Fiscais
| Componente | Descrição |
|-----------|-----------|
| `NaturezaOperacaoController.php` | Naturezas de operação (CFOP) |
| `NcmController.php` | NCM - Nomenclatura Comum do Mercosul |
| `IbptController.php` / `IbptService.php` | IBPT - Carga tributária |
| `DifalController.php` | DIFAL - Diferencial de alíquota |
| `SpedController.php` / `SpedConfigController.php` | SPED Fiscal |
| `SintegraController.php` | SINTEGRA |
| `ContigenciaController.php` | Contingência NF-e/NFC-e |
| `InutilizacaoController.php` | Inutilização de numeração |

---

### 2. VENDAS E PDV

| Controller | Descrição |
|-----------|-----------|
| `VendaController.php` | Vendas completas |
| `API/VendaController.php` | API de vendas |
| `API/PDV/*.php` | Ponto de Venda (LoginController, ClienteController) |
| `API/FrontBoxController.php` | Frontend do caixa |
| `FrontBoxController.php` | Interface do caixa Web |
| `OrcamentoController.php` | Orçamentos |
| `API/PreVendaController.php` | Pré-vendas |
| `TrocaController.php` | Devoluções/trocas |
| `DevolucaoController.php` | Devoluções formais |
| `CupomDescontoController.php` | Cupons de desconto |
| `CashBackConfigController.php` | Configuração de cashback |

---

### 3. ESTOQUE E PRODUTOS

| Controller | Descrição |
|-----------|-----------|
| `ProdutoController.php` | Cadastro de produtos |
| `EstoqueController.php` | Controle de estoque |
| `EstoqueLocalizacaoController.php` | Localização no estoque |
| `StockEntryController.php` | Entrada de estoque |
| `StockEntryService.php` | Serviço de entrada |
| `StockSaleService.php` | Serviço de saída por venda |
| `TransferenciaEstoqueController.php` | Transferências |
| `InventarioController.php` | Inventários |
| `VariacaoController.php` | Variações de produto |
| `ListaPrecoController.php` | Listas de preço |
| `ComboController.php` | Combos/kits |
| `UnidadeMedidaController.php` | Unidades de medida |
| `MarcaController.php` | Marcas |
| `ImportadorController.php` | Importação de produtos |
| `ImeiTrackingController.php` | Rastreamento de IMEI |
| `API/ImeiUnitController.php` | Unidades IMEI via API |

---

### 4. FINANCEIRO

| Controller | Descrição |
|-----------|-----------|
| `ContaPagarController.php` | Contas a pagar |
| `ContaReceberController.php` | Contas a receber |
| `CaixaController.php` | Controle de caixa |
| `SangriaController.php` | Sangrias de caixa |
| `SuprimentoController.php` | Suprimentos de caixa |
| `BoletoController.php` | Boletos |
| `ContaBoletoController.php` | Contas com boleto |
| `FinanceiroBoletoController.php` | Financeiro boletos |
| `FinanceiroDashboardController.php` | Dashboard financeiro |
| `FinanceiroPlanoController.php` | Planos financeiros |
| `TaxaCartaoController.php` | Taxas de cartão |
| `ApuracaoMensalController.php` | Apuração mensal |
| `FechamentoMensalController.php` | Fechamento mensal |
| `CategoriaContaController.php` | Categorias contábeis |
| `ContaEmpresaController.php` | Contas bancárias |
| `AsaasController.php` | Integração Asaas (pagamentos) |
| `API/PaymentController.php` | API de pagamentos |

---

### 5. CLIENTES E CRM

| Controller | Descrição |
|-----------|-----------|
| `ClienteController.php` | Cadastro de clientes |
| `ClienteDeliveryController.php` | Clientes de delivery |
| `ClienteScoreController.php` | Score/pontuação de clientes |
| `CrmController.php` | CRM completo |
| `MensagemPadraoCrmController.php` | Mensagens padrão CRM |
| `MensagemCrmLogController.php` | Log de mensagens CRM |
| `ConvenioController.php` | Convênios |
| `ContratoConfigController.php` | Contratos |
| `AssinarContratoController.php` | Assinatura de contratos |
| `API/CrmController.php` | API CRM |
| `API/EnvioFaturaWppController.php` | Envio de fatura via WhatsApp |

---

### 6. FOOD SERVICE (Restaurantes, Pizzarias, Bares)

| Controller | Descrição |
|-----------|-----------|
| **Cardápio Digital** | |
| `ConfigCardapioController.php` | Configuração do cardápio |
| `CarrosselCardapioController.php` | Carrossel do cardápio |
| `AvaliacaoCardapioController.php` | Avaliações |
| `API/Cardapio/*.php` | API do cardápio (carrinho, produtos) |
| **Delivery** | |
| `API/Delivery/*.php` | API delivery (carrinho, clientes, pedidos, produtos) |
| `FuncionamentoDeliveryController.php` | Horários de delivery |
| **Comanda** | |
| `API/Comanda/*.php` | Sistema de comandas (7 controllers) |
| **Atendimento** | |
| `AtendimentoController.php` | Atendimentos |
| `AtendimentoGarcomController.php` | Atendimento garçom |
| `MesaController.php` | Gestão de mesas |
| **Pizza** | |
| `TamanhoPizzaController.php` | Tamanhos de pizza |
| `AdicionalController.php` | Adicionais |
| `CategoriaAdicionalController.php` | Categorias de adicionais |
| **iFood** | |
| `IfoodConfigController.php` | Configuração iFood |
| `IfoodCatalogoController.php` | Catálogo iFood |
| `IfoodPedidoController.php` | Pedidos iFood |
| `IfoodProdutoController.php` | Produtos iFood |

---

### 7. SERVIÇOS E ORDENS DE SERVIÇO

| Controller | Descrição |
|-----------|-----------|
| `ServicoController.php` | Cadastro de serviços |
| `CategoriaServicoController.php` | Categorias |
| `OrdemServicoController.php` | Ordens de serviço |
| `API/OrdemServicoController.php` | API de OS |
| `AgendamentoController.php` | Agendamentos |
| `ConfiguracaoAgendamentoController.php` | Config agendamento |
| `FuncionamentoController.php` | Horários |
| `InterrupcoesController.php` | Interrupções |
| `GarantiaController.php` | Garantias |

---

### 8. PRODUÇÃO

| Controller | Descrição |
|-----------|-----------|
| `GestaoProducaoController.php` | Gestão de produção |
| `API/GestaoProducaoController.php` | API produção |
| `API/OrdemProducaoController.php` | Ordens de produção |
| `ApontamentoController.php` | Apontamentos |
| `CustoConfiguracaoController.php` | Configuração de custos |
| `API/PlanejamentoCustoController.php` | Planejamento de custos |

---

### 9. TRANSPORTE E LOGÍSTICA

| Controller | Descrição |
|-----------|-----------|
| `TransportadoraController.php` | Transportadoras |
| `FreteController.php` | Fretes |
| `TipoDespesaFreteController.php` | Tipos de despesa |
| `VeiculoController.php` | Veículos |
| `ManutencaoVeiculoController.php` | Manutenção |
| `MotoboyController.php` | Motoboys |
| `LocalizacaoController.php` | Localização/rastreamento |
| `ManifestoController.php` | Manifestos de carga |

---

### 10. E-COMMERCE E MARKETPLACE

| Controller | Descrição |
|-----------|-----------|
| **WooCommerce** | |
| `WoocommerceConfigController.php` | Configuração |
| `WoocommerceCategoriaController.php` | Categorias |
| `WoocommerceProdutoController.php` | Produtos |
| `WoocommercePedidoController.php` | Pedidos |
| **Mercado Livre** | |
| `MercadoLivreAuthController.php` | Autenticação OAuth |
| `MercadoLivreConfigController.php` | Configuração |
| `MercadoLivreProdutoController.php` | Produtos |
| `MercadoLivrePerguntaController.php` | Perguntas |
| **NuvemShop** | |
| `NuvemShopController.php` | Integração NuvemShop |
| **VendiZap** | |
| `VendiZapConfigController.php` | Configuração |
| `VendiZapProdutoController.php` | Produtos |
| `VendiZapPedidoController.php` | Pedidos |
| `VendiZapCategoriaController.php` | Categorias |
| **Marketplace Próprio** | |
| `MarketPlaceConfigController.php` | Configuração |
| `DestaqueMarketPlaceController.php` | Destaques |
| `ServicoMarketPlaceController.php` | Serviços |
| `SegmentoController.php` | Segmentos |
| **E-commerce Próprio** | |
| `EcommerceConfigController.php` | Configuração |
| `API/EcommerceController.php` | API e-commerce |

---

### 11. RH E COLABORADORES

| Controller | Descrição |
|-----------|-----------|
| `FuncionarioController.php` | Funcionários |
| `FuncionarioEventoController.php` | Eventos de funcionário |
| `EventoFuncionarioController.php` | Registro de eventos |
| `ComissaoController.php` | Comissões |
| `MargemComissaoController.php` | Margens de comissão |
| `MetaResultadoController.php` | Metas e resultados |
| `ControleAcessoController.php` | Controle de acesso |
| `RoleController.php` | Permissões/roles |

---

### 12. SEGMENTOS ESPECIALIZADOS

#### Ótica
| Controller | Descrição |
|-----------|-----------|
| `FormatoArmacaoOticaController.php` | Formatos de armação |
| `TipoArmacaoController.php` | Tipos de armação |
| `LaboratorioController.php` | Laboratórios óticos |
| `TratamentoOticaController.php` | Tratamentos de lente |
| `MedicoController.php` | Médicos/oftalmologistas |

#### Hotelaria
| Controller | Descrição |
|-----------|-----------|
| `AcomodacaoController.php` | Acomodações |
| `CategoriaAcomodacaoController.php` | Categorias |
| `ReservaController.php` | Reservas |
| `ConfigReservaController.php` | Configuração |
| `FrigobarController.php` | Frigobar |
| `EstacionamentoController.php` | Estacionamento |

---

### 13. COMPRAS E FORNECEDORES

| Controller | Descrição |
|-----------|-----------|
| `CompraController.php` | Compras |
| `ComprasIAController.php` | Compras com IA |
| `FornecedorController.php` | Fornecedores |
| `CotacaoController.php` | Cotações |
| `CotacaoRespostaController.php` | Respostas de cotação |

---

### 14. ADMINISTRAÇÃO MULTI-TENANT

| Controller | Descrição |
|-----------|-----------|
| `EmpresaController.php` | Gestão de empresas |
| `UsuarioController.php` | Usuários |
| `UsuarioEmissaoController.php` | Usuários de emissão |
| `ContadorController.php` | Contador |
| `ContadorAdminController.php` | Admin do contador |
| `ContadorEmpresaController.php` | Empresas do contador |
| `ImpersonateController.php` | Impersonar usuário |
| `GerenciarPlanoController.php` | Gestão de planos |
| `UpgradePlanoController.php` | Upgrade de planos |
| `ConfiguracaoSuperController.php` | Config super admin |
| `BackupController.php` | Backups |
| `SistemaController.php` | Sistema |
| `LogController.php` | Logs |

---

### 15. TEF (Transferência Eletrônica de Fundos)

| Controller | Descrição |
|-----------|-----------|
| `TefConfigController.php` | Configuração TEF |
| `TefController.php` | Operações TEF |
| `TefRegistroController.php` | Registros TEF |
| Model: `TefMultiPlusCard.php` | Multi Plus Card |

---

### 16. INTELIGÊNCIA ARTIFICIAL

| Componente | Descrição |
|-----------|-----------|
| `ComprasIAController.php` | Sugestões de compra via IA |
| `FinancePrevisaoService.php` | Previsão financeira com IA |

---

## Models (320 entidades)

### Categorias Principais

| Grupo | Models Exemplo |
|-------|---------------|
| **Core** | `User`, `Empresa`, `Cidade`, `Config` |
| **Produtos** | `Produto`, `ProdutoVariacao`, `ProdutoComposicao`, `ProdutoAdicional`, `Marca`, `CategoriaProduto`, `UnidadeMedida` |
| **Vendas** | `Venda`, `ItemVenda`, `Orcamento`, `PreVenda`, `VendaSuspensa`, `Troca`, `Devolucao` |
| **Fiscal NF-e** | `Nfe`, `ItemNfe`, `FaturaNfe`, `NaturezaOperacao`, `PadraoTributacaoProduto` |
| **Fiscal NFC-e** | `Nfce`, `ItemNfce`, `FaturaNfce`, `Inutilizacao` |
| **CT-e** | `Cte`, `MedidaCte`, `ComponenteCte`, `ChaveNfeCte` |
| **MDF-e** | `Mdfe`, `Percurso`, `UnidadeCarga`, `ValePedagio`, `Ciot` |
| **Financeiro** | `ContaPagar`, `ContaReceber`, `Caixa`, `SangriaCaixa`, `SuprimentoCaixa`, `Pagamento` |
| **Estoque** | `Estoque`, `MovimentacaoProduto`, `StockMove`, `TransferenciaEstoque`, `ItemInventario` |
| **Pessoas** | `Cliente`, `Fornecedor`, `Funcionario`, `Transportadora`, `Motoboy` |
| **Food Service** | `Pedido`, `ItemPedido`, `Adicional`, `TamanhoPizza`, `ConfiguracaoCardapio`, `CarrosselCardapio` |
| **CRM** | `CrmAnotacao`, `MensagemPadraoCrm`, `CupomDesconto`, `CashBackConfig` |
| **E-commerce** | `WoocommerceConfig`, `WoocommercePedido`, `WoocommerceItemPedido`, `VendiZapConfig` |
| **Agendamento** | `Agendamento`, `ItemAgendamento`, `Servico`, `Funcionamento`, `Interrupcao` |
| **OS** | `OrdemServico`, `ServicoOs`, `RelatorioOs`, `FuncionarioOs`, `ProdutoOs` |
| **Produção** | `OrdemProducao`, `Apontamento`, `CustoConfiguracao` |
| **Hotelaria** | `Acomodacao`, `Reserva`, `Frigobar` |
| **Ótica** | `OticaOs`, `Laboratorio`, `TratamentoOtica`, `FormatoArmacao`, `TipoArmacao` |

---

## Services (Motor de Negócios)

| Service | Responsabilidade |
|---------|-----------------|
| `NFeService.php` | Emissão/cancelamento/CC de NF-e via Cloud-DFE SDK |
| `NFeServiceApi.php` | API externa de NF-e |
| `NFCeService.php` | Emissão de NFC-e (consumidor final) |
| `NFCeServiceApi.php` | API externa de NFC-e |
| `CTeService.php` | CT-e para transportadoras |
| `CTeOsService.php` | CT-e OS (ordem de serviço de transporte) |
| `MDFeService.php` | MDF-e para manifestos de carga |
| `DFeService.php` | Manifesto do Destinatário |
| `StockEntryService.php` | Entrada automática de estoque por NF-e |
| `StockSaleService.php` | Baixa automática de estoque por venda |
| `IbptService.php` | Consulta IBPT para carga tributária |
| `SpeedService.php` | SPED fiscal |
| `FinancePrevisaoService.php` | Previsão financeira com IA |

---

## Migrations (260 tabelas)

### Evolução Cronológica

| Período | Tabelas Criadas | Destaque |
|---------|----------------|----------|
| 2022 | `users`, `empresas`, `produtos`, `clientes`, `caixas` | Core do sistema |
| 2023 Q2 | `nves` (NF-e), `nfces`, `item_nves` | Módulo fiscal |
| 2023 Q3 | `pagamentos`, `inutilizacaos` | Financeiro |
| 2023 Q4 | `ctes`, `conta_pagars`, `conta_recebers`, `mdves`, `ordem_servicos`, `pedidos` | Transporte, OS, Food |
| 2024 Q1 | `cte_os`, `ordem_producaos`, `produto_composicaos` | Produção |
| 2024 Q2 | `cotacaos`, `ifood_*`, `woocommerce_*`, `mercado_livre_*` | E-commerce |
| 2024 Q3 | `stock_moves`, `imei_units`, `crm_anotacaos` | IMEI, CRM |
| 2024 Q4 | `otica_os`, `laboratorios`, `acomodacaos`, `reservas` | Ótica, Hotelaria |
| 2025 | `item_inventarios`, `tef_*`, `nuvem_shop_*` | Inventário, TEF, NuvemShop |

---

## Docker Infrastructure

```yaml
# plus/docker-compose.yml
services:
  app:        # PHP 8.2 FPM
    build: .
    volumes: .:/var/www
    networks: [controlplus]
    
  web:        # Nginx 1.25
    image: nginx:1.25-alpine
    ports: "8080:80"
    depends_on: [app]
    
  db:         # MySQL 8.0
    image: mysql:8.0
    volumes: db_data:/var/lib/mysql
    environment:
      MYSQL_DATABASE: controlplus
```

**Dockerfile:**
- Base: `php:8.2-fpm`
- Extensions: GD, BCMath, PDO, Zip, Intl, Soap
- Node.js 18 (para assets frontend)
- Composer para dependências PHP

---

## Fluxo de Dados Suite ↔ Plus

```
┌────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO                               │
│                                                                 │
│  1. Usuário acessa Arcádia Suite (porta 5000)                  │
│  2. Navega para módulo Plus (/plus)                            │
│  3. Suite gera token SSO com dados do usuário                  │
│  4. Proxy envia requisição para Laravel (porta 8080)           │
│  5. Laravel valida SSO, auto-login, exibe interface            │
│  6. Operações fiscais (NF-e/NFC-e) executadas no Plus         │
│  7. Dados sincronizados via SOE Motor Adapter                  │
│  8. Suite consome dados para BI, dashboards, governança        │
│                                                                 │
│  SUITE (Inteligência)         PLUS (Execução)                  │
│  ├── Decide o que vender      ├── Emite NF-e/NFC-e            │
│  ├── Analisa tendências       ├── Controla estoque             │
│  ├── Gera relatórios BI       ├── Processa pagamentos          │
│  ├── Automatiza processos     ├── Gerencia caixa               │
│  └── Governa políticas        └── Registra movimentações       │
└────────────────────────────────────────────────────────────────┘
```

---

## APIs do Plus

### Rotas Web (912 rotas) - Agrupadas

| Grupo | Rotas | Exemplos |
|-------|-------|---------|
| Dashboard | ~10 | `/home`, `/empresas` |
| Produtos | ~60 | `/produtos/*`, `/estoque/*`, `/marcas/*` |
| Vendas/PDV | ~50 | `/vendas/*`, `/pdv/*`, `/orcamento/*` |
| Fiscal | ~80 | `/nfe/*`, `/nfce/*`, `/cte/*`, `/mdfe/*` |
| Financeiro | ~70 | `/conta-pagar/*`, `/conta-receber/*`, `/caixa/*` |
| Clientes/CRM | ~40 | `/clientes/*`, `/crm/*` |
| Food Service | ~80 | `/cardapio/*`, `/delivery/*`, `/comanda/*`, `/pedidos/*` |
| E-commerce | ~60 | `/woocommerce/*`, `/mercado-livre/*`, `/nuvem-shop/*` |
| OS/Serviços | ~40 | `/ordem-servico/*`, `/agendamento/*`, `/servicos/*` |
| Transporte | ~50 | `/cte/*`, `/mdfe/*`, `/veiculos/*`, `/motoboy/*` |
| Admin | ~100 | `/usuarios/*`, `/empresa/*`, `/configuracao/*` |
| Contabilidade | ~60 | `/sped/*`, `/apuracao/*`, `/fechamento/*` |
| Outros | ~212 | Reservas, ótica, laboratórios, tickets, etc. |

### Rotas API (634 rotas) - Agrupadas

| Grupo | Prefixo | Descrição |
|-------|---------|-----------|
| PDV | `/api/pdv/*` | Ponto de venda mobile |
| Cardápio | `/api/cardapio/*` | Cardápio digital |
| Delivery | `/api/delivery/*` | Delivery app |
| Comanda | `/api/comanda/*` | Sistema de comandas |
| Kotlin App | `/api/kotlin/*` | App mobile nativo |
| Fiscal | `/api/nfe/*`, `/api/nfce/*` | Emissão fiscal |
| CRM | `/api/crm/*` | CRM mobile |
| Estoque | `/api/stock-entry/*` | Entrada de estoque |
| E-commerce | `/api/woocommerce/*`, `/api/mercadolivre/*` | Integrações |
| iFood | `/api/ifood/*` | Integração iFood |

---

## Resumo Visual

```
┌──────────────────────────────────────────────────────────────────┐
│                    ARCÁDIA PLUS - ERP COMPLETO                   │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │   FISCAL   │  │   VENDAS   │  │  ESTOQUE   │  │ FINANCEIRO ││
│  │ NF-e/NFC-e │  │ PDV/Caixa  │  │ IMEI Track │  │ Contas P/R ││
│  │ CT-e/MDF-e │  │ Orçamentos │  │ Inventário │  │ Boletos    ││
│  │ NFS-e/SPED │  │ Trocas     │  │ Transf.    │  │ TEF        ││
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘│
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │   FOOD     │  │ E-COMMERCE │  │  SERVIÇOS  │  │ TRANSPORTE ││
│  │ Cardápio   │  │ WooCommerce│  │    O.S.    │  │   CT-e     ││
│  │ Delivery   │  │ Merc.Livre │  │ Agendament │  │   MDF-e    ││
│  │ iFood      │  │ NuvemShop  │  │ Garantias  │  │ Logística  ││
│  │ Comandas   │  │ VendiZap   │  │            │  │            ││
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘│
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │   CRM      │  │    RH      │  │  PRODUÇÃO  │  │ SEGMENTOS  ││
│  │ Clientes   │  │ Comissões  │  │ Ordens     │  │ Ótica      ││
│  │ Score      │  │ Metas      │  │ Apontament │  │ Hotelaria  ││
│  │ Contratos  │  │ Roles      │  │ Custos     │  │ Marketplace││
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘│
│                                                                   │
│  376 Controllers │ 320 Models │ 12 Services │ 1.194 Views       │
│  260 Migrations  │ 912 Web Routes │ 634 API Routes              │
└──────────────────────────────────────────────────────────────────┘
```

---

*Arcádia Plus v2.0 - O Motor de Execução do Arcádia Suite*
