"""
ArcadiaSecurityManager - Integração Superset com Arcadia Kernel
"""

from superset.security import SupersetSecurityManager
from flask import g, request, current_app
from sqlalchemy import text
import jwt
import logging

logger = logging.getLogger(__name__)

class ArcadiaSecurityManager(SupersetSecurityManager):
    """
    Security Manager integrado ao Arcadia Kernel
    - Extrai tenant e usuário do token JWT
    - Aplica RLS automaticamente
    - Sincroniza roles com ArcadiaSuite
    """
    
    ROLE_MAPPING = {
        'superadmin': 'Admin',
        'admin': 'Alpha',
        'analyst': 'Gamma',
        'viewer': 'Public',
    }
    
    def before_request(self):
        """Executado antes de cada requisição"""
        # Primeiro, executar o comportamento padrão do Superset
        super().before_request()
        
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return
            
        token = auth_header.replace('Bearer ', '')
        
        try:
            payload = jwt.decode(
                token, 
                current_app.config.get('SECRET_KEY', 'default-key'), 
                algorithms=['HS256']
            )
            
            g.tenant_id = payload.get('tenant_id')
            g.user_id = payload.get('sub')
            g.user_role = payload.get('role', 'viewer')
            g.user_email = payload.get('email')
            
            if g.tenant_id:
                try:
                    from superset import db
                    db.session.execute(
                        text(f"SET LOCAL app.current_tenant = {g.tenant_id}")
                    )
                except Exception as e:
                    logger.warning(f"Erro ao aplicar RLS: {e}")
                    
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expirado")
        except jwt.InvalidTokenError:
            logger.warning("JWT token inválido")
        except Exception as e:
            logger.warning(f"Erro ao processar JWT: {e}")
    
    def can_access_datasource(self, datasource):
        """Verificar acesso ao datasource baseado no tenant"""
        tenant_id = getattr(g, 'tenant_id', None)
        if not tenant_id:
            return super().can_access_datasource(datasource)
            
        ds_tenant = getattr(datasource, 'tenant_id', None)
        if ds_tenant and str(ds_tenant) != str(tenant_id):
            return False
            
        return True
    
    def get_user_roles(self, user):
        """Retornar roles mapeadas do Arcadia"""
        arcadia_role = getattr(g, 'user_role', None)
        if arcadia_role:
            superset_role = self.ROLE_MAPPING.get(arcadia_role, 'Gamma')
            return [superset_role]
        return super().get_user_roles(user)
    
    def is_admin(self):
        """Verificar se usuário é admin no Arcadia"""
        arcadia_role = getattr(g, 'user_role', None)
        if arcadia_role:
            return arcadia_role in ['superadmin', 'admin']
        return super().is_admin()
