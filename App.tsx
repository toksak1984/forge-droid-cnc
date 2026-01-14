
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import WorkflowPanel from './components/WorkflowPanel.tsx';
import { DEFAULT_PROCESSING_PARAMS, DEFAULT_VECTOR_PARAMS, DEFAULT_DXF_PARAMS, DEFAULT_GCODE_PARAMS } from './constants.ts';
import { ProcessingParams, VectorParams, VectorResult, AnalysisResult, DxfParams, GCodeParams, MachinePreset, AppStep } from './types.ts';
import { traceBitmap } from './services/vectorizer.ts';
import { generateDXF, downloadDXF } from './services/dxfExporter.ts';
import { generateGCode, downloadGCode } from './services/gcodeExporter.ts';
import { analyzeImage } from './services/geminiService.ts';
import { 
  ArrowPathIcon, 
  ChevronRightIcon,
  XMarkIcon, 
  MagnifyingGlassPlusIcon, 
  MagnifyingGlassMinusIcon,
  CameraIcon,
  PhotoIcon,
  CpuChipIcon,
  CubeTransparentIcon,
  SparklesIcon,
  ArrowUturnLeftIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>('input');
  
  const [processParams, setProcessParams] = useState<ProcessingParams>(DEFAULT_PROCESSING_PARAMS);
  const [vectorParams, setVectorParams] = useState<VectorParams>(DEFAULT_VECTOR_PARAMS);
  const [dxfParams, setDxfParams] = useState<DxfParams>(DEFAULT_DXF_PARAMS);
  const [gcodeParams, setGcodeParams] = useState<GCodeParams>(DEFAULT_GCODE_PARAMS);
  
  const [vectorResult, setVectorResult] = useState<VectorResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
  const [imageVersion, setImageVersion] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Layout / Bottom Sheet States
  const [panelHeight, setPanelHeight] = useState(380); // Default height in pixels
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const headerHeight = 56; // h-14 = 56px
  
  // Preview States
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCut, setIsDraggingCut] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
  const lastDistRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyImageFilters = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.filter = `contrast(${100 + processParams.contrast}%) brightness(${100 + processParams.brightness}%) grayscale(100%)`;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = processParams.threshold;
    const invert = processParams.invert;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      let val = avg > threshold ? 255 : 0;
      if (invert) val = 255 - val;
      data[i] = data[i+1] = data[i+2] = val;
    }
    ctx.filter = 'none';
    ctx.putImageData(imageData, 0, 0);
  }, [processParams]);

  useEffect(() => {
    if (currentStep === 'filter' || currentStep === 'vector') {
      const raf = requestAnimationFrame(() => { applyImageFilters(); });
      return () => cancelAnimationFrame(raf);
    }
  }, [applyImageFilters, currentStep, imageVersion]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "https://picsum.photos/1000/1000";
    img.onload = () => {
      originalImageRef.current = img;
      setImgDims({ width: img.width, height: img.height });
      const ar = img.width / img.height;
      setAspectRatio(ar);
      setVectorParams(prev => ({ 
        ...prev, 
        physicalWidth: 100, 
        physicalHeight: 100 / ar,
        materialWidth: 200,
        materialHeight: 200
      }));
      setImageVersion(v => v + 1);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          originalImageRef.current = img;
          setImgDims({ width: img.width, height: img.height });
          const ar = img.width / img.height;
          setAspectRatio(ar);
          setVectorParams(prev => ({ 
            ...prev, 
            physicalWidth: 100, 
            physicalHeight: 100 / ar,
            materialWidth: 200,
            materialHeight: 200
          }));
          setImageVersion(v => v + 1);
          setVectorResult(null);
          setCurrentStep('filter');
          setZoom(1);
          setOffset({ x: 0, y: 0 });
          setPanelHeight(380);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const updateVectorParams = (updates: Partial<VectorParams>) => {
    setVectorParams(prev => {
      const next = { ...prev, ...updates };
      if (prev.lockAspectRatio) {
        if ('physicalWidth' in updates && updates.physicalWidth !== prev.physicalWidth) {
          next.physicalHeight = (updates.physicalWidth || 1) / aspectRatio;
        } else if ('physicalHeight' in updates && updates.physicalHeight !== prev.physicalHeight) {
          next.physicalWidth = (updates.physicalHeight || 1) * aspectRatio;
        }
      }
      return next;
    });
  };

  const handleTrace = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      try {
        const result = await traceBitmap(imageData, vectorParams, (pct, msg) => {
          setProgress(pct);
          setProgressMessage(msg);
        });
        setVectorResult({ ...result, width: canvasRef.current.width, height: canvasRef.current.height });
        setCurrentStep('export');
      } catch (err) {
        console.error(err);
      }
    }
    setIsProcessing(false);
  };

  const handleAnalyze = async () => {
    if (!canvasRef.current) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeImage(canvasRef.current.toDataURL('image/jpeg', 0.5));
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    }
    setIsAnalyzing(false);
  };

  const previewScale = useMemo(() => 2.5, []);

  // Panel Dragging Logic
  const handlePanelTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDraggingPanel(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastTouchRef.current = { x: 0, y: clientY };
    e.stopPropagation();
  };

  // Double tap/click to maximize or reset
  const handlePanelDoubleClick = () => {
     if (panelHeight > window.innerHeight * 0.8) {
         setPanelHeight(380);
     } else {
         setPanelHeight(window.innerHeight - headerHeight);
     }
  };

  const handleGlobalTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (isDraggingPanel && lastTouchRef.current) {
      const deltaY = lastTouchRef.current.y - clientY;
      setPanelHeight(prev => {
        // Allow expanding almost to top (leave header visible usually, but allow full cover if desired)
        // Max height: Window height - headerHeight (to keep header) or full window.
        // Let's cap at window.innerHeight so it can push header out of view if flex-1 shrinks to 0.
        const maxHeight = window.innerHeight; 
        const minHeight = 100;
        return Math.max(minHeight, Math.min(maxHeight, prev + deltaY));
      });
      lastTouchRef.current = { x: 0, y: clientY };
      return;
    }

    // Preview interaction
    if ('touches' in e && e.touches.length === 1 && lastTouchRef.current && !isDraggingPanel) {
      const dx = clientX - lastTouchRef.current.x;
      const dy = clientY - lastTouchRef.current.y;

      if (isDraggingCut) {
        const physDx = dx / (previewScale * zoom);
        const physDy = -dy / (previewScale * zoom);
        let newX = vectorParams.offsetX + physDx;
        let newY = vectorParams.offsetY + physDy;
        if (vectorParams.snapToGrid) {
            newX = Math.round(newX / vectorParams.gridSize) * vectorParams.gridSize;
            newY = Math.round(newY / vectorParams.gridSize) * vectorParams.gridSize;
        }
        updateVectorParams({ offsetX: newX, offsetY: newY });
      } else {
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      lastTouchRef.current = { x: clientX, y: clientY };
    } else if ('touches' in e && e.touches.length === 2 && lastDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / lastDistRef.current;
      setZoom(prev => Math.min(10, Math.max(0.1, prev * ratio)));
      lastDistRef.current = dist;
    }
  };

  const handleGlobalTouchEnd = () => {
    setIsDraggingPanel(false);
    setIsDraggingCut(false);
    lastTouchRef.current = null;
    lastDistRef.current = null;
  };

  const getOriginPos = (origin: string, stockW: number, stockH: number) => {
    switch (origin) {
      case 'center': return { x: stockW / 2, y: stockH / 2 };
      case 'top-left': return { x: 0, y: 0 };
      case 'top-right': return { x: stockW, y: 0 };
      case 'bottom-right': return { x: stockW, y: stockH };
      default: return { x: 0, y: stockH }; 
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full bg-[#050508] text-slate-300 relative overflow-hidden font-sans select-none"
      onMouseMove={handleGlobalTouchMove}
      onMouseUp={handleGlobalTouchEnd}
      onTouchMove={handleGlobalTouchMove}
      onTouchEnd={handleGlobalTouchEnd}
    >
      <div className="absolute top-[-20%] left-[-20%] w-[140vw] h-[140vw] bg-violet-900/5 rounded-full blur-[140px] pointer-events-none z-0" />
      
      {/* Header */}
      <header className="h-14 shrink-0 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2.5">
           <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <CpuChipIcon className="w-5 h-5 text-white" />
           </div>
           <div>
               <h1 className="text-xs font-bold text-white tracking-widest uppercase">Forge<span className="text-violet-500">Droid</span></h1>
               <div className="flex items-center gap-1.5">
                 <span className="text-[8px] text-fuchsia-400 font-mono tracking-widest uppercase opacity-80">{currentStep}</span>
                 {vectorResult && (
                   <>
                     <div className="w-1 h-1 rounded-full bg-slate-700" />
                     <span className="text-[8px] text-slate-500 font-mono uppercase">{vectorResult.nodeCount} pts</span>
                   </>
                 )}
               </div>
           </div>
        </div>
        <div className="flex items-center gap-2">
           {currentStep !== 'input' && (
             <button onClick={() => setCurrentStep('input')} className="p-2 rounded-full bg-white/5 text-slate-400 active:bg-red-500/20 active:text-red-400 transition-all">
                <ArrowUturnLeftIcon className="w-5 h-5" />
             </button>
           )}
        </div>
      </header>

      {/* Main Preview Area - uses flex-1 to fill remaining space */}
      <main 
        className="flex-1 min-h-0 relative overflow-hidden touch-none" 
        onTouchStart={(e) => {
           if (e.touches.length === 1) {
              lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
           } else if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              lastDistRef.current = Math.sqrt(dx * dx + dy * dy);
           }
        }}
      >
          <div className="w-full h-full flex items-center justify-center pointer-events-none" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transition: lastTouchRef.current ? 'none' : 'transform 0.15s cubic-bezier(0.23, 1, 0.32, 1)' }}>
            {currentStep === 'input' ? (
                <div className="flex flex-col items-center gap-8 pointer-events-auto px-6">
                   <div className="text-center space-y-3">
                      <h2 className="text-3xl font-bold text-white tracking-tight">Machine Ready</h2>
                      <p className="text-sm text-slate-500 max-w-[260px] mx-auto leading-relaxed">Precision Raster-to-Vector conversion.</p>
                   </div>
                   <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
                      <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-[2rem] active:scale-95 active:bg-violet-600 transition-all cursor-pointer group shadow-xl">
                        <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center group-active:bg-white/20">
                           <CameraIcon className="w-7 h-7 text-violet-400 group-active:text-white" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold uppercase tracking-widest text-white">Capture Blueprint</span>
                           <span className="text-[10px] text-slate-500 font-mono">Snap Machine Bed</span>
                        </div>
                        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                      </label>
                      <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-[2rem] active:scale-95 active:bg-fuchsia-600 transition-all cursor-pointer group shadow-xl">
                        <div className="w-14 h-14 rounded-2xl bg-fuchsia-600/20 flex items-center justify-center group-active:bg-white/20">
                           <PhotoIcon className="w-7 h-7 text-fuchsia-400 group-active:text-white" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold uppercase tracking-widest text-white">Import Design</span>
                           <span className="text-[10px] text-slate-500 font-mono">From Local Library</span>
                        </div>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                   </div>
                </div>
            ) : currentStep === 'export' && vectorResult ? (
                <div 
                  className="relative bg-black/40 border border-slate-700 pointer-events-auto shadow-2xl"
                  style={{ 
                    width: vectorParams.materialWidth * previewScale, 
                    height: vectorParams.materialHeight * previewScale 
                  }}
                >
                    {/* Stock Grid */}
                    {vectorParams.showGrid && (
                      <>
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                            style={{ 
                              backgroundImage: `linear-gradient(to right, #666 1px, transparent 1px), linear-gradient(to bottom, #666 1px, transparent 1px)`, 
                              backgroundSize: `${(vectorParams.gridSize / 2) * previewScale}px ${(vectorParams.gridSize / 2) * previewScale}px` 
                            }} 
                        />
                        <div className="absolute inset-0 opacity-[0.15] pointer-events-none" 
                            style={{ 
                              backgroundImage: `linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)`, 
                              backgroundSize: `${vectorParams.gridSize * previewScale}px ${vectorParams.gridSize * previewScale}px` 
                            }} 
                        />
                      </>
                    )}

                    {/* Origin Marker */}
                    {(() => {
                      const origin = getOriginPos(vectorParams.originPosition, vectorParams.materialWidth * previewScale, vectorParams.materialHeight * previewScale);
                      return (
                        <div className="absolute z-10" style={{ left: origin.x, top: origin.y, transform: 'translate(-50%, -50%)' }}>
                          <div className="w-4 h-4 rounded-full border border-fuchsia-500 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-fuchsia-500 animate-ping" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Vector Toolpath Container */}
                    {(() => {
                      const origin = getOriginPos(vectorParams.originPosition, vectorParams.materialWidth * previewScale, vectorParams.materialHeight * previewScale);
                      const cutX = origin.x + (vectorParams.offsetX * previewScale);
                      const cutY = origin.y - (vectorParams.offsetY * previewScale);

                      return (
                        <div 
                          className={`absolute cursor-move group select-none transition-shadow ${isDraggingCut ? 'ring-2 ring-violet-500 shadow-2xl shadow-violet-500/20 z-30' : ''}`}
                          onMouseDown={(e) => { e.stopPropagation(); setIsDraggingCut(true); }}
                          onTouchStart={(e) => { e.stopPropagation(); setIsDraggingCut(true); lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
                          style={{ 
                            left: cutX, 
                            top: cutY, 
                            width: vectorParams.physicalWidth * previewScale, 
                            height: vectorParams.physicalHeight * previewScale,
                            transform: `translate(${vectorParams.originPosition.includes('right') ? '-100%' : '0'}, ${vectorParams.originPosition.includes('bottom') ? '-100%' : '0'}) rotate(${vectorParams.rotation}deg) scaleX(${vectorParams.flipX ? -1 : 1}) scaleY(${vectorParams.flipY ? -1 : 1})`,
                            transformOrigin: 'top left'
                          }}
                        >
                          <svg width="100%" height="100%" viewBox={`0 0 ${vectorResult.width} ${vectorResult.height}`} preserveAspectRatio="none" className="overflow-visible">
                            <path d={vectorResult.svgPath} fill="none" stroke="#a78bfa" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                            <rect x="0" y="0" width={vectorResult.width} height={vectorResult.height} fill="violet" fillOpacity="0.05" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 2" />
                          </svg>
                          <div className={`absolute -top-6 left-0 flex gap-2 transition-opacity duration-200 ${isDraggingCut ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                             <span className="text-[7px] font-mono bg-violet-600 text-white px-1.5 py-0.5 rounded shadow-lg uppercase">Cut Bounds</span>
                             <span className="text-[7px] font-mono bg-black/60 text-slate-400 px-1.5 py-0.5 rounded uppercase">X:{vectorParams.offsetX.toFixed(3)} Y:{vectorParams.offsetY.toFixed(3)}</span>
                          </div>
                        </div>
                      );
                    })()}
                </div>
            ) : (
                <canvas ref={canvasRef} className="max-w-[95%] max-h-[95%] shadow-2xl border border-white/10 rounded-sm transition-transform" />
            )}
          </div>
          <div className="absolute bottom-6 right-6 flex flex-col gap-4 z-40">
              {currentStep === 'filter' && !isAnalyzing && (
                <button onClick={handleAnalyze} className="w-14 h-14 bg-gradient-to-tr from-fuchsia-600 to-violet-600 rounded-full flex items-center justify-center shadow-2xl shadow-violet-600/40 active:scale-90 transition-transform border border-white/20 pointer-events-auto">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </button>
              )}
              {currentStep !== 'input' && (
                <div className="flex flex-col gap-2 pointer-events-auto">
                  <button onClick={() => setZoom(z => Math.min(10, z * 1.2))} className="w-12 h-12 bg-black/60 backdrop-blur rounded-full flex items-center justify-center border border-white/10 active:bg-violet-600 shadow-lg">
                    <MagnifyingGlassPlusIcon className="w-5 h-5 text-white" />
                  </button>
                  <button onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} className="w-12 h-12 bg-black/60 backdrop-blur rounded-full flex items-center justify-center border border-white/10 active:bg-violet-600 shadow-lg">
                    <MagnifyingGlassMinusIcon className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
          </div>
      </main>

      {/* Bottom Control Sheet */}
      <div 
        className={`shrink-0 z-[60] relative bg-[#0a0a0f] border-t border-white/10 transition-shadow ${isDraggingPanel ? 'shadow-[0_-30px_60px_rgba(0,0,0,0.8)]' : 'shadow-[0_-20px_50px_rgba(0,0,0,0.5)]'}`}
        style={{ height: `${panelHeight}px` }}
      >
        {/* Resize Handle / Tab */}
        <div 
           className="h-10 w-full flex items-center justify-center cursor-ns-resize group active:bg-white/5 transition-colors shrink-0"
           onMouseDown={handlePanelTouchStart}
           onTouchStart={handlePanelTouchStart}
           onDoubleClick={handlePanelDoubleClick}
        >
           <div className="h-1.5 w-14 bg-slate-800 rounded-full shadow-inner group-hover:bg-slate-700 transition-colors" />
        </div>

        <WorkflowPanel 
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isOpen={true}
          processParams={processParams} setProcessParams={setProcessParams}
          vectorParams={vectorParams} setVectorParams={updateVectorParams}
          dxfParams={dxfParams} setDxfParams={setDxfParams}
          gcodeParams={gcodeParams} setGcodeParams={setGcodeParams}
          onTrace={handleTrace}
          onExportDXF={() => vectorResult && downloadDXF(generateDXF(vectorResult, dxfParams, vectorParams), 'forge_droid_export.dxf')}
          onExportGCode={() => vectorResult && downloadGCode(generateGCode(vectorResult, vectorParams, gcodeParams), 'toolpath.nc')}
          analysis={analysis}
        />
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center backdrop-blur-xl">
           <div className="text-center w-full px-12 space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="relative w-24 h-24 mx-auto">
                <CubeTransparentIcon className="w-full h-full text-violet-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                 <div className="text-violet-400 font-bold text-xs uppercase tracking-[0.4em] mb-2">{progressMessage}</div>
                 <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.4)]" style={{ width: `${progress}%` }} />
                 </div>
                 <div className="text-[10px] text-slate-600 font-mono tracking-widest">{progress.toFixed(0)}% COMPLETE</div>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        .pb-safe { padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 20px)); }
        input[type='range'] { -webkit-appearance: none; background: transparent; }
        input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; height: 24px; width: 24px; border-radius: 50%; background: #8b5cf6; box-shadow: 0 0 10px rgba(139, 92, 246, 0.4); cursor: pointer; margin-top: -10px; }
        input[type='range']::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #1e1e2e; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
