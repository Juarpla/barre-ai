import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Modelos a intentar en orden, leídos desde OPENROUTER_MODELS en .env.local.
 * Si la variable no está definida se usan los tres modelos por defecto.
 * Separar por coma: OPENROUTER_MODELS=modelo1:free,modelo2:free,modelo3:free
 */
const MODELS: string[] = (
  process.env.OPENROUTER_MODELS ||
  'nvidia/nemotron-3-nano-30b-a3b:free,arcee-ai/trinity-large-preview:free,stepfun/step-3.5-flash:free'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

/** Timeout por modelo (ms). Si se supera, se intenta el siguiente. */
const MODEL_TIMEOUT_MS = 20_000;

/** Esperas entre reintentos ante 429/503 por modelo (ms). */
const RETRY_DELAYS_MS = [2_000];

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
  error?: { message?: string };
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
 * Intenta llamar a un modelo de OpenRouter con reintentos ante 429/503.
 * Usa un timeout independiente por modelo combinado con el signal del cliente.
 *
 * Devuelve:
 *   { ok: true, text, modelUsed }  — éxito
 *   { ok: false, clientAborted }   — fallo (timeout del modelo o error recuperable)
 */
async function callModelWithRetry(
  model: string,
  prompt: string,
  clientSignal: AbortSignal,
): Promise<
  | { ok: true; text: string; modelUsed: string }
  | { ok: false; clientAborted: boolean }
> {
  // Timeout independiente por modelo — no acumulativo
  const modelTimeoutController = new AbortController();
  const modelTimeoutId = setTimeout(
    () => modelTimeoutController.abort(),
    MODEL_TIMEOUT_MS,
  );

  const combinedSignal = AbortSignal.any
    ? AbortSignal.any([clientSignal, modelTimeoutController.signal])
    : modelTimeoutController.signal;

  try {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      let response: Response;
      let rawBody: string;

      try {
        response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://barre-ai.vercel.app',
            'X-Title': 'BarreAI Studio',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
          signal: combinedSignal,
        });
        rawBody = await response.text().catch(() => '');
      } catch (fetchErr) {
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          return { ok: false, clientAborted: clientSignal.aborted };
        }
        // Error de red → pasar al siguiente modelo
        console.warn(`[OpenRouter] Modelo ${model}: error de red (intento ${attempt + 1}) — ${(fetchErr as Error).message}`);
        return { ok: false, clientAborted: false };
      }

      // Éxito
      if (response.ok && rawBody) {
        let data: OpenRouterResponse;
        try {
          data = JSON.parse(rawBody) as OpenRouterResponse;
        } catch {
          console.warn(`[OpenRouter] Modelo ${model}: respuesta no-JSON`);
          return { ok: false, clientAborted: false };
        }

        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          console.warn(`[OpenRouter] Modelo ${model}: choices vacíos`);
          return { ok: false, clientAborted: false };
        }

        return { ok: true, text, modelUsed: data.model ?? model };
      }

      // 429 / 503 → reintentar si quedan intentos
      if (response.status === 429 || response.status === 503) {
        if (attempt < RETRY_DELAYS_MS.length) {
          console.warn(
            `[OpenRouter] Modelo ${model}: ${response.status}. Reintento ${attempt + 1}/${RETRY_DELAYS_MS.length} en ${RETRY_DELAYS_MS[attempt] / 1000}s...`
          );
          await sleep(RETRY_DELAYS_MS[attempt], combinedSignal);
          continue;
        }
      }

      // Cualquier otro error → pasar al siguiente modelo
      console.warn(`[OpenRouter] Modelo ${model}: error ${response.status} — pasando al siguiente`);
      return { ok: false, clientAborted: false };
    }

    return { ok: false, clientAborted: false };
  } finally {
    clearTimeout(modelTimeoutId);
  }
}

export async function POST(request: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'API key de OpenRouter no configurada (OPENROUTER_API_KEY)' },
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

  const clientSignal = request.signal;

  // Intentar cada modelo en orden
  for (const model of MODELS) {
    if (clientSignal.aborted) {
      return NextResponse.json({ error: 'Solicitud cancelada' }, { status: 499 });
    }

    console.log(`[OpenRouter] Intentando modelo: ${model}`);
    const result = await callModelWithRetry(model, prompt, clientSignal);

    if (result.ok) {
      console.log(`[OpenRouter] Respondió: ${result.modelUsed}`);
      try {
        const parsed = parseJSON(result.text);
        return NextResponse.json({ result: parsed, model: result.modelUsed });
      } catch {
        console.warn(`[OpenRouter] Modelo ${model}: JSON inválido en respuesta — pasando al siguiente`);
        continue;
      }
    }

    if (result.clientAborted) {
      return NextResponse.json({ error: 'Solicitud cancelada' }, { status: 499 });
    }

    // Modelo falló → continuar al siguiente
    console.warn(`[OpenRouter] Modelo ${model} falló — probando siguiente...`);
  }

  // Todos los modelos fallaron
  console.error('[OpenRouter] Todos los modelos fallaron.');
  return NextResponse.json(
    { error: `OpenRouter: todos los modelos (${MODELS.length}) fallaron` },
    { status: 502 }
  );
}
