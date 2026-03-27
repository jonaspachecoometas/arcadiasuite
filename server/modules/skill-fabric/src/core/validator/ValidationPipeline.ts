// server/modules/skill-fabric/src/core/validator/ValidationPipeline.ts
// Validates skill data before persist — schema, slug format, version, etc.

import type { CreateSkillFabricDto, UpdateSkillFabricDto, ValidationResult, ValidationError, ValidationWarning } from "../../types";

export class ValidationPipeline {
  /** Validate a new skill DTO */
  validateCreate(dto: CreateSkillFabricDto): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Name
    if (!dto.name || dto.name.trim().length === 0) {
      errors.push({ field: "name", message: "Nome é obrigatório", code: "REQUIRED" });
    } else if (dto.name.length > 255) {
      errors.push({ field: "name", message: "Nome deve ter no máximo 255 caracteres", code: "MAX_LENGTH" });
    }

    // Slug
    if (!dto.slug || dto.slug.trim().length === 0) {
      errors.push({ field: "slug", message: "Slug é obrigatório", code: "REQUIRED" });
    } else {
      if (!/^[a-z0-9-_]+$/.test(dto.slug)) {
        errors.push({ field: "slug", message: "Slug deve conter apenas letras minúsculas, números, hífens e underscores", code: "INVALID_FORMAT" });
      }
      if (dto.slug.length > 255) {
        errors.push({ field: "slug", message: "Slug deve ter no máximo 255 caracteres", code: "MAX_LENGTH" });
      }
    }

    // Mode
    const validModes = ["code", "markdown", "visual"];
    if (!dto.mode || !validModes.includes(dto.mode)) {
      errors.push({ field: "mode", message: `Modo deve ser um de: ${validModes.join(", ")}`, code: "INVALID_VALUE" });
    }

    // Source
    if (!dto.source || dto.source.trim().length === 0) {
      errors.push({ field: "source", message: "Source (corpo da skill) é obrigatório", code: "REQUIRED" });
    }

    // Version format (semver-like)
    if (dto.version && !/^\d+\.\d+\.\d+$/.test(dto.version)) {
      errors.push({ field: "version", message: "Versão deve seguir o formato semver (ex: 1.0.0)", code: "INVALID_FORMAT" });
    }

    // Namespace
    const validNamespaces = ["system", "tenant", "company", "user"];
    if (dto.namespace && !validNamespaces.includes(dto.namespace)) {
      warnings.push({ field: "namespace", message: `Namespace '${dto.namespace}' não é padrão. Use: ${validNamespaces.join(", ")}` });
    }

    // Tags
    if (dto.tags && dto.tags.length > 20) {
      warnings.push({ field: "tags", message: "Muitas tags (>20) — considere usar menos para melhor organização" });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /** Validate an update DTO — all fields are optional */
  validateUpdate(dto: UpdateSkillFabricDto): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        errors.push({ field: "name", message: "Nome não pode ser vazio", code: "EMPTY" });
      } else if (dto.name.length > 255) {
        errors.push({ field: "name", message: "Nome deve ter no máximo 255 caracteres", code: "MAX_LENGTH" });
      }
    }

    if (dto.mode !== undefined) {
      const validModes = ["code", "markdown", "visual"];
      if (!validModes.includes(dto.mode)) {
        errors.push({ field: "mode", message: `Modo deve ser um de: ${validModes.join(", ")}`, code: "INVALID_VALUE" });
      }
    }

    if (dto.version !== undefined && !/^\d+\.\d+\.\d+$/.test(dto.version)) {
      errors.push({ field: "version", message: "Versão deve seguir o formato semver (ex: 1.0.0)", code: "INVALID_FORMAT" });
    }

    if (dto.source !== undefined && dto.source.trim().length === 0) {
      errors.push({ field: "source", message: "Source não pode ser vazio", code: "EMPTY" });
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

export const validationPipeline = new ValidationPipeline();
