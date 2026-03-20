'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell,
  Music,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  PlayCircle,
  Loader2,
  Search,
} from 'lucide-react';

import type { Routine, SequenceItem } from './lib/types';
import { ILLUSTRATION_CATALOG } from './lib/types';
import { validateSequenceItems, validateSongBlocks } from './lib/validation';
import { INITIAL_ROUTINES } from './data/routines';
import BarreIllustrator from './components/BarreIllustrator';

// --- CONFIGURACIÓN ---
const STORAGE_KEY = 'barre-ai-routines-v2';

/** Rango válido de duración total de la sesión completa (todas las rutinas sumadas) */
const SESSION_MIN_MINUTES = 45;
const SESSION_MAX_MINUTES = 55;

/**
 * Devuelve cuántos ejercicios debe tener una rutina según su duración:
 *   ≤ 5 min → 2 ejercicios
 *   ≥ 6 min → 3 ejercicios
 * Esto regula el tiempo real de cada sección de forma proporcional.
 */
function exercisesForDuration(durationMin: number): number {
  if (durationMin <= 5) return 2;
  return 3;
}

/**
 * Si la IA devuelve un objeto wrapper en vez de un array desnudo
 * (ej. { "songs": [...] } o { "blocks": [...] }), extrae el primer
 * valor que sea un array. Si ya es un array, lo devuelve tal cual.
 */
function unwrapArray(data: unknown): unknown {
  if (Array.isArray(data)) return data;
  if (data !== null && typeof data === 'object') {
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(val)) return val;
    }
  }
  return data;
}

// --- TIPOS PARA PROVEEDOR ACTIVO ---
export type AIProvider = 'gemini' | 'openrouter' | 'ollama-cloud' | null;

/** Nombre legible para mostrar en la UI */
export const PROVIDER_LABELS: Record<NonNullable<AIProvider>, string> = {
  'gemini': 'Gemini',
  'openrouter': 'OpenRouter',
  'ollama-cloud': 'Ollama Cloud',
};

// --- TIPOS PARA BÚSQUEDA DE VIDEO ---
interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  source: 'youtube' | 'vimeo' | 'dailymotion';
}

type VideoState = 'idle' | 'loading' | 'error' | VideoResult[];

const SOURCE_LABELS: Record<VideoResult['source'], string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  dailymotion: 'Dailymotion',
};

const SOURCE_COLORS: Record<VideoResult['source'], string> = {
  youtube: 'bg-red-100 text-red-700',
  vimeo: 'bg-sky-100 text-sky-700',
  dailymotion: 'bg-blue-100 text-blue-700',
};

/**
 * Detecta pares de ejercicios espejo (derecha/izquierda) en una secuencia y
 * sincroniza sus pasos: el ejercicio del lado derecho dicta los pasos; el del
 * lado izquierdo recibe los mismos pasos con los términos de lateralidad
 * reemplazados (derecha↔izquierda, right↔left, etc.).
 *
 * Empareja por proximidad: busca el primer vecino sin par que tenga el mismo
 * nombre base (sin el término de lado). Se procesan de arriba hacia abajo.
 */
function mirrorPairedExercises(sequence: SequenceItem[]): SequenceItem[] {
  // Mapa de términos: [derecha, izquierda]  (en minúsculas, para detectar)
  const SIDE_PAIRS: [string, string][] = [
    ['derecho', 'izquierdo'],
    ['derecha', 'izquierda'],
    ['right',   'left'],
  ];

  /** Normaliza el nombre de un ejercicio removiendo indicadores de lado */
  function baseName(name: string): string {
    let base = name.toLowerCase();
    for (const [r, l] of SIDE_PAIRS) {
      base = base.replace(new RegExp(`\\b${r}\\b`, 'g'), '').replace(new RegExp(`\\b${l}\\b`, 'g'), '');
    }
    return base.replace(/\s+/g, ' ').trim();
  }

  /** Devuelve 'right', 'left' o null según el lado que menciona el nombre */
  function detectSide(name: string): 'right' | 'left' | null {
    const lower = name.toLowerCase();
    for (const [r, l] of SIDE_PAIRS) {
      if (new RegExp(`\\b${r}\\b`).test(lower)) return 'right';
      if (new RegExp(`\\b${l}\\b`).test(lower)) return 'left';
    }
    return null;
  }

  /** Reemplaza todos los términos de lado en un string (right→left o left→right) */
  function swapSideTerms(text: string): string {
    // Usar placeholder para evitar doble reemplazo
    let result = text;
    for (const [r, l] of SIDE_PAIRS) {
      const rRe = new RegExp(`\\b${r}\\b`, 'gi');
      const lRe = new RegExp(`\\b${l}\\b`, 'gi');
      result = result
        .replace(rRe, (m) => `__R__${m}__R__`)
        .replace(lRe, (m) => `__L__${m}__L__`);
    }
    // Ahora resolver los placeholders cruzando lados
    result = result
      .replace(/__R__(derecho)__R__/gi, 'izquierdo')
      .replace(/__R__(derecha)__R__/gi, 'izquierda')
      .replace(/__R__(right)__R__/gi, 'left')
      .replace(/__L__(izquierdo)__L__/gi, 'derecho')
      .replace(/__L__(izquierda)__L__/gi, 'derecha')
      .replace(/__L__(left)__L__/gi, 'right');
    // Limpiar cualquier placeholder residual
    result = result.replace(/__[RL]__[^_]*__[RL]__/g, (m) => m.replace(/__[RL]__/g, ''));
    return result;
  }

  const result = [...sequence];
  const paired = new Set<number>(); // índices ya procesados

  for (let i = 0; i < result.length; i++) {
    if (paired.has(i)) continue;
    const sideI = detectSide(result[i].name);
    if (!sideI) continue;

    const baseI = baseName(result[i].name);

    // Buscar el primer ejercicio aún no emparejado con el mismo nombre base y lado opuesto
    for (let j = i + 1; j < result.length; j++) {
      if (paired.has(j)) continue;
      const sideJ = detectSide(result[j].name);
      if (!sideJ || sideJ === sideI) continue;
      if (baseName(result[j].name) !== baseI) continue;

      // ¡Par encontrado! i=right/left, j=opuesto
      // El que aparece primero (i) dicta los pasos; j recibe mirror de los mismos
      const dominantSteps = result[i].steps;
      const mirroredSteps = dominantSteps.map((s: string) => swapSideTerms(s));

      result[j] = { ...result[j], steps: mirroredSteps };

      paired.add(i);
      paired.add(j);
      break;
    }
  }

  return result;
}

// --- OPCIONES DE BPM ---
export const BPM_OPTIONS = [
  { value: 110, label: '110 BPM', description: 'Suave' },
  { value: 128, label: '128 BPM', description: 'Clásico' },
  { value: 140, label: '140 BPM', description: 'Cardio' },
] as const;

export type BpmValue = (typeof BPM_OPTIONS)[number]['value'];

// --- HELPER: llamada a la API de Gemini via server route ---
async function callGeminiAPI(prompt: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || `Error del servidor: ${response.status}`
    );
  }

  const data = await response.json();
  return (data as { result: unknown }).result;
}

// --- HELPER: llamada a la API de OpenRouter via server route (2do fallback) ---
async function callOpenRouterAPI(prompt: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || `Error de OpenRouter: ${response.status}`
    );
  }

  const data = await response.json();
  return (data as { result: unknown }).result;
}

// --- HELPER: llamada a la API de Ollama Cloud via server route (3er fallback) ---
async function callOllamaCloudAPI(prompt: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/ollama-cloud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || `Error de Ollama Cloud: ${response.status}`
    );
  }

  const data = await response.json();
  return (data as { result: unknown }).result;
}

/**
 * Cadena de fallback estricta: Gemini → OpenRouter → Ollama Cloud
 * onFallback(msg): muestra aviso al usuario antes de cada salto.
 * onProvider(p): informa qué proveedor está activo en cada momento.
 */
async function callAIWithFallback(
  prompt: string,
  onFallback: (msg: string) => void,
  onProvider: (provider: AIProvider) => void,
  signal?: AbortSignal,
): Promise<unknown> {
  // 1. Gemini (primero siempre)
  onProvider('gemini');
  try {
    const result = await callGeminiAPI(prompt, signal);
    return result;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    console.warn('[Fallback] Gemini falló → OpenRouter:', (err as Error).message);
    onFallback('Gemini no está disponible. Cambiando a OpenRouter...');
  }

  // 2. OpenRouter Free (segundo siempre)
  onProvider('openrouter');
  try {
    const result = await callOpenRouterAPI(prompt, signal);
    return result;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    console.warn('[Fallback] OpenRouter falló → Ollama Cloud:', (err as Error).message);
    onFallback('OpenRouter no responde. Cambiando a Ollama Cloud...');
  }

  // 3. Ollama Cloud (tercero y último)
  onProvider('ollama-cloud');
  return await callOllamaCloudAPI(prompt, signal);
}

// --- APP PRINCIPAL ---
export default function BarreApp() {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    // Inicializar desde localStorage si hay datos guardados
    if (typeof window === 'undefined') return INITIAL_ROUTINES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Routine[]) : INITIAL_ROUTINES;
    } catch {
      return INITIAL_ROUTINES;
    }
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isImproving, setIsImproving] = useState(false);
  const [isRefreshingSongs, setIsRefreshingSongs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<AIProvider>(null);
  const [bpm, setBpm] = useState<BpmValue>(128);
  const [videoStates, setVideoStates] = useState<Record<string, VideoState>>({});
  // Modal de selección de video: nombre del ejercicio activo, o null si cerrado
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [videoPage, setVideoPage] = useState(0);
  // Query manual para búsqueda personalizada en el modal
  const [videoCustomQuery, setVideoCustomQuery] = useState('');

  // AbortController ref para cancelar fetch al desmontar
  const abortControllerRef = useRef<AbortController | null>(null);

  // Limpiar AbortController al desmontar
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Auto-dismiss del error después de 5 segundos
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // Auto-dismiss del aviso de fallback después de 6 segundos
  useEffect(() => {
    if (!info) return;
    const timer = setTimeout(() => setInfo(null), 6000);
    return () => clearTimeout(timer);
  }, [info]);

  // Clamp currentIdx cuando routines cambia
  useEffect(() => {
    setCurrentIdx((prev) => Math.min(prev, routines.length - 1));
  }, [routines]);

  // Persistir en localStorage cada vez que routines cambia
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
    } catch {
      console.warn('No se pudo guardar en localStorage.');
    }
  }, [routines]);

  const isAIBusy = isImproving || isRefreshingSongs;

  // Busca videos en los 3 proveedores en paralelo y abre el modal de selección
  const fetchVideo = async (exerciseName: string) => {
    const key = exerciseName;
    const current = videoStates[key];
    // Si ya tenemos resultados cacheados, abre el modal directamente
    if (Array.isArray(current) && current.length > 0) {
      setVideoPage(0);
      setVideoModal(key);
      return;
    }
    setVideoStates((prev) => ({ ...prev, [key]: 'loading' }));
    setVideoPage(0);
    setVideoModal(key);
    try {
      const res = await fetch(`/api/video-search?q=${encodeURIComponent(exerciseName)}`);
      if (!res.ok) throw new Error('Respuesta no exitosa');
      const data = await res.json();
      const videos: VideoResult[] = data.videos ?? [];
      if (videos.length === 0) throw new Error('Sin resultados');
      setVideoStates((prev) => ({ ...prev, [key]: videos }));
    } catch {
      setVideoStates((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  // Busca con una query personalizada del usuario, bajo la clave del ejercicio activo
  const fetchVideoByQuery = async (key: string, customQuery: string) => {
    const q = customQuery.trim();
    if (!q) return;
    setVideoStates((prev) => ({ ...prev, [key]: 'loading' }));
    setVideoPage(0);
    setVideoCustomQuery('');
    try {
      const res = await fetch(`/api/video-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Respuesta no exitosa');
      const data = await res.json();
      const videos: VideoResult[] = data.videos ?? [];
      if (videos.length === 0) throw new Error('Sin resultados');
      setVideoStates((prev) => ({ ...prev, [key]: videos }));
    } catch {
      setVideoStates((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  const improveRoutineWithAI = async (routineId: number) => {
    if (isAIBusy) return;
    setIsImproving(true);
    setError(null);

    // Leer desde el estado actual (evitar stale closure)
    const routine = routines.find((r) => r.id === routineId);
    if (!routine || !routine.sequence.length) {
      setIsImproving(false);
      return;
    }

    const durationNum = parseInt(routine.duration) || 6;
    const numExercises = exercisesForDuration(durationNum);
    const blockDuration = Math.round(durationNum / numExercises);
    const timeRanges = Array.from({ length: numExercises }, (_, i) => {
      const start = i * blockDuration;
      const end = i === numExercises - 1 ? durationNum : (i + 1) * blockDuration;
      return `${start}-${end} min`;
    });

    // Construir catálogo de tipos para el prompt
    const typeCatalog = Object.entries(ILLUSTRATION_CATALOG)
      .map(([key, desc]) => `  - "${key}": ${desc}`)
      .join('\n');

    const prompt = `Como experto en Barre, mejora la secuencia de "${routine.title}" (${routine.duration}).
    
    REGLAS OBLIGATORIAS:
    1. Genera EXACTAMENTE ${numExercises} ejercicios distintos (ni más, ni menos).
    2. Cada ejercicio debe ser un objeto independiente en el array "sequence".
    3. La propiedad "steps" DEBE SER un array de EXACTAMENTE 5 instrucciones. Cada instrucción debe ser una sola frase corta y clara.
    4. NO combines varios ejercicios en uno solo.
    5. La propiedad "type" DEBE SER uno de los siguientes valores según la postura del ejercicio:
${typeCatalog}
    Elige el "type" que mejor represente visualmente la posición corporal del ejercicio.
    Equipo disponible: ${routine.equipment.join(', ')}.
    
    6. Genera TAMBIÉN un array "songs" con EXACTAMENTE ${numExercises} bloques de canciones (~${bpm} BPM), uno por cada ejercicio.
    7. Cada bloque de canciones debe tener EXACTAMENTE 3 opciones de canciones reales y populares.
    8. Usa estos rangos de tiempo: ${timeRanges.map(t => `"${t}"`).join(', ')}.
    
    Responde UNICAMENTE con un JSON objeto con dos propiedades:
    {
      "sequence": [{"name": "Ejercicio 1", "steps": ["Instrucción 1", "Instrucción 2", "Instrucción 3", "Instrucción 4", "Instrucción 5"], "type": "tipo_del_catalogo"}, ...],
      "songs": [{"t": "${timeRanges[0]}", "options": ["Cancion 1 - Artista", "Cancion 2 - Artista", "Cancion 3 - Artista"]}, ...]
    }`;

    // Cancelar request anterior si existe
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await callAIWithFallback(
        prompt,
        (msg) => setInfo(msg),
        (p) => setActiveProvider(p),
        controller.signal,
      );

      // Parsear respuesta que ahora contiene sequence y songs
      const parsed = result as { sequence?: unknown; songs?: unknown };
      if (!parsed || typeof parsed !== 'object' || !('sequence' in parsed)) {
        throw new Error('Respuesta inesperada: se esperaba un objeto con "sequence" y "songs"');
      }

      const improvedSequence = mirrorPairedExercises(
        validateSequenceItems(parsed.sequence, numExercises)
      );
      // Validar songs si están presentes, sino mantener las existentes
      let newSongs = routine.songs;
      if (parsed.songs) {
        try {
          newSongs = validateSongBlocks(parsed.songs, numExercises);
        } catch {
          // Si las canciones fallan la validación, mantener las existentes
          console.warn('Songs validation failed, keeping existing songs');
        }
      }

      // State update funcional para evitar race conditions
      setRoutines((prev) => {
        const updated = prev.map((r) =>
          r.id === routineId ? { ...r, sequence: improvedSequence, songs: newSongs } : r
        );
        return updated;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Error al mejorar rutina:', err);
      setError(`No se pudo mejorar la rutina: ${(err as Error).message}`);
    } finally {
      setIsImproving(false);
      setActiveProvider(null);
    }
  };

  const refreshSongsWithAI = async (routineId: number) => {
    if (isAIBusy) return;
    setIsRefreshingSongs(true);
    setError(null);

    const routine = routines.find((r) => r.id === routineId);
    if (!routine || !routine.sequence.length) {
      setIsRefreshingSongs(false);
      return;
    }

    const durationNum = parseInt(routine.duration) || 6;
    const numExercises = exercisesForDuration(durationNum);
    const blockDuration = Math.round(durationNum / numExercises);
    const timeRanges = Array.from({ length: numExercises }, (_, i) => {
      const start = i * blockDuration;
      const end = i === numExercises - 1 ? durationNum : (i + 1) * blockDuration;
      return `${start}-${end} min`;
    });

    const prompt = `Como DJ experto en fitness, sugiere canciones de ritmo constante (~${bpm} BPM) para una rutina de Barre "${routine.title}" (${routine.duration}).

    REGLAS OBLIGATORIAS:
    1. Genera EXACTAMENTE ${numExercises} bloques de canciones (uno por cada ejercicio de la rutina).
    2. Cada bloque debe tener EXACTAMENTE 3 opciones de canciones (ni más, ni menos).
    3. Usa estos rangos de tiempo para la propiedad "t": ${timeRanges.map(t => `"${t}"`).join(', ')}.
    4. Las canciones deben ser reales, populares y con buen ritmo para ejercicio.

    Responde UNICAMENTE con un objeto JSON con la propiedad "songs":
    {"songs": [${timeRanges.map(t => `{"t": "${t}", "options": ["Cancion 1 - Artista", "Cancion 2 - Artista", "Cancion 3 - Artista"]}`).join(', ')}]}`;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await callAIWithFallback(
        prompt,
        (msg) => setInfo(msg),
        (p) => setActiveProvider(p),
        controller.signal,
      );
      // Algunos LLMs envuelven el array en un objeto, ej: { "songs": [...] }
      // Intentar extraer el array desde cualquier propiedad del objeto antes de validar
      const songsData = unwrapArray(result);
      const newSongs = validateSongBlocks(songsData, numExercises);

      setRoutines((prev) =>
        prev.map((r) => (r.id === routineId ? { ...r, songs: newSongs } : r))
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Error al refrescar canciones:', err);
      setError(`No se pudieron refrescar las canciones: ${(err as Error).message}`);
    } finally {
      setIsRefreshingSongs(false);
      setActiveProvider(null);
    }
  };

  const currentRoutine: Routine | undefined = routines[currentIdx];

  /** Suma de todas las duraciones (en minutos) — se recalcula cuando routines cambia */
  const totalMinutes = routines.reduce(
    (sum, r) => sum + (parseInt(r.duration) || 0),
    0
  );
  const totalLabel = `${totalMinutes} MIN`;
  const totalInRange = totalMinutes >= SESSION_MIN_MINUTES && totalMinutes <= SESSION_MAX_MINUTES;

  // Guard: si no hay rutina actual (caso extremo), mostrar loading
  if (!currentRoutine) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Cargando rutinas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* TOAST DE AVISO (fallback a Ollama) */}
      {info && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[101] max-w-md w-full px-4 animate-in">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
            <Info size={20} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-700 flex-1">{info}</p>
            <button onClick={() => setInfo(null)} className="text-indigo-400 hover:text-indigo-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* TOAST DE ERRORES */}
      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-in">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Dumbbell size={22} />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">
            BARRE<span className="text-indigo-600">AI</span> STUDIO
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* INDICADOR DE PROVEEDOR LLM */}
          {activeProvider ? (
            <div className="flex items-center gap-2 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-md shadow-indigo-200 animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              {PROVIDER_LABELS[activeProvider]}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold bg-slate-100 text-slate-400 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              IA en espera
            </div>
          )}
          <div
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${
              totalInRange
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-amber-50 text-amber-700'
            }`}
            title={totalInRange ? 'Duración total dentro del rango recomendado (45-55 min)' : `Fuera del rango recomendado (45-55 min)`}
          >
            <Clock size={14} />
            TOTAL: {totalLabel}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {/* TABS */}
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 no-scrollbar">
          {routines.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => setCurrentIdx(idx)}
              className={`shrink-0 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                currentIdx === idx
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 -translate-y-1'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'
              }`}
            >
              {idx + 1}. {r.title}
            </button>
          ))}
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          {/* HERO */}
          <div className="bg-slate-900 p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left">
                <span className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-2 block">
                  Sesión Local
                </span>
                <h2 className="text-5xl font-black mb-4">{currentRoutine.title}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 text-slate-400 font-medium">
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <Clock size={16} className="text-indigo-400" />
                    {currentRoutine.duration}
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <Dumbbell size={16} className="text-indigo-400" />
                    {currentRoutine.equipment.join(', ')}
                  </div>
                </div>
              </div>
              <div className="w-40 h-40 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-2 shadow-inner">
                <BarreIllustrator type={currentRoutine.sequence[0]?.type} />
              </div>
            </div>

            {/* BOTONES AI */}
            <div className="flex flex-wrap gap-3 mt-10 relative z-10">
              <button
                onClick={() => improveRoutineWithAI(currentRoutine.id)}
                disabled={isAIBusy}
                className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-500/30"
              >
                {isImproving ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
                {isImproving ? 'INTELIGENCIA ACTIVA...' : 'POTENCIAR CON AI'}
              </button>

            </div>
          </div>

          <div className="p-6 md:p-10 space-y-12">
            {/* SECUENCIA */}
            <section>
              <h3 className="text-2xl font-black flex items-center gap-3 mb-8 text-slate-800">
                <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                PASOS DE LA SECUENCIA
              </h3>
              <div className="grid grid-cols-1 gap-10">
                {currentRoutine.sequence.map((item, i) => (
                  <div key={`${currentRoutine.id}-seq-${item.name}-${i}`} className="flex flex-col md:flex-row gap-8 items-start group">
                    <div className="w-full md:w-56 h-56 bg-slate-50 rounded-4xl shrink-0 border-2 border-slate-100 flex items-center justify-center group-hover:border-indigo-200 transition-all group-hover:shadow-xl group-hover:shadow-indigo-50">
                      <BarreIllustrator type={item.type} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-3">
                        <span className="text-indigo-200 italic font-serif">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {item.name}
                      </h4>
                      <ul className="space-y-3">
                        {item.steps.map((step, idx) => (
                          <li
                            key={`${item.name}-step-${idx}`}
                            className="flex items-start gap-3 text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors"
                          >
                            <div className="mt-2 w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />
                            <span className="text-sm md:text-base">{step}</span>
                          </li>
                        ))}
                      </ul>
                      {/* Botón Ver video */}
                      <div className="mt-5">
                        {(() => {
                          const vs = videoStates[item.name];
                          const isLoading = vs === 'loading';
                          const isError = vs === 'error';
                          return (
                            <button
                              onClick={() => fetchVideo(item.name)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <PlayCircle size={16} />
                              )}
                              {isLoading ? 'Buscando...' : isError ? 'Sin resultados — reintentar' : 'Ver video'}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* PLAYLIST */}
            <section className="bg-indigo-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-200">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Music size={28} />
                  PLAYLIST RECOMENDADA
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {/* SELECTOR BPM */}
                  <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
                    {BPM_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setBpm(opt.value)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${
                          bpm === opt.value
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                        <span className={`ml-1 font-medium normal-case tracking-normal ${bpm === opt.value ? 'text-indigo-400' : 'text-white/40'}`}>
                          {opt.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => refreshSongsWithAI(currentRoutine.id)}
                    disabled={isAIBusy}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase transition-all backdrop-blur-md"
                  >
                    {isRefreshingSongs ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    REFRESCAR BEATS
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentRoutine.songs.map((block, i) => (
                  <div
                    key={`${currentRoutine.id}-song-${block.t}-${i}`}
                    className="bg-white/10 border border-white/20 rounded-3xl p-6 backdrop-blur-sm"
                  >
                    <span className="text-indigo-200 font-black text-xs block mb-4 uppercase tracking-tighter">
                      {block.t}
                    </span>
                    <div className="space-y-3">
                      {block.options.map((opt, j) => (
                        <div key={`${block.t}-opt-${j}`} className="flex items-center gap-3 text-sm font-medium">
                          <CheckCircle2 size={16} className="text-indigo-300 shrink-0" />
                          <span className={j === 0 ? 'text-white' : 'text-white/60'}>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <div className="flex justify-between mt-12 items-center px-4">
          <button
            onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
            className="group flex items-center gap-4 text-slate-400 font-black uppercase text-xs hover:text-indigo-600 transition-all disabled:opacity-30"
            disabled={currentIdx === 0}
          >
            <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-indigo-600 group-hover:bg-indigo-50">
              <ChevronLeft size={20} />
            </div>
            Anterior
          </button>

          <div className="hidden sm:flex gap-2">
            {routines.map((r, i) => (
              <div
                key={r.id}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  currentIdx === i ? 'w-12 bg-indigo-600' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setCurrentIdx((prev) => Math.min(routines.length - 1, prev + 1))
            }
            className="group flex items-center gap-4 text-slate-400 font-black uppercase text-xs hover:text-indigo-600 transition-all text-right disabled:opacity-30"
            disabled={currentIdx === routines.length - 1}
          >
            Siguiente
            <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-indigo-600 group-hover:bg-indigo-50">
              <ChevronRight size={20} />
            </div>
          </button>
        </div>
      </main>

      {/* MODAL DE SELECCIÓN DE VIDEO */}
      {videoModal && (() => {
        const vs = videoStates[videoModal];
        const isLoading = vs === 'loading';
        const isError = vs === 'error';
        const videos = Array.isArray(vs) ? vs : [];
        const total = videos.length;
        const page = Math.min(videoPage, Math.max(0, total - 1));
        const current = videos[page] ?? null;

        const closeModal = () => { setVideoModal(null); setVideoCustomQuery(''); };

        return (
          <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
            onClick={closeModal}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Panel — full-width en móvil, max-w-sm en desktop */}
            <div
              className="relative bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pill handle (solo móvil) */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-100">
                <div className="min-w-0 pr-3">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Ver video</p>
                  <h2 className="text-sm font-black text-slate-800 leading-snug truncate">{videoModal}</h2>
                </div>
                <button
                  onClick={closeModal}
                  className="shrink-0 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={14} className="text-slate-500" />
                </button>
              </div>

              {/* Contenido */}
              <div className="px-5 py-4">

                {/* Estado: cargando */}
                {isLoading && (
                  <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                    <p className="text-xs text-center">Buscando en YouTube, Vimeo y Dailymotion...</p>
                  </div>
                )}

                {/* Estado: error — campo de búsqueda manual */}
                {isError && (
                  <div className="flex flex-col gap-4 py-5">
                    <div className="flex flex-col items-center gap-1.5 text-slate-400">
                      <AlertCircle size={26} className="text-amber-400" />
                      <p className="text-xs text-center text-slate-500">
                        No se encontraron videos.<br />Intenta con otra búsqueda.
                      </p>
                    </div>

                    {/* Input de búsqueda manual */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        fetchVideoByQuery(videoModal, videoCustomQuery);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={videoCustomQuery}
                        onChange={(e) => setVideoCustomQuery(e.target.value)}
                        placeholder="ej. plie barre tutorial"
                        autoFocus
                        className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-slate-300 text-slate-700 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!videoCustomQuery.trim()}
                        className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                        aria-label="Buscar"
                      >
                        <Search size={15} className="text-white" />
                      </button>
                    </form>

                    {/* Reintentar con query original */}
                    <button
                      onClick={() => {
                        setVideoStates((prev) => ({ ...prev, [videoModal]: 'idle' }));
                        fetchVideo(videoModal);
                      }}
                      className="text-xs text-slate-400 hover:text-indigo-600 transition-colors text-center"
                    >
                      Reintentar búsqueda original
                    </button>
                  </div>
                )}

                {/* Video actual */}
                {current && (
                  <div>
                    {/* Thumbnail grande */}
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeModal}
                      className="block relative rounded-2xl overflow-hidden bg-slate-100 aspect-video group"
                    >
                      {current.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={current.thumbnail}
                          alt={current.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle size={40} className="text-slate-300" />
                        </div>
                      )}
                      {/* Overlay play */}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <PlayCircle size={24} className="text-indigo-600 ml-0.5" />
                        </div>
                      </div>
                    </a>

                    {/* Info del video */}
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">{current.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{current.channel}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${SOURCE_COLORS[current.source]}`}>
                        {SOURCE_LABELS[current.source]}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer — paginación + cerrar */}
              <div className="px-5 pb-5 flex items-center gap-3">
                {/* Navegación anterior/siguiente */}
                {total > 1 && (
                  <>
                    <button
                      onClick={() => setVideoPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                      aria-label="Anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {/* Indicador de página */}
                    <div className="flex gap-1.5 items-center flex-1 justify-center">
                      {videos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setVideoPage(i)}
                          className={`rounded-full transition-all ${i === page ? 'w-4 h-2 bg-indigo-600' : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'}`}
                          aria-label={`Video ${i + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setVideoPage((p) => Math.min(total - 1, p + 1))}
                      disabled={page === total - 1}
                      className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                      aria-label="Siguiente"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}

                {/* Botón cerrar prominente (si hay 1 solo video o en loading/error) */}
                {(total <= 1 || isLoading || isError) && (
                  <button
                    onClick={closeModal}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-600 transition-colors"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
