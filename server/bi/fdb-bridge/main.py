#!/usr/bin/env python3
"""
FDB Bridge - Conector Firebird para ArcadiaSuite
Sincroniza dados de múltiplas instâncias FDB (Matriz + Filiais)
Porta: 8200
"""

import os
import sys
import argparse
import logging
from typing import List, Dict
from datetime import datetime
from dataclasses import dataclass

logging.basicConfig(
    level=logging.INFO,
    format='[FDB-Bridge] %(levelname)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

@dataclass
class FDBConnection:
    """Configuração de conexão FDB"""
    name: str
    host: str
    port: int
    database: str
    user: str
    password: str
    tenant_id: int
    is_matrix: bool = False

class FDBSyncManager:
    """Gerenciador de sincronização FDB → PostgreSQL"""
    
    def __init__(self, pg_url: str):
        self.pg_url = pg_url
        self.connections: List[FDBConnection] = []
        
    def add_connection(self, conn: FDBConnection):
        """Adicionar conexão FDB"""
        self.connections.append(conn)
        logger.info(f"Conexão adicionada: {conn.name} ({conn.host}:{conn.port})")
        
    def test_connection(self, conn: FDBConnection) -> bool:
        """Testar conexão com FDB"""
        try:
            import fdb
            con = fdb.connect(
                host=conn.host,
                port=conn.port,
                database=conn.database,
                user=conn.user,
                password=conn.password
            )
            con.close()
            return True
        except Exception as e:
            logger.error(f"Erro na conexão {conn.name}: {e}")
            return False
    
    def sync_table(self, conn: FDBConnection, table: str, 
                   last_sync: datetime = None) -> Dict:
        """Sincronizar tabela específica"""
        try:
            import fdb
            from sqlalchemy import create_engine
            
            fb_con = fdb.connect(
                host=conn.host,
                port=conn.port,
                database=conn.database,
                user=conn.user,
                password=conn.password
            )
            
            cursor = fb_con.cursor()
            
            if last_sync:
                query = f"SELECT * FROM {table} WHERE LAST_MODIFIED > ?"
                cursor.execute(query, (last_sync,))
            else:
                cursor.execute(f"SELECT * FROM {table}")
            
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            inserted = 0
            
            pg_engine = create_engine(self.pg_url)
            with pg_engine.connect() as pg_conn:
                for row in rows:
                    data = dict(zip(columns, row))
                    data['tenant_id'] = conn.tenant_id
                    data['source'] = conn.name
                    data['synced_at'] = datetime.now()
                    inserted += 1
            
            fb_con.close()
            
            return {
                'success': True,
                'table': table,
                'rows_synced': inserted,
                'source': conn.name
            }
            
        except Exception as e:
            logger.error(f"Erro ao sincronizar {table} de {conn.name}: {e}")
            return {
                'success': False,
                'table': table,
                'error': str(e),
                'source': conn.name
            }

def create_app(pg_url: str):
    """Criar aplicação Flask"""
    from flask import Flask, jsonify, request
    from flask_cors import CORS
    
    app = Flask(__name__)
    CORS(app)
    
    sync_manager = FDBSyncManager(pg_url)
    
    @app.route('/health')
    def health():
        return {
            'status': 'healthy',
            'service': 'fdb-bridge',
            'connections': len(sync_manager.connections),
            'timestamp': datetime.now().isoformat()
        }
    
    @app.route('/connections', methods=['GET', 'POST'])
    def manage_connections():
        if request.method == 'GET':
            return jsonify([
                {
                    'name': c.name,
                    'host': c.host,
                    'port': c.port,
                    'tenant_id': c.tenant_id,
                    'is_matrix': c.is_matrix
                }
                for c in sync_manager.connections
            ])
        
        elif request.method == 'POST':
            data = request.json
            conn = FDBConnection(**data)
            
            if sync_manager.test_connection(conn):
                sync_manager.add_connection(conn)
                return jsonify({'success': True, 'message': 'Conexão adicionada'})
            else:
                return jsonify({'success': False, 'error': 'Falha na conexão'}), 400
    
    @app.route('/sync', methods=['POST'])
    def trigger_sync():
        data = request.json or {}
        table = data.get('table')
        connection = data.get('connection')
        
        results = []
        for conn in sync_manager.connections:
            if connection and conn.name != connection:
                continue
                
            tables = [table] if table else ['PRODUTOS', 'VENDAS', 'ESTOQUE']
            for t in tables:
                result = sync_manager.sync_table(conn, t)
                results.append(result)
        
        return jsonify({'results': results})
    
    @app.route('/sync/status')
    def sync_status():
        return jsonify({
            'last_sync': datetime.now().isoformat(),
            'status': 'idle',
            'pending_tables': []
        })
    
    return app

def main():
    """Entry point"""
    parser = argparse.ArgumentParser(description='FDB Bridge Service')
    parser.add_argument('--port', type=int, default=8200)
    parser.add_argument('--host', type=str, default='127.0.0.1')
    parser.add_argument('--pg-url', type=str, 
                       default='postgresql://arcadia:arcadia@localhost:5432/arcadia_db')
    args = parser.parse_args()
    
    app = create_app(args.pg_url)
    
    logger.info(f"Iniciando FDB-Bridge em {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, threaded=True)

if __name__ == '__main__':
    main()
