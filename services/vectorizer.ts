
import { VectorParams, VectorResult } from '../types.ts';

/**
 * The worker source code is inlined to avoid cross-origin and path resolution issues 
 * in restrictive preview environments.
 */
const workerSource = `
import * as d3 from 'https://aistudiocdn.com/d3@^7.9.0';

const round = (num) => Math.round(num * 100) / 100;

const getSqSegDist = (p, p1, p2) => {
  let x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = p2[0]; y = p2[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = p[0] - x; dy = p[1] - y;
  return dx * dx + dy * dy;
};

const simplifyDPStep = (points, first, last, sqTolerance, simplified) => {
  let maxSqDist = sqTolerance;
  let index = -1;
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }
  if (index !== -1) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
};

const simplifyDouglasPeucker = (points, tolerance) => {
  if (points.length <= 2) return points;
  const sqTolerance = tolerance * tolerance;
  const last = points.length - 1;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);
  return simplified;
};

self.onmessage = async (e) => {
  const { imageData, params } = e.data;
  const { width, height, data } = imageData;

  self.postMessage({ type: 'progress', percent: 10, message: 'Building bit-grid...' });

  const values = new Float64Array(width * height);
  for (let i = 0; i < width * height; i++) {
    values[i] = data[i << 2] > 128 ? 1 : 0;
  }

  self.postMessage({ type: 'progress', percent: 30, message: 'Calculating contours...' });
  const contours = d3.contours().size([width, height]).thresholds([0.5])(values);
  const contour = contours[0];

  if (!contour) {
    self.postMessage({ type: 'result', result: { svgPath: '', polylines: [], arcs: [], nodeCount: 0, width, height } });
    return;
  }

  const polylines = [];
  const pathParts = [];
  const totalPolygons = contour.coordinates.length;

  for (let i = 0; i < totalPolygons; i++) {
    if (i % 50 === 0) {
      self.postMessage({ 
        type: 'progress', 
        percent: 40 + (i / totalPolygons) * 50, 
        message: 'Optimizing path ' + i + '/' + totalPolygons + '...' 
      });
    }

    const polygon = contour.coordinates[i];
    for (const ring of polygon) {
      if (params.noiseThreshold > 0 && Math.abs(d3.polygonArea(ring)) < params.noiseThreshold) continue;

      let finalRing = ring;
      if (params.simplify > 0) {
        finalRing = simplifyDouglasPeucker(ring, params.simplify);
      }

      const len = finalRing.length;
      if (len > 2) {
        polylines.push(finalRing);
        const ringSegments = new Array(len + 1);
        const start = finalRing[0];
        ringSegments[0] = 'M' + round(start[0]) + ' ' + round(start[1]);
        
        for (let k = 1; k < len; k++) {
          const p = finalRing[k];
          ringSegments[k] = 'L' + round(p[0]) + ' ' + round(p[1]);
        }
        ringSegments[len] = "Z";
        pathParts.push(ringSegments.join(''));
      }
    }
  }

  const nodeCount = polylines.reduce((acc, p) => acc + p.length, 0);
  
  self.postMessage({ 
    type: 'result', 
    result: {
      svgPath: pathParts.join(''),
      polylines,
      arcs: [],
      nodeCount,
      width,
      height
    } 
  });
};
`;

let worker: Worker | null = null;
let workerUrl: string | null = null;

export const traceBitmap = (
  imageData: ImageData,
  params: VectorParams,
  onProgress: (percent: number, message: string) => void
): Promise<VectorResult> => {
  return new Promise((resolve, reject) => {
    if (worker) {
      worker.terminate();
    }

    try {
      if (!workerUrl) {
        const blob = new Blob([workerSource], { type: 'application/javascript' });
        workerUrl = URL.createObjectURL(blob);
      }

      // CRITICAL: Must use { type: 'module' } to support ESM imports inside the worker.
      worker = new Worker(workerUrl, { type: 'module' });

      worker.onmessage = (e) => {
        const { type, percent, message, result, error } = e.data;
        
        if (type === 'progress') {
          onProgress(percent, message);
        } else if (type === 'result') {
          onProgress(100, 'Tracing complete.');
          worker?.terminate();
          worker = null;
          resolve(result);
        } else if (type === 'error') {
          worker?.terminate();
          worker = null;
          reject(new Error(error));
        }
      };

      worker.onerror = (err) => {
        console.error('Vector Worker Error:', err);
        worker?.terminate();
        worker = null;
        reject(err);
      };

      const dataCopy = new Uint8ClampedArray(imageData.data);
      worker.postMessage({
        imageData: {
          width: imageData.width,
          height: imageData.height,
          data: dataCopy
        },
        params
      }, [dataCopy.buffer]);

    } catch (err) {
      console.error('Failed to initialize worker:', err);
      reject(err);
    }
  });
};
