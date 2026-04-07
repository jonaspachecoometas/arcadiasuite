#!/usr/bin/env python3
"""
MetaSet - Serviço Apache Superset integrado ao Arcadia Kernel
Porta: 8100 (interna)
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime

# Configurar logging para stdout (capturado pelo Kernel)
logging.basicConfig(
    level=logging.INFO,
    format='[MetaSet] %(levelname)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def setup_environment():
    """Configurar variáveis de ambiente"""
    base_dir = Path(__file__).parent.absolute()
    
    os.environ.setdefault('SUPERSET_HOME', str(base_dir / 'superset_home'))
    os.environ.setdefault('PYTHONPATH', str(base_dir))
    
    (base_dir / 'superset_home').mkdir(exist_ok=True)
    (base_dir / 'superset_home' / 'uploads').mkdir(exist_ok=True)
    
    return base_dir

def parse_arguments():
    """Parsear argumentos da linha de comando"""
    parser = argparse.ArgumentParser(description='MetaSet BI Service')
    parser.add_argument('--port', type=int, default=8100, help='Porta do serviço')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host do serviço')
    parser.add_argument('--workers', type=int, default=4, help='Número de workers')
    return parser.parse_args()

def create_app():
    """Criar aplicação Flask do Superset"""
    try:
        from superset import create_app as create_superset_app
        app = create_superset_app()
    except ImportError:
        logger.error("Apache Superset não instalado. Rode: pip install apache-superset")
        sys.exit(1)
    
    @app.route('/health')
    def health_check():
        return {
            'status': 'healthy',
            'service': 'metaset',
            'version': app.config.get('VERSION_STRING', '4.1.0-arcadia'),
            'timestamp': datetime.now().isoformat()
        }, 200
    
    @app.route('/info')
    def service_info():
        return {
            'name': 'MetaSet',
            'description': 'Business Intelligence by ArcadiaSuite',
            'port': args.port,
            'features': ['sql_lab', 'dashboards', 'charts', 'rls']
        }
    
    @app.route('/static/assets/images/branding/metaset-logo-horiz.png')
    def serve_logo():
        from flask import send_file
        return send_file('/app/superset/static/assets/images/superset-logo-horiz.png', mimetype='image/png')
    
    return app

def main():
    """Entry point principal"""
    global args
    
    args = parse_arguments()
    base_dir = setup_environment()
    
    logger.info(f"Iniciando MetaSet em {args.host}:{args.port}")
    logger.info(f"Diretório base: {base_dir}")
    
    try:
        from gunicorn.app.base import BaseApplication
    except ImportError:
        logger.error("Gunicorn não instalado. Rode: pip install gunicorn")
        sys.exit(1)
    
    class MetaSetApplication(BaseApplication):
        def __init__(self, app, options=None):
            self.options = options or {}
            self.application = app
            super().__init__()
        
        def load_config(self):
            for key, value in self.options.items():
                if key in self.cfg.settings and value is not None:
                    self.cfg.set(key.lower(), value)
        
        def load(self):
            return self.application
    
    app = create_app()
    
    options = {
        'bind': f'{args.host}:{args.port}',
        'workers': args.workers,
        'worker_class': 'gthread',
        'threads': 4,
        'timeout': 120,
        'keepalive': 5,
        'max_requests': 1000,
        'max_requests_jitter': 50,
        'accesslog': '-',
        'errorlog': '-',
        'loglevel': 'info',
        'preload_app': True,
    }
    
    MetaSetApplication(app, options).run()

if __name__ == '__main__':
    main()
