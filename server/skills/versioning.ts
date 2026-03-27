import crypto from 'crypto';
import { db } from '../../db/index';
import { Skill } from './engine';

export interface SkillVersion {
  id: string;
  skillId: string;
  sha: string;
  message: string;
  author: string;
  timestamp: Date;
  content: any;
}

export class VersionManager {
  async createVersion(skillId: string, message: string, author: string, content: any): Promise<SkillVersion> {
    const sha = this.generateSha(skillId, content);

    const version = await db.insertInto('skill_versions').values({
      skill_id: skillId,
      sha,
      message,
      author,
      content: JSON.stringify(content),
      created_at: new Date()
    }).returning('*').executeTakeFirst();

    return this.mapVersion(version);
  }

  async listVersions(skillId: string, limit = 20, offset = 0): Promise<SkillVersion[]> {
    const versions = await db
      .selectFrom('skill_versions')
      .where('skill_id', '=', skillId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .selectAll()
      .execute();

    return versions.map(v => this.mapVersion(v));
  }

  async getVersion(skillId: string, sha: string): Promise<SkillVersion | null> {
    const version = await db
      .selectFrom('skill_versions')
      .where('skill_id', '=', skillId)
      .where('sha', '=', sha)
      .selectAll()
      .executeTakeFirst();

    return version ? this.mapVersion(version) : null;
  }

  async rollbackToVersion(skillId: string, versionSha: string, author: string): Promise<Skill> {
    const version = await this.getVersion(skillId, versionSha);
    if (!version) throw new Error(`Version ${versionSha} not found`);

    const content = JSON.parse(version.content);

    // Update main skill table
    await db
      .updateTable('arcadia_skills')
      .set({
        content: JSON.stringify(content),
        updated_at: new Date()
      })
      .where('id', '=', skillId)
      .execute();

    // Create rollback version
    await this.createVersion(skillId, `Rollback to ${versionSha.slice(0, 7)}`, author, content);

    return { id: skillId, ...content } as any;
  }

  async fork(skillId: string, newSlug: string, author: string): Promise<Skill> {
    const original = await db
      .selectFrom('arcadia_skills')
      .where('id', '=', skillId)
      .selectAll()
      .executeTakeFirst();

    if (!original) throw new Error(`Skill ${skillId} not found`);

    const newId = crypto.randomUUID();
    const content = JSON.parse(original.content);

    const forked = await db
      .insertInto('arcadia_skills')
      .values({
        id: newId,
        slug: newSlug,
        name: `${original.name} (fork)`,
        description: `Fork of ${original.slug}`,
        type: original.type,
        content: JSON.stringify(content),
        tenant_id: original.tenant_id,
        status: 'draft',
        created_at: new Date()
      })
      .returning('*')
      .executeTakeFirst();

    // Create initial version
    await this.createVersion(newId, `Forked from ${original.slug}`, author, content);

    return { id: newId, ...content } as any;
  }

  async diffVersions(skillId: string, sha1: string, sha2: string): Promise<any> {
    const v1 = await this.getVersion(skillId, sha1);
    const v2 = await this.getVersion(skillId, sha2);

    if (!v1 || !v2) throw new Error('One or both versions not found');

    const content1 = JSON.parse(v1.content);
    const content2 = JSON.parse(v2.content);

    return {
      from: { sha: sha1, timestamp: v1.timestamp },
      to: { sha: sha2, timestamp: v2.timestamp },
      changes: this.computeDiff(content1, content2)
    };
  }

  private generateSha(skillId: string, content: any): string {
    const str = `${skillId}${JSON.stringify(content)}${Date.now()}`;
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  private computeDiff(obj1: any, obj2: any): Record<string, any> {
    const diff: Record<string, any> = {};

    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    for (const key of allKeys) {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        diff[key] = { before: obj1[key], after: obj2[key] };
      }
    }

    return diff;
  }

  private mapVersion(row: any): SkillVersion {
    return {
      id: row.id,
      skillId: row.skill_id,
      sha: row.sha,
      message: row.message,
      author: row.author,
      timestamp: row.created_at,
      content: JSON.parse(row.content)
    };
  }
}
