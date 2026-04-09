# MAPA GERAL DO SISTEMA RETAIL - Arcádia Suite

---

## 1. VISÃO MACRO DO MÓDULO

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                        ARCÁDIA RETAIL - MAPA GERAL                             ║
║                   Loja de Celulares e Assistência Técnica                       ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            ║
║   │DASHBOARD│  │   PDV   │  │ PESSOAS │  │ ESTOQUE │  │SERVIÇOS │            ║
║   │  (KPIs) │  │ (Caixa) │  │(Cadastro│  │(Depósito│  │  (O.S.) │            ║
║   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            ║
║        │            │            │            │            │                   ║
║   ┌────┴────┐  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐            ║
║   │TRADE-IN │  │ COMPRAS │  │CADASTROS│  │RELATÓRIO│  │COMISSÕES│            ║
║   │(Aval.)  │  │(Aquis.) │  │ (Config)│  │(Reports)│  │ (Metas) │            ║
║   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            ║
║        │            │            │            │            │                   ║
║        └────────────┴────────────┴─────┬──────┴────────────┘                   ║
║                                        │                                       ║
║                              ┌─────────┴─────────┐                             ║
║                              │   CONFIGURAÇÃO     │                             ║
║                              │  Plus / Empresas   │                             ║
║                              └───────────────────┘                             ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. FLUXO PRINCIPAL DE OPERAÇÕES

```
                    ┌──────────────────────────────────────────────┐
                    │              ENTRADA DE MERCADORIA           │
                    └──────────────────────┬───────────────────────┘
                                           │
                    ┌──────────────────────┬┴──────────────────────┐
                    ▼                      ▼                       ▼
            ┌──────────────┐    ┌──────────────┐       ┌──────────────┐
            │   COMPRA     │    │  TRADE-IN    │       │ CONSIGNAÇÃO  │
            │  Fornecedor  │    │   Cliente    │       │  Parceiro    │
            └──────┬───────┘    └──────┬───────┘       └──────┬───────┘
                   │                   │                       │
                   │            ┌──────┴───────┐               │
                   │            │  Avaliação   │               │
                   │            │  19 itens    │               │
                   │            │  checklist   │               │
                   │            └──────┬───────┘               │
                   │                   │                       │
                   │            ┌──────┴───────┐               │
                   │            │  Aprovação   │               │
                   │            │  Gera Crédito│               │
                   │            │  Cria O.S.   │               │
                   │            └──────┬───────┘               │
                   │                   │                       │
                   │            ┌──────┴───────┐               │
                   │            │   Revisão    │               │
                   │            │  O.S. Interna│               │
                   │            │  Manutenção  │               │
                   │            └──────┬───────┘               │
                   │                   │                       │
                   ▼                   ▼                       ▼
            ┌─────────────────────────────────────────────────────┐
            │                    ESTOQUE                          │
            │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
            │  │Depósito │  │Depósito │  │Depósito │            │
            │  │  Loja   │  │ Central │  │Trânsito │            │
            │  └────┬────┘  └────┬────┘  └────┬────┘            │
            │       └────────────┼────────────┘                  │
            │                    │                               │
            │  ┌────────────────┬┴──────────────────┐            │
            │  │  Dispositivos  │     Produtos      │            │
            │  │  (por IMEI)    │  (por qtd/série)  │            │
            │  └────────────────┴───────────────────┘            │
            └────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
            ┌─────────────────────────────────────────────────────┐
            │                      PDV                            │
            │                                                     │
            │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
            │  │Dispositivos│  │  Produtos  │  │ Faturar O.S. │  │
            │  │  (IMEI)    │  │(Acessórios)│  │  (Serviços)  │  │
            │  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘  │
            │        └───────────────┼────────────────┘           │
            │                        ▼                            │
            │              ┌──────────────────┐                   │
            │              │    CARRINHO      │                   │
            │              │                  │                   │
            │              │  Subtotal        │                   │
            │              │  - Desconto      │                   │
            │              │  - Trade-In      │                   │
            │              │  - Crédito       │                   │
            │              │  = TOTAL         │                   │
            │              └────────┬─────────┘                   │
            │                       ▼                             │
            │              ┌──────────────────┐                   │
            │              │   PAGAMENTO      │                   │
            │              │ 💵 Dinheiro      │                   │
            │              │ 💳 Débito        │                   │
            │              │ 💳 Crédito (Nx)  │                   │
            │              │ 📱 PIX           │                   │
            │              │ 🔀 Combinado     │                   │
            │              └────────┬─────────┘                   │
            │                       ▼                             │
            │              ┌──────────────────┐                   │
            │              │    VENDA         │                   │
            │              │  Impressão A4    │                   │
            │              │  Sync Plus       │                   │
            │              │  NF-e/NFC-e      │                   │
            │              └──────────────────┘                   │
            └─────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────────┐
                    ▼            ▼                ▼
            ┌────────────┐ ┌─────────┐   ┌────────────┐
            │ COMISSÃO   │ │RELATÓRIO│   │ DEVOLUÇÃO  │
            │ Vendedor   │ │Caixa    │   │ Troca      │
            │ Metas      │ │Diário   │   │ Crédito    │
            └────────────┘ └─────────┘   └────────────┘
```

---

## 3. CICLO DE VIDA DO DISPOSITIVO (IMEI)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  JORNADA DO DISPOSITIVO POR IMEI                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ENTRADA                                                                │
│  ═══════                                                                │
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │   COMPRA     │     │  TRADE-IN    │     │ CONSIGNAÇÃO  │            │
│  │  Fornecedor  │     │   Cliente    │     │  Parceiro    │            │
│  │  condition:  │     │  condition:  │     │  condition:  │            │
│  │  new         │     │  used/refurb │     │  varies      │            │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘            │
│         │                    │                    │                     │
│         │             ┌──────┴───────┐            │                     │
│         │             │  AVALIAÇÃO   │            │                     │
│         │             │  Checklist   │            │                     │
│         │             │  19 itens    │            │                     │
│         │             └──────┬───────┘            │                     │
│         │                    │                    │                     │
│         │             ┌──────┴───────┐            │                     │
│         │             │  O.S. INT.   │            │                     │
│         │             │  Revisão     │            │                     │
│         │             │  Manutenção  │            │                     │
│         │             └──────┬───────┘            │                     │
│         │                    │                    │                     │
│         ▼                    ▼                    ▼                     │
│  ┌─────────────────────────────────────────────────────┐               │
│  │              ESTOQUE (status: in_stock)              │               │
│  │                                                      │               │
│  │  IMEI: 35XXXXXXXXXXXXX                              │               │
│  │  Marca: Samsung | Modelo: S24 Ultra                  │               │
│  │  Cor: Preto | Storage: 256GB | RAM: 12GB             │               │
│  │  Condição: refurbished                               │               │
│  │  Preço Compra: R$ 2.500 | Preço Venda: R$ 3.500     │               │
│  │  Depósito: Loja Centro                               │               │
│  └──────────────────────┬──────────────────────────────┘               │
│                         │                                               │
│  MOVIMENTAÇÕES          │                                               │
│  ═══════════════        │                                               │
│                         │                                               │
│  ┌──────────┐    ┌──────┴──────┐    ┌──────────────┐                   │
│  │TRANSFER. │◄───│  DISPONÍVEL │───►│  ASSISTÊNCIA │                   │
│  │Entre lojas│   │  para venda │    │  O.S. cliente│                   │
│  │in_transit │   │  in_stock   │    │  in_service  │                   │
│  └──────────┘    └──────┬──────┘    └──────┬───────┘                   │
│                         │                  │                            │
│                         │                  │ (retorna após reparo)      │
│                         │                  └──────────┐                 │
│                         │                             │                 │
│  SAÍDA                  ▼                             ▼                 │
│  ═════           ┌──────────────┐            ┌──────────────┐          │
│                  │    VENDA     │            │  DE VOLTA AO │          │
│                  │  PDV + NF-e  │            │   ESTOQUE    │          │
│                  │  status:sold │            │   in_stock   │          │
│                  └──────┬───────┘            └──────────────┘          │
│                         │                                              │
│                  ┌──────┴───────┐                                      │
│                  │  DEVOLUÇÃO?  │                                      │
│                  │  returned    │──────────► Volta ao estoque          │
│                  └──────────────┘                                      │
│                                                                         │
│  RASTREAMENTO: device_history + imei_history (kardex completo)         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. FLUXO DO TRADE-IN (4 ETAPAS DETALHADAS)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                      TRADE-IN - FLUXO COMPLETO                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ETAPA 1: AVALIAÇÃO                                                      ║
║  ══════════════════                                                      ║
║                                                                          ║
║  ┌────────────────────────────────────────────────────────────┐          ║
║  │  Cliente chega com dispositivo usado                       │          ║
║  │                                                            │          ║
║  │  1. Identificar cliente (busca por nome/CPF)               │          ║
║  │  2. Registrar IMEI, Marca, Modelo                          │          ║
║  │  3. Preencher Checklist (19 itens):                        │          ║
║  │                                                            │          ║
║  │  ┌──────────────────────────────────────────────────────┐  │          ║
║  │  │ ☐ Liga corretamente           ☐ Sensores/NFC        │  │          ║
║  │  │ ☐ Sem avarias/fantasma        ☐ Face ID/Touch ID    │  │          ║
║  │  │ ☐ Sem manchas na tela         ☐ Microfones          │  │          ║
║  │  │ ☐ Botões funcionando          ☐ Áudio auricular     │  │          ║
║  │  │ ☐ Marcas de uso               ☐ Alto-falante        │  │          ║
║  │  │ ☐ Wi-Fi                       ☐ Carregamento        │  │          ║
║  │  │ ☐ Chip                        ☐ Câmeras             │  │          ║
║  │  │ ☐ 4G/5G                       ☐ Flash               │  │          ║
║  │  │ ☐ Possui carregador           ☐ 3uTools OK          │  │          ║
║  │  │                         🔋 Bateria: ____%            │  │          ║
║  │  └──────────────────────────────────────────────────────┘  │          ║
║  │                                                            │          ║
║  │  4. Listar peças necessárias (se houver)                   │          ║
║  │  5. Definir valor estimado                                 │          ║
║  │  6. Assinatura digital do cliente                          │          ║
║  │  7. Imprimir comprovante                                   │          ║
║  │                                                            │          ║
║  │  Status: PENDING                                           │          ║
║  └────────────────────────────────────────────┬───────────────┘          ║
║                                               │                          ║
║                                               ▼                          ║
║  ETAPA 2: APROVAÇÃO                                                      ║
║  ══════════════════                                                      ║
║                                                                          ║
║  ┌────────────────────────────────────────────────────────────┐          ║
║  │  Gerente revisa avaliação e decide:                        │          ║
║  │                                                            │          ║
║  │  [APROVAR]                          [REJEITAR]             │          ║
║  │     │                                  │                   │          ║
║  │     ▼                                  ▼                   │          ║
║  │  Automaticamente:                   Avaliação              │          ║
║  │  ✅ Gera CRÉDITO para cliente       rejeitada.             │          ║
║  │     (R$ do valor estimado)          Sem ações.             │          ║
║  │  ✅ Cria O.S. INTERNA                                     │          ║
║  │     (INT2602XXXXXX)                                        │          ║
║  │  ✅ Registra no IMEI History                               │          ║
║  │                                                            │          ║
║  │  Status: APPROVED                                          │          ║
║  └────────────────────────────────────────────┬───────────────┘          ║
║                                               │                          ║
║                                               ▼                          ║
║  ETAPA 3: REVISÃO / MANUTENÇÃO                                           ║
║  ═════════════════════════════                                           ║
║                                                                          ║
║  ┌────────────────────────────────────────────────────────────┐          ║
║  │  Técnico trabalha na O.S. Interna:                         │          ║
║  │                                                            │          ║
║  │  1. Diagnóstico técnico                                    │          ║
║  │  2. Troca de peças (registra peças + custos)               │          ║
║  │  3. Limpeza e preparação                                   │          ║
║  │  4. Teste de qualidade                                     │          ║
║  │  5. Preenche checklist de conclusão                        │          ║
║  │  6. Finaliza O.S. Interna                                  │          ║
║  │                                                            │          ║
║  │  Custos:                                                   │          ║
║  │  ├── Peças utilizadas: R$ XXX                              │          ║
║  │  ├── Mão de obra: R$ XXX                                   │          ║
║  │  └── Total reparo: R$ XXX                                  │          ║
║  │                                                            │          ║
║  │  Status O.S.: COMPLETED                                    │          ║
║  └────────────────────────────────────────────┬───────────────┘          ║
║                                               │                          ║
║                                               ▼                          ║
║  ETAPA 4: ENTRADA NO ESTOQUE                                             ║
║  ═══════════════════════════                                            ║
║                                                                          ║
║  ┌────────────────────────────────────────────────────────────┐          ║
║  │  Ao finalizar O.S. Interna:                                │          ║
║  │                                                            │          ║
║  │  ✅ Cria dispositivo no estoque (mobile_devices)           │          ║
║  │     condition: "refurbished"                               │          ║
║  │     acquisitionType: "trade_in"                            │          ║
║  │                                                            │          ║
║  │  💰 Cálculo do preço sugerido:                             │          ║
║  │     Custo aquisição = Valor Trade-In + Custo Reparo        │          ║
║  │     Preço sugerido  = Custo × (1 + Margem%)                │          ║
║  │     Ex: R$1500 + R$300 = R$1800 × 1.30 = R$ 2.340         │          ║
║  │                                                            │          ║
║  │  ✅ Registra no IMEI History                               │          ║
║  │  ✅ Registra no Activity Feed                              │          ║
║  │  ✅ Disponível no PDV para venda                           │          ║
║  │                                                            │          ║
║  │  Status: IN_STOCK (pronto para venda)                      │          ║
║  └────────────────────────────────────────────────────────────┘          ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 5. MAPA DO PDV (PONTO DE VENDA)

```
╔═══════════════════════════════════════════════════════════════════════╗
║                          PDV - PONTO DE VENDA                        ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  BARRA SUPERIOR                                                       ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │ 🏪 Empresa: Loja Centro    👤 Vendedor: João Silva              │ ║
║  │                                                                  │ ║
║  │ [Sangria] [Reforço] [Devolução] [Selecionar Cliente] [Limpar]   │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ┌───────────────────────────────────┬──────────────────────────────┐ ║
║  │      CATÁLOGO (3 colunas)         │     CARRINHO (2 colunas)     │ ║
║  │                                   │                              │ ║
║  │  ┌──────────┬──────────┬────────┐ │  ┌──────────────────────────┐│ ║
║  │  │📱Disposit│📦Produtos│🔧Fat.OS│ │  │ Samsung S24 Ultra       ││ ║
║  │  └──────────┴──────────┴────────┘ │  │ IMEI: 35XXX  📱Celular  ││ ║
║  │                                   │  │           R$ 3.500,00    ││ ║
║  │  [🔍 Buscar...              ]     │  ├──────────────────────────┤│ ║
║  │                                   │  │ Capinha Silicone         ││ ║
║  │  ┌──────────────────────────────┐ │  │ 2x R$ 45,00             ││ ║
║  │  │ Samsung S24 Ultra            │ │  │            R$ 90,00     ││ ║
║  │  │ 256GB | Preto | IMEI: 35XX  │ │  ├──────────────────────────┤│ ║
║  │  │ 🟢 Novo   📦 Loja Centro    │ │  │ O.S. #OS2602ABC         ││ ║
║  │  │              R$ 3.500,00     │ │  │ Troca de tela 🔧Serviço ││ ║
║  │  │              [+ Adicionar]   │ │  │           R$ 450,00     ││ ║
║  │  ├──────────────────────────────┤ │  ╞══════════════════════════╡│ ║
║  │  │ iPhone 15 Pro               │ │  │ Subtotal    R$ 4.040,00 ││ ║
║  │  │ 128GB | Branco | IMEI: 86XX │ │  │ Desconto   -R$   40,00 ││ ║
║  │  │ 🔵 Recond  📦 Loja Centro   │ │  │ Trade-In   -R$ 1.500,00 ││ ║
║  │  │              R$ 4.200,00     │ │  │ Crédito    -R$   200,00 ││ ║
║  │  │              [+ Adicionar]   │ │  │─────────────────────────││ ║
║  │  ├──────────────────────────────┤ │  │ TOTAL       R$ 2.300,00 ││ ║
║  │  │ Xiaomi 14                   │ │  │                          ││ ║
║  │  │ 512GB | Azul | IMEI: 86XX   │ │  │ 💙 Crédito: R$ 200,00  ││ ║
║  │  │ 🟡 Usado   📦 Loja Centro   │ │  │                          ││ ║
║  │  │              R$ 2.800,00     │ │  │ [↕️ Trade-In]            ││ ║
║  │  │              [+ Adicionar]   │ │  │ [💰 FINALIZAR VENDA]    ││ ║
║  │  └──────────────────────────────┘ │  └──────────────────────────┘│ ║
║  └───────────────────────────────────┴──────────────────────────────┘ ║
║                                                                       ║
║  MODAL DE PAGAMENTO                                                   ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │  Total: R$ 2.300,00                                              │ ║
║  │                                                                  │ ║
║  │  [Dinheiro ✓] [Débito] [Crédito] [PIX] [Combinado]             │ ║
║  │                                                                  │ ║
║  │  Valor: [R$ 2.300,00]     Parcelas: [1x]                       │ ║
║  │                                                                  │ ║
║  │  Desconto: [___]%  ou  [R$ ___]                                 │ ║
║  │                                                                  │ ║
║  │  [CONFIRMAR PAGAMENTO]                                           │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 6. FLUXO DA ORDEM DE SERVIÇO (12 ESTADOS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ORDEM DE SERVIÇO - FLUXO DE STATUS                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          ┌──────────┐                                       │
│                          │  ABERTA  │ ◄── Cliente entrega dispositivo       │
│                          │   open   │                                       │
│                          └────┬─────┘                                       │
│                               │                                             │
│                               ▼                                             │
│                        ┌─────────────┐                                      │
│                        │ DIAGNÓSTICO │ ◄── Técnico analisa problema         │
│                        │  diagnosis  │                                      │
│                        └──────┬──────┘                                      │
│                               │                                             │
│                               ▼                                             │
│                        ┌─────────────┐                                      │
│                        │ ORÇAMENTO   │ ◄── Técnico elabora orçamento        │
│                        │   quote     │                                      │
│                        └──────┬──────┘                                      │
│                               │                                             │
│                               ▼                                             │
│                     ┌────────────────────┐                                  │
│                     │ AGUARD. APROVAÇÃO  │ ◄── Enviado para cliente         │
│                     │ pending_approval   │                                  │
│                     └─────┬────────┬─────┘                                  │
│                           │        │                                        │
│                  APROVOU  │        │  REJEITOU                              │
│                           ▼        ▼                                        │
│                    ┌──────────┐  ┌──────────┐                               │
│                    │ APROVADA │  │ REJEITADA│ ──► FIM                       │
│                    │ approved │  │ rejected │                               │
│                    └────┬─────┘  └──────────┘                               │
│                         │                                                   │
│                         ▼                                                   │
│                    ┌──────────┐                                              │
│                    │ EM REPARO│ ◄── Técnico inicia trabalho                 │
│                    │in_repair │                                              │
│                    └────┬─────┘                                              │
│                         │                                                   │
│              ┌──────────┼──────────┐                                        │
│              │                     │                                        │
│              ▼                     │                                        │
│     ┌──────────────┐               │                                        │
│     │ AGUARD. PEÇAS│               │ ◄── Se precisar de peça                │
│     │waiting_parts │───────────────┘                                        │
│     └──────────────┘     (peça chegou, volta para reparo)                   │
│                                                                             │
│                         │                                                   │
│                         ▼                                                   │
│                  ┌──────────────┐                                           │
│                  │ QUALIDADE    │ ◄── Verificação pós-reparo                │
│                  │quality_check │                                           │
│                  └──────┬───────┘                                           │
│                         │                                                   │
│                         ▼                                                   │
│                  ┌──────────────┐                                           │
│                  │ PRONTO PARA  │ ◄── Disponível para retirada              │
│                  │  RETIRADA    │     (aparece no PDV p/ faturar)           │
│                  │ ready_pickup │                                           │
│                  └──────┬───────┘                                           │
│                         │                                                   │
│                         ▼                                                   │
│                  ┌──────────────┐                                           │
│                  │  CONCLUÍDA   │ ◄── Cliente retirou + pagou               │
│                  │  completed   │     (faturada no PDV)                     │
│                  └──────────────┘                                           │
│                                                                             │
│   Em qualquer momento: ──────────► ┌──────────────┐                        │
│                                    │  CANCELADA   │                        │
│                                    │  cancelled   │                        │
│                                    └──────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. MAPA DE RELATÓRIOS

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RELATÓRIOS DO RETAIL                         │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│  OS POR      │  Status    │ Qtd  │ Valor Total                     │
│  STATUS      │  open      │  12  │ R$ 5.400                        │
│              │  in_repair │   8  │ R$ 3.200                        │
│              │  completed │  45  │ R$ 22.500                       │
│              │                                                      │
├──────────────┼──────────────────────────────────────────────────────┤
│              │                                                      │
│  OS POR      │  Técnico     │ Total │ Concl. │ Andamento │ Receita │
│  TÉCNICO     │  Carlos      │   15  │   12   │     3     │ R$8.500 │
│              │  Pedro       │   10  │    8   │     2     │ R$5.200 │
│              │                                                      │
├──────────────┼──────────────────────────────────────────────────────┤
│              │                                                      │
│  VENDAS POR  │  Vendedor │ Vendas │ Receita   │ Ticket │ Dias     │
│  VENDEDOR    │  João     │   28   │ R$45.000  │ R$1607 │  22      │
│              │  Maria    │   22   │ R$38.000  │ R$1727 │  20      │
│              │                                                      │
├──────────────┼──────────────────────────────────────────────────────┤
│              │                                                      │
│  MARGEM      │  Dispositivo  │ IMEI    │ Custo  │ Venda  │  Margem │
│  POR IMEI    │  S24 Ultra    │ 35XXX   │ R$2500 │ R$3500 │  40.0%  │
│              │  iPhone 15    │ 86XXX   │ R$3800 │ R$4200 │  10.5%  │
│              │                                                      │
├──────────────┼──────────────────────────────────────────────────────┤
│              │                                                      │
│  CAIXA       │  ┌────────────────────────────────────────────┐     │
│  DIÁRIO      │  │ Total Vendas: R$ 12.500  (8 vendas)       │     │
│              │  │ Dinheiro: R$ 4.200  │  Cartão: R$ 5.800   │     │
│              │  │ PIX: R$ 2.500       │  Combinado: R$ 0    │     │
│  (4 queries) │  │ Sangrias: -R$ 500   │  Reforços: +R$ 200  │     │
│              │  │ Saldo Caixa: R$ 3.900                      │     │
│              │  └────────────────────────────────────────────┘     │
│              │                                                      │
│              │  POR VENDEDOR:                                       │
│              │  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐ │
│              │  │Vendedor│Vendas│Dinh. │Déb. │Créd.│ PIX │TOTAL │ │
│              │  │João   │  5  │R$2100│R$1500│R$800│R$1200│R$5600│ │
│              │  │Maria  │  3  │R$2100│R$1300│R$600│R$1300│R$6900│ │
│              │  │TOTAL  │  8  │R$4200│R$2800│R$1400│R$2500│R$12.5│ │
│              │  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘ │
│              │                                                      │
├──────────────┼──────────────────────────────────────────────────────┤
│              │                                                      │
│  GIRO DE     │  Produto    │ Estoque │ Vendas 30d │ Turnover      │
│  ESTOQUE     │  Capinha    │    50   │     35     │   0.70        │
│              │  Película   │    80   │     42     │   0.53        │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

## 8. ARQUITETURA TÉCNICA

```
╔═══════════════════════════════════════════════════════════════════════╗
║                    ARQUITETURA DO MÓDULO RETAIL                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  FRONTEND (React + TypeScript + Tailwind + shadcn/ui)                ║
║  ═══════════════════════════════════════════════════                  ║
║                                                                       ║
║  client/src/pages/ArcadiaRetail.tsx ──── 10.067 linhas               ║
║       │                                                               ║
║       ├── Dashboard (KPIs, Feed, Alertas)                            ║
║       ├── PDV (Carrinho, Catálogo, Pagamento)                        ║
║       ├── Pessoas (CRUD, Papéis, Histórico)                          ║
║       ├── Estoque (Depósitos, Séries, Inventário)                    ║
║       ├── Serviços (O.S. CRUD, Checklist)                            ║
║       ├── Trade-In (Avaliações, Fluxo 4 etapas)                     ║
║       ├── Compras (Pedidos, Recebimento)                             ║
║       ├── Cadastros (Pagamento, Vendedores, Promoções)               ║
║       ├── Relatórios (6 sub-abas)                                    ║
║       ├── Comissões (Dashboard, Metas, Fechamento)                   ║
║       └── Configuração (Plus, Empresas, Sync)                        ║
║                                                                       ║
║  client/src/components/TradeInForm.tsx ─── 988 linhas                ║
║       └── Formulário completo c/ checklist + assinatura              ║
║                                                                       ║
║  ─────────────────────────────────────────────────────────────        ║
║                          API (fetch → /api/retail/*)                  ║
║  ─────────────────────────────────────────────────────────────        ║
║                                                                       ║
║  BACKEND (Express.js + Drizzle ORM)                                  ║
║  ══════════════════════════════════                                   ║
║                                                                       ║
║  server/retail/routes.ts ──── 5.218 linhas (~130 endpoints)          ║
║       │                                                               ║
║       ├── CRUD: Devices, Evaluations, ServiceOrders,                 ║
║       │         Persons, Products, Warehouses, etc.                   ║
║       ├── PDV: Sessions, Sales, Payments, CashMovements              ║
║       ├── Trade-In: Approve, Process, FullFlow, Stock                ║
║       ├── Reports: OsStatus, OsTech, SalesSeller,                   ║
║       │            MarginIMEI, DailyCash, StockTurnover              ║
║       ├── Returns: Search, Process, Credits                          ║
║       └── Commissions: Plans, Goals, Calculate, Close                ║
║                                                                       ║
║  server/retail/plus-sync.ts ──── 542 linhas                          ║
║       └── Sync: Customers, Sales+Items, NF-e                        ║
║                                                                       ║
║  ─────────────────────────────────────────────────────────────        ║
║                          Drizzle ORM → PostgreSQL                     ║
║  ─────────────────────────────────────────────────────────────        ║
║                                                                       ║
║  BANCO DE DADOS (PostgreSQL + 40 tabelas)                            ║
║  ════════════════════════════════════════                             ║
║                                                                       ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               ║
║  │  Dispositivos │  │    Vendas    │  │   Estoque    │               ║
║  │ mobile_devices│  │  pos_sales   │  │ warehouses   │               ║
║  │ device_history│  │pos_sale_items│  │warehouse_stk │               ║
║  │ imei_history  │  │pos_sessions  │  │stock_movem.  │               ║
║  └──────────────┘  │cash_movements│  │transfers     │               ║
║                    └──────────────┘  │serials       │               ║
║  ┌──────────────┐                    │inventories   │               ║
║  │  Trade-In    │  ┌──────────────┐  └──────────────┘               ║
║  │ evaluations  │  │   Serviços   │                                  ║
║  │ checklist_*  │  │service_orders│  ┌──────────────┐               ║
║  │ acquisitions │  │  so_items    │  │  Cadastros   │               ║
║  │ transfer_doc │  │ warranties   │  │payment_meth. │               ║
║  └──────────────┘  └──────────────┘  │ sellers      │               ║
║                                      │ comm_plans   │               ║
║  ┌──────────────┐  ┌──────────────┐  │ promotions   │               ║
║  │  Créditos    │  │  Devoluções  │  │ price_tables │               ║
║  │customer_cred.│  │return_exch.  │  │product_types │               ║
║  └──────────────┘  │return_items  │  └──────────────┘               ║
║                    └──────────────┘                                   ║
║                                                                       ║
║  ─────────────────────────────────────────────────────────────        ║
║                                                                       ║
║  INTEGRAÇÃO PLUS (Laravel ERP - Porta 8080)                          ║
║  ══════════════════════════════════════════                           ║
║                                                                       ║
║  ┌───────────┐    ┌───────────┐    ┌───────────┐                     ║
║  │Proxy Rev. │    │  SSO      │    │Auto-Start │                     ║
║  │/plus/* →  │    │HMAC-SHA256│    │php artisan│                     ║
║  │:8080      │    │Token      │    │serve      │                     ║
║  └───────────┘    └───────────┘    └───────────┘                     ║
║        │                                                              ║
║        ▼                                                              ║
║  ┌─────────────────────────────────────────────────┐                 ║
║  │  Plus (Laravel)                                  │                 ║
║  │  ├── NF-e / NFC-e (SEFAZ)                       │                 ║
║  │  ├── Clientes / Fornecedores                     │                 ║
║  │  ├── Vendas / Faturamento                        │                 ║
║  │  └── Fiscal completo                             │                 ║
║  └─────────────────────────────────────────────────┘                 ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 9. SEGURANÇA MULTI-TENANT

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADAS DE SEGURANÇA                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CAMADA 1: AUTENTICAÇÃO                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Passport.js Session → req.isAuthenticated()                 │   │
│  │  Todas as rotas /api/retail/* exigem login                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  CAMADA 2: TENANT SCOPING                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  req.user.tenantId → obrigatório                             │   │
│  │  Se ausente → 403 "Tenant not identified"                    │   │
│  │  WHERE tenant_id = $tenantId em TODAS as queries             │   │
│  │  Dados de um tenant NUNCA vazam para outro                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  CAMADA 3: MODULE GATING                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  requireModule('retail') → verifica tenants.features.retail  │   │
│  │  Se módulo inativo → 403 "Módulo não habilitado"             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  CAMADA 4: OPERAÇÕES SENSÍVEIS                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Devoluções → Exige senha do GERENTE                         │   │
│  │  Sangrias → Registra responsável + autorizador               │   │
│  │  Exclusões → Soft delete quando possível                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  CAMADA 5: AUDITORIA                                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  retail_activity_feed → Todas as operações relevantes        │   │
│  │  device_history → Movimentação de IMEI                       │   │
│  │  imei_history → Kardex completo por IMEI                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. MAPA DE INTEGRAÇÕES

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INTEGRAÇÕES DO RETAIL                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    ┌──────────────────┐                               │
│                    │  ARCÁDIA RETAIL  │                               │
│                    │    (Express)     │                               │
│                    └────────┬─────────┘                               │
│                             │                                        │
│         ┌───────────────────┼───────────────────┐                    │
│         │                   │                   │                    │
│         ▼                   ▼                   ▼                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  PLUS (PHP)  │  │  ERPNEXT     │  │  POSTGRESQL  │              │
│  │  :8080       │  │  (API ext.)  │  │  (Drizzle)   │              │
│  │              │  │              │  │              │              │
│  │ ▸ NF-e/NFC-e│  │ ▸ Clientes   │  │ ▸ 40+ tabelas│              │
│  │ ▸ Clientes  │  │ ▸ Fornecedor │  │ ▸ Retail     │              │
│  │ ▸ Vendas    │  │ ▸ Estoque    │  │ ▸ Multi-ten. │              │
│  │ ▸ Fiscal    │  │ ▸ Financeiro │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│         │                   │                                        │
│         │                   │                                        │
│         ▼                   ▼                                        │
│  ┌──────────────────────────────────────────────────┐               │
│  │                    SEFAZ                          │               │
│  │  NF-e / NFC-e (via Plus Laravel + nfelib)        │               │
│  └──────────────────────────────────────────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Métricas Finais:**
- **16.800+ linhas** de código
- **40+ tabelas** no banco
- **~130 endpoints** REST
- **11 abas** na interface
- **19 itens** no checklist de avaliação
- **12 estados** de O.S.
- **4 etapas** no fluxo de Trade-In
- **5 formas** de pagamento
- **4 queries** no caixa diário
