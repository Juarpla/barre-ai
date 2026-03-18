import { NextRequest, NextResponse } from 'next/server';

// Ollama Cloud usa la misma API que local pero con base URL https://ollama.com/api
// y autenticación Bearer con tu API key de ollama.com/settings/api-keys
const OLLAMA_CLOUD_API_KEY = process.env.OLLAMA_CLOUD_API_KEY || '';
const OLLAMA_CLOUD_URL = 'https://ollama.com/api/chat';

// Lista de modelos a intentar en orden de preferencia.
// Si el primero falla, se prueba el siguiente, y así sucesivamente.
const OLLAMA_CLOUD_MODELS: string[] = (
  process.env.OLLAMA_CLOUD_MODELS || 'llama3.3,qwen2.5:72b,gemma3:27b'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

interface OllamaMessage {
  role: string;
  content: string;
}
interface OllamaResponse {
  message?: OllamaMessage;
  error?: string;
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

/** Llama a un modelo específico de Ollama Cloud. Devuelve el texto de la respuesta. */
async function callModel(model: string, prompt: string, signal: AbortSignal): Promise<string> {
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

  const data = await response.json() as OllamaResponse;

  if (!response.ok) {
    const errMsg = data.error || `Ollama Cloud error ${response.status}`;
    throw new Error(errMsg);
  }

  const text = data.message?.content;
  if (!text) {
    throw new Error('Respuesta vacía de Ollama Cloud');
  }

  return text;
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

  // Intentar cada modelo en orden hasta que uno responda correctamente
  const errors: string[] = [];

  for (const model of OLLAMA_CLOUD_MODELS) {
    try {
      console.log(`Ollama Cloud: intentando con modelo "${model}"...`);
      const text = await callModel(model, prompt, request.signal);
      const parsed = parseJSON(text);
      console.log(`Ollama Cloud: modelo "${model}" respondió exitosamente.`);
      return NextResponse.json({ result: parsed, model });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
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
    { error: `Ollama Cloud no disponible. Errores por modelo: ${errors.join(' | ')}` },
    { status: 502 }
  );
}
