export interface Project {
  id: string;
  name: string;
  fps: number;
  resolution: { width: number; height: number };
  duration: number;
  tracks: Track[];
  assets: Asset[];
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  name: string;
  clips: Clip[];
}

export interface Clip {
  id: string;
  assetId: string;
  startTime: number;
  duration: number;
  trimIn: number;
  trimOut: number;
  speed: number;
  opacity: number;
  label?: string;
}

export interface Asset {
  id: string;
  type: 'video' | 'audio' | 'image';
  name: string;
  url: string;
  duration?: number;
  width?: number;
  height?: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  thumbnailUrl?: string;
  prompt?: string;
  generatedBy?: string;
  createdAt: string;
}
