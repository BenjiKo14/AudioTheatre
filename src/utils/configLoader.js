/**
 * AudioTheatre — Config Loader
 * Lecture / écriture de config.json via @tauri-apps/plugin-fs
 * Import CSV via importFromCSV()
 *
 * IMPORTANT : ce module est le SEUL point d'accès à Tauri FS.
 * Aucun composant ne doit appeler Tauri directement.
 */

import { validateConfig, formatValidationErrors } from './validators';

const CONFIG_FILENAME = 'config.json';

/**
 * Lit et valide config.json depuis le répertoire de l'application.
 * @returns {Promise<{ cues: Cue[], version: number }>}
 * @throws {Error} Si le fichier est invalide (NOT_FOUND → retourne cues:[])
 */
export async function readConfig(filePath) {
  const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');

  const path = filePath ?? CONFIG_FILENAME;
  const opts = filePath ? {} : { baseDir: BaseDirectory.Resource };

  let raw;
  try {
    raw = await readTextFile(path, opts);
  } catch (err) {
    // Fichier absent
    const error = new Error(`Fichier de configuration introuvable : ${path}`);
    error.code = 'NOT_FOUND';
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`config.json contient du JSON invalide`);
  }

  const { valid, errors } = validateConfig(parsed);
  if (!valid) {
    throw new Error(formatValidationErrors(errors));
  }

  return {
    version: parsed.version ?? 1,
    cues: parsed.cues,
  };
}

/**
 * Écrit l'état actuel des cues dans config.json.
 * @param {Cue[]} cues - La setlist complète
 * @returns {Promise<void>}
 */
export async function writeConfig(cues) {
  const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');

  // audioMissing est un état runtime — ne jamais le persister
  const cleanCues = cues.map(({ audioMissing: _, ...cue }) => cue);

  const config = {
    version: 1,
    cues: cleanCues,
  };

  const raw = JSON.stringify(config, null, 2);

  await writeTextFile(CONFIG_FILENAME, raw, {
    baseDir: BaseDirectory.Resource,
  });
}

/**
 * Vérifie l'existence des fichiers audio pour chaque cue.
 * Gère les chemins absolus (sélecteur de fichier Tauri) ET relatifs (AppData).
 * @param {Cue[]} cues
 * @returns {Promise<Cue[]>} cues avec audioMissing: true si le fichier est absent
 */
export async function checkAudioFiles(cues) {
  const { exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');

  return Promise.all(
    cues.map(async (cue) => {
      if (cue.type !== 'audio' || !cue.audioFile) return cue;
      try {
        const isAbsolute = /^[A-Za-z]:[\\\/]/.test(cue.audioFile) || cue.audioFile.startsWith('/');
        const opts = isAbsolute ? {} : { baseDir: BaseDirectory.Resource };
        const fileExists = await exists(cue.audioFile, opts);
        if (!fileExists) return { ...cue, audioMissing: true };
      } catch {
        return { ...cue, audioMissing: true };
      }
      return cue;
    })
  );
}

/**
 * Importe une setlist depuis un fichier JSON ou CSV.
 * @param {string} filePath - Chemin absolu vers le fichier
 * @returns {Promise<{ cues: Cue[] }>}
 */
export async function importConfig(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return importFromCSV(filePath);
  }

  // Traitement JSON
  return readConfig(filePath);
}

/**
 * Importe une setlist depuis un fichier CSV.
 * Colonnes attendues (headers) : id, type, title, note, audioFile, pictogram, description, watchFor
 * @param {string} filePath
 * @returns {Promise<{ cues: Cue[] }>}
 */
export async function importFromCSV(filePath) {
  const { readTextFile } = await import('@tauri-apps/plugin-fs');

  const raw = await readTextFile(filePath);
  const lines = raw.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length < 2) {
    throw new Error('Le fichier CSV est vide ou ne contient que l\'en-tête');
  }

  const headers = parseCSVLine(lines[0]);
  const requiredHeaders = ['type', 'title'];
  const missing = requiredHeaders.filter(h => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(`CSV invalide : colonnes manquantes : ${missing.join(', ')}`);
  }

  const cues = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });

    if (!row.type || !row.title) continue;
    if (row.type !== 'audio' && row.type !== 'scene') continue;

    cues.push({
      id: row.id || crypto.randomUUID(),
      type: row.type,
      title: row.title,
      note: row.note || '',
      pictogram: row.pictogram || '',
      audioFile: row.audioFile || '',
      description: row.description || '',
      watchFor: row.watchFor || '',
    });
  }

  if (cues.length === 0) {
    throw new Error('Aucun cue valide trouvé dans le fichier CSV');
  }

  return { cues };
}

/**
 * Parse une ligne CSV en gérant les guillemets.
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
