// --- TIPOS ---
export interface SongBlock {
  t: string;
  options: string[];
}

export interface SequenceItem {
  name: string;
  steps: string[];
  type: IllustrationType;
}

export interface Routine {
  id: number;
  title: string;
  duration: string;
  equipment: string[];
  songs: SongBlock[];
  sequence: SequenceItem[];
}

// --- CATÁLOGO DE ILUSTRACIONES ---
// Cada tipo mapea a una animación Lottie en BarreIllustrator.
// La descripción ayuda a Gemini a elegir el tipo correcto para cada ejercicio.
export const ILLUSTRATION_CATALOG = {
  standing:           'De pie con piernas abiertas y brazos extendidos (plié, sentadillas amplias)',
  warmup_arms:        'De pie con brazos en movimiento circular (calentamiento, movilidad articular)',
  barre_kick:         'Junto a la barra pateando una pierna al frente (battement, extensiones frontales)',
  barre_releve:       'Junto a la barra en relevé/puntas con brazos arriba (equilibrio, elevaciones)',
  barre_tendu:        'De pie deslizando una pierna al lateral (tendu, aductores, trabajo lateral)',
  barre_plie:         'Plié en segunda posición con talón elevado (pulsos, trabajo de cuádriceps)',
  standing_kickback:  'De pie inclinado con patada hacia atrás (kickback de glúteo)',
  standing_circles:   'De pie con pierna extendida haciendo círculos (glúteo medio, abducción)',
  standing_arms:      'De pie con brazos flexionando pesas (bíceps, hombros, trabajo de brazos)',
  standing_lean_arms: 'Torso inclinado con brazos hacia atrás (tríceps, extensiones)',
  floor_donkey:       'En 4 puntos elevando pierna hacia el techo (donkey kick, patada de burro)',
  floor_hydrant:      'En 4 puntos abriendo rodilla al lateral (fire hydrant, glúteo medio)',
  plank_cube:         'Plancha inclinada con manos en cubo/bloque (core, estabilidad)',
  plank_knees:        'Plancha llevando rodilla al pecho (mountain climber, core dinámico)',
  bridge_ball:        'Puente de glúteo boca arriba con pelota entre rodillas (puente, isquiotibiales)',
  bridge_pulses:      'Puente de glúteo arriba con pulsos pequeños (pulsos de puente)',
  abs_crunch:         'Boca arriba haciendo crunch con aro/implemento (abdominales superiores)',
  abs_scissors:       'Boca arriba con piernas elevadas en tijera (abdominales inferiores)',
  stretch_pigeon:     'Sentado en postura de paloma (estiramiento de cadera, flexores)',
  stretch_child:      'Postura del niño con brazos extendidos (estiramiento de espalda, relajación)',
} as const;

export type IllustrationType = keyof typeof ILLUSTRATION_CATALOG;

export const VALID_ILLUSTRATION_TYPES = Object.keys(ILLUSTRATION_CATALOG) as IllustrationType[];
