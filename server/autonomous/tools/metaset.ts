/**
 * MetaSet Tools - Ferramentas de BI para Agentes Autônomos
 * Arcádia Suite
 * 
 * Integração com Apache Superset via novo cliente em /server/bi/metaset-client/
 */

import { BaseTool, ToolParameter, ToolResult } from "./BaseTool";
import { metasetClient } from "../../bi/metaset-client/index";

// Database ID padrão do Arcádia (deve ser configurado no MetaSet)
const DEFAULT_DATABASE_ID = 1;

export class MetaSetQueryTool extends BaseTool {
  name = "metaset.query";
  description = "Executa uma consulta SQL no motor de BI e retorna os resultados. Use para análises, relatórios e extração de dados.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "query", type: "string", description: "Consulta SQL (apenas SELECT)", required: true },
    { name: "limit", type: "number", description: "Limite de linhas (padrão: 100)", required: false },
  ];

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const result = await metasetClient.executeSql(DEFAULT_DATABASE_ID, params.query, { 
        limit: params.limit || 100 
      });
      const preview = result.rows.slice(0, 20).map(row => {
        const obj: Record<string, any> = {};
        result.columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
      return this.formatSuccess(
        `Consulta executada: ${result.rowCount} linhas, ${result.columns.length} colunas.\n\nColunas: ${result.columns.join(", ")}\n\nPrimeiras ${Math.min(20, preview.length)} linhas:\n${JSON.stringify(preview, null, 2)}`,
        { columns: result.columns, rows: result.rows, rowCount: result.rowCount }
      );
    } catch (err: any) {
      return this.formatError(`Erro na consulta: ${err.message}`);
    }
  }
}

export class MetaSetListTablesTool extends BaseTool {
  name = "metaset.list_tables";
  description = "Lista todas as tabelas disponíveis no banco de dados para análise de BI.";
  category = "bi";
  parameters: ToolParameter[] = [];

  async execute(): Promise<ToolResult> {
    try {
      const tables = await metasetClient.getDatabaseTables(DEFAULT_DATABASE_ID);
      const summary = tables.map(t => `- ${t.name} (${t.schema})`).join("\n");
      return this.formatSuccess(
        `${tables.length} tabelas disponíveis:\n${summary}`,
        tables
      );
    } catch (err: any) {
      return this.formatError(`Erro ao listar tabelas: ${err.message}`);
    }
  }
}

export class MetaSetTableFieldsTool extends BaseTool {
  name = "metaset.table_fields";
  description = "Obtém as colunas e tipos de uma tabela específica para planejar consultas e análises.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "tableId", type: "number", description: "ID da tabela (use metaset.list_tables para obter)", required: true },
  ];

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const metadata = await metasetClient.getTableMetadata(params.tableId);
      const fields = metadata.result?.columns || [];
      const summary = fields.map((f: any) => `- ${f.column_name} (${f.type})`).join("\n");
      return this.formatSuccess(
        `${fields.length} colunas:\n${summary}`,
        fields
      );
    } catch (err: any) {
      return this.formatError(`Erro ao obter campos: ${err.message}`);
    }
  }
}

export class MetaSetCreateChartTool extends BaseTool {
  name = "metaset.create_chart";
  description = "Cria um gráfico/chart no motor de BI. O chart fica salvo e pode ser adicionado a dashboards.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "name", type: "string", description: "Nome do gráfico", required: true },
    { name: "datasetId", type: "number", description: "ID do dataset/tabela", required: true },
    { name: "vizType", type: "string", description: "Tipo: table, bar, line, pie, area, scatter", required: true },
    { name: "params", type: "object", description: "Parâmetros de visualização", required: false },
  ];

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const chart = await metasetClient.createChart({
        name: params.name,
        datasetId: params.datasetId,
        vizType: params.vizType,
        params: params.params || {},
      });
      return this.formatSuccess(
        `Gráfico criado: "${chart.name}" (ID: ${chart.id}). Use metaset.add_to_dashboard para adicionar a um dashboard.`,
        chart
      );
    } catch (err: any) {
      return this.formatError(`Erro ao criar gráfico: ${err.message}`);
    }
  }
}

export class MetaSetListChartsTool extends BaseTool {
  name = "metaset.list_charts";
  description = "Lista todos os gráficos/charts salvos no motor de BI.";
  category = "bi";
  parameters: ToolParameter[] = [];

  async execute(): Promise<ToolResult> {
    try {
      const charts = await metasetClient.listCharts();
      if (charts.length === 0) {
        return this.formatSuccess("Nenhum gráfico criado ainda. Use metaset.create_chart para criar.", []);
      }
      const summary = charts.map(c => `- [${c.id}] "${c.name}" (${c.vizType}) - ${c.description || "sem descrição"}`).join("\n");
      return this.formatSuccess(`${charts.length} gráficos:\n${summary}`, charts);
    } catch (err: any) {
      return this.formatError(`Erro ao listar gráficos: ${err.message}`);
    }
  }
}

export class MetaSetCreateDashboardTool extends BaseTool {
  name = "metaset.create_dashboard";
  description = "Cria um novo dashboard no motor de BI para organizar gráficos.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "name", type: "string", description: "Nome do dashboard", required: true },
    { name: "description", type: "string", description: "Descrição do dashboard", required: false },
  ];

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const dashboard = await metasetClient.createDashboard({
        name: params.name,
        description: params.description,
      });
      return this.formatSuccess(
        `Dashboard criado: "${dashboard.name}" (ID: ${dashboard.id}).`,
        dashboard
      );
    } catch (err: any) {
      return this.formatError(`Erro ao criar dashboard: ${err.message}`);
    }
  }
}

export class MetaSetListDashboardsTool extends BaseTool {
  name = "metaset.list_dashboards";
  description = "Lista todos os dashboards do motor de BI.";
  category = "bi";
  parameters: ToolParameter[] = [];

  async execute(): Promise<ToolResult> {
    try {
      const dashboards = await metasetClient.listDashboards();
      if (dashboards.length === 0) {
        return this.formatSuccess("Nenhum dashboard criado ainda. Use metaset.create_dashboard para criar.", []);
      }
      const summary = dashboards.map(d => `- [${d.id}] "${d.name}" - ${d.description || "sem descrição"}`).join("\n");
      return this.formatSuccess(`${dashboards.length} dashboards:\n${summary}`, dashboards);
    } catch (err: any) {
      return this.formatError(`Erro ao listar dashboards: ${err.message}`);
    }
  }
}

export class MetaSetGetDashboardTool extends BaseTool {
  name = "metaset.get_dashboard";
  description = "Obtém detalhes de um dashboard específico.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "dashboardId", type: "number", description: "ID do dashboard", required: true },
  ];

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const dashboard = await metasetClient.getDashboard(params.dashboardId);
      return this.formatSuccess(
        `Dashboard: "${dashboard.result?.dashboard_title}"`,
        dashboard
      );
    } catch (err: any) {
      return this.formatError(`Erro ao obter dashboard: ${err.message}`);
    }
  }
}

export class MetaSetSuggestAnalysisTool extends BaseTool {
  name = "metaset.suggest_analysis";
  description = "Sugere consultas e tipos de gráfico para uma tabela baseado em sua estrutura de dados. Ideal para descoberta de insights.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "tableName", type: "string", description: "Nome da tabela para analisar", required: true },
  ];

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const suggestions = await metasetClient.getAutoSuggestions(params.tableName);
      return this.formatSuccess(
        `Sugestões para tabela "${params.tableName}":\n\nGráficos recomendados: ${suggestions.suggestedCharts.join(", ")}\n\nConsultas sugeridas:\n${suggestions.suggestedQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
        suggestions
      );
    } catch (err: any) {
      return this.formatError(`Erro ao sugerir análises: ${err.message}`);
    }
  }
}

export class MetaSetSyncTool extends BaseTool {
  name = "metaset.sync_database";
  description = "Sincroniza o schema do banco de dados com o motor de BI. Use após criar novas tabelas.";
  category = "bi";
  parameters: ToolParameter[] = [];

  async execute(): Promise<ToolResult> {
    try {
      await metasetClient.syncDatabaseSchema(DEFAULT_DATABASE_ID);
      return this.formatSuccess("Schema do banco sincronizado com o motor de BI.");
    } catch (err: any) {
      return this.formatError(`Erro ao sincronizar: ${err.message}`);
    }
  }
}

export class MetaSetHealthTool extends BaseTool {
  name = "metaset.health";
  description = "Verifica o status do motor de BI (MetaSet).";
  category = "bi";
  parameters: ToolParameter[] = [];

  async execute(): Promise<ToolResult> {
    try {
      const health = await metasetClient.isHealthy();
      if (health.online) {
        return this.formatSuccess(`Motor BI online (versão: ${health.version})`, health);
      }
      return this.formatError("Motor BI offline");
    } catch (err: any) {
      return this.formatError(`Erro ao verificar status: ${err.message}`);
    }
  }
}

// Ferramentas legadas (mantidas para compatibilidade, mas redirecionadas)
export class MetaSetCreateQuestionTool extends BaseTool {
  name = "metaset.create_question";
  description = "[LEGADO] Use metaset.create_chart em vez disso. Cria uma pergunta no motor de BI.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "name", type: "string", description: "Nome", required: true },
    { name: "query", type: "string", description: "Consulta SQL", required: true },
  ];

  async execute(params: Record<string, any>): Promise<ToolResult> {
    return this.formatSuccess("Use metaset.create_chart para criar visualizações no MetaSet (Apache Superset).");
  }
}

export class MetaSetRunQuestionTool extends BaseTool {
  name = "metaset.run_question";
  description = "[LEGADO] Use metaset.query em vez disso. Executa uma pergunta salva.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "questionId", type: "number", description: "ID", required: true },
  ];

  async execute(): Promise<ToolResult> {
    return this.formatSuccess("Use metaset.query para executar consultas SQL diretamente.");
  }
}

export class MetaSetListQuestionsTool extends BaseTool {
  name = "metaset.list_questions";
  description = "[LEGADO] Use metaset.list_charts em vez disso. Lista perguntas salvas.";
  category = "bi";
  parameters: ToolParameter[] = [];

  async execute(): Promise<ToolResult> {
    return this.formatSuccess("Use metaset.list_charts para listar visualizações no MetaSet.");
  }
}

export class MetaSetAddToDashboardTool extends BaseTool {
  name = "metaset.add_to_dashboard";
  description = "[LEGADO] Funcionalidade em desenvolvimento para novo MetaSet.";
  category = "bi";
  parameters: ToolParameter[] = [
    { name: "dashboardId", type: "number", description: "ID do dashboard", required: true },
    { name: "chartId", type: "number", description: "ID do gráfico", required: true },
  ];

  async execute(): Promise<ToolResult> {
    return this.formatSuccess("Funcionalidade de adicionar gráficos a dashboards em desenvolvimento para o novo MetaSet.");
  }
}
