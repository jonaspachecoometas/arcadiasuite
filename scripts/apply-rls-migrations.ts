#!/usr/bin/env tsx
/**
 * Script para aplicar migrações RLS (Row Level Security)
 * 
 * Uso:
 *   npm run db:apply-rls
 *   ou
 *   npx tsx scripts/apply-rls-migrations.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Migrações na ordem correta
const MIGRATIONS = [
  '001_enable_rls.sql',
  '002_create_policies.sql',
  '003_tenant_context.sql',
];

async function applyMigration(pool: pg.Pool, filename: string): Promise<void> {
  const filepath = join(__dirname, '..', 'migrations', filename);
  const sql = readFileSync(filepath, 'utf-8');
  
  console.log(`\n📄 Aplicando: ${filename}`);
  console.log('='.repeat(50));
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Divide o SQL em statements individuais (separados por ;)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
        process.stdout.write('.');
      } catch (err) {
        console.error(`\n❌ Erro no statement ${i + 1}:`);
        console.error(err.message);
        // Alguns erros são esperados (ex: DROP IF NOT EXISTS)
        if (!err.message.includes('does not exist')) {
          throw err;
        }
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ ${filename} aplicado com sucesso!`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function verifyRLS(pool: pg.Pool): Promise<void> {
  console.log('\n🔍 Verificando tabelas com RLS habilitado...\n');
  
  const result = await pool.query(`
    SELECT 
      schemaname,
      tablename,
      rowsecurity as rls_enabled
    FROM pg_tables
    JOIN pg_class ON pg_class.relname = pg_tables.tablename
    WHERE schemaname = 'public'
      AND rowsecurity = true
    ORDER BY tablename;
  `);
  
  console.log(`✓ ${result.rows.length} tabelas com RLS habilitado:\n`);
  result.rows.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.tablename}`);
  });
}

async function verifyPolicies(pool: pg.Pool): Promise<void> {
  console.log('\n📋 Verificando políticas criadas...\n');
  
  const result = await pool.query(`
    SELECT 
      tablename,
      policyname,
      permissive,
      roles,
      cmd as operation,
      qual as condition
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  
  console.log(`✓ ${result.rows.length} políticas criadas\n`);
  
  // Agrupa por tabela
  const byTable: Record<string, string[]> = {};
  result.rows.forEach(row => {
    if (!byTable[row.tablename]) {
      byTable[row.tablename] = [];
    }
    byTable[row.tablename].push(`${row.operation}`);
  });
  
  Object.entries(byTable).forEach(([table, ops]) => {
    console.log(`  • ${table}: ${ops.join(', ')}`);
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurado!');
    console.error('Exemplo: export DATABASE_URL="postgresql://user:pass@localhost:5432/arcadia"');
    process.exit(1);
  }
  
  console.log('🚀 Iniciando aplicação das migrações RLS...');
  console.log(`🔗 Database: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });
  
  try {
    // Testa conexão
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco estabelecida\n');
    
    // Aplica cada migração
    for (const migration of MIGRATIONS) {
      await applyMigration(pool, migration);
    }
    
    // Verificações finais
    await verifyRLS(pool);
    await verifyPolicies(pool);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Todas as migrações aplicadas com sucesso!');
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('\n❌ Erro ao aplicar migrações:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
