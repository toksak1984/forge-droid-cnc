
export type Units = 'mm' | 'in';
export type AppStep = 'input' | 'filter' | 'vector' | 'export';
export type OriginPosition = 'bottom-left' | 'top-left' | 'center' | 'bottom-right' | 'top-right';

export interface ProcessingParams {
  brightness: number;
  contrast: number;
  threshold: number;
  invert: boolean;
  blur: number;
}

export interface VectorParams {
  noiseThreshold: number; 
  simplify: number; 
  smoothness: number;
  curveFitting: number; 
  units: Units;
  physicalWidth: number; 
  physicalHeight: number;
  materialWidth: number;
  materialHeight: number;
  lockAspectRatio: boolean;
  flipX: boolean;
  flipY: boolean;
  rotation: number; 
  offsetX: number; 
  offsetY: number; 
  originPosition: OriginPosition;
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
}

export interface GCodeParams {
  feedRate: number;
  plungeRate: number;
  spindleSpeed: number;
  cutDepth: number; 
  stepDown: number; 
  safeZ: number;
  toolDiameter: number;
}

export interface DxfParams {
  polylineType: 'LWPOLYLINE' | 'POLYLINE';
  mirrorY: boolean;
  flattenArcs: boolean;
  layerName: string;
}

export interface MachinePreset {
  id: string;
  name: string;
  description: string;
  gcode: GCodeParams;
  dxf: DxfParams;
}

export interface Arc {
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  isClockwise: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface VectorResult {
  svgPath: string;
  polylines: number[][][]; 
  arcs: Arc[];
  nodeCount: number;
  width: number;
  height: number;
}

export interface AnalysisResult {
  text: string;
  status: 'good' | 'warning' | 'critical';
}
