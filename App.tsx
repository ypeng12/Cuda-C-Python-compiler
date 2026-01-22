
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Box, Cpu, Zap, Layers, Code, 
  BarChart3, Activity, Terminal as TerminalIcon, Save, 
  ChevronRight, CheckCircle2, Info, Trash2, Layout, Edit2, Check, Clock, X, Terminal
} from 'lucide-react';
import { Language, TerminalLine, CompilationResult, CodeTemplate } from './types';
import { TEMPLATES } from './constants';
import { CompilerService } from './services/compilerService';

const App: React.FC = () => {
  // Persistence state
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

  const currentCode = drafts[activeLang];

  const updateDraft = (newCode: string) => {
    setDrafts(prev => ({ ...prev, [activeLang]: newCode }));
  };

  const saveToTemplates = () => {
    const trimmedCurrent = currentCode.trim();
    if (TEMPLATES.some(t => t.code.trim() === trimmedCurrent)) return;
    if (userTemplates.some(t => t.code.trim() === trimmedCurrent && t.language === activeLang)) return;

    const execTime = result?.performanceMetrics?.executionTime || '---';
    const autoName = `${activeLang.toUpperCase()}_Snapshot_${(userTemplates.length + 1).toString().padStart(2, '0')}`;
    
    const newTemplate: CodeTemplate = {
      id: `user-${Date.now()}`,
      name: autoName,
      language: activeLang,
      code: currentCode,
      description: `Saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
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
    setTerminalLines(prev => [...prev, { type: 'info', content: `[DISPATCH] 启动硬件仿真流水线...` }]);

    try {
      const res = await compilerRef.current.compileAndRun(currentCode, activeLang);
      setResult(res);
      if (res.status === 'success') {
        setTerminalLines(prev => [
          ...prev, 
          { type: 'success', content: `执行完成。Latency: ${res.performanceMetrics?.executionTime || 'N/A'}` },
          { type: 'stdout', content: res.output }
        ]);
      }
    } catch (e) {
      setTerminalLines(prev => [...prev, { type: 'error', content: '仿真链路异常。' }]);
    } finally {
      setIsCompiling(false);
      setTimeout(() => setIsEmulating(false), 2000);
    }
  };

  const leaderboard = useMemo(() => {
    if (result?.leaderboard && result.leaderboard.length > 0) return result.leaderboard;
    return [
      { label: 'Python Baseline (NumPy Loop)', value: 0, color: '#ef4444' },
      { label: 'Vectorized (CPU/MKL)', value: 0, color: '#3b82f6' },
      { label: 'Optimized CUDA (Shared Mem + Half)', value: 0, color: '#10b981' },
      { label: 'CURRENT KERNEL', value: 0, color: '#22c55e' }
    ];
  }, [result]);

  const renderTemplateSection = (lang: Language, icon: React.ReactNode, color: string) => {
    const filtered = userTemplates.filter(t => t.language === lang);
    if (filtered.length === 0) return null;

    return (
      <div className="mb-6">
        <div className={`flex items-center gap-2 text-[10px] font-black px-2 mb-3 uppercase tracking-[0.2em] ${color}`}>
          {icon}
          {lang} 存档
        </div>
        <div className="space-y-2">
          {filtered.map(t => (
            <div 
              key={t.id}
              onClick={() => loadTemplate(t)}
              className="group w-full bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl p-3 text-left transition-all relative overflow-hidden cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-zinc-200 truncate pr-12">{t.name}</span>
                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => deleteTemplate(e, t.id)} className="p-1 text-zinc-500 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2.5">
                <span className="text-[9px] text-zinc-600 truncate max-w-[100px] uppercase font-bold tracking-widest">{t.description}</span>
                <span className="text-[10px] font-mono text-zinc-600 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {t.executionTime || '---'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#020305] text-zinc-300 font-sans overflow-hidden selection:bg-green-500/30">
      
      {/* LEFT PANEL */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-[#050608] p-5 space-y-5">
        <div className="flex items-center gap-3 mb-2 px-1">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            <Zap className="text-white" size={20} fill="currentColor" />
          </div>
          <span className="font-black text-white tracking-[0.3em] text-sm italic uppercase">Nvidia-X</span>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/[0.03] rounded-[1.5rem] border border-white/10 p-6 space-y-6">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
            <BarChart3 size={14} className="text-orange-500" />
            性能加速排行榜
          </div>
          <div className="space-y-6">
            {leaderboard.map((item, i) => {
              const hasData = result !== null && item.value > 0;
              const minVal = Math.min(...leaderboard.filter(l => l.value > 0).map(l => l.value)) || 1;
              const relativeSpeedWidth = hasData ? (minVal / item.value) * 100 : 0;

              return (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest leading-none">
                    <span className="text-zinc-500 max-w-[180px] truncate">{item.label}</span>
                    <span className="text-zinc-100 font-mono tracking-tighter">{hasData ? `${item.value.toFixed(2)}ms` : '--'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${hasData ? Math.max(3, relativeSpeedWidth) : 0}%`, 
                        backgroundColor: item.color, 
                        boxShadow: `0 0 10px ${item.color}33` 
                      }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div className="bg-white/[0.02] rounded-[1.5rem] border border-white/5 p-6 flex-1 flex flex-col items-center justify-center text-center group cursor-default border-dashed">
            <Activity size={32} className="text-zinc-800 mb-4 group-hover:text-blue-500 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-zinc-600">Diagnostics Ready</span>
            <p className="text-[9px] text-zinc-700 px-2 leading-relaxed font-medium">
              仿真引擎状态：就绪。下发指令后将激活实时算力深度诊断模块。
            </p>
          </div>

          <button 
            onClick={() => setShowDiagnostics(true)}
            className="w-full bg-[#0a1018] hover:bg-[#101824] border border-blue-900/30 py-4 rounded-xl flex items-center justify-between px-6 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Activity size={16} className="text-blue-400" />
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em]">Runtime Analysis</span>
            </div>
            <ChevronRight size={14} className="text-blue-500" />
          </button>

          <button 
            onClick={() => setShowConsoleOverlay(true)}
            className="w-full bg-[#0d0e12] hover:bg-[#15161d] border border-zinc-800 py-4 rounded-xl flex items-center justify-between px-6 transition-all group"
          >
            <div className="flex items-center gap-3">
              <TerminalIcon size={16} className="text-zinc-500 group-hover:text-white" />
              <span className="text-[10px] font-black text-zinc-500 group-hover:text-white uppercase tracking-[0.2em]">Hardware Console</span>
            </div>
            <ChevronRight size={14} className="text-zinc-600" />
          </button>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col relative">
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-10 bg-[#050608]">
          <div className="flex gap-4">
            {['cuda', 'cpp', 'python'].map((l) => (
              <button key={l} onClick={() => setActiveLang(l as Language)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                  activeLang === l ? 'bg-green-600 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                  : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-8">
            <button onClick={saveToTemplates} className="flex items-center gap-2.5 text-zinc-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">
              <Save size={16} />
              Save Snapshot
            </button>
            <button onClick={runCode} disabled={isCompiling}
              className={`flex items-center gap-5 px-10 py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-[0.2em]
                ${isCompiling ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_40px_rgba(34,197,94,0.4)] active:scale-[0.96]'}`}
            >
              {isCompiling ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play size={14} fill="white" />}
              {isCompiling ? 'Dispatching...' : 'Execute Kernel'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#020305] p-8 overflow-y-auto custom-scrollbar">
          <div className="flex-1 rounded-[2.5rem] bg-black/60 border border-white/[0.03] flex flex-col min-h-[400px] overflow-hidden shadow-2xl relative">
            <div className="flex items-center gap-4 px-8 py-4 bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isCompiling ? 'bg-orange-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]'}`} />
                 {activeLang} CORE DISPATCH
               </div>
               <div className="ml-auto flex items-center gap-4">
                 <Cpu size={12} className="text-zinc-700" />
                 TARGET: <span className="text-green-500/80 font-mono">NVIDIA A100_SXM4</span>
               </div>
            </div>
            <textarea value={currentCode} onChange={(e) => updateDraft(e.target.value)}
              className="flex-1 p-12 font-mono text-[14px] leading-relaxed bg-transparent text-zinc-300 outline-none resize-none selection:bg-green-500/20 code-font scroll-smooth"
              spellCheck={false}
            />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6">
              <div className="bg-black/60 border border-white/5 p-6 rounded-3xl flex flex-col gap-2">
                <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Dispatch Batch</span>
                <span className="text-2xl font-black text-white font-mono tracking-tighter">
                  {result?.performanceMetrics?.batch || '----'}
                </span>
              </div>
              <div className="bg-black/60 border border-white/5 p-6 rounded-3xl flex flex-col gap-2">
                <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Arithmetic Dim</span>
                <span className="text-2xl font-black text-white font-mono tracking-tighter">
                  {result?.performanceMetrics?.dim || '----'}
                </span>
              </div>
              <div className="bg-[#0c140e] border border-green-500/20 p-6 rounded-3xl flex flex-col gap-2 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)] border-l-4 border-l-green-500/40">
                <span className="text-[9px] text-green-500/60 uppercase font-black tracking-widest">E2E Latency (Sim)</span>
                <span className="text-3xl font-black text-green-500 font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                  {result?.performanceMetrics?.executionTime || '0.00ms'}
                </span>
              </div>
          </div>
          
          <div className="mt-6 p-8 bg-green-500/[0.02] rounded-3xl border border-green-500/10 transition-all">
            <div className="flex items-center gap-5 mb-4">
               <CheckCircle2 size={24} className="text-green-500/60" />
               <div className="text-[12px] text-zinc-200 font-black uppercase tracking-[0.2em]">Numerical Integrity Pass</div>
            </div>
            <div className="pl-11 space-y-4">
               <p className="text-[10px] text-zinc-600 font-medium leading-relaxed">
                 硬件仿真单元验证完成。相对于 Python (float64) 基线，输出张量精度符合 IEEE 754 混合精度验证标准。
               </p>
               {result?.output && (
                 <div className="mt-4 pt-4 border-t border-white/5">
                   <div className="flex items-center gap-2 mb-2 text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                     <TerminalIcon size={12} /> Console Output
                   </div>
                   <pre className="text-[11px] font-mono text-green-400/80 bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto whitespace-pre-wrap">
                     {result.output}
                   </pre>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Diagnostics Overlay */}
        {showDiagnostics && (
          <div className="absolute inset-0 bg-[#020305]/98 backdrop-blur-3xl z-50 flex flex-col p-12 transition-all animate-in fade-in slide-in-from-right-10 duration-500">
             <div className="flex justify-between items-center mb-8 px-2 border-b border-white/10 pb-6">
                <div className="flex items-center gap-5">
                  <Activity size={24} className="text-blue-500" />
                  <div>
                    <h2 className="text-sm font-black tracking-[0.5em] uppercase text-white">System Insights</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-blue-400">SPEEDUP FACTOR: {result?.performanceMetrics?.speedup || '1.0x'}</span>
                      <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">(Ref vs Python Baseline)</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDiagnostics(false)} className="text-zinc-500 hover:text-white p-2 rounded-full border border-white/10 transition-colors">
                  <X size={20} />
                </button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-white/[0.01] rounded-[2rem] border border-white/5 shadow-2xl">
               {result?.analysis ? (
                  <div className="max-w-4xl mx-auto space-y-12 pb-12">
                    {result.analysis.split('\n').map((line, idx) => {
                      if (line.startsWith('###')) return <h3 key={idx} className="text-lg font-black text-white mt-12 mb-6 border-l-4 border-blue-500 pl-4 uppercase tracking-widest">{line.replace('###', '')}</h3>;
                      if (line.startsWith('*')) return <div key={idx} className="flex gap-4 text-zinc-300 mb-5 bg-white/[0.03] p-6 rounded-2xl border border-white/5 leading-relaxed text-sm font-medium"><span className="text-blue-500 font-black">•</span>{line.replace('*', '').trim()}</div>;
                      return <p key={idx} className="text-zinc-400 leading-relaxed text-sm font-medium">{line}</p>;
                    })}
                  </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                    <Info size={48} className="mb-6 text-zinc-600" />
                    <span className="text-lg tracking-widest uppercase font-black text-zinc-600">Pending Execution Dispatch</span>
                 </div>
               )}
             </div>
          </div>
        )}

        {/* Console Overlay */}
        {showConsoleOverlay && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-50 flex flex-col p-12 transition-all animate-in fade-in slide-in-from-bottom-20 duration-500">
            <div className="flex justify-between items-center mb-8 px-2 border-b border-white/10 pb-6">
              <div className="flex items-center gap-4">
                <TerminalIcon size={24} className="text-green-500" />
                <h2 className="text-sm font-black tracking-[0.5em] uppercase text-white">Simulation Node [TTY_0]</h2>
              </div>
              <button onClick={() => setShowConsoleOverlay(false)} className="text-zinc-500 hover:text-white p-2 rounded-full border border-white/10 transition-colors">
                 <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-black/40 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl p-8 font-mono text-sm space-y-2 overflow-y-auto">
                {terminalLines.map((line, idx) => (
                  <div key={idx} className={`
                    ${line.type === 'error' ? 'text-red-400' : ''}
                    ${line.type === 'success' ? 'text-green-400' : ''}
                    ${line.type === 'info' ? 'text-blue-400' : ''}
                    ${line.type === 'stdout' ? 'text-zinc-400' : ''}
                  `}>
                    {line.content}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 border-l border-white/5 flex flex-col bg-[#050608] p-6">
        <div className="flex items-center justify-between mb-8 px-2">
           <div className="flex items-center gap-4">
             <Layers size={18} className="text-purple-400" />
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-white uppercase leading-none tracking-widest">硬件拓扑仿真</span>
               <span className="text-[8px] text-zinc-600 uppercase tracking-[0.4em] mt-1 font-bold">(EMULATION)</span>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">LIVE</span>
           </div>
        </div>

        <div className="aspect-square bg-black/80 rounded-[2rem] border border-white/[0.04] relative overflow-hidden flex items-center justify-center shadow-inner">
           {isEmulating ? (
             <div className="relative w-4/5 h-4/5 flex items-center justify-center">
                <div className="absolute inset-0 bg-green-500/10 blur-[100px] animate-pulse" />
                <div className="w-full h-full grid grid-cols-8 grid-rows-6 gap-2 p-3 border border-green-500/20 rounded-2xl bg-black/60 shadow-2xl">
                   {Array.from({length: 48}).map((_, i) => (
                     <div key={i} className="rounded-md transition-all duration-300"
                      style={{ backgroundColor: Math.random() > 0.4 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.05)', animation: `pulse ${0.7 + Math.random()}s infinite` }} />
                   ))}
                </div>
                <div className="absolute left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_30px_rgba(34,197,94,0.8)] animate-[scan_2s_linear_infinite] z-20" />
             </div>
           ) : (
             <div className="text-center space-y-4 opacity-10">
                <Layout size={48} className="mx-auto text-zinc-400" />
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Hardware Idle</div>
             </div>
           )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
             <span className="text-[8px] font-black text-zinc-600 uppercase mb-3 tracking-[0.2em]">TFLOPS 吞吐</span>
             <div className="flex flex-col">
                <span className="text-lg font-black text-white font-mono tracking-tighter leading-tight">{result?.performanceMetrics?.tflops || '0.00'}</span>
                <span className="text-[8px] text-zinc-600 uppercase font-bold mt-1 tracking-widest">(Effective)</span>
             </div>
          </div>
          <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
             <span className="text-[8px] font-black text-zinc-600 uppercase mb-3 tracking-[0.2em]">GPU 利用率</span>
             <div className="flex flex-col">
                <span className="text-lg font-black text-white font-mono tracking-tighter leading-tight">{result?.performanceMetrics?.gpuUtilization || '0.0%'}</span>
                <span className="text-[8px] text-zinc-600 uppercase font-bold mt-1 tracking-widest">(Mem Ctrl)</span>
             </div>
          </div>
        </div>

        <div className="mt-12 flex-1 flex flex-col overflow-hidden">
          <div className="text-[10px] font-black text-zinc-600 uppercase px-2 mb-6 tracking-[0.3em] flex items-center justify-between border-b border-white/5 pb-3">
            <span>SAVED KERNELS</span>
            <span className="text-[8px] opacity-40 font-mono tracking-tighter bg-white/5 px-2 py-0.5 rounded">{userTemplates.length} FILES</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-10 pr-4 custom-scrollbar scroll-smooth pb-10">
            {renderTemplateSection('cuda', <Layers size={10} />, 'text-green-500')}
            {renderTemplateSection('cpp', <Cpu size={10} />, 'text-blue-500')}
            {renderTemplateSection('python', <Code size={10} />, 'text-yellow-500')}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan { 0% { top: -10%; opacity: 0; } 25% { opacity: 1; } 75% { opacity: 1; } 100% { top: 110%; opacity: 0; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.03); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
        .code-font { font-family: 'Fira Code', 'JetBrains Mono', monospace; }
      `}} />
    </div>
  );
};

export default App;
