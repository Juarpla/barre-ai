import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Usa openrouter/free: OpenRouter selecciona automáticamente el mejor
 * modelo gratuito disponible en el momento de la solicitud.
 * No tiene costo — ideal como fallback de Gemini.
 */
const MODEL = 'openrouter/free';

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
  error?: { message?: string };
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

  let response: Response;
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
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
      signal: request.signal,
    });
  } catch (fetchErr) {
    if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
      return NextResponse.json({ error: 'Solicitud cancelada' }, { status: 499 });
    }
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error('No se pudo conectar con OpenRouter:', msg);
    return NextResponse.json(
      { error: 'No se pudo conectar con OpenRouter.' },
      { status: 502 }
    );
  }

  const data = await response.json() as OpenRouterResponse;

  if (!response.ok) {
    const errMsg = data.error?.message || `OpenRouter error ${response.status}`;
    console.error('Error de OpenRouter:', response.status, errMsg);
    return NextResponse.json({ error: errMsg }, { status: response.status });
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    return NextResponse.json({ error: 'Respuesta vacía de OpenRouter' }, { status: 502 });
  }

  console.log(`OpenRouter: respondió con modelo ${data.model ?? MODEL}`);

  try {
    const parsed = parseJSON(text);
    return NextResponse.json({ result: parsed, model: data.model });
  } catch {
    return NextResponse.json(
      { error: 'La respuesta de OpenRouter no es JSON válido' },
      { status: 502 }
    );
  }
}
