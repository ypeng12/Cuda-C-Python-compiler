
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Box, Cpu, Zap, Layers, Code, 
  BarChart3, Activity, Terminal as TerminalIcon, Save, 
  ChevronRight, CheckCircle2, Info, Trash2, Layout, X,
  Activity as Heartbeat, GripHorizontal
} from 'lucide-react';
import { Language, TerminalLine, CompilationResult, CodeTemplate } from './types';
import { TEMPLATES } from './constants';
import { CompilerService } from './services/compilerService';

const App: React.FC = () => {
  const [activeLang, setActiveLang] = useState<Language>(() => {
    return (localStorage.getItem('nv_active_lang') as Language) || 'cuda';
  });
  
  const [drafts, setDrafts] = useState<Record<Language, string>>(() => {
    const saved = localStorage.getItem('nv_drafts');
    if (saved) return JSON.parse(saved);
    return {
      cuda: TEMPLATES.find(t => t.language === 'cuda')?.code || '',
      cpp: TEMPLATES.find(t => t.language === 'cpp')?.code || '',
      python: TEMPLATES.find(t => t.language === 'python')?.code || '',
    };
  });
  
  const [userTemplates, setUserTemplates] = useState<CodeTemplate[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [showConsoleOverlay, setShowConsoleOverlay] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isEmulating, setIsEmulating] = useState(false);

  const [consoleHeight, setConsoleHeight] = useState(240); 
  const [isResizing, setIsResizing] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  const compilerRef = useRef<CompilerService | null>(null);

  useEffect(() => {
    compilerRef.current = new CompilerService();
    const savedTemplates = localStorage.getItem('user_templates');
    if (savedTemplates) setUserTemplates(JSON.parse(savedTemplates));
  }, []);

  useEffect(() => {
    localStorage.setItem('nv_active_lang', activeLang);
    localStorage.setItem('nv_drafts', JSON.stringify(drafts));
  }, [activeLang, drafts]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing && consoleRef.current) {
      const container = consoleRef.current.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY - 10;
      const minHeight = 80;
      const maxHeight = window.innerHeight * 0.7;
      if (newHeight > minHeight && newHeight < maxHeight) {
        setConsoleHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const currentCode = drafts[activeLang];

  const updateDraft = (newCode: string) => {
    setDrafts(prev => ({ ...prev, [activeLang]: newCode }));
  };

  const saveToTemplates = () => {
    const trimmedCurrent = currentCode.trim();
    if (!trimmedCurrent) return;

    const execTime = result?.performanceMetrics?.executionTime || '---';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const autoName = `${activeLang.toUpperCase()}_Snapshot_${(userTemplates.length + 1).toString().padStart(2, '0')}`;
    
    const newTemplate: CodeTemplate = {
      id: `user-${Date.now()}`,
      name: autoName,
      language: activeLang,
      code: currentCode,
      description: `Saved at ${timestamp}`,
      isUserSaved: true,
      executionTime: execTime
    };
    
    const updated = [...userTemplates, newTemplate];
    setUserTemplates(updated);
    localStorage.setItem('user_templates', JSON.stringify(updated));
  };

  const deleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = userTemplates.filter(t => t.id !== id);
    setUserTemplates(updated);
    localStorage.setItem('user_templates', JSON.stringify(updated));
  };

  const loadTemplate = (t: CodeTemplate) => {
    setActiveLang(t.language);
    setDrafts(prev => ({ ...prev, [t.language]: t.code }));
  };

  const runCode = async () => {
    if (isCompiling || !compilerRef.current) return;
    setIsCompiling(true);
    setIsEmulating(true);
    setResult(null);
    setTerminalLines([]);

    try {
      const res = await compilerRef.current.compileAndRun(currentCode, activeLang);
      setResult(res);
      if (res.status === 'success') {
        setTerminalLines([
          { type: 'info', content: `[SYSTEM] Target: NVIDIA A100 / Xeon Multi-Core SIMD` },
          { type: 'info', content: `[MEM] Allocating buffer...` },
          { type: 'success', content: `[OK] Dispatched. Latency: ${res.performanceMetrics?.executionTime}` },
          { type: 'stdout', content: res.output }
        ]);
      }
    } catch (e) {
      setTerminalLines([{ type: 'error', content: '[ERROR] Simulation backend error.' }]);
    } finally {
      setIsCompiling(false);
      setTimeout(() => setIsEmulating(false), 300);
    }
  };

  const parseTimeValue = (timeStr?: string): number | null => {
    if (!timeStr || timeStr === '---' || timeStr.includes('N/A')) return null;
    const match = timeStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  };

  const leaderboard = useMemo(() => {
    const getBestTime = (lang: Language, fallback: number) => {
      const times = userTemplates
        .filter(t => t.language === lang)
        .map(t => parseTimeValue(t.executionTime))
        .filter((t): t is number => t !== null);
      return times.length > 0 ? Math.min(...times) : fallback;
    };

    const currentVal = parseTimeValue(result?.performanceMetrics?.executionTime) || 0;

    return [
      { label: 'Python Snapshot (Best)', value: getBestTime('python', 1850.50), color: '#ef4444' },
      { label: 'C++ Snapshot (Best)', value: getBestTime('cpp', 125.40), color: '#f59e0b' },
      { label: 'CUDA Snapshot (Best)', value: getBestTime('cuda', 8.20), color: '#10b981' },
      { label: 'CURRENT DISPATCH', value: currentVal, color: '#3b82f6' }
    ];
  }, [userTemplates, result]);

  const renderSavedGroup = (lang: Language, icon: React.ReactNode, color: string) => {
    const group = userTemplates.filter(t => t.language === lang);
    if (group.length === 0) return null;

    return (
      <div className="mb-5 last:mb-0">
        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] mb-3 opacity-50 ${color}`}>
          {icon} {lang} snapshots
        </div>
        <div className="space-y-2">
          {group.map(t => (
            <div key={t.id} onClick={() => loadTemplate(t)}
              className="bg-white/[0.02] border border-white/5 p-3 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-white/[0.05] transition-all"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-zinc-300 truncate group-hover:text-white">{t.name}</span>
                <span className="text-[9px] text-zinc-600 uppercase mt-0.5">{t.executionTime || '---'}</span>
              </div>
              <button onClick={(e) => deleteTemplate(e, t.id)} className="p-1 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen w-full bg-[#020305] text-zinc-300 font-sans overflow-hidden selection:bg-green-500/20 ${isResizing ? 'cursor-row-resize' : ''}`}>
      
      {/* LEFT PANEL - 固定宽度，不收缩 */}
      <div className="w-[320px] flex-shrink-0 border-r border-white/5 flex flex-col bg-[#050608] p-5 space-y-5 overflow-y-auto custom-scrollbar z-20">
        <div className="flex items-center gap-3 mb-2 px-1">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
            <Zap className="text-white" size={18} fill="currentColor" />
          </div>
          <span className="font-black text-white tracking-widest text-sm uppercase italic">Nvidia-X</span>
        </div>

        {/* Leaderboard */}
        <div className="bg-[#0c0d11] rounded-xl border border-blue-500/10 p-5 space-y-5 shadow-lg">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            <BarChart3 size={14} className="text-orange-500" />
            性能加速排行榜
          </div>
          <div className="space-y-5">
            {leaderboard.map((item, i) => {
              const val = item.value || 0;
              const active = val > 0;
              const validValues = leaderboard.filter(l => l.value > 0).map(l => l.value);
              const minVal = validValues.length > 0 ? Math.min(...validValues) : 1;
              const barWidth = active ? (minVal / val) * 100 : 0;
              
              return (
                <div key={i} className="space-y-2.5">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest leading-none">
                    <span className="text-zinc-500 truncate max-w-[150px]">{item.label}</span>
                    <span className="text-zinc-100 font-mono text-[10px]">{active ? `${val.toFixed(2)}MS` : '--'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${active ? Math.max(2, barWidth) : 0}%`, 
                        backgroundColor: item.color,
                        boxShadow: `0 0 10px ${item.color}44`
                      }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="bg-[#030406] border border-white/5 p-5 rounded-xl flex flex-col group">
            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">E2E Latency</span>
            <div className="text-2xl font-black text-green-500 font-mono mt-1 group-hover:text-green-400 transition-colors">
              {result?.performanceMetrics?.executionTime || '0.000 ms'}
            </div>
          </div>
          <div className="bg-[#030406] border border-white/5 p-5 rounded-xl flex flex-col group">
            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Throughput Efficiency</span>
            <div className="text-base font-black text-white font-mono mt-1 group-hover:text-blue-400 transition-colors">
              {result?.performanceMetrics?.tflops || '---'}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button onClick={() => setShowDiagnostics(true)} className="w-full bg-[#0d0e12] border border-white/5 py-3.5 rounded-lg flex items-center justify-between px-5 transition-all hover:bg-white/5 group">
            <span className="text-[11px] font-black text-blue-400 group-hover:text-blue-300 uppercase tracking-widest">Architecture Analysis</span>
            <ChevronRight size={14} className="text-blue-500" />
          </button>
          <button onClick={() => setShowConsoleOverlay(true)} className="w-full bg-[#0d0e12] border border-white/5 py-3.5 rounded-lg flex items-center justify-between px-5 transition-all hover:bg-white/5 group">
            <span className="text-[11px] font-black text-zinc-500 group-hover:text-white uppercase tracking-widest">Full Node Log</span>
            <ChevronRight size={14} className="text-zinc-600" />
          </button>
        </div>
      </div>

      {/* CENTER PANEL - min-w-0 确保不会撑开父容器 */}
      <div className="flex-1 min-w-0 flex flex-col relative bg-[#020305]">
        <div className="h-16 border-b border-white/5 flex-shrink-0 flex items-center justify-between px-8 bg-[#050608] z-10">
          <div className="flex gap-3">
            {['cuda', 'cpp', 'python'].map((l) => (
              <button key={l} onClick={() => setActiveLang(l as Language)}
                className={`px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border ${
                  activeLang === l ? 'bg-green-600 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <button onClick={saveToTemplates} className="text-zinc-500 hover:text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5">
              <Save size={16} /> Save Snapshot
            </button>
            {/* 固定宽度的按钮，防止 Dispatching 时拉伸布局 */}
            <button onClick={runCode} disabled={isCompiling}
              className={`flex items-center justify-center gap-4 w-[180px] py-2.5 rounded-lg font-black text-[11px] transition-all uppercase tracking-widest
                ${isCompiling ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 active:scale-95'}`}
            >
              {isCompiling ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play size={14} fill="white" />}
              {isCompiling ? 'Dispatching...' : 'Execute Kernel'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-5 overflow-hidden">
          <div className="flex-1 bg-black/40 border border-white/5 rounded-xl flex flex-col overflow-hidden shadow-2xl min-h-0">
            <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{activeLang} Core Dispatch</span>
              <div className="flex items-center gap-4">
                <Cpu size={12} className="text-zinc-800" />
                <span className="text-[10px] font-mono text-green-500/50">NVIDIA_A100_SXM4_80GB</span>
              </div>
            </div>
            <textarea value={currentCode} onChange={(e) => updateDraft(e.target.value)}
              className="flex-1 p-8 font-mono text-[15px] bg-transparent text-zinc-300 outline-none resize-none custom-scrollbar leading-relaxed"
              spellCheck={false}
              placeholder="// Write code here..."
            />
          </div>

          {/* Resize Handle */}
          <div 
            onMouseDown={startResizing}
            className={`h-2 w-full cursor-row-resize flex items-center justify-center group transition-colors hover:bg-green-500/20 my-1 rounded-full ${isResizing ? 'bg-green-500/40' : 'bg-transparent'}`}
          >
            <div className="w-12 h-1 rounded-full bg-zinc-800 group-hover:bg-zinc-600 transition-colors" />
          </div>

          {/* Console Output - 固定高度状态 */}
          <div 
            ref={consoleRef}
            style={{ height: `${consoleHeight}px` }}
            className="bg-[#08090b] flex-shrink-0 rounded-xl border border-white/5 p-5 flex flex-col overflow-hidden shadow-inner transition-[height] duration-75 ease-out"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <ChevronRight size={12} className="text-green-500" /> Console Output (Shapes/Logs)
              </span>
              {result?.performanceMetrics?.batch && <span className="text-[9px] font-mono text-zinc-700">BATCH: {result.performanceMetrics.batch}</span>}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/30 rounded-lg p-5">
              <pre className="text-[13px] font-mono text-green-500/80 leading-relaxed whitespace-pre">
                {result?.output || (isCompiling ? "Initializing virtualization environment..." : "Terminal ready. Awaiting command.")}
              </pre>
            </div>
          </div>
        </div>

        {/* Overlays */}
        {showConsoleOverlay && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col p-10 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-5">
              <div className="flex items-center gap-4">
                <TerminalIcon size={24} className="text-green-500" />
                <h2 className="text-sm font-black tracking-widest uppercase text-white">Full Node Simulation [TTY_0]</h2>
              </div>
              <button onClick={() => setShowConsoleOverlay(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 bg-black/40 rounded-xl border border-white/10 p-8 font-mono text-[12px] space-y-1.5 overflow-y-auto custom-scrollbar">
              {terminalLines.map((line, idx) => (
                <div key={idx} className={line.type === 'error' ? 'text-red-400' : line.type === 'success' ? 'text-green-400' : line.type === 'info' ? 'text-blue-400' : 'text-zinc-500'}>
                  <span className="mr-4 opacity-30">[{new Date().toLocaleTimeString()}]</span>
                  {line.content}
                </div>
              ))}
            </div>
          </div>
        )}

        {showDiagnostics && (
          <div className="absolute inset-0 bg-[#020305]/98 backdrop-blur-xl z-50 flex flex-col p-10 animate-in fade-in slide-in-from-right-4 duration-200">
             <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-5">
                <h2 className="text-sm font-black tracking-widest uppercase text-white">Runtime Intelligence Analysis</h2>
                <button onClick={() => setShowDiagnostics(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-xl p-10">
                {result?.analysis ? (
                   <div className="max-w-4xl mx-auto space-y-8">
                     {result.analysis.split('\n').map((line, idx) => <p key={idx} className="text-zinc-400 leading-relaxed text-sm">{line}</p>)}
                   </div>
                ) : <div className="text-center text-zinc-800 uppercase tracking-widest text-[12px] mt-24 opacity-30 italic">Analysis Cache Empty</div>}
             </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - 固定宽度，不收缩 */}
      <div className="w-[320px] flex-shrink-0 border-l border-white/5 flex flex-col bg-[#050608] p-5 overflow-y-auto custom-scrollbar">
        <div className="aspect-square bg-black/40 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center mb-8 shadow-inner">
           <div className="w-[85%] h-[85%] grid grid-cols-10 grid-rows-10 gap-1.5 p-1.5">
              {Array.from({length: 100}).map((_, i) => (
                  <div key={i} className={`rounded-[1px] transition-all duration-300 ${isEmulating ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-white/5'}`} 
                    style={{ opacity: isEmulating ? Math.random() * 0.8 + 0.2 : 0.1 }} />
              ))}
           </div>
           {!isEmulating && <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-zinc-800 uppercase tracking-[0.4em] pointer-events-none">NODE_ARRAY_IDLE</div>}
        </div>

        <div className="flex-1">
          <div className="text-[10px] font-black text-zinc-600 uppercase px-1 mb-5 tracking-widest flex justify-between items-center border-b border-white/5 pb-3">
            <span>SAVED KERNELS</span>
            <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-zinc-500">{userTemplates.length}</span>
          </div>
          
          <div className="space-y-5">
            {renderSavedGroup('cuda', <Layers size={12} />, 'text-green-500')}
            {renderSavedGroup('cpp', <Cpu size={12} />, 'text-blue-500')}
            {renderSavedGroup('python', <Code size={12} />, 'text-yellow-500')}
            {userTemplates.length === 0 && (
              <div className="text-center p-8 border border-dashed border-white/5 rounded-xl opacity-20 text-[9px] uppercase tracking-widest font-black">Archive Empty</div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;
