/**
 * AudioTheatre — Config Validators
 * Validation du schéma config.json au démarrage
 */

/**
 * Valide un objet config chargé depuis config.json
 * @param {unknown} config - L'objet brut parsé depuis JSON
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    errors.push('config.json doit être un objet JSON valide');
    return { valid: false, errors };
  }

  if (config.version !== undefined &&
      (!Number.isInteger(config.version) || config.version < 1)) {
    errors.push('"version" doit être un entier positif (ex: 1)');
  }

  if (!Array.isArray(config.cues)) {
    errors.push('La propriété "cues" doit être un tableau');
    return { valid: false, errors };
  }

  config.cues.forEach((cue, index) => {
    if (!cue || typeof cue !== 'object') {
      errors.push(`cues[${index}]: doit être un objet`);
      return;
    }
    if (typeof cue.id !== 'string' || cue.id.trim() === '') {
      errors.push(`cues[${index}]: "id" est requis (string non vide)`);
    }
    if (cue.type !== 'audio' && cue.type !== 'scene') {
      errors.push(`cues[${index}]: "type" doit être "audio" ou "scene" (reçu: ${cue.type})`);
    }
    if (typeof cue.title !== 'string' || cue.title.trim() === '') {
      errors.push(`cues[${index}]: "title" est requis (string non vide)`);
    }
    if (cue.type === 'audio' && cue.audioFile !== undefined && typeof cue.audioFile !== 'string') {
      errors.push(`cues[${index}]: "audioFile" doit être une string`);
    }
    if (cue.trimStart !== undefined && (typeof cue.trimStart !== 'number' || cue.trimStart < 0)) {
      errors.push(`cues[${index}]: "trimStart" doit être un nombre positif`);
    }
    if (cue.trimEnd !== undefined && (typeof cue.trimEnd !== 'number' || cue.trimEnd < 0)) {
      errors.push(`cues[${index}]: "trimEnd" doit être un nombre positif`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Retourne un message d'erreur lisible depuis une liste d'erreurs de validation
 */
export function formatValidationErrors(errors) {
  return `config.json invalide :\n${errors.map(e => `• ${e}`).join('\n')}`;
}
