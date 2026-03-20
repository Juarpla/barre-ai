import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

interface YouTubeSearchItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium?: { url: string } };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: { message: string; code: number };
}

export async function GET(request: NextRequest) {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: 'YouTube API key no configurada (YOUTUBE_API_KEY)' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim() === '') {
    return NextResponse.json({ error: 'Se requiere el parámetro q' }, { status: 400 });
  }

  // Construir query optimizada para encontrar tutoriales de barre
  const searchQuery = `${query.trim()} barre fitness tutorial`;

  const params = new URLSearchParams({
    part: 'snippet',
    q: searchQuery,
    type: 'video',
    maxResults: '3',
    relevanceLanguage: 'es',        // Preferir español primero
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
    key: YOUTUBE_API_KEY,
  });

  try {
    const response = await fetch(`${YOUTUBE_SEARCH_URL}?${params}`, {
      signal: request.signal,
    });

    const data = await response.json() as YouTubeSearchResponse;

    if (!response.ok) {
      console.error('[YouTube] Error de API:', data.error?.message);
      return NextResponse.json(
        { error: data.error?.message || `YouTube API error ${response.status}` },
        { status: response.status }
      );
    }

    const videos = (data.items ?? [])
      .filter((item) => item.id.videoId)
      .map((item) => ({
        videoId: item.id.videoId!,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url ?? '',
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));

    if (videos.length === 0) {
      // Fallback: buscar sin filtro de idioma
      const fallbackParams = new URLSearchParams({
        part: 'snippet',
        q: `${query.trim()} barre exercise tutorial`,
        type: 'video',
        maxResults: '3',
        safeSearch: 'moderate',
        videoEmbeddable: 'true',
        key: YOUTUBE_API_KEY,
      });

      const fallbackRes = await fetch(`${YOUTUBE_SEARCH_URL}?${fallbackParams}`);
      const fallbackData = await fallbackRes.json() as YouTubeSearchResponse;

      const fallbackVideos = (fallbackData.items ?? [])
        .filter((item) => item.id.videoId)
        .map((item) => ({
          videoId: item.id.videoId!,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium?.url ?? '',
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        }));

      return NextResponse.json({ videos: fallbackVideos, query: searchQuery });
    }

    return NextResponse.json({ videos, query: searchQuery });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Solicitud cancelada' }, { status: 499 });
    }
    console.error('[YouTube] Error de red:', err);
    return NextResponse.json(
      { error: 'No se pudo conectar con YouTube' },
      { status: 502 }
    );
  }
}
