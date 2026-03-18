// --- TIPOS ---
export interface SongBlock {
  t: string;
  options: string[];
}

export interface SequenceItem {
  name: string;
  steps: string[];
  type: string;
}

export interface Routine {
  id: number;
  title: string;
  duration: string;
  equipment: string[];
  songs: SongBlock[];
  sequence: SequenceItem[];
}
