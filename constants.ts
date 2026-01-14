
import { ProcessingParams, VectorParams, DxfParams, GCodeParams, MachinePreset } from './types';

export const DEFAULT_PROCESSING_PARAMS: ProcessingParams = {
  brightness: 0,
  contrast: 0,
  threshold: 128,
  invert: false,
  blur: 0,
};

export const DEFAULT_VECTOR_PARAMS: VectorParams = {
  noiseThreshold: 10,
  simplify: 0.5,
  smoothness: 0,
  curveFitting: 0.5,
  units: 'mm',
  physicalWidth: 100.000,
  physicalHeight: 100.000,
  materialWidth: 200.000,
  materialHeight: 200.000,
  lockAspectRatio: true,
  flipX: false,
  flipY: false,
  rotation: 0.000,
  offsetX: 0.000,
  offsetY: 0.000,
  originPosition: 'bottom-left',
  snapToGrid: false,
  gridSize: 10.000,
  showGrid: true
};

export const DEFAULT_GCODE_PARAMS: GCodeParams = {
  feedRate: 1200,
  plungeRate: 300,
  spindleSpeed: 12000,
  cutDepth: -1.500,
  stepDown: 1.500,
  safeZ: 5.000,
  toolDiameter: 3.175,
};

export const DEFAULT_DXF_PARAMS: DxfParams = {
  polylineType: 'LWPOLYLINE',
  mirrorY: true,
  flattenArcs: false,
  layerName: 'CUT_PATH',
};

export const MACHINE_PRESETS: MachinePreset[] = [
  {
    id: 'router',
    name: 'CNC Router Pro',
    description: 'Precision wood/plastic 3-axis machining',
    gcode: { feedRate: 2000, plungeRate: 500, spindleSpeed: 18000, cutDepth: -3.000, stepDown: 1.500, safeZ: 10.000, toolDiameter: 6.350 },
    dxf: { polylineType: 'LWPOLYLINE', mirrorY: true, flattenArcs: false, layerName: 'CNC_PROFILE' }
  },
  {
    id: 'laser',
    name: 'Industrial Laser',
    description: 'High-speed vector pathing & engraving',
    gcode: { feedRate: 4000, plungeRate: 4000, spindleSpeed: 1000, cutDepth: 0.000, stepDown: 0.000, safeZ: 3.000, toolDiameter: 0.150 },
    dxf: { polylineType: 'LWPOLYLINE', mirrorY: true, flattenArcs: true, layerName: 'LASER_PATH' }
  },
  {
    id: 'mill',
    name: 'Desktop Mill',
    description: 'Precision metal profile machining',
    gcode: { feedRate: 800, plungeRate: 200, spindleSpeed: 4500, cutDepth: -1.000, stepDown: 0.500, safeZ: 15.000, toolDiameter: 3.175 },
    dxf: { polylineType: 'POLYLINE', mirrorY: false, flattenArcs: true, layerName: 'MILL_STEPS' }
  }
];

export const ANALYSIS_PROMPT = `
You are a Senior CNC Quality Inspector.
Evaluate the current contrast-threshold image for vector suitability:
1. Is the detail resolution sharp enough for a 1/8" bit?
2. Are there areas where lines might blur into non-geometric blobs?
3. Suggest the optimal "Simplification" level for smooth G-code.
Respond with 3 specific technical points and a score.
`;
