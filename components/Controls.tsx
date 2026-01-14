
import React, { useState, useEffect } from 'react';
import { ProcessingParams, VectorParams, DxfParams, GCodeParams, Units, MachinePreset } from '../types';
import { MACHINE_PRESETS } from '../constants.ts';
import { 
  ChevronRightIcon,
  ChevronDownIcon,
  CpuChipIcon, 
  SparklesIcon, 
  WrenchScrewdriverIcon, 
  AdjustmentsHorizontalIcon,
  CommandLineIcon,
  DocumentDuplicateIcon,
  Square3Stack3DIcon,
  BeakerIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';

interface ControlsProps {
  processParams: ProcessingParams;
  setProcessParams: (p: ProcessingParams) => void;
  vectorParams: VectorParams;
  setVectorParams: (p: VectorParams) => void;
  dxfParams: DxfParams;
  setDxfParams: (p: DxfParams) => void;
  gcodeParams: GCodeParams;
  setGcodeParams: (p: GCodeParams) => void;
  onTrace: () => void;
  onExportDXF: () => void;
  onExportGCode: () => void;
  onAnalyze: () => void;
  onApplyPreset: (preset: MachinePreset) => void;
  isAnalyzing: boolean;
  nodeCount: number;
  imgDimensions?: { width: number, height: number };
}

const Section = ({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: any, children?: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between px-4 py-3.5 bg-transparent hover:bg-violet-900/10 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-violet-500 group-hover:text-fuchsia-400 transition-colors duration-300" />
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-white uppercase tracking-widest font-mono">{title}</span>
        </div>
        {isOpen ? <ChevronDownIcon className="w-3 h-3 text-slate-600" /> : <ChevronRightIcon className="w-3 h-3 text-slate-600" />}
      </button>
      {isOpen && <div className="p-4 space-y-5 bg-black/20 animate-in slide-in-from-top-1 duration-200 shadow-inner">{children}</div>}
    </div>
  );
};

const SliderControl = ({ label, value, min, max, step, onChange, unit }: { label: string, value: number, min: number, max: number, step?: number, onChange: (val: number) => void, unit?: string }) => (
  <div className="space-y-2.5">
    <div className="flex justify-between items-center text-[10px] font-mono">
      <label className="text-slate-500 uppercase tracking-wide">{label}</label>
      <span className="text-violet-300 bg-violet-950/40 px-2 py-0.5 rounded border border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
        {value.toFixed(step && step < 1 ? 3 : 0)}{unit}
      </span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step || 1}
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))} 
      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-fuchsia-500 transition-all" 
    />
  </div>
);

const NumberInput = ({ label, value, onChange, unit, step = 0.001 }: { label: string, value: number, onChange: (val: number) => void, unit?: string, step?: number }) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    const num = parseFloat(newVal);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(inputValue);
    if (isNaN(num)) {
      setInputValue(value.toString());
    } else {
      setInputValue(num.toString());
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-slate-500 uppercase font-mono block tracking-wide">{label}</label>
      <div className="relative group">
          <input 
            type="number" 
            step={step}
            value={inputValue} 
            onChange={handleChange}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            className="w-full bg-[#121218] border border-white/10 rounded px-2.5 py-1.5 text-xs text-violet-300 font-mono focus:outline-none focus:border-violet-500/60 focus:bg-[#1a1a24] transition-all shadow-sm group-hover:border-white/20" 
          />
          {unit && <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-600 font-mono">{unit}</span>}
      </div>
    </div>
  );
};

const TextInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] text-slate-500 uppercase font-mono block tracking-wide">{label}</label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#121218] border border-white/10 rounded px-2.5 py-1.5 text-xs text-violet-300 font-mono focus:outline-none focus:border-violet-500/60 focus:bg-[#1a1a24] transition-all shadow-sm hover:border-white/20" 
      />
    </div>
);

const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) => (
  <div className="flex items-center justify-between cursor-pointer group py-1" onClick={() => onChange(!checked)}>
    <label className="text-[11px] text-slate-400 group-hover:text-white font-medium cursor-pointer transition-colors tracking-wide">{label}</label>
    <div className={`w-9 h-4.5 flex items-center rounded-full p-0.5 duration-300 ease-in-out border border-transparent ${checked ? 'bg-violet-600/90 border-violet-400/30 shadow-[0_0_10px_rgba(124,58,237,0.3)]' : 'bg-slate-800'}`}>
      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-4.5' : 'translate-x-0'}`} />
    </div>
  </div>
);

const Controls: React.FC<ControlsProps> = ({
  processParams, setProcessParams,
  vectorParams, setVectorParams,
  dxfParams, setDxfParams,
  gcodeParams, setGcodeParams,
  onTrace, onExportDXF, onExportGCode, onAnalyze,
  onApplyPreset,
  isAnalyzing, nodeCount,
  imgDimensions
}) => {
  
  const updateProcess = (key: keyof ProcessingParams, value: any) => setProcessParams({ ...processParams, [key]: value });
  const updateVector = (key: keyof VectorParams, value: any) => setVectorParams({ ...vectorParams, [key]: value });
  const updateDxf = (key: keyof DxfParams, value: any) => setDxfParams({ ...dxfParams, [key]: value });
  const updateGCode = (key: keyof GCodeParams, value: any) => setGcodeParams({ ...gcodeParams, [key]: value });

  // Calculate proportional height for display
  const calculatedHeight = imgDimensions && imgDimensions.width > 0 
    ? (imgDimensions.height / imgDimensions.width) * vectorParams.physicalWidth 
    : 0;

  return (
    <div className="w-80 bg-[#0a0a0f]/95 backdrop-blur-xl flex flex-col h-full border-r border-white/5 shadow-[4px_0_40px_-10px_rgba(124,58,237,0.15)] z-20 relative overflow-hidden">
      
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent z-30" />

      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 bg-[#0a0a0f] shrink-0 relative z-20">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-800 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)] border border-white/10">
              <CpuChipIcon className="w-5 h-5 text-white" />
           </div>
           <div>
               <h1 className="text-sm font-bold text-white tracking-tight leading-none drop-shadow-md">VECTOR<span className="text-violet-500">FORGE</span></h1>
               <span className="text-[9px] text-fuchsia-400 font-mono tracking-[0.2em] uppercase opacity-80">AI Processor</span>
           </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        
        {/* Presets */}
        <Section title="Machine Presets" icon={Square3Stack3DIcon} defaultOpen={true}>
            <div className="grid grid-cols-1 gap-2">
            {MACHINE_PRESETS.map(preset => (
                <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                className="text-left px-3 py-3 rounded-md bg-[#121218] border border-white/5 hover:border-violet-500/40 hover:bg-[#1a1a24] transition-all group relative overflow-hidden"
                >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-center mb-1 relative z-10">
                    <div className="text-[11px] font-bold text-slate-300 uppercase font-mono group-hover:text-violet-300 transition-colors">{preset.name}</div>
                    {preset.id === 'router' && <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(232,121,249,0.8)] animate-pulse" />}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight group-hover:text-slate-400 transition-colors relative z-10">{preset.description}</div>
                </button>
            ))}
            </div>
        </Section>

        {/* 1. Pre-Processing */}
        <Section title="Image Prep" icon={AdjustmentsHorizontalIcon}>
            <SliderControl label="Threshold" value={processParams.threshold} min={0} max={255} onChange={(v) => updateProcess('threshold', v)} />
            <SliderControl label="Contrast" value={processParams.contrast} min={-100} max={100} onChange={(v) => updateProcess('contrast', v)} unit="%" />
            <SliderControl label="Brightness" value={processParams.brightness} min={-100} max={100} onChange={(v) => updateProcess('brightness', v)} unit="%" />
            <div className="pt-3 border-t border-white/5 mt-2">
                <Toggle label="Invert Colors" checked={processParams.invert} onChange={(v) => updateProcess('invert', v)} />
            </div>
        </Section>

        {/* 2. Vectorization */}
        <Section title="Vector Params" icon={BeakerIcon} defaultOpen={true}>
             <div className="flex items-center justify-between mb-4 bg-[#121218] p-1 rounded-md border border-white/5">
                {(['mm', 'in'] as Units[]).map(u => (
                    <button 
                        key={u}
                        onClick={() => updateVector('units', u)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-all font-mono ${vectorParams.units === u ? 'bg-violet-600 text-white shadow-[0_2px_10px_rgba(124,58,237,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {u.toUpperCase()}
                    </button>
                ))}
            </div>
            
            <SliderControl label="Noise Reduction" value={vectorParams.noiseThreshold} min={0} max={100} onChange={(v) => updateVector('noiseThreshold', v)} />
            <SliderControl label="Simplification" value={vectorParams.simplify} min={0} max={2} step={0.1} onChange={(v) => updateVector('simplify', v)} />
            <SliderControl label="Curve Fitting" value={vectorParams.curveFitting} min={0} max={1} step={0.05} onChange={(v) => updateVector('curveFitting', v)} />
        </Section>

        {/* 2b. Transform & Layout - NEW */}
        <Section title="Transform & Layout" icon={ArrowsPointingOutIcon} defaultOpen={true}>
            <div className="grid grid-cols-2 gap-3 mb-2">
               <NumberInput label="Width" value={vectorParams.physicalWidth} onChange={(v) => updateVector('physicalWidth', v)} unit={vectorParams.units} step={0.001} />
               <div className="opacity-70 pointer-events-none">
                  <NumberInput label="Height (Auto)" value={calculatedHeight} onChange={() => {}} unit={vectorParams.units} step={0.001} />
               </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
               <NumberInput label="Rotation" value={vectorParams.rotation} onChange={(v) => updateVector('rotation', v)} unit="deg" step={0.001} />
               <NumberInput label="Offset X" value={vectorParams.offsetX} onChange={(v) => updateVector('offsetX', v)} unit={vectorParams.units} step={0.001} />
               <NumberInput label="Offset Y" value={vectorParams.offsetY} onChange={(v) => updateVector('offsetY', v)} unit={vectorParams.units} step={0.001} />
            </div>
        </Section>

        {/* 3. Machining */}
        <Section title="Machine Specs" icon={WrenchScrewdriverIcon}>
             <div className="space-y-4">
                 <div>
                    <div className="text-[9px] text-fuchsia-400 font-mono uppercase mb-2 tracking-wider">Speed & Feeds</div>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberInput label="Feed Rate" value={gcodeParams.feedRate} onChange={(v) => updateGCode('feedRate', v)} unit="mm/min" />
                        <NumberInput label="Plunge Rate" value={gcodeParams.plungeRate} onChange={(v) => updateGCode('plungeRate', v)} unit="mm/min" />
                        <NumberInput label="Spindle" value={gcodeParams.spindleSpeed} onChange={(v) => updateGCode('spindleSpeed', v)} unit="RPM" />
                    </div>
                 </div>
                 
                 <div>
                    <div className="text-[9px] text-fuchsia-400 font-mono uppercase mb-2 tracking-wider">Dimensions</div>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberInput label="Cut Depth" value={gcodeParams.cutDepth} onChange={(v) => updateGCode('cutDepth', v)} unit={vectorParams.units} />
                        <NumberInput label="Step Down" value={gcodeParams.stepDown} onChange={(v) => updateGCode('stepDown', v)} unit={vectorParams.units} />
                        <NumberInput label="Tool Dia" value={gcodeParams.toolDiameter} onChange={(v) => updateGCode('toolDiameter', v)} unit={vectorParams.units} />
                        <NumberInput label="Safe Z" value={gcodeParams.safeZ} onChange={(v) => updateGCode('safeZ', v)} unit={vectorParams.units} />
                    </div>
                 </div>
             </div>
        </Section>

        {/* 4. Export */}
        <Section title="Export Format" icon={DocumentDuplicateIcon}>
             <div className="space-y-4">
                <TextInput label="Layer Name" value={dxfParams.layerName} onChange={(v) => updateDxf('layerName', v)} />
                
                <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-mono tracking-wide">DXF Style</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['LWPOLYLINE', 'POLYLINE'].map((type) => (
                            <button
                                key={type}
                                onClick={() => updateDxf('polylineType', type)}
                                className={`py-2 px-2 text-[9px] font-mono border rounded transition-colors ${dxfParams.polylineType === type ? 'border-violet-500/50 bg-violet-900/20 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'border-white/5 bg-[#121218] text-slate-500 hover:border-white/10'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
                <Toggle label="Mirror Y-Axis" checked={dxfParams.mirrorY} onChange={(v) => updateDxf('mirrorY', v)} />
                <Toggle label="Flatten Arcs" checked={dxfParams.flattenArcs} onChange={(v) => updateDxf('flattenArcs', v)} />
             </div>
        </Section>

        <Section title="Quality Control" icon={SparklesIcon}>
            <button 
                onClick={onAnalyze} 
                disabled={isAnalyzing}
                className="w-full py-3.5 bg-gradient-to-r from-fuchsia-700 to-purple-800 hover:from-fuchsia-600 hover:to-purple-700 text-white text-[10px] font-bold uppercase tracking-widest rounded border border-white/10 shadow-[0_0_15px_rgba(192,38,211,0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12" />
                {isAnalyzing ? (
                    <span className="animate-pulse flex items-center gap-2"><SparklesIcon className="w-4 h-4 animate-spin" /> Analyzing...</span>
                ) : (
                    <>
                    <SparklesIcon className="w-4 h-4" />
                    AI Inspection
                    </>
                )}
            </button>
        </Section>
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-white/5 bg-[#08080c] space-y-4 shrink-0 relative z-20">
         <div className="flex justify-between items-center text-[10px] font-mono text-slate-600">
            <span>NODES: <span className="text-violet-400">{nodeCount}</span></span>
            <span>PATHS: <span className="text-violet-400">{nodeCount ? (nodeCount / 12).toFixed(0) : 0}</span></span>
         </div>

         <button 
            onClick={onTrace} 
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-[0.15em] rounded-md shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all active:scale-[0.98] border border-violet-400/30 group"
         >
           <span className="drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">Process Vectors</span>
         </button>

         <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={onExportDXF} 
                disabled={nodeCount === 0} 
                className="flex items-center justify-center gap-2 py-2.5 border border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 hover:border-slate-500 hover:text-white"
            >
                <ArrowDownTrayIcon className="w-3 h-3" /> DXF
            </button>
            <button 
                onClick={onExportGCode} 
                disabled={nodeCount === 0} 
                className="flex items-center justify-center gap-2 py-2.5 border border-amber-900/30 bg-amber-950/20 hover:bg-amber-900/40 text-amber-500 hover:text-amber-400 rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 hover:border-amber-700/50 hover:shadow-[0_0_10px_rgba(245,158,11,0.1)]"
            >
                <CommandLineIcon className="w-3 h-3" /> G-CODE
            </button>
         </div>
      </div>
    </div>
  );
};

export default Controls;