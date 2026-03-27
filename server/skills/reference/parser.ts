// server/skills/reference/parser.ts
// Parser de referências /tipo/caminho usadas no corpo das skills

export type ReferenceType = 'skill' | 'kg' | 'file' | 'data' | 'var' | 'tool' | 'agent';
export type ReferenceNamespace = 'system' | 'tenant' | 'company' | 'user';

export interface Reference {
  type: ReferenceType;
  namespace?: ReferenceNamespace;
  path: string;
  queryParams?: Record<string, string>;
  fullMatch: string;
}

// Padrão: /skill/slug, /skill:system/slug, /kg/entidade:id/campo?param=val
const PATTERN =
  /\/(skill|kg|file|data|var|tool|agent)(?::(system|tenant|company|user))?\/([a-zA-Z0-9_\-./:%]+)(?:\?([^\s`"']+))?/g;

export class ReferenceParser {
  parse(text: string): Reference[] {
    const refs: Reference[] = [];
    let match: RegExpExecArray | null;
    PATTERN.lastIndex = 0;

    while ((match = PATTERN.exec(text)) !== null) {
      const [fullMatch, type, namespace, path, queryString] = match;
      refs.push({
        type: type as ReferenceType,
        namespace: namespace as ReferenceNamespace | undefined,
        path,
        queryParams: queryString ? parseQS(queryString) : undefined,
        fullMatch,
      });
    }

    return refs;
  }

  /** Extrai apenas os slugs de dependências /skill/... do corpo */
  extractSkillDeps(text: string): string[] {
    return this.parse(text)
      .filter((r) => r.type === 'skill')
      .map((r) => (r.namespace ? `${r.namespace}/${r.path}` : r.path));
  }
}

function parseQS(qs: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(qs));
}

export const referenceParser = new ReferenceParser();
