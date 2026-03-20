import { NextRequest, NextResponse } from 'next/server';

// Ollama Cloud usa la misma API que local pero con base URL https://ollama.com/api
// y autenticación Bearer con tu API key de ollama.com/settings/api-keys
const OLLAMA_CLOUD_API_KEY = process.env.OLLAMA_CLOUD_API_KEY || '';
const OLLAMA_CLOUD_URL = 'https://ollama.com/api/chat';

// Lista de modelos a intentar en orden de preferencia.
// Si el primero falla o agota su tiempo, se prueba el siguiente.
const OLLAMA_CLOUD_MODELS: string[] = (
  process.env.OLLAMA_CLOUD_MODELS || 'llama3.3,qwen2.5:72b,gemma3:27b'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

/** Timeout por modelo (ms): 30s — suficiente para modelos grandes como qwen2.5:72b */
const MODEL_TIMEOUT_MS = 30_000;

/** Esperas entre reintentos ante 429/503 dentro del mismo modelo (ms) */
const RETRY_DELAYS_MS = [3_000];

interface OllamaMessage {
  role: string;
  content: string;
}
interface OllamaResponse {
  message?: OllamaMessage;
  error?: string;
}

/** Espera N milisegundos, cancelable mediante signal */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

/** Parsea JSON desde texto, tolerando bloques markdown ```json ``` */
function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // continúa al error
      }
    }
    throw new Error('La respuesta no es JSON válido');
  }
}

/**
 * Llama a un modelo con hasta (1 + RETRY_DELAYS_MS.length) intentos ante 429/503.
 * El signal combinado (timeout por modelo + cliente) cancela todo si se agota el tiempo.
 * Devuelve el texto de la respuesta o lanza un error.
 */
async function callModelWithRetry(
  model: string,
  prompt: string,
  signal: AbortSignal,
): Promise<string> {
  let lastError = '';

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const response = await fetch(OLLAMA_CLOUD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_CLOUD_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json',
      }),
      signal,
    });

    const rawBody = await response.text().catch(() => '');

    if (response.ok) {
      // Parsear la respuesta exitosa
      let data: OllamaResponse;
      try {
        data = JSON.parse(rawBody) as OllamaResponse;
      } catch {
        throw new Error('Ollama Cloud devolvió una respuesta no-JSON');
      }
      const text = data.message?.content;
      if (!text) throw new Error('Respuesta vacía de Ollama Cloud');
      return text;
    }

    // Errores recuperables: reintentar
    if (response.status === 429 || response.status === 503) {
      let errMsg = `HTTP ${response.status}`;
      if (rawBody) {
        try {
          const errData = JSON.parse(rawBody) as OllamaResponse;
          errMsg = errData.error || errMsg;
        } catch { /* ignorar */ }
      }
      lastError = errMsg;

      if (attempt < RETRY_DELAYS_MS.length) {
        console.warn(
          `Ollama Cloud modelo "${model}" respondió ${response.status}. Reintento ${attempt + 1}/${RETRY_DELAYS_MS.length} en ${RETRY_DELAYS_MS[attempt] / 1000}s...`
        );
        await sleep(RETRY_DELAYS_MS[attempt], signal);
        continue;
      }
    } else {
      // Error no recuperable (400, 401, 404, 500…) — fallar inmediatamente
      let errMsg = `Ollama Cloud error ${response.status}`;
      if (rawBody) {
        try {
          const errData = JSON.parse(rawBody) as OllamaResponse;
          errMsg = errData.error || errMsg;
        } catch { /* ignorar */ }
      }
      throw new Error(errMsg);
    }
  }

  throw new Error(lastError || `Ollama Cloud modelo "${model}" no respondió`);
}

export async function POST(request: NextRequest) {
  if (!OLLAMA_CLOUD_API_KEY) {
    return NextResponse.json(
      { error: 'API key de Ollama Cloud no configurada (OLLAMA_CLOUD_API_KEY)' },
      { status: 500 }
    );
  }

  let prompt: string;
  try {
    const body = await request.json() as { prompt?: unknown };
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json({ error: 'Se requiere un prompt válido' }, { status: 400 });
    }
    prompt = body.prompt;
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }

  // Intentar cada modelo en orden, cada uno con su propio timeout independiente
  const errors: string[] = [];

  for (const model of OLLAMA_CLOUD_MODELS) {
    // Timeout independiente por modelo — no acumulativo
    const modelTimeoutController = new AbortController();
    const timeoutId = setTimeout(() => modelTimeoutController.abort(), MODEL_TIMEOUT_MS);
    const combinedSignal = AbortSignal.any
      ? AbortSignal.any([request.signal, modelTimeoutController.signal])
      : modelTimeoutController.signal;

    try {
      console.log(`Ollama Cloud: intentando modelo "${model}" (timeout: ${MODEL_TIMEOUT_MS / 1000}s, hasta ${1 + RETRY_DELAYS_MS.length} intentos)...`);
      const text = await callModelWithRetry(model, prompt, combinedSignal);
      clearTimeout(timeoutId);
      const parsed = parseJSON(text);
      console.log(`Ollama Cloud: modelo "${model}" respondió exitosamente.`);
      return NextResponse.json({ result: parsed, model });
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        // ¿Fue el timeout del modelo o cancelación del cliente?
        if (modelTimeoutController.signal.aborted) {
          const msg = `"${model}" no respondió en ${MODEL_TIMEOUT_MS / 1000}s`;
          console.warn(`Ollama Cloud: timeout — ${msg}, probando siguiente modelo...`);
          errors.push(msg);
          continue; // pasar al siguiente modelo
        }
        // Cancelación del cliente — abortar todo
        return NextResponse.json({ error: 'Solicitud cancelada' }, { status: 499 });
      }

      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Ollama Cloud: modelo "${model}" falló — ${msg}`);
      errors.push(`${model}: ${msg}`);
      // Continuar con el siguiente modelo
    }
  }

  // Todos los modelos fallaron
  console.error('Ollama Cloud: todos los modelos fallaron.', errors);
  return NextResponse.json(
    { error: `Ollama Cloud no disponible. Errores: ${errors.join(' | ')}` },
    { status: 502 }
  );
}
