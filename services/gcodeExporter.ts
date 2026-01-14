
import { VectorResult, GCodeParams, VectorParams, Arc, OriginPosition } from '../types.ts';

const transformPoint = (x: number, y: number, cx: number, cy: number, cos: number, sin: number, offsetX: number, offsetY: number) => {
    const dx = x - cx;
    const dy = y - cy;
    const rx = dx * cos - dy * sin + cx;
    const ry = dx * sin + dy * cos + cy;
    return [rx + offsetX, ry + offsetY];
};

export const generateGCode = (
  vectorData: VectorResult, 
  vParams: VectorParams, 
  gParams: GCodeParams
): string => {
  const { polylines, arcs } = vectorData;
  const scaleX = vParams.physicalWidth / vectorData.width;
  const scaleY = vParams.physicalHeight / vectorData.height;
  const rad = (vParams.rotation || 0) * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const physW = vParams.physicalWidth;
  const physH = vParams.physicalHeight;
  let cx_off = 0, cy_off = 0;

  switch(vParams.originPosition) {
    case 'center': cx_off = physW / 2; cy_off = physH / 2; break;
    case 'top-left': cy_off = physH; break;
    case 'top-right': cx_off = physW; cy_off = physH; break;
    case 'bottom-right': cx_off = physW; break;
    case 'bottom-left': default: break;
  }

  const getCoord = (px: number, py: number) => {
      let x_mm = px * scaleX;
      let y_mm = (vectorData.height - py) * scaleY;
      if (vParams.flipX) x_mm = physW - x_mm;
      if (vParams.flipY) y_mm = physH - y_mm;
      const centerX = physW / 2;
      const centerY = physH / 2;
      return transformPoint(x_mm, y_mm, centerX, centerY, cos, sin, vParams.offsetX - cx_off, vParams.offsetY - cy_off);
  };

  let gcode = `( CNC VECTOR FORGE - PRECISION G-CODE )\nG21 (Metric)\nG90 (Absolute)\nM3 S${gParams.spindleSpeed.toFixed(0)}\nG0 Z${gParams.safeZ.toFixed(3)}\n\n`;
  if (vParams.units === 'in') gcode = gcode.replace('G21', 'G20');

  const targetZ = gParams.cutDepth;
  const stepDown = Math.abs(gParams.stepDown) || Math.abs(targetZ) || 1;
  const passes: number[] = [];
  if (targetZ === 0) passes.push(0);
  else {
      let curZ = 0;
      while (curZ > targetZ) {
          curZ = Math.max(targetZ, curZ - stepDown);
          passes.push(curZ);
      }
  }

  polylines.forEach((poly, pIdx) => {
    const [startX, startY] = getCoord(poly[0][0], poly[0][1]);
    passes.forEach((z, zIdx) => {
        gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)}\nG1 Z${z.toFixed(3)} F${gParams.plungeRate.toFixed(0)}\n`;
        for (let i = 1; i < poly.length; i++) {
            const [x, y] = getCoord(poly[i][0], poly[i][1]);
            gcode += `G1 X${x.toFixed(3)} Y${y.toFixed(3)} F${gParams.feedRate.toFixed(0)}\n`;
        }
        gcode += `G0 Z${gParams.safeZ.toFixed(3)}\n`;
    });
  });

  gcode += `M5\nG0 X0 Y0\nM30`;
  return gcode;
};

export const downloadGCode = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
