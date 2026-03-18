'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  X,
} from 'lucide-react';
import {
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

import type { Routine } from './lib/types';
import { validateSequenceItems, validateSongBlocks } from './lib/validation';
import { auth, db, firebaseEnabled } from './lib/firebase';
import { INITIAL_ROUTINES } from './data/routines';
import BarreIllustrator from './components/BarreIllustrator';

// --- CONFIGURACIÓN ---
const appId = 'barre-ai-app-v2';

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

// --- APP PRINCIPAL ---
export default function BarreApp() {
  const [user, setUser] = useState<User | null>(null);
  const [routines, setRoutines] = useState<Routine[]>(INITIAL_ROUTINES);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isImproving, setIsImproving] = useState(false);
  const [isRefreshingSongs, setIsRefreshingSongs] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Clamp currentIdx cuando routines cambia
  useEffect(() => {
    setCurrentIdx((prev) => Math.min(prev, routines.length - 1));
  }, [routines]);

  // Firebase Auth
  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch((e) => {
      console.error('Error en autenticación anónima:', e);
    });
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Firebase Firestore listener con error handler
  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'routines');
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setRoutines(docSnap.data().data);
        }
      },
      (err) => {
        console.error('Error en Firestore listener:', err);
        setError('Error al sincronizar datos. Los cambios se guardarán localmente.');
      }
    );
    return () => unsub();
  }, [user]);

  const saveRoutines = useCallback(
    async (newData: Routine[]) => {
      if (!user || !db) return;
      try {
        await setDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'routines'),
          { data: newData }
        );
      } catch (e) {
        console.error('Error al guardar rutinas:', e);
        setError('No se pudieron guardar los cambios en la nube.');
      }
    },
    [user]
  );

  const isAIBusy = isImproving || isRefreshingSongs;

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

    const defaultType = routine.sequence[0]?.type ?? 'standing';
    const prompt = `Como experto en Barre, mejora esta secuencia de "${routine.title}".
    REGLA: La propiedad "steps" DEBE SER un array de strings (viñetas).
    Equipo disponible: ${routine.equipment.join(', ')}.
    
    Responde UNICAMENTE con JSON:
    [{"name": "nombre", "steps": ["paso 1", "paso 2"], "type": "${defaultType}"}]`;

    // Cancelar request anterior si existe
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await callGeminiAPI(prompt, controller.signal);
      const improvedSequence = validateSequenceItems(result);

      // State update funcional para evitar race conditions
      setRoutines((prev) => {
        const updated = prev.map((r) =>
          r.id === routineId ? { ...r, sequence: improvedSequence } : r
        );
        // Guardar en Firestore (fire-and-forget con manejo de errores interno)
        saveRoutines(updated);
        return updated;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Error al mejorar rutina:', err);
      setError(`No se pudo mejorar la rutina: ${(err as Error).message}`);
    } finally {
      setIsImproving(false);
    }
  };

  const refreshSongsWithAI = async (routineId: number) => {
    if (isAIBusy) return;
    setIsRefreshingSongs(true);
    setError(null);

    const routine = routines.find((r) => r.id === routineId);
    if (!routine) {
      setIsRefreshingSongs(false);
      return;
    }

    const prompt = `Sugiere 3 canciones de ritmo constante (~126-128 BPM) para una rutina de "${routine.title}".
    Responde UNICAMENTE con JSON:
    [{"t": "0-3 min", "options": ["Cancion 1 - Artista", "Cancion 2", "Cancion 3"]}]`;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await callGeminiAPI(prompt, controller.signal);
      const newSongs = validateSongBlocks(result);

      setRoutines((prev) => {
        const updated = prev.map((r) =>
          r.id === routineId ? { ...r, songs: newSongs } : r
        );
        saveRoutines(updated);
        return updated;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Error al refrescar canciones:', err);
      setError(`No se pudieron refrescar las canciones: ${(err as Error).message}`);
    } finally {
      setIsRefreshingSongs(false);
    }
  };

  const currentRoutine: Routine | undefined = routines[currentIdx];

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
        <div className="flex items-center gap-2 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-full text-indigo-700">
          <Clock size={14} />
          TOTAL: ~75 MIN
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
                  {firebaseEnabled ? 'Sesión Sincronizada' : 'Sesión Local'}
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
              <button
                onClick={() => refreshSongsWithAI(currentRoutine.id)}
                disabled={isAIBusy}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all backdrop-blur-md"
              >
                {isRefreshingSongs ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Music size={20} />
                )}
                REFRESCAR BEATS
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
                <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">
                  Ritmo: 128 BPM Constante
                </span>
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
    </div>
  );
}
