
import { VectorResult, DxfParams, VectorParams, Arc, OriginPosition } from '../types.ts';

const transformPoint = (x: number, y: number, cx: number, cy: number, cos: number, sin: number, offsetX: number, offsetY: number) => {
    const dx = x - cx;
    const dy = y - cy;
    const rx = dx * cos - dy * sin + cx;
    const ry = dx * sin + dy * cos + cy;
    return [rx + offsetX, ry + offsetY];
};

export const generateDXF = (vectorData: VectorResult, params: DxfParams, vParams: VectorParams): string => {
  const { polylines, arcs } = vectorData;
  const layer = params.layerName || 'CUT_PATH';
  
  const scaleX = vParams.physicalWidth / vectorData.width;
  const scaleY = vParams.physicalHeight / vectorData.height;
  
  const rad = (vParams.rotation || 0) * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Origin Calculations
  let cx_off = 0, cy_off = 0;
  const physW = vParams.physicalWidth;
  const physH = vParams.physicalHeight;

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

      // Center of rotation is design center
      const centerX = physW / 2;
      const centerY = physH / 2;
      
      const [rx, ry] = transformPoint(x_mm, y_mm, centerX, centerY, cos, sin, vParams.offsetX - cx_off, vParams.offsetY - cy_off);
      return [rx, ry];
  };

  const header = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
  let entities = '';

  polylines.forEach(poly => {
    if (params.polylineType === 'LWPOLYLINE') {
      entities += `0\nLWPOLYLINE\n8\n${layer}\n90\n${poly.length}\n70\n1\n`;
      poly.forEach(([px, py]) => {
        const [x, y] = getCoord(px, py);
        entities += `10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n`;
      });
    } else {
      entities += `0\nPOLYLINE\n8\n${layer}\n66\n1\n70\n1\n`;
      poly.forEach(([px, py]) => {
        const [x, y] = getCoord(px, py);
        entities += `0\nVERTEX\n8\n${layer}\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n`;
      });
      entities += `0\nSEQEND\n`;
    }
  });

  const footer = `0\nENDSEC\n0\nEOF\n`;
  return header + entities + footer;
};

export const downloadDXF = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
