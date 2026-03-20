import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Configuración de proveedores
// ---------------------------------------------------------------------------
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN || '';

const YOUTUBE_URL = 'https://www.googleapis.com/youtube/v3/search';
const VIMEO_URL = 'https://api.vimeo.com/videos';
const DAILYMOTION_URL = 'https://api.dailymotion.com/videos';

// ---------------------------------------------------------------------------
// Tipos compartidos
// ---------------------------------------------------------------------------
export interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  source: 'youtube' | 'vimeo' | 'dailymotion';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Diccionario de traducción de términos de barre/ballet en español → inglés.
 * Permite que Vimeo y Dailymotion encuentren contenido en inglés aunque
 * el nombre del ejercicio esté en español.
 */
const TERM_TRANSLATIONS: [RegExp, string][] = [
  [/plié?s?|pliés?/gi, 'plie'],
  [/relevés?/gi, 'releve'],
  [/arabesque/gi, 'arabesque'],
  [/battement(s)?/gi, 'battement'],
  [/tendu(s)?/gi, 'tendu'],
  [/grand[e]?\s+battement/gi, 'grand battement'],
  [/petit[e]?\s+battement/gi, 'petit battement'],
  [/port\s+de\s+bras/gi, 'port de bras'],
  [/rond\s+de\s+jambe/gi, 'rond de jambe'],
  [/passé/gi, 'passe'],
  [/développé/gi, 'developpe'],
  [/dégagé/gi, 'degage'],
  [/fondu/gi, 'fondu'],
  [/frappe/gi, 'frappe'],
  [/glissé/gi, 'glisse'],
  [/pierna(s)?\s+derecha/gi, 'right leg'],
  [/pierna(s)?\s+izquierda/gi, 'left leg'],
  [/glúteo(s)?/gi, 'glutes'],
  [/caderas?/gi, 'hips'],
  [/tobillos?/gi, 'ankles'],
  [/primera\s+posici[oó]n/gi, 'first position'],
  [/segunda\s+posici[oó]n/gi, 'second position'],
  [/tercera\s+posici[oó]n/gi, 'third position'],
  [/cuarta\s+posici[oó]n/gi, 'fourth position'],
  [/quinta\s+posici[oó]n/gi, 'fifth position'],
  [/punta(s)?\s+de\s+pie/gi, 'pointe'],
  [/media\s+punta/gi, 'demi pointe'],
];

/** Traduce términos de barre en español al equivalente inglés para mejor búsqueda */
function toEnglishTerms(query: string): string {
  let result = query;
  for (const [pattern, replacement] of TERM_TRANSLATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Construye una query orientada a barre/pilates/ballet.
 */
function buildFitnessQuery(term: string, suffix: string): string {
  return `${term} ${suffix}`;
}

// ---------------------------------------------------------------------------
// YouTube
// ---------------------------------------------------------------------------
interface YouTubeItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium?: { url: string } };
  };
}
interface YouTubeResponse {
  items?: YouTubeItem[];
  error?: { message: string; code: number };
}

async function searchYouTube(query: string, signal?: AbortSignal): Promise<VideoResult[]> {
  if (!YOUTUBE_API_KEY) return [];

  const trySearch = async (q: string, lang?: string): Promise<VideoResult[]> => {
    const params = new URLSearchParams({
      part: 'snippet',
      q,
      type: 'video',
      maxResults: '3',
      safeSearch: 'moderate',
      videoEmbeddable: 'true',
      // Categoría 17 = Sports — filtra contenido de fitness/deporte
      videoCategoryId: '17',
      key: YOUTUBE_API_KEY,
    });
    if (lang) params.set('relevanceLanguage', lang);

    try {
      const res = await fetch(`${YOUTUBE_URL}?${params}`, { signal });
      if (!res.ok) return [];
      const data = await res.json() as YouTubeResponse;
      return (data.items ?? [])
        .filter((item) => item.id.videoId)
        .map((item) => ({
          videoId: item.id.videoId!,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium?.url ?? '',
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          source: 'youtube' as const,
        }));
    } catch {
      return [];
    }
  };

  // Intento 1: en español, categoría Sports
  const esResults = await trySearch(
    buildFitnessQuery(query, 'barre pilates ballet tutorial'),
    'es',
  );
  if (esResults.length > 0) return esResults;

  // Intento 2: en inglés, sin filtro de idioma, misma categoría
  return trySearch(buildFitnessQuery(query, 'barre pilates ballet exercise tutorial'));
}

// ---------------------------------------------------------------------------
// Vimeo (requiere VIMEO_ACCESS_TOKEN; si no está configurado se omite)
// ---------------------------------------------------------------------------
interface VimeoItem {
  uri: string;
  name: string;
  user?: { name: string };
  pictures?: { sizes?: { link: string; width?: number }[] };
  link: string;
}
interface VimeoResponse {
  data?: VimeoItem[];
  error?: string;
}

async function searchVimeo(query: string, signal?: AbortSignal): Promise<VideoResult[]> {
  if (!VIMEO_ACCESS_TOKEN) return [];

  // Traducir términos en español para mejor cobertura en Vimeo (contenido mayormente en inglés)
  const enQuery = toEnglishTerms(query);

  const trySearch = async (q: string): Promise<VideoResult[]> => {
    const params = new URLSearchParams({
      query: q,
      per_page: '3',
      content_rating: 'safe',
      fields: 'uri,name,user.name,pictures.sizes,link',
    });
    const res = await fetch(`${VIMEO_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
      signal,
    });
    if (!res.ok) return [];
    const data = await res.json() as VimeoResponse;
    return mapVimeoItems(data.data ?? []);
  };

  try {
    // Intento 1: término traducido + "barre workout"
    const r1 = await trySearch(buildFitnessQuery(enQuery, 'barre workout'));
    if (r1.length > 0) return r1;

    // Intento 2: término traducido + "pilates"
    const r2 = await trySearch(buildFitnessQuery(enQuery, 'pilates exercise'));
    if (r2.length > 0) return r2;

    // Intento 3: solo "barre exercise" genérico — siempre tiene resultados
    return trySearch('barre exercise workout tutorial');
  } catch {
    return [];
  }
}

function mapVimeoItems(items: VimeoItem[]): VideoResult[] {
  return items.map((item) => {
    const videoId = item.uri.replace('/videos/', '');
    const sizes = item.pictures?.sizes ?? [];
    // Índice 3 = 640x360, fallback al último disponible
    const thumbnail = (sizes[3] ?? sizes[sizes.length - 1])?.link ?? '';
    return {
      videoId,
      title: item.name,
      channel: item.user?.name ?? 'Vimeo',
      thumbnail,
      url: item.link,
      source: 'vimeo' as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Dailymotion (API pública, sin auth)
// ---------------------------------------------------------------------------
interface DailymotionItem {
  id: string;
  title: string;
  'owner.screenname': string;
  thumbnail_240_url?: string;
}
interface DailymotionResponse {
  list?: DailymotionItem[];
}

async function searchDailymotion(query: string, signal?: AbortSignal): Promise<VideoResult[]> {
  const enQuery = toEnglishTerms(query);

  const trySearch = async (q: string, lang?: string): Promise<VideoResult[]> => {
    const params = new URLSearchParams({
      search: q,
      limit: '3',
      fields: 'id,title,owner.screenname,thumbnail_240_url',
      channel: 'sport',
      'no_live': '1',
    });
    if (lang) params.set('language', lang);
    const res = await fetch(`${DAILYMOTION_URL}?${params}`, { signal });
    if (!res.ok) return [];
    const data = await res.json() as DailymotionResponse;
    return mapDailymotionItems(data.list ?? []);
  };

  try {
    // Intento 1: término en inglés + "barre" + idioma inglés
    const r1 = await trySearch(buildFitnessQuery(enQuery, 'barre exercise'), 'en');
    if (r1.length > 0) return r1;

    // Intento 2: sin filtro de idioma
    const r2 = await trySearch(buildFitnessQuery(enQuery, 'barre pilates workout'));
    if (r2.length > 0) return r2;

    return [];
  } catch {
    return [];
  }
}

function mapDailymotionItems(items: DailymotionItem[]): VideoResult[] {
  return items.map((item) => ({
    videoId: item.id,
    title: item.title,
    channel: item['owner.screenname'] ?? 'Dailymotion',
    thumbnail: item.thumbnail_240_url ?? '',
    url: `https://www.dailymotion.com/video/${item.id}`,
    source: 'dailymotion' as const,
  }));
}

// ---------------------------------------------------------------------------
// Handler principal — busca en los 3 proveedores en PARALELO
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim() === '') {
    return NextResponse.json({ error: 'Se requiere el parámetro q' }, { status: 400 });
  }

  const q = query.trim();

  try {
    const [ytVideos, vimeoVideos, dmVideos] = await Promise.all([
      searchYouTube(q, request.signal),
      searchVimeo(q, request.signal),
      searchDailymotion(q, request.signal),
    ]);

    // Lista plana combinada: YouTube primero, luego Vimeo, luego Dailymotion
    const videos: VideoResult[] = [...ytVideos, ...vimeoVideos, ...dmVideos];

    return NextResponse.json({ videos, query: q });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Solicitud cancelada' }, { status: 499 });
    }
    console.error('[video-search] Error:', err);
    return NextResponse.json({ error: 'Error al buscar videos' }, { status: 502 });
  }
}
