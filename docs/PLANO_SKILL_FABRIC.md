 Vou criar um plano técnico focado apenas nas funções e implementações, sem aspectos de negócio, custos ou gestão de equipe. Ideal para gerar comandos no Claude Code.

\---

\`\`\`markdown  
\# PLANO TÉCNICO DE IMPLEMENTAÇÃO: SKILL FABRIC  
\#\# Gerador e Gestor de Desenvolvimento de Skills \- Arcádia Suite

\*\*Versão:\*\* 1.0    
\*\*Data:\*\* Março 2026    
\*\*Tipo:\*\* Especificação Técnica para Implementação  

\---

\#\# 1\. ARQUITETURA TÉCNICA

\#\#\# 1.1 Stack Tecnológico

| Camada | Tecnologia | Propósito |  
|--------|-----------|-----------|  
| Frontend | React \+ TypeScript \+ Monaco Editor | IDE no browser |  
| Backend | Node.js \+ TypeScript | API e runtime |  
| Compilador | ANTLR \+ AST | Parser de skills |  
| Validação | ESLint \+ Custom Rules | Quality gates |  
| Runtime | VM2 \+ Sandboxing | Execução segura |  
| Storage | PostgreSQL \+ Neo4j | Dados e grafo |  
| Cache | Redis | Performance |

\#\#\# 1.2 Estrutura de Diretórios

\`\`\`  
server/modules/skill-fabric/  
├── src/  
│   ├── api/  
│   │   ├── routes/  
│   │   │   ├── skills.routes.ts  
│   │   │   ├── compiler.routes.ts  
│   │   │   ├── validator.routes.ts  
│   │   │   └── marketplace.routes.ts  
│   │   └── controllers/  
│   ├── core/  
│   │   ├── skill/  
│   │   │   ├── Skill.entity.ts  
│   │   │   ├── Skill.repository.ts  
│   │   │   └── Skill.service.ts  
│   │   ├── compiler/  
│   │   │   ├── VisualCompiler.ts  
│   │   │   ├── CodeCompiler.ts  
│   │   │   ├── MarkdownCompiler.ts  
│   │   │   └── AST/  
│   │   ├── validator/  
│   │   │   ├── ValidationPipeline.ts  
│   │   │   ├── rules/  
│   │   │   │   ├── SyntaxRule.ts  
│   │   │   │   ├── TypeRule.ts  
│   │   │   │   ├── SecurityRule.ts  
│   │   │   │   └── PerformanceRule.ts  
│   │   ├── executor/  
│   │   │   ├── SkillExecutor.ts  
│   │   │   ├── Sandbox.ts  
│   │   │   └── ReferenceResolver.ts  
│   │   └── lifecycle/  
│   │       ├── LifecycleManager.ts  
│   │       └── StateMachine.ts  
│   └── types/  
│       └── index.ts  
└── tests/

client/src/modules/skill-fabric/  
├── visual-studio/  
│   ├── components/  
│   │   ├── Canvas.tsx  
│   │   ├── NodePalette.tsx  
│   │   ├── PropertyPanel.tsx  
│   │   └── ConnectionLine.tsx  
│   └── hooks/  
│       ├── useCanvas.ts  
│       └── useDragDrop.ts  
├── code-ide/  
│   ├── components/  
│   │   ├── MonacoEditor.tsx  
│   │   ├── IntelliSenseProvider.ts  
│   │   └── DebuggerPanel.tsx  
│   └── templates/  
│       └── skill-template.ts  
├── markdown-studio/  
│   ├── components/  
│   │   ├── MarkdownEditor.tsx  
│   │   ├── AIAssistant.tsx  
│   │   └── LivePreview.tsx  
│   └── parser/  
│       └── MarkdownParser.ts  
└── shared/  
    ├── components/  
    │   ├── SkillToolbar.tsx  
    │   ├── VersionSelector.tsx  
    │   └── ValidationPanel.tsx  
    └── utils/  
        └── referenceParser.ts  
\`\`\`

\---

\#\# 2\. MÓDULOS DE IMPLEMENTAÇÃO

\#\#\# 2.1 Módulo: Core API (skills.api)

\*\*Arquivos:\*\*  
\- \`server/modules/skill-fabric/src/api/routes/skills.routes.ts\`  
\- \`server/modules/skill-fabric/src/api/controllers/skills.controller.ts\`

\*\*Funções:\*\*

\`\`\`typescript  
// CRUD Básico  
POST   /api/skills                    // createSkill(dto: CreateSkillDTO)  
GET    /api/skills                    // listSkills(query: ListSkillsQuery)  
GET    /api/skills/:id                // getSkill(id: string)  
PUT    /api/skills/:id                // updateSkill(id: string, dto: UpdateSkillDTO)  
DELETE /api/skills/:id                // archiveSkill(id: string)

// Compilação  
POST   /api/skills/:id/compile        // compileSkill(id: string)  
GET    /api/skills/:id/ast            // getSkillAST(id: string)

// Validação  
POST   /api/skills/:id/validate       // validateSkill(id: string)  
GET    /api/skills/:id/validation     // getValidationResults(id: string)

// Execução  
POST   /api/skills/:id/execute        // executeSkill(id: string, input: any)  
GET    /api/skills/:id/executions     // listExecutions(id: string)

// Versionamento  
GET    /api/skills/:id/versions       // listVersions(id: string)  
POST   /api/skills/:id/versions       // createVersion(id: string, dto: VersionDTO)  
POST   /api/skills/:id/rollback       // rollbackToVersion(id: string, version: string)

// Lifecycle  
POST   /api/skills/:id/submit         // submitForReview(id: string)  
POST   /api/skills/:id/approve        // approveSkill(id: string)  
POST   /api/skills/:id/reject         // rejectSkill(id: string, reason: string)  
POST   /api/skills/:id/publish        // publishSkill(id: string)  
POST   /api/skills/:id/deprecate      // deprecateSkill(id: string)

// Marketplace  
GET    /api/skills/marketplace        // listMarketplaceSkills(query: MarketplaceQuery)  
POST   /api/skills/:id/publish-marketplace  // publishToMarketplace(id: string)  
POST   /api/skills/marketplace/:id/install  // installFromMarketplace(id: string)  
\`\`\`

\*\*DTOs:\*\*

\`\`\`typescript  
interface CreateSkillDTO {  
  name: string;  
  slug: string;  
  description: string;  
  type: 'visual' | 'code' | 'markdown';  
  tenantId: number;  
  companyId?: number;  
  initialContent?: any;  
}

interface UpdateSkillDTO {  
  name?: string;  
  description?: string;  
  content?: any;  
  metadata?: SkillMetadata;  
}

interface ListSkillsQuery {  
  tenantId?: number;  
  companyId?: number;  
  userId?: number;  
  type?: 'visual' | 'code' | 'markdown';  
  status?: 'draft' | 'dev' | 'testing' | 'staging' | 'production';  
  tags?: string\[\];  
  search?: string;  
  limit?: number;  
  offset?: number;  
}  
\`\`\`

\---

\#\#\# 2.2 Módulo: Skill Entity (skill.entity)

\*\*Arquivo:\*\* \`server/modules/skill-fabric/src/core/skill/Skill.entity.ts\`

\*\*Classe:\*\*

\`\`\`typescript  
export class Skill {  
  constructor(props: SkillProps) {  
    this.id \= props.id || uuid();  
    this.validateProps(props);  
    Object.assign(this, props);  
  }

  // Identidade  
  id: UUID;  
  slug: string;  
  name: string;  
  description: string;  
    
  // Hierarquia  
  tenantId: number;  
  companyId?: number;  
  userId?: number;  
  namespace: 'system' | 'tenant' | 'company' | 'user';  
    
  // Implementação  
  type: 'visual' | 'code' | 'markdown';  
  content: VisualContent | CodeContent | MarkdownContent;  
  compiled?: CompiledSkill;  
    
  // Interface  
  inputSchema: JSONSchema;  
  outputSchema: JSONSchema;  
    
  // Runtime  
  timeout: number \= 30000;  
  memory: number \= 512;  
  retries: number \= 3;  
    
  // Lifecycle  
  status: SkillStatus \= 'draft';  
  version: SemanticVersion \= '0.0.1';  
  branch: string \= 'main';  
    
  // Métodos de domínio  
  compile(): CompiledSkill;  
  validate(): ValidationResult;  
  execute(context: ExecutionContext): Promise\<ExecutionResult\>;  
  changeStatus(newStatus: SkillStatus, reason?: string): void;  
  createVersion(message: string): Version;  
  rollback(version: string): void;  
  fork(newSlug: string): Skill;  
    
  // Validação  
  private validateProps(props: SkillProps): void;  
  private validateSlug(slug: string): boolean;  
  private validateContent(content: any): boolean;  
}  
\`\`\`

\---

\#\#\# 2.3 Módulo: Compiladores (compiler)

\*\*Arquivos:\*\*  
\- \`server/modules/skill-fabric/src/core/compiler/VisualCompiler.ts\`  
\- \`server/modules/skill-fabric/src/core/compiler/CodeCompiler.ts\`  
\- \`server/modules/skill-fabric/src/core/compiler/MarkdownCompiler.ts\`

\*\*Interface:\*\*

\`\`\`typescript  
interface Compiler {  
  compile(source: any): CompiledSkill;  
  parse(source: any): AST;  
  generateCode(ast: AST): string;  
  validateSyntax(source: any): SyntaxValidationResult;  
}

// Visual Compiler  
export class VisualCompiler implements Compiler {  
  compile(canvas: VisualCanvas): CompiledSkill {  
    // 1\. Valida conexões  
    // 2\. Ordena topologicamente  
    // 3\. Gera AST  
    // 4\. Compila para JavaScript  
  }  
    
  parse(canvas: VisualCanvas): VisualAST;  
  generateCode(ast: VisualAST): string;  
  validateSyntax(canvas: VisualCanvas): SyntaxValidationResult;  
}

// Code Compiler  
export class CodeCompiler implements Compiler {  
  compile(sourceCode: string): CompiledSkill {  
    // 1\. Parse TypeScript  
    // 2\. Type checking  
    // 3\. Transform decorators  
    // 4\. Bundle dependencies  
  }  
    
  parse(sourceCode: string): TypeScriptAST;  
  generateCode(ast: TypeScriptAST): string;  
  validateSyntax(sourceCode: string): SyntaxValidationResult;  
}

// Markdown Compiler  
export class MarkdownCompiler implements Compiler {  
  compile(markdown: string): CompiledSkill {  
    // 1\. Parse frontmatter  
    // 2\. Extrair blocos de código  
    // 3\. Resolver referências /xxx/  
    // 4\. Gerar JavaScript  
  }  
    
  parse(markdown: string): MarkdownAST;  
  generateCode(ast: MarkdownAST): string;  
  validateSyntax(markdown: string): SyntaxValidationResult;  
}  
\`\`\`

\*\*AST Types:\*\*

\`\`\`typescript  
interface AST {  
  type: 'skill';  
  version: string;  
  metadata: SkillMetadata;  
  imports: ImportNode\[\];  
  exports: ExportNode\[\];  
  body: StatementNode\[\];  
}

type StatementNode \=   
  | VariableDeclarationNode  
  | FunctionDeclarationNode  
  | ClassDeclarationNode  
  | ExpressionStatementNode  
  | IfStatementNode  
  | LoopStatementNode  
  | TryCatchNode  
  | SkillCallNode;

interface SkillCallNode {  
  type: 'skill-call';  
  reference: string;  // /skill/xxx  
  arguments: ArgumentNode\[\];  
  await: boolean;  
}  
\`\`\`

\---

\#\#\# 2.4 Módulo: Validador (validator)

\*\*Arquivo:\*\* \`server/modules/skill-fabric/src/core/validator/ValidationPipeline.ts\`

\*\*Pipeline:\*\*

\`\`\`typescript  
export class ValidationPipeline {  
  private rules: ValidationRule\[\] \= \[  
    new SyntaxRule(),  
    new TypeRule(),  
    new SecurityRule(),  
    new DependencyRule(),  
    new PerformanceRule(),  
    new DocumentationRule()  
  \];

  async validate(skill: Skill): Promise\<ValidationResult\> {  
    const results: RuleResult\[\] \= \[\];  
      
    for (const rule of this.rules) {  
      const result \= await rule.check(skill);  
      results.push(result);  
        
      // Fail fast para erros críticos  
      if (result.severity \=== 'error' && rule.isBlocking) {  
        break;  
      }  
    }  
      
    return this.aggregateResults(results);  
  }  
    
  calculateScore(results: RuleResult\[\]): number {  
    return results.reduce((score, r) \=\> {  
      return r.passed ? score \+ r.weight : score;  
    }, 0);  
  }  
}

// Regras individuais  
export class SyntaxRule implements ValidationRule {  
  name \= 'syntax';  
  weight \= 10;  
  isBlocking \= true;  
    
  async check(skill: Skill): Promise\<RuleResult\> {  
    const compiler \= this.getCompiler(skill.type);  
    const result \= compiler.validateSyntax(skill.content);  
      
    return {  
      rule: this.name,  
      passed: result.valid,  
      weight: this.weight,  
      severity: result.valid ? 'info' : 'error',  
      details: result.errors  
    };  
  }  
}

export class SecurityRule implements ValidationRule {  
  name \= 'security';  
  weight \= 20;  
  isBlocking \= true;  
    
  forbiddenPatterns \= \[  
    /eval\\s\*\\(/,  
    /Function\\s\*\\(/,  
    /child\_process/,  
    /fs\\.unlink/,  
    /process\\.env\\s\*=/,  
    /\_\_proto\_\_/,  
    /constructor\\s\*\\\[\\s\*\["'\]prototype\["'\]\\s\*\\\]/  
  \];  
    
  async check(skill: Skill): Promise\<RuleResult\> {  
    const code \= skill.compiled?.code || '';  
    const vulnerabilities: Vulnerability\[\] \= \[\];  
      
    for (const pattern of this.forbiddenPatterns) {  
      if (pattern.test(code)) {  
        vulnerabilities.push({  
          severity: 'critical',  
          pattern: pattern.source,  
          line: this.findLine(code, pattern),  
          message: \`Uso proibido de: ${pattern.source}\`  
        });  
      }  
    }  
      
    // Scan de dependências  
    const deps \= skill.compiled?.dependencies || \[\];  
    for (const dep of deps) {  
      const audit \= await this.auditDependency(dep);  
      if (audit.vulnerabilities.length \> 0\) {  
        vulnerabilities.push(...audit.vulnerabilities);  
      }  
    }  
      
    return {  
      rule: this.name,  
      passed: vulnerabilities.length \=== 0,  
      weight: this.weight,  
      severity: vulnerabilities.length \> 0 ? 'error' : 'info',  
      details: vulnerabilities  
    };  
  }  
}  
\`\`\`

\---

\#\#\# 2.5 Módulo: Executor (executor)

\*\*Arquivo:\*\* \`server/modules/skill-fabric/src/core/executor/SkillExecutor.ts\`

\*\*Implementação:\*\*

\`\`\`typescript  
export class SkillExecutor {  
  constructor(  
    private sandbox: Sandbox,  
    private referenceResolver: ReferenceResolver,  
    private cache: CacheManager,  
    private logger: Logger  
  ) {}

  async execute(  
    skillId: string,   
    input: any,   
    context: ExecutionContext  
  ): Promise\<ExecutionResult\> {  
    const skill \= await this.loadSkill(skillId);  
      
    // Check cache  
    const cacheKey \= this.generateCacheKey(skillId, input);  
    if (\!context.skipCache) {  
      const cached \= await this.cache.get(cacheKey);  
      if (cached) return { ...cached, cached: true };  
    }  
      
    // Pre-execution  
    const validatedInput \= this.validateInput(skill, input);  
    const executionContext \= this.buildContext(skill, context);  
      
    // Execute in sandbox  
    const startTime \= Date.now();  
    try {  
      const result \= await this.sandbox.run({  
        code: skill.compiled.code,  
        context: executionContext,  
        timeout: skill.timeout,  
        memory: skill.memory  
      });  
        
      // Post-execution  
      const duration \= Date.now() \- startTime;  
      const output \= this.validateOutput(skill, result);  
        
      // Cache result  
      await this.cache.set(cacheKey, output, skill.cacheConfig);  
        
      // Log execution  
      await this.logExecution(skill, input, output, duration);  
        
      return {  
        success: true,  
        data: output,  
        duration,  
        executionId: context.executionId  
      };  
        
    } catch (error) {  
      // Handle error  
      if (skill.retries \> 0 && this.isRetryable(error)) {  
        return this.retry(skillId, input, context, skill.retries);  
      }  
        
      // Fallback  
      if (skill.fallbackSkillId) {  
        return this.execute(skill.fallbackSkillId, input, context);  
      }  
        
      return {  
        success: false,  
        error: this.sanitizeError(error),  
        duration: Date.now() \- startTime  
      };  
    }  
  }  
    
  private buildContext(skill: Skill, parentContext: ExecutionContext): ExecutionContext {  
    return {  
      ...parentContext,  
      skillId: skill.id,  
      tenantId: skill.tenantId,  
      variables: {  
        input: parentContext.input,  
        config: skill.config,  
        secrets: this.loadSecrets(skill.tenantId)  
      },  
      skills: {  
        execute: (ref: string, params: any) \=\> this.executeReference(ref, params, parentContext)  
      },  
      kg: {  
        query: (cypher: string, params: any) \=\> this.kg.query(cypher, params)  
      },  
      tools: {  
        call: (toolName: string, params: any) \=\> this.callTool(toolName, params)  
      }  
    };  
  }  
}  
\`\`\`

\*\*Sandbox:\*\*

\`\`\`typescript  
export class Sandbox {  
  private vm: NodeVM;  
    
  constructor(config: SandboxConfig) {  
    this.vm \= new NodeVM({  
      timeout: config.timeout,  
      sandbox: config.context,  
      require: {  
        external: config.allowedModules || \[\],  
        builtin: \['path', 'util', 'crypto'\],  
        root: './',  
        mock: this.buildMocks()  
      },  
      compiler: (code: string) \=\> this.compile(code)  
    });  
  }  
    
  async run(options: RunOptions): Promise\<any\> {  
    const script \= new VMScript(options.code, {  
      filename: options.filename || 'skill.js'  
    });  
      
    const fn \= this.vm.run(script);  
      
    if (typeof fn \=== 'function') {  
      return await fn(options.context);  
    }  
      
    return fn;  
  }  
    
  private buildMocks(): Record\<string, any\> {  
    return {  
      fs: {  
        readFile: (path: string) \=\> { throw new Error('fs.readFile blocked'); },  
        writeFile: () \=\> { throw new Error('fs.writeFile blocked'); }  
      },  
      child\_process: new Proxy({}, {  
        get: () \=\> { throw new Error('child\_process blocked'); }  
      })  
    };  
  }  
}  
\`\`\`

\---

\#\#\# 2.6 Módulo: Visual Studio (Frontend)

\*\*Arquivo:\*\* \`client/src/modules/skill-fabric/visual-studio/components/Canvas.tsx\`

\*\*Componentes:\*\*

\`\`\`typescript  
// Canvas principal  
export const Canvas: React.FC\<CanvasProps\> \= ({ skill, onChange }) \=\> {  
  const \[nodes, setNodes\] \= useState\<Node\[\]\>(skill.content.nodes);  
  const \[edges, setEdges\] \= useState\<Edge\[\]\>(skill.content.edges);  
  const \[selectedNode, setSelectedNode\] \= useState\<Node | null\>(null);  
    
  const { dragRef, dropRef, isDragging } \= useDragDrop({  
    onDrop: (item, position) \=\> {  
      const newNode \= createNode(item.type, position);  
      setNodes(\[...nodes, newNode\]);  
    }  
  });  
    
  const onConnect \= (connection: Connection) \=\> {  
    const newEdge \= createEdge(connection);  
    if (validateConnection(newEdge, nodes, edges)) {  
      setEdges(\[...edges, newEdge\]);  
    }  
  };  
    
  const onNodeUpdate \= (nodeId: string, updates: Partial\<Node\>) \=\> {  
    setNodes(nodes.map(n \=\> n.id \=== nodeId ? { ...n, ...updates } : n));  
  };  
    
  const onCompile \= async () \=\> {  
    const compiled \= await compileVisualSkill({ nodes, edges });  
    onChange({ ...skill, content: { nodes, edges }, compiled });  
  };  
    
  return (  
    \<div className="canvas-container" ref={dropRef}\>  
      \<CanvasToolbar onCompile={onCompile} onRun={onRun} /\>  
        
      \<div className="canvas-workspace"\>  
        \<NodePalette ref={dragRef} /\>  
          
        \<ReactFlow  
          nodes={nodes}  
          edges={edges}  
          onNodesChange={setNodes}  
          onEdgesChange={setEdges}  
          onConnect={onConnect}  
          onNodeClick={(\_, node) \=\> setSelectedNode(node)}  
          nodeTypes={customNodeTypes}  
          edgeTypes={customEdgeTypes}  
          fitView  
        \>  
          \<Background /\>  
          \<Controls /\>  
          \<MiniMap /\>  
        \</ReactFlow\>  
          
        {selectedNode && (  
          \<PropertyPanel  
            node={selectedNode}  
            onChange={(updates) \=\> onNodeUpdate(selectedNode.id, updates)}  
            onClose={() \=\> setSelectedNode(null)}  
          /\>  
        )}  
      \</div\>  
    \</div\>  
  );  
};

// Tipos de nós disponíveis  
const nodeTypes \= {  
  trigger: TriggerNode,  
  action: ActionNode,  
  condition: ConditionNode,  
  loop: LoopNode,  
  transform: TransformNode,  
  output: OutputNode  
};  
\`\`\`

\---

\#\#\# 2.7 Módulo: Code IDE (Frontend)

\*\*Arquivo:\*\* \`client/src/modules/skill-fabric/code-ide/components/MonacoEditor.tsx\`

\*\*Implementação:\*\*

\`\`\`typescript  
export const SkillCodeEditor: React.FC\<EditorProps\> \= ({ skill, onChange }) \=\> {  
  const editorRef \= useRef\<monaco.editor.IStandaloneCodeEditor\>();  
  const \[decorations, setDecorations\] \= useState\<string\[\]\>(\[\]);  
    
  // Configurar IntelliSense para referências /xxx/  
  useEffect(() \=\> {  
    if (\!editorRef.current) return;  
      
    const disposable \= monaco.languages.registerCompletionItemProvider(  
      'typescript',  
      {  
        triggerCharacters: \['/'\],  
        provideCompletionItems: async (model, position) \=\> {  
          const lineContent \= model.getLineContent(position.lineNumber);  
          const beforeCursor \= lineContent.substring(0, position.column \- 1);  
            
          if (beforeCursor.match(/\\/(\\w\*)$/)) {  
            const suggestions \= await fetchReferenceSuggestions(  
              beforeCursor,  
              skill.tenantId  
            );  
              
            return {  
              suggestions: suggestions.map(s \=\> ({  
                label: s.fullReference,  
                kind: monaco.languages.CompletionItemKind.Reference,  
                insertText: s.fullReference,  
                detail: s.description,  
                documentation: { value: s.documentation }  
              }))  
            };  
          }  
            
          return { suggestions: \[\] };  
        }  
      }  
    );  
      
    return () \=\> disposable.dispose();  
  }, \[skill.tenantId\]);  
    
  // Real-time validation  
  const onValidate \= async (code: string) \=\> {  
    const markers \= await validateCode(code);  
    monaco.editor.setModelMarkers(  
      editorRef.current\!.getModel()\!,  
      'skill-validator',  
      markers.map(m \=\> ({  
        severity: monaco.MarkerSeverity\[m.severity\],  
        message: m.message,  
        startLineNumber: m.line,  
        startColumn: m.column,  
        endLineNumber: m.endLine || m.line,  
        endColumn: m.endColumn || m.column \+ 1  
      }))  
    );  
  };  
    
  return (  
    \<div className="code-editor-container"\>  
      \<EditorToolbar  
        onRun={() \=\> executeSkill(skill.id, editorRef.current\!.getValue())}  
        onDebug={() \=\> startDebugger(skill.id)}  
        onFormat={() \=\> formatCode(editorRef.current\!)}  
      /\>  
        
      \<MonacoEditor  
        height="100%"  
        language="typescript"  
        value={skill.content.sourceCode}  
        onChange={onChange}  
        onMount={(editor) \=\> {  
          editorRef.current \= editor;  
          configureSkillEditor(editor);  
        }}  
        options={{  
          minimap: { enabled: true },  
          folding: true,  
          automaticLayout: true,  
          suggestOnTriggerCharacters: true,  
          quickSuggestions: true  
        }}  
      /\>  
        
      \<ValidationPanel markers={decorations} /\>  
    \</div\>  
  );  
};  
\`\`\`

\---

\#\#\# 2.8 Módulo: Referências (reference)

\*\*Arquivo:\*\* \`client/src/shared/utils/referenceParser.ts\`

\*\*Parser:\*\*

\`\`\`typescript  
export class ReferenceParser {  
  // Padrão: /type:namespace/path?query  
  private static readonly PATTERN \=   
    /\\/(skill|kg|file|data|var|tool|agent)(?::(system|tenant|company|user))?\\/(\[a-zA-Z0-9\_\\/\\.\\-:\]+)(?:\\?(\[^\\s\]+))?/g;  
    
  parse(text: string): Reference\[\] {  
    const refs: Reference\[\] \= \[\];  
    let match;  
      
    while ((match \= ReferenceParser.PATTERN.exec(text)) \!== null) {  
      const \[fullMatch, type, namespace, path, queryString\] \= match;  
        
      refs.push({  
        type: type as ReferenceType,  
        namespace: namespace as ReferenceNamespace,  
        path,  
        queryParams: queryString ? parseQueryString(queryString) : undefined,  
        fullMatch,  
        position: {  
          start: match.index,  
          end: match.index \+ fullMatch.length  
        }  
      });  
    }  
      
    return refs;  
  }  
    
  async resolveReferences(  
    refs: Reference\[\],   
    context: ResolutionContext  
  ): Promise\<ResolvedReference\[\]\> {  
    return Promise.all(refs.map(ref \=\> this.resolve(ref, context)));  
  }  
    
  private async resolve(ref: Reference, context: ResolutionContext): Promise\<ResolvedReference\> {  
    const resolvers: Record\<ReferenceType, Resolver\> \= {  
      skill: new SkillResolver(),  
      kg: new KGResolver(),  
      file: new FileResolver(),  
      data: new DataResolver(),  
      var: new VariableResolver(),  
      tool: new ToolResolver(),  
      agent: new AgentResolver()  
    };  
      
    const resolver \= resolvers\[ref.type\];  
    const value \= await resolver.resolve(ref, context);  
      
    return {  
      ...ref,  
      resolved: true,  
      value,  
      metadata: await resolver.getMetadata(ref)  
    };  
  }  
}  
\`\`\`

\---

\#\# 3\. COMANDOS DE IMPLEMENTAÇÃO PARA CLAUDE CODE

\#\#\# 3.1 Setup Inicial

\`\`\`bash  
\# Criar estrutura de diretórios  
mkdir \-p server/modules/skill-fabric/src/{api/{routes,controllers},core/{skill,compiler,validator,executor,lifecycle},types}  
mkdir \-p client/src/modules/skill-fabric/{visual-studio/{components,hooks},code-ide/{components,templates},markdown-studio/{components,parser},shared/{components,utils}}

\# Instalar dependências backend  
cd server/modules/skill-fabric  
npm init \-y  
npm install typescript @types/node ts-node express zod uuid vm2 antlr4ts  
npm install \-D jest @types/jest supertest

\# Instalar dependências frontend  
cd ../../../client  
npm install @monaco-editor/react react-flow-renderer @types/react-flow-renderer  
npm install antlr4ts antlr4ts-cli

\# Gerar parser ANTLR  
npx antlr4ts \-visitor \-listener server/modules/skill-fabric/src/core/compiler/grammar/SkillLexer.g4  
npx antlr4ts \-visitor \-listener server/modules/skill-fabric/src/core/compiler/grammar/SkillParser.g4  
\`\`\`

\#\#\# 3.2 Implementação por Fase

\*\*Fase 1: Core API e Entity\*\*  
\`\`\`bash  
\# Gerar arquivos base  
claude generate server/modules/skill-fabric/src/core/skill/Skill.entity.ts  
claude generate server/modules/skill-fabric/src/core/skill/Skill.repository.ts  
claude generate server/modules/skill-fabric/src/api/routes/skills.routes.ts  
claude generate server/modules/skill-fabric/src/api/controllers/skills.controller.ts  
\`\`\`

\*\*Fase 2: Compiladores\*\*  
\`\`\`bash  
claude generate server/modules/skill-fabric/src/core/compiler/VisualCompiler.ts  
claude generate server/modules/skill-fabric/src/core/compiler/CodeCompiler.ts  
claude generate server/modules/skill-fabric/src/core/compiler/MarkdownCompiler.ts  
\`\`\`

\*\*Fase 3: Validador\*\*  
\`\`\`bash  
claude generate server/modules/skill-fabric/src/core/validator/ValidationPipeline.ts  
claude generate server/modules/skill-fabric/src/core/validator/rules/SyntaxRule.ts  
claude generate server/modules/skill-fabric/src/core/validator/rules/SecurityRule.ts  
\`\`\`

\*\*Fase 4: Executor\*\*  
\`\`\`bash  
claude generate server/modules/skill-fabric/src/core/executor/SkillExecutor.ts  
claude generate server/modules/skill-fabric/src/core/executor/Sandbox.ts  
claude generate server/modules/skill-fabric/src/core/executor/ReferenceResolver.ts  
\`\`\`

\*\*Fase 5: Frontend Visual\*\*  
\`\`\`bash  
claude generate client/src/modules/skill-fabric/visual-studio/components/Canvas.tsx  
claude generate client/src/modules/skill-fabric/visual-studio/components/NodePalette.tsx  
claude generate client/src/modules/skill-fabric/visual-studio/hooks/useDragDrop.ts  
\`\`\`

\*\*Fase 6: Frontend Code\*\*  
\`\`\`bash  
claude generate client/src/modules/skill-fabric/code-ide/components/MonacoEditor.tsx  
claude generate client/src/modules/skill-fabric/code-ide/components/IntelliSenseProvider.ts  
claude generate client/src/modules/skill-fabric/code-ide/templates/skill-template.ts  
\`\`\`

\---

\#\# 4\. TESTES

\#\#\# 4.1 Estrutura de Testes

\`\`\`  
tests/  
├── unit/  
│   ├── skill.entity.test.ts  
│   ├── visual-compiler.test.ts  
│   ├── code-compiler.test.ts  
│   ├── markdown-compiler.test.ts  
│   ├── validation-pipeline.test.ts  
│   └── skill-executor.test.ts  
├── integration/  
│   ├── api.test.ts  
│   ├── compile-execute.test.ts  
│   └── reference-resolution.test.ts  
└── e2e/  
    ├── create-skill-flow.test.ts  
    ├── visual-editor.test.ts  
    └── marketplace.test.ts  
\`\`\`

\#\#\# 4.2 Exemplo de Teste

\`\`\`typescript  
// tests/unit/skill.entity.test.ts  
describe('Skill Entity', () \=\> {  
  it('should create skill with valid props', () \=\> {  
    const skill \= new Skill({  
      name: 'Test Skill',  
      slug: 'test\_skill',  
      type: 'code',  
      content: { sourceCode: 'export default () \=\> {}' },  
      tenantId: 1  
    });  
      
    expect(skill.id).toBeDefined();  
    expect(skill.status).toBe('draft');  
    expect(skill.version).toBe('0.0.1');  
  });  
    
  it('should validate slug format', () \=\> {  
    expect(() \=\> new Skill({ slug: 'invalid slug' })).toThrow();  
    expect(() \=\> new Skill({ slug: 'valid\_slug' })).not.toThrow();  
  });  
    
  it('should compile skill', async () \=\> {  
    const skill \= createTestSkill('code');  
    const compiled \= await skill.compile();  
      
    expect(compiled.code).toBeDefined();  
    expect(compiled.ast).toBeDefined();  
    expect(compiled.dependencies).toBeInstanceOf(Array);  
  });  
});  
\`\`\`

\---

\#\# 5\. MIGRAÇÃO E DEPLOY

\#\#\# 5.1 Migração de Dados

\`\`\`typescript  
// scripts/migrate-skills.ts  
export async function migrateLegacySkills() {  
  const legacySkills \= await db.query('SELECT \* FROM old\_automations');  
    
  for (const old of legacySkills) {  
    const skill \= new Skill({  
      name: old.name,  
      slug: generateSlug(old.name),  
      type: inferType(old),  
      content: convertContent(old),  
      tenantId: old.tenant\_id,  
      status: 'production'  
    });  
      
    await skillRepo.save(skill);  
  }  
}  
\`\`\`

\#\#\# 5.2 Feature Flags

\`\`\`typescript  
// Configuração gradual  
const featureFlags \= {  
  'skill-fabric.enabled': true,  
  'skill-fabric.visual-editor': true,  
  'skill-fabric.code-ide': true,  
  'skill-fabric.markdown-studio': false, // Beta  
  'skill-fabric.marketplace': false      // Próxima release  
};  
\`\`\`

\---

\*\*Fim do Plano Técnico\*\*  
\`\`\`

\---

Este plano técnico está pronto para gerar comandos no Claude Code. Ele contém:

✅ \*\*Estrutura de diretórios\*\* completa    
✅ \*\*Funções e métodos\*\* detalhados para cada módulo    
✅ \*\*Interfaces e tipos\*\* TypeScript    
✅ \*\*Comandos de implementação\*\* por fase    
✅ \*\*Testes\*\* estruturados  

\*\*Para usar no Claude Code:\*\*  
\`\`\`bash  
\# Exemplo de comando  
claude generate server/modules/skill-fabric/src/core/skill/Skill.entity.ts \--spec "Plano Técnico Skill Fabric v1.0"  
\`\`\`

Quer que eu gere comandos específicos para algum módulo ou adicione mais detalhes de implementação?  
