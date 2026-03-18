import { NextRequest, NextResponse } from 'next/server';

// La API key se lee del servidor, NUNCA se expone al cliente
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Reintentos: esperas de 2s, 4s, 8s antes de rendirse
const RETRY_DELAYS_MS = [2000, 4000, 8000];

/** Espera N milisegundos */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Llama a Gemini con reintentos automáticos ante errores 429 (rate limit) y
 * 503 (sobrecarga temporal). Devuelve la Response de fetch o lanza un error.
 */
async function fetchGeminiWithRetry(body: string): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    // Éxito o error no recuperable → devolver inmediatamente
    if (response.ok || (response.status !== 429 && response.status !== 503)) {
      return response;
    }

    lastResponse = response;

    // Si quedan reintentos, esperar antes del siguiente intento
    if (attempt < RETRY_DELAYS_MS.length) {
      console.warn(
        `Gemini respondió ${response.status}. Reintento ${attempt + 1}/${RETRY_DELAYS_MS.length} en ${RETRY_DELAYS_MS[attempt] / 1000}s...`
      );
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  // Se agotaron los reintentos: devolver la última respuesta fallida
  return lastResponse!;
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'API key de Gemini no configurada en el servidor' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere un prompt válido' },
        { status: 400 }
      );
    }

    const geminiBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = await fetchGeminiWithRetry(geminiBody);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error de Gemini API:', response.status, errorData);

      const userMessage =
        response.status === 429
          ? 'El servicio de IA está ocupado. Espera unos segundos e inténtalo de nuevo.'
          : response.status === 503
            ? 'El servicio de IA no está disponible en este momento. Inténtalo de nuevo más tarde.'
            : `Error de la API de Gemini: ${response.status}`;

      return NextResponse.json({ error: userMessage }, { status: response.status });
    }

    const data = await response.json();

    if (!data.candidates?.length || !data.candidates[0]?.content?.parts?.length) {
      return NextResponse.json(
        { error: 'Respuesta inesperada de la API de Gemini' },
        { status: 502 }
      );
    }

    const rawText = data.candidates[0].content.parts[0].text;

    // Validar que sea JSON parseable antes de enviar al cliente
    try {
      const parsed = JSON.parse(rawText);
      return NextResponse.json({ result: parsed });
    } catch {
      return NextResponse.json(
        { error: 'La respuesta de la IA no es JSON válido' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Error en API route de Gemini:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
