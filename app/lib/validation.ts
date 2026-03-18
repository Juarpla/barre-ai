import type { SequenceItem, SongBlock, IllustrationType } from './types';
import { VALID_ILLUSTRATION_TYPES } from './types';

const validTypes: ReadonlySet<string> = new Set(VALID_ILLUSTRATION_TYPES);

/**
 * Valida que un objeto tenga la forma de SequenceItem.
 * Si el type no está en el catálogo, lo corrige a 'standing' como fallback.
 */
function normalizeSequenceItem(item: unknown): SequenceItem | null {
  if (typeof item !== 'object' || item === null) return null;
  const obj = item as Record<string, unknown>;

  if (
    typeof obj.name !== 'string' ||
    obj.name.length === 0 ||
    !Array.isArray(obj.steps) ||
    !obj.steps.every((s: unknown) => typeof s === 'string') ||
    obj.steps.length < 5 ||
    typeof obj.type !== 'string'
  ) {
    return null;
  }

  // Si el type no es válido, asignar 'standing' como fallback
  const type: IllustrationType = validTypes.has(obj.type)
    ? (obj.type as IllustrationType)
    : 'standing';

  return {
    name: obj.name,
    steps: obj.steps as string[],
    type,
  };
}

/**
 * Valida que un objeto tenga la forma de SongBlock con exactamente 3 opciones.
 */
function isValidSongBlock(block: unknown): block is SongBlock {
  if (typeof block !== 'object' || block === null) return false;
  const obj = block as Record<string, unknown>;
  return (
    typeof obj.t === 'string' &&
    obj.t.length > 0 &&
    Array.isArray(obj.options) &&
    obj.options.every((o: unknown) => typeof o === 'string') &&
    obj.options.length === 3
  );
}

/**
 * Valida y parsea un array de SequenceItem desde datos desconocidos.
 * Normaliza los types inválidos a 'standing' en lugar de rechazar.
 * @param minCount - Cantidad mínima de ejercicios esperados (default: 3)
 * Lanza un error si la estructura base falla.
 */
export function validateSequenceItems(data: unknown, minCount: number = 3): SequenceItem[] {
  if (!Array.isArray(data)) {
    throw new Error('Se esperaba un array de ejercicios');
  }
  if (data.length === 0) {
    throw new Error('El array de ejercicios no puede estar vacío');
  }
  if (data.length < minCount) {
    throw new Error(
      `Se esperaban al menos ${minCount} ejercicios, pero se recibieron ${data.length}`
    );
  }

  const normalized = data.map(normalizeSequenceItem);
  const invalid = normalized.findIndex((item) => item === null);
  if (invalid !== -1) {
    throw new Error(
      `Formato inválido en ejercicio ${invalid + 1}: debe tener name (string), steps (al menos 5 strings) y type (string)`
    );
  }

  return normalized as SequenceItem[];
}

/**
 * Valida y parsea un array de SongBlock desde datos desconocidos.
 * @param expectedCount - Cantidad esperada de bloques (debe coincidir con el número de ejercicios)
 * Lanza un error si la validación falla.
 */
export function validateSongBlocks(data: unknown, expectedCount?: number): SongBlock[] {
  if (!Array.isArray(data)) {
    throw new Error('Se esperaba un array de bloques de canciones');
  }
  if (data.length === 0) {
    throw new Error('El array de canciones no puede estar vacío');
  }
  if (expectedCount !== undefined && data.length !== expectedCount) {
    throw new Error(
      `Se esperaban exactamente ${expectedCount} bloques de canciones, pero se recibieron ${data.length}`
    );
  }
  if (!data.every(isValidSongBlock)) {
    throw new Error(
      'Formato inválido: cada bloque debe tener t (string) y options (exactamente 3 strings)'
    );
  }
  return data;
}
