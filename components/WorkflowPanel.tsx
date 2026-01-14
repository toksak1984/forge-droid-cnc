
import React from 'react';
import { AppStep, ProcessingParams, VectorParams, DxfParams, GCodeParams, AnalysisResult, Units, OriginPosition } from '../types';
import { MACHINE_PRESETS } from '../constants.ts';
import { 
  ChevronRightIcon, 
  ChevronLeftIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  BeakerIcon,
  AdjustmentsHorizontalIcon,
  WrenchScrewdriverIcon,
  ArrowDownTrayIcon,
  Squares2X2Icon,
  ScaleIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowsPointingOutIcon,
  ArrowPathRoundedSquareIcon,
  CommandLineIcon,
  ViewColumnsIcon,
  QueueListIcon,
  XMarkIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface WorkflowPanelProps {
  currentStep: AppStep;
  setCurrentStep: (step: AppStep) => void;
  isOpen: boolean;
  processParams: ProcessingParams;
  setProcessParams: (p: ProcessingParams) => void;
  vectorParams: VectorParams;
  setVectorParams: (p: Partial<VectorParams>) => void;
  dxfParams: DxfParams;
  setDxfParams: (p: DxfParams) => void;
  gcodeParams: GCodeParams;
  setGcodeParams: (p: GCodeParams) => void;
  onTrace: () => void;
  onExportDXF: () => void;
  onExportGCode: () => void;
  analysis: AnalysisResult | null;
}

const Slider = ({ label, value, min, max, step = 1, onChange, unit }: any) => (
  <div className="space-y-4 py-1">
    <div className="flex justify-between items-center px-1">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="text-[11px] font-mono text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20 shadow-sm">
        {value}{unit}
      </div>
    </div>
    <div className="relative flex items-center">
        <input 
          type="range" min={min} max={max} step={step} value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
    </div>
  </div>
);

const PrecisionInput = ({ label, value, onChange, unit, decimals = 3 }: { label: string, value: number, onChange: (v: number) => void, unit?: string, decimals?: number }) => {
  const [localVal, setLocalVal] = React.useState(value.toFixed(decimals));
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (!isEditing) {
      setLocalVal(value.toFixed(decimals));
    }
  }, [value, decimals, isEditing]);

  const step = React.useMemo(() => 1 / Math.pow(10, decimals), [decimals]);

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{label}</label>
      <div className="relative group">
        <input 
          type="number" 
          step={step} 
          value={localVal}
          onChange={(e) => {
            setLocalVal(e.target.value);
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) onChange(num);
          }}
          onFocus={() => setIsEditing(true)}
          onBlur={() => {
            setIsEditing(false);
            const num = parseFloat(localVal);
            if (!isNaN(num)) {
              setLocalVal(num.toFixed(decimals));
              onChange(num);
            } else {
              setLocalVal(value.toFixed(decimals));
            }
          }}
          className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-mono text-violet-300 focus:outline-none focus:border-violet-500/40 transition-all shadow-inner"
        />
        <span className="absolute right-4 top-4 text-[9px] text-slate-600 font-bold pointer-events-none uppercase">{unit}</span>
      </div>
    </div>
  );
};

const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  currentStep, setCurrentStep, isOpen,
  processParams, setProcessParams,
  vectorParams, setVectorParams,
  dxfParams, setDxfParams,
  gcodeParams, setGcodeParams,
  onTrace, onExportDXF, onExportGCode, analysis
}) => {
  // State to track which preset is currently being edited
  const [editingPresetId, setEditingPresetId] = React.useState<string | null>(null);

  if (!isOpen || currentStep === 'input') return null;

  const updateProcess = (k: keyof ProcessingParams, v: any) => setProcessParams({ ...processParams, [k]: v });

  // When editing, we display the name of the active preset, or just "Custom Configuration"
  const activePresetName = MACHINE_PRESETS.find(p => p.id === editingPresetId)?.name || 'Machine Configuration';

  return (
    <div className="h-full flex flex-col bg-transparent">
      
      <div className="flex items-center justify-between px-8 mb-4">
         <div className="flex gap-2">
            {(['filter', 'vector', 'export'] as AppStep[]).map((step) => (
                <div key={step} className={`h-1.5 rounded-full transition-all duration-500 ${currentStep === step ? 'w-10 bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.6)]' : 'w-4 bg-slate-800'}`} />
            ))}
         </div>
         <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Workspace Layer</span>
      </div>

      <div className="flex-1 px-6 py-2 overflow-y-auto custom-scrollbar">
        {currentStep === 'filter' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
               <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center"><BeakerIcon className="w-6 h-6 text-violet-400" /></div>
               <div><h3 className="text-xs font-bold uppercase tracking-widest text-white">Filtering Layer</h3><p className="text-[10px] text-slate-500 uppercase tracking-tighter">Prepare raw data for tracing</p></div>
            </div>
            <div className="space-y-4">
                <Slider label="Light Threshold" value={processParams.threshold} min={0} max={255} onChange={(v:any) => updateProcess('threshold', v)} />
                <Slider label="Edge Contrast" value={processParams.contrast} min={-100} max={100} onChange={(v:any) => updateProcess('contrast', v)} unit="%" />
                <button className={`w-full flex items-center justify-between p-5 rounded-3xl border transition-all active:scale-95 ${processParams.invert ? 'bg-white border-white text-black shadow-lg shadow-white/10' : 'bg-white/5 border-white/10 text-white shadow-inner'}`} onClick={() => updateProcess('invert', !processParams.invert)}>
                   <span className="text-xs font-bold uppercase tracking-widest">Invert Polarities</span>
                   <div className={`w-12 h-6 rounded-full transition-all flex items-center px-1.5 ${processParams.invert ? 'bg-violet-600' : 'bg-slate-700'}`}><div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${processParams.invert ? 'translate-x-5.5' : ''}`} /></div>
                </button>
            </div>
            {analysis && (
              <div className="p-5 bg-violet-950/20 border border-violet-500/20 rounded-[2rem] flex gap-4 animate-in zoom-in-95 duration-300 shadow-xl">
                 <CheckCircleIcon className="w-6 h-6 text-violet-400 shrink-0 mt-0.5" /><div className="space-y-1"><span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block">AI Review</span><p className="text-[11px] font-mono leading-relaxed text-violet-200/80">{analysis.text}</p></div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'vector' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
               <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center"><AdjustmentsHorizontalIcon className="w-6 h-6 text-fuchsia-400" /></div>
               <div><h3 className="text-xs font-bold uppercase tracking-widest text-white">Engineering Tools</h3><p className="text-[10px] text-slate-500 uppercase tracking-tighter">Precision dimensions & CNC setup</p></div>
            </div>

            <div className="space-y-6">
                <div className="bg-white/5 rounded-3xl p-5 space-y-5 border border-white/5 shadow-inner">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ViewColumnsIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Machine Stock Dimensions</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <PrecisionInput label="Material Width" value={vectorParams.materialWidth} onChange={(v) => setVectorParams({ materialWidth: v })} unit={vectorParams.units} />
                        <PrecisionInput label="Material Height" value={vectorParams.materialHeight} onChange={(v) => setVectorParams({ materialHeight: v })} unit={vectorParams.units} />
                    </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-5 space-y-5 border border-white/5 shadow-inner">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Cut Profile Dimensions</span>
                       <button onClick={() => setVectorParams({ lockAspectRatio: !vectorParams.lockAspectRatio })} className="flex items-center gap-2 text-[9px] font-bold text-violet-400 uppercase bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                          {vectorParams.lockAspectRatio ? <LockClosedIcon className="w-3 h-3" /> : <LockOpenIcon className="w-3 h-3" />}
                          {vectorParams.lockAspectRatio ? 'Locked' : 'Free Scale'}
                       </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <PrecisionInput label="Physical Width" value={vectorParams.physicalWidth} onChange={(v) => setVectorParams({ physicalWidth: v })} unit={vectorParams.units} />
                        <PrecisionInput label="Physical Height" value={vectorParams.physicalHeight} onChange={(v) => setVectorParams({ physicalHeight: v })} unit={vectorParams.units} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                        <button onClick={() => setVectorParams({ physicalWidth: vectorParams.physicalWidth * 0.99, physicalHeight: vectorParams.physicalHeight * 0.99 })} className="h-10 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase hover:bg-violet-600 hover:text-white transition-colors">-1% Scale</button>
                        <button onClick={() => setVectorParams({ physicalWidth: vectorParams.physicalWidth * 1.01, physicalHeight: vectorParams.physicalHeight * 1.01 })} className="h-10 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase hover:bg-violet-600 hover:text-white transition-colors">+1% Scale</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setVectorParams({ physicalWidth: vectorParams.materialWidth, physicalHeight: vectorParams.materialWidth / (vectorParams.physicalWidth / vectorParams.physicalHeight) })} 
                            className="h-10 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-violet-600 transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowsPointingOutIcon className="w-3 h-3" /> Fill Stock
                        </button>
                        <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                            {(['mm', 'in'] as Units[]).map(u => (
                                <button key={u} onClick={() => setVectorParams({ units: u })} className={`flex-1 rounded-lg text-[10px] font-bold uppercase transition-all ${vectorParams.units === u ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500'}`}>{u}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-5 space-y-5 border border-white/5 shadow-inner">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Placement & Transforms</span>
                    <div className="grid grid-cols-3 gap-4">
                        <PrecisionInput label="Rotation" value={vectorParams.rotation} onChange={(v) => setVectorParams({ rotation: v })} unit="deg" decimals={3} />
                        <PrecisionInput label="Offset X" value={vectorParams.offsetX} onChange={(v) => setVectorParams({ offsetX: v })} unit={vectorParams.units} decimals={3} />
                        <PrecisionInput label="Offset Y" value={vectorParams.offsetY} onChange={(v) => setVectorParams({ offsetY: v })} unit={vectorParams.units} decimals={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setVectorParams({ flipX: !vectorParams.flipX })} className={`h-12 rounded-2xl border transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase ${vectorParams.flipX ? 'bg-violet-600 border-violet-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500'}`}><ArrowsRightLeftIcon className="w-4 h-4" /> Mirror X</button>
                        <button onClick={() => setVectorParams({ flipY: !vectorParams.flipY })} className={`h-12 rounded-2xl border transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase ${vectorParams.flipY ? 'bg-violet-600 border-violet-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500'}`}><ScaleIcon className="w-4 h-4" /> Mirror Y</button>
                    </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-5 space-y-5 border border-white/5 shadow-inner">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <QueueListIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Grid & Snapping</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-all flex items-center px-1 cursor-pointer ${vectorParams.snapToGrid ? 'bg-violet-600' : 'bg-slate-700'}`} onClick={() => setVectorParams({ snapToGrid: !vectorParams.snapToGrid })}>
                             <div className={`w-4 h-4 rounded-full bg-white transition-transform ${vectorParams.snapToGrid ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Show Grid Lines</span>
                        <div className={`w-12 h-6 rounded-full transition-all flex items-center px-1 cursor-pointer ${vectorParams.showGrid ? 'bg-violet-600' : 'bg-slate-700'}`} onClick={() => setVectorParams({ showGrid: !vectorParams.showGrid })}>
                             <div className={`w-4 h-4 rounded-full bg-white transition-transform ${vectorParams.showGrid ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>
                    <Slider label="Major Grid Size" value={vectorParams.gridSize} min={0.1} max={50} step={0.1} onChange={(v:any) => setVectorParams({ gridSize: v })} unit={vectorParams.units} />
                </div>

                <div className="bg-white/5 rounded-3xl p-5 space-y-5 border border-white/5 shadow-inner pb-10">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Machine Origin Point</span>
                    <div className="grid grid-cols-3 gap-2">
                        {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as OriginPosition[]).map(pos => (
                            <button key={pos} onClick={() => setVectorParams({ originPosition: pos })} className={`h-12 rounded-xl border text-[9px] font-bold uppercase transition-all px-1 leading-tight ${vectorParams.originPosition === pos ? 'bg-violet-600 border-violet-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500'}`}>{pos.replace('-', ' ')}</button>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {currentStep === 'export' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* If Editing a Preset Config */}
            {editingPresetId ? (
              <div className="animate-in slide-in-from-right-4 duration-300">
                 <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                    <button onClick={() => setEditingPresetId(null)} className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                       <ChevronLeftIcon className="w-5 h-5 text-white" />
                    </button>
                    <div>
                       <h3 className="text-xs font-bold uppercase tracking-widest text-white">{activePresetName}</h3>
                       <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Machine Parameters</p>
                    </div>
                 </div>

                 <div className="space-y-6 pb-20">
                    <div className="bg-white/5 rounded-3xl p-5 space-y-5 border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2">
                           <Cog6ToothIcon className="w-4 h-4 text-violet-400" />
                           <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Speeds & Feeds</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <PrecisionInput label="Feed Rate" value={gcodeParams.feedRate} onChange={(v) => setGcodeParams({...gcodeParams, feedRate: v})} unit="mm/min" decimals={0} />
                            <PrecisionInput label="Plunge Rate" value={gcodeParams.plungeRate} onChange={(v) => setGcodeParams({...gcodeParams, plungeRate: v})} unit="mm/min" decimals={0} />
                            <PrecisionInput label="Spindle RPM" value={gcodeParams.spindleSpeed} onChange={(v) => setGcodeParams({...gcodeParams, spindleSpeed: v})} unit="RPM" decimals={0} />
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-3xl p-5 space-y-5 border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2">
                           <ArrowsPointingOutIcon className="w-4 h-4 text-fuchsia-400" />
                           <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Cut Geometry</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <PrecisionInput label="Target Depth" value={gcodeParams.cutDepth} onChange={(v) => setGcodeParams({...gcodeParams, cutDepth: v})} unit={vectorParams.units} decimals={3} />
                            <PrecisionInput label="Step Down" value={gcodeParams.stepDown} onChange={(v) => setGcodeParams({...gcodeParams, stepDown: v})} unit={vectorParams.units} decimals={3} />
                            <PrecisionInput label="Safe Z Height" value={gcodeParams.safeZ} onChange={(v) => setGcodeParams({...gcodeParams, safeZ: v})} unit={vectorParams.units} decimals={3} />
                            <PrecisionInput label="Tool Diameter" value={gcodeParams.toolDiameter} onChange={(v) => setGcodeParams({...gcodeParams, toolDiameter: v})} unit={vectorParams.units} decimals={3} />
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-3xl p-5 space-y-5 border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2">
                           <DocumentArrowDownIcon className="w-4 h-4 text-amber-400" />
                           <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">DXF Output</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                             <div className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Polyline Type</span>
                                <div className="flex bg-black/20 rounded-xl p-1 border border-white/5">
                                    {(['LWPOLYLINE', 'POLYLINE'] as const).map(t => (
                                        <button key={t} onClick={() => setDxfParams({...dxfParams, polylineType: t})} className={`flex-1 h-8 rounded-lg text-[9px] font-bold uppercase transition-all ${dxfParams.polylineType === t ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-sm' : 'text-slate-500'}`}>{t}</button>
                                    ))}
                                </div>
                             </div>
                             <button className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${dxfParams.mirrorY ? 'bg-amber-600/10 border-amber-500/20 text-amber-100' : 'bg-white/5 border-white/10 text-slate-400'}`} onClick={() => setDxfParams({...dxfParams, mirrorY: !dxfParams.mirrorY})}>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Mirror Y Axis</span>
                                <div className={`w-8 h-4 rounded-full transition-all flex items-center px-1 ${dxfParams.mirrorY ? 'bg-amber-500' : 'bg-slate-700'}`}><div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${dxfParams.mirrorY ? 'translate-x-3.5' : ''}`} /></div>
                             </button>
                        </div>
                    </div>

                    <button onClick={() => setEditingPresetId(null)} className="w-full h-14 bg-violet-600 text-white rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-violet-500/20 active:scale-95 transition-all">
                       <CheckCircleIcon className="w-5 h-5" /> Confirm Settings
                    </button>
                 </div>
              </div>
            ) : (
              // Standard Export View
              <>
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                   <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center"><Squares2X2Icon className="w-6 h-6 text-amber-400" /></div>
                   <div><h3 className="text-xs font-bold uppercase tracking-widest text-white">Export Profile</h3><p className="text-[10px] text-slate-500 uppercase tracking-tighter">Ready for final toolpath generation</p></div>
                </div>
                <div className="space-y-6 pb-12">
                    <div className="grid grid-cols-1 gap-3">
                       {MACHINE_PRESETS.map(p => (
                         <div key={p.id} onClick={() => { setGcodeParams(p.gcode); setDxfParams(p.dxf); }} className="text-left p-4 pr-3 rounded-[2rem] bg-white/5 border border-white/5 active:border-violet-600 active:bg-violet-950/20 transition-all group shadow-sm flex items-center justify-between cursor-pointer">
                            <div className="space-y-1 pl-2">
                               <div className="text-[11px] font-bold uppercase tracking-widest text-white group-active:text-violet-400">{p.name}</div>
                               <div className="text-[9px] text-slate-600 leading-tight uppercase font-mono tracking-tighter">{p.description}</div>
                            </div>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setGcodeParams(p.gcode); 
                                setDxfParams(p.dxf);
                                setEditingPresetId(p.id); 
                              }}
                              className="w-12 h-12 rounded-2xl bg-black/20 hover:bg-violet-600 hover:text-white flex items-center justify-center text-slate-600 transition-all border border-white/5 active:scale-90"
                            >
                                <WrenchScrewdriverIcon className="w-5 h-5" />
                            </button>
                         </div>
                       ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button onClick={onExportDXF} className="h-16 bg-white/5 active:bg-violet-600 text-white rounded-3xl flex flex-col items-center justify-center gap-1 transition-all border border-white/10 shadow-xl active:scale-95"><ArrowDownTrayIcon className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Save DXF</span></button>
                        <button onClick={onExportGCode} className="h-16 bg-amber-600/10 active:bg-amber-600 text-amber-500 active:text-white rounded-3xl flex flex-col items-center justify-center gap-1 transition-all border border-amber-600/20 shadow-xl active:scale-95"><CommandLineIcon className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Save G-CODE</span></button>
                    </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-7 pt-4 pb-12 flex items-center gap-4 bg-[#0a0a0f]/80 backdrop-blur-xl border-t border-white/5 shrink-0">
         {currentStep !== 'filter' && (
           <button onClick={() => setCurrentStep(currentStep === 'vector' ? 'filter' : 'vector')} className="h-16 w-16 flex items-center justify-center bg-white/5 rounded-3xl active:scale-95 transition-all text-slate-400 border border-white/10 shadow-xl"><ChevronLeftIcon className="w-7 h-7" /></button>
         )}
         <button onClick={() => { if (currentStep === 'filter') setCurrentStep('vector'); else if (currentStep === 'vector') onTrace(); }} className="flex-1 h-16 bg-violet-600 text-white rounded-3xl flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(139,92,246,0.4)] active:scale-95 transition-all border border-violet-400/20 active:bg-violet-500">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] drop-shadow-md">{currentStep === 'filter' ? 'Step 2: Calibration' : currentStep === 'vector' ? 'Step 3: Analyze Paths' : 'Export Ready'}</span>
            <ChevronRightIcon className="w-6 h-6" />
         </button>
      </div>
    </div>
  );
};

export default WorkflowPanel;
