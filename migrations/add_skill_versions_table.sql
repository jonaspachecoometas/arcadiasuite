-- Migration: Add skill_versions table for Git-like versioning
-- Phase 2.4: Versionamento Git-like de skills

CREATE TABLE IF NOT EXISTS skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES arcadia_skills(id) ON DELETE CASCADE,
  sha VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Índices
  UNIQUE(skill_id, sha),
  INDEX skill_versions_skill_id (skill_id),
  INDEX skill_versions_created_at (created_at)
);

-- Trigger para criar versão inicial ao criar skill (opcional)
-- CREATE OR REPLACE FUNCTION create_initial_skill_version()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO skill_versions (skill_id, sha, message, author, content)
--   VALUES (
--     NEW.id,
--     encode(digest(NEW.id || NEW.content::text, 'sha256'), 'hex'),
--     'Initial version',
--     'system',
--     NEW.content
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER skill_initial_version AFTER INSERT ON arcadia_skills
-- FOR EACH ROW EXECUTE FUNCTION create_initial_skill_version();
