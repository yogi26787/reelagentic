export type Word = {w: string; s: number; e: number};

export type Moment = {
  id?: string | number;
  start: number;
  end: number;
  effect: string;
  /** "behind" renders under the person cut-out (text behind you). Default "front". */
  layer?: "front" | "behind";
  props?: Record<string, any>;
  sfx?: string;
  sfxVolume?: number;
  /** seconds after start to play the sfx */
  sfxAt?: number;
};

export type Zoom = {
  start: number;
  end: number;
  scale?: number;
  /** 0..1 focus point; defaults to the face, then frame centre */
  focus?: [number, number];
  /** punch = instant cut-in, smooth = eased push, shake = punch + camera shake */
  type?: "punch" | "smooth" | "shake";
};

export type Transition = {
  time: number;
  type: "whip" | "glitch" | "flash" | "burn" | "leak" | "zoom-blur" | "shake";
  dur?: number;
};

export type Face = {t: number; x: number; y: number; w: number; h: number; q?: number};

export type Captions = {
  style?: string;
  /** vertical centre 0..1 */
  position?: number;
  words?: Word[];
  /** [start,end] windows where captions hide (e.g. under a big title) */
  hide?: [number, number][];
  maxWords?: number;
  uppercase?: boolean;
  /** words to colour with the accent */
  highlight?: string[];
  size?: number;
};

export type Broll = {start: number; end: number; src: string; mode?: "full" | "pip" | "split"; startFrom?: number; muted?: boolean};

export type Story = {
  fps: number;
  width: number;
  height: number;
  duration: number;
  video: string;
  foreground?: string;
  videoVolume?: number;
  look?: string;
  palette?: Record<string, string>;
  captions?: Captions | null;
  music?: {src: string; volume?: number; duck?: boolean; startFrom?: number; labelSong?: boolean} | null;
  zooms?: Zoom[];
  transitions?: Transition[];
  broll?: Broll[];
  moments: Moment[];
  faces?: Face[];
  progressBar?: boolean;
  /** draw Instagram UI safe zones (storyboard stills only) */
  safeZones?: boolean;
  /** snap starts to music beats (render.py, needs beats.json); {tolerance} optional */
  beatSync?: boolean | {tolerance?: number};
  beats?: number[];
  cover?: {time?: number; title?: string; subtitle?: string; frame?: string; face?: Face | null; style?: string};
};
