import type { SequenceItem, SongBlock } from './types';

/**
 * Valida que un objeto tenga la forma de SequenceItem.
 */
function isValidSequenceItem(item: unknown): item is SequenceItem {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    Array.isArray(obj.steps) &&
    obj.steps.every((s: unknown) => typeof s === 'string') &&
    obj.steps.length > 0 &&
    typeof obj.type === 'string'
  );
}

/**
 * Valida que un objeto tenga la forma de SongBlock.
 */
function isValidSongBlock(block: unknown): block is SongBlock {
  if (typeof block !== 'object' || block === null) return false;
  const obj = block as Record<string, unknown>;
  return (
    typeof obj.t === 'string' &&
    obj.t.length > 0 &&
    Array.isArray(obj.options) &&
    obj.options.every((o: unknown) => typeof o === 'string') &&
    obj.options.length > 0
  );
}

/**
 * Valida y parsea un array de SequenceItem desde datos desconocidos.
 * Lanza un error si la validación falla.
 */
export function validateSequenceItems(data: unknown): SequenceItem[] {
  if (!Array.isArray(data)) {
    throw new Error('Se esperaba un array de ejercicios');
  }
  if (data.length === 0) {
    throw new Error('El array de ejercicios no puede estar vacío');
  }
  if (!data.every(isValidSequenceItem)) {
    throw new Error(
      'Formato inválido: cada ejercicio debe tener name (string), steps (string[]) y type (string)'
    );
  }
  return data;
}

/**
 * Valida y parsea un array de SongBlock desde datos desconocidos.
 * Lanza un error si la validación falla.
 */
export function validateSongBlocks(data: unknown): SongBlock[] {
  if (!Array.isArray(data)) {
    throw new Error('Se esperaba un array de bloques de canciones');
  }
  if (data.length === 0) {
    throw new Error('El array de canciones no puede estar vacío');
  }
  if (!data.every(isValidSongBlock)) {
    throw new Error(
      'Formato inválido: cada bloque debe tener t (string) y options (string[])'
    );
  }
  return data;
}
