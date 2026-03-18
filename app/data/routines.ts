import type { Routine } from '../lib/types';

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 1,
    title: 'Calentamiento',
    duration: '8 min',
    equipment: ['Sin equipo'],
    songs: [
      { t: '0-4 min', options: ['Levitating - Dua Lipa', 'Physical - Dua Lipa', 'Say So - Doja Cat'] },
      { t: '4-8 min', options: ['Flowers - Miley Cyrus', 'Starboy - The Weeknd', 'Cold Heart - Elton John'] },
    ],
    sequence: [
      {
        name: 'Plié con Estiramiento Lateral',
        steps: [
          'Coloca los pies en 2da posición (más anchos que hombres).',
          'Baja la cadera manteniendo la espalda recta.',
          'Estira el brazo derecho sobre la cabeza en un arco largo.',
          'Alterna lados manteniendo el core firme.',
        ],
        type: 'standing',
      },
      {
        name: 'Rotación Articular Activa',
        steps: [
          'Realiza círculos amplios con los hombros hacia atrás.',
          'Inclina suavemente la cabeza de lado a lado.',
          'Haz rotaciones de muñecas y tobillos.',
          'Inhala profundo al subir brazos, exhala al bajar.',
        ],
        type: 'warmup_arms',
      },
    ],
  },
  {
    id: 2,
    title: 'Pierna Derecha',
    duration: '9 min',
    equipment: ['Pesas pequeñas', 'Ligas'],
    songs: [
      { t: '0-4 min', options: ['Cruel Summer - Taylor Swift', 'Anti-Hero - Taylor Swift', 'Karma - Taylor Swift'] },
      { t: '4-9 min', options: ['Houdini - Dua Lipa', 'Training Season - Dua Lipa', 'Illusion - Dua Lipa'] },
    ],
    sequence: [
      {
        name: 'Grand Battement con Barra',
        steps: [
          'Mano izquierda apoyada suavemente en la barra/cubo.',
          'Lanza la pierna derecha hacia adelante con fuerza controlada.',
          'Mantén la punta del pie estirada (point).',
          'Baja la pierna sin tocar el suelo completamente.',
        ],
        type: 'barre_kick',
      },
      {
        name: 'Pulsos en Relevé',
        steps: [
          'Eleva el talón derecho lo más alto posible.',
          'Flexiona ligeramente la rodilla de apoyo.',
          'Realiza rebotes de 2 cm hacia arriba y abajo.',
          'Mantén el brazo derecho en 5ta posición (arriba).',
        ],
        type: 'barre_releve',
      },
    ],
  },
  {
    id: 3,
    title: 'Glúteo Derecho',
    duration: '7 min',
    equipment: ['Aro', 'Cubo'],
    songs: [
      { t: '0-3 min', options: ['Greedy - Tate McRae', 'Exes - Tate McRae', 'Run for the Hills - Tate McRae'] },
      { t: '3-7 min', options: ['Rush - Troye Sivan', 'One of Your Girls - Troye Sivan', 'Got Me Started - Troye Sivan'] },
    ],
    sequence: [
      {
        name: 'Kickback con Aro',
        steps: [
          'Sujeta el aro con el pie derecho contra la pared.',
          'Empuja hacia atrás extendiendo la pierna.',
          'Aprieta el glúteo en el punto máximo de extensión.',
          'Mantén la cadera cuadrada mirando al frente.',
        ],
        type: 'standing_kickback',
      },
      {
        name: 'Círculos de Glúteo Medio',
        steps: [
          'Pierna derecha extendida hacia atrás en diagonal.',
          'Dibuja círculos pequeños del tamaño de una moneda.',
          'Cambia el sentido del círculo cada 8 tiempos.',
          'Evita arquear la zona lumbar.',
        ],
        type: 'standing_circles',
      },
    ],
  },
  {
    id: 4,
    title: 'Pierna Izquierda',
    duration: '9 min',
    equipment: ['Ligas', 'Pesas pequeñas'],
    songs: [
      { t: '0-4 min', options: ['Vampire - Olivia Rodrigo', 'Bad Idea Right? - Olivia Rodrigo', 'Get Him Back! - Olivia Rodrigo'] },
      { t: '4-9 min', options: ['greedy - Tate McRae', 'exes - Tate McRae', 'run for the hills - Tate McRae'] },
    ],
    sequence: [
      {
        name: 'Tendu Lateral',
        steps: [
          'Desliza el pie izquierdo hacia el lateral.',
          'Mantén el contacto de la punta con el suelo.',
          'Regresa a 1ra posición apretando aductores.',
          'Torso largo y hombros relajados.',
        ],
        type: 'barre_tendu',
      },
      {
        name: 'Plié Pulsante',
        steps: [
          'Baja a medio plié en 2da posición.',
          'Talón izquierdo elevado (relevé unilateral).',
          'Haz pulsos pequeños manteniendo el nivel bajo.',
          'Brazos en 2da posición (abiertos).',
        ],
        type: 'barre_plie',
      },
    ],
  },
  {
    id: 5,
    title: 'Glúteo Izquierdo',
    duration: '7 min',
    equipment: ['Pelotita', 'Ligas'],
    songs: [
      { t: '0-3 min', options: ['Starboy - The Weeknd', 'Blinding Lights - The Weeknd', 'Save Your Tears - The Weeknd'] },
      { t: '3-7 min', options: ['Peaches - Justin Bieber', 'Stay - The Kid LAROI', 'Ghost - Justin Bieber'] },
    ],
    sequence: [
      {
        name: 'Donkey Kicks con Pelota',
        steps: [
          'Colócate en 4 puntos de apoyo.',
          'Pon la pelota detrás de la corva izquierda.',
          'Eleva el talón hacia el techo apretando la pelota.',
          'No dejes que la rodilla toque el suelo al bajar.',
        ],
        type: 'floor_donkey',
      },
      {
        name: 'Fire Hydrant Izquierdo',
        steps: [
          'Abre la rodilla izquierda hacia el lateral.',
          'Mantén el ángulo de 90 grados en la pierna.',
          'Evita inclinar todo el peso hacia la derecha.',
          'Exhala al subir la pierna.',
        ],
        type: 'floor_hydrant',
      },
    ],
  },
  {
    id: 6,
    title: 'Brazos',
    duration: '8 min',
    equipment: ['Pesas pequeñas', 'Discos'],
    songs: [
      { t: '0-4 min', options: ['Titanium - David Guetta', 'Wake Me Up - Avicii', 'Lean On - Major Lazer'] },
      { t: '4-8 min', options: ['One Kiss - Calvin Harris', 'How Deep Is Your Love - Calvin Harris', 'Summer - Calvin Harris'] },
    ],
    sequence: [
      {
        name: 'Biceps con Discos',
        steps: [
          'Sujeta los discos con las palmas hacia arriba.',
          'Flexiona codos manteniéndolos pegados a las costillas.',
          'Extiende casi por completo sin bloquear codos.',
          'Rodillas suaves (no bloqueadas).',
        ],
        type: 'standing_arms',
      },
      {
        name: 'Tricep Kickback',
        steps: [
          'Inclina el torso 45 grados hacia adelante.',
          'Estira brazos hacia atrás sobrepasando la cadera.',
          'Mantén la mirada al suelo para alinear el cuello.',
          'Pequeños pulsos arriba al final de la serie.',
        ],
        type: 'standing_lean_arms',
      },
    ],
  },
  {
    id: 7,
    title: '4 Puntos de Apoyo',
    duration: '6 min',
    equipment: ['Cubo'],
    songs: [
      { t: '0-3 min', options: ['Stronger - Kanye West', 'Power - Kanye West', 'All of the Lights - Kanye West'] },
      { t: '3-6 min', options: ['Work - Rihanna', 'Desperado - Rihanna', 'Needed Me - Rihanna'] },
    ],
    sequence: [
      {
        name: 'Plancha Inclinada sobre Cubo',
        steps: [
          'Apoya las manos sobre el cubo de yoga.',
          'Estira las piernas formando una línea recta.',
          'Empuja activamente el suelo con los brazos.',
          'Mantén el ombligo hacia la columna.',
        ],
        type: 'plank_cube',
      },
      {
        name: 'Knee to Chest',
        steps: [
          'Desde la plancha, lleva rodilla derecha al pecho.',
          'Redondea ligeramente la espalda alta.',
          'Regresa a plancha y alterna con la izquierda.',
          'Ritmo constante siguiendo la música.',
        ],
        type: 'plank_knees',
      },
    ],
  },
  {
    id: 8,
    title: 'Glúteos (Puentes)',
    duration: '8 min',
    equipment: ['Pelotita', 'Ligas'],
    songs: [
      { t: '0-4 min', options: ['Shape of You - Ed Sheeran', 'Bad Habits - Ed Sheeran', 'Shivers - Ed Sheeran'] },
      { t: '4-8 min', options: ['Watermelon Sugar - Harry Styles', 'As It Was - Harry Styles', 'Adore You - Harry Styles'] },
    ],
    sequence: [
      {
        name: 'Puente de Glúteo con Pelota',
        steps: [
          'Túmbate boca arriba con rodillas flexionadas.',
          'Coloca la pelota entre las rodillas y aprieta.',
          'Eleva la pelvis articulando vértebra a vértebra.',
          'Mantén la presión constante sobre la pelota.',
        ],
        type: 'bridge_ball',
      },
      {
        name: 'Pulsos de Puente',
        steps: [
          'Mantén la pelvis en el punto más alto.',
          'Baja solo 5 cm y vuelve a subir rápido.',
          'Relaja los hombros y el cuello.',
          'Siente el trabajo en isquiotibiales y glúteos.',
        ],
        type: 'bridge_pulses',
      },
    ],
  },
  {
    id: 9,
    title: 'Abdominales',
    duration: '8 min',
    equipment: ['Pelotita', 'Aro'],
    songs: [
      { t: '0-4 min', options: ['Toxic - Britney Spears', 'Womanizer - Britney Spears', 'Gimme More - Britney Spears'] },
      { t: '4-8 min', options: ['Single Ladies - Beyoncé', 'Crazy in Love - Beyoncé', 'Formation - Beyoncé'] },
    ],
    sequence: [
      {
        name: 'Crunch con Aro',
        steps: [
          'Sujeta el aro con ambas manos frente al pecho.',
          'Sube el torso apretando ligeramente el aro.',
          'Exhala en cada subida.',
          'Mantén la zona lumbar pegada al mat.',
        ],
        type: 'abs_crunch',
      },
      {
        name: 'Tijeras de Piernas',
        steps: [
          'Eleva ambas piernas a 90 grados.',
          'Baja una pierna rozando el suelo sin tocarlo.',
          'Cambia de pierna con un movimiento fluido.',
          'Manos detrás de la nuca para apoyo cervical.',
        ],
        type: 'abs_scissors',
      },
    ],
  },
  {
    id: 10,
    title: 'Estiramiento Final',
    duration: '6 min',
    equipment: ['Sin equipo'],
    songs: [
      { t: '0-3 min', options: ['Ocean Eyes - Billie Eilish', 'Lovely - Billie Eilish', 'Everything I Wanted - Billie Eilish'] },
      { t: '3-6 min', options: ['Shallow - Lady Gaga', 'Always Remember Us This Way - Lady Gaga', "I'll Never Love Again - Lady Gaga"] },
    ],
    sequence: [
      {
        name: 'Estiramiento de Paloma',
        steps: [
          'Flexiona la rodilla derecha adelante y estira la izquierda atrás.',
          'Baja el torso sobre la pierna flexionada.',
          'Respira profundamente dejando caer el peso.',
          'Cambia de lado después de 1 minuto.',
        ],
        type: 'stretch_pigeon',
      },
      {
        name: 'Postura del Niño',
        steps: [
          'Siéntate sobre los talones con rodillas abiertas.',
          'Camina con las manos hacia adelante estirando la espalda.',
          'Apoya la frente en el suelo.',
          'Relájate por completo agradeciendo tu práctica.',
        ],
        type: 'stretch_child',
      },
    ],
  },
];
