import { NextRequest, NextResponse } from 'next/server';

// La API key se lee del servidor, NUNCA se expone al cliente
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error de Gemini API:', response.status, errorData);
      return NextResponse.json(
        { error: `Error de la API de Gemini: ${response.status}` },
        { status: response.status }
      );
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
