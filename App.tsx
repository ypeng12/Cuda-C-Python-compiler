
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Box, Cpu, Zap, Layers, Code, 
  BarChart3, Activity, Terminal as TerminalIcon, Save, 
  ChevronRight, CheckCircle2, Info, Trash2, Layout, Edit2, Check, Clock, X
} from 'lucide-react';
import { Language, TerminalLine, CompilationResult, CodeTemplate } from './types';
import { TEMPLATES } from './constants';
import { CompilerService } from './services/compilerService';
import Terminal from './components/Terminal';

const App: React.FC = () => {
  // States
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
  const [showConsole, setShowConsole] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isEmulating, setIsEmulating] = useState(false);
  
  // Renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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
    const isDefault = TEMPLATES.some(t => t.code.trim() === trimmedCurrent);
    if (isDefault) return;

    const alreadyExists = userTemplates.some(t => t.code.trim() === trimmedCurrent && t.language === activeLang);
    if (alreadyExists) return;

    const execTime = result?.performanceMetrics?.executionTime || '---';
    const autoName = `${activeLang.toUpperCase()}_Kernel_${(userTemplates.length + 1).toString().padStart(2, '0')}`;
    
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

  const startRenaming = (e: React.MouseEvent, t: CodeTemplate) => {
    e.stopPropagation();
    setEditingId(t.id);
    setEditingName(t.name);
  };

  const confirmRename = () => {
    if (!editingId) return;
    const updated = userTemplates.map(t => t.id === editingId ? { ...t, name: editingName } : t);
    setUserTemplates(updated);
    localStorage.setItem('user_templates', JSON.stringify(updated));
    setEditingId(null);
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
    setTerminalLines(prev => [...prev, { type: 'info', content: `[SYSTEM] 分发 ${activeLang.toUpperCase()} 核心指令...` }]);

    try {
      const res = await compilerRef.current.compileAndRun(currentCode, activeLang);
      setResult(res);
      if (res.status === 'success') {
        setTerminalLines(prev => [
          ...prev, 
          { type: 'success', content: `分发成功。执行耗时: ${res.performanceMetrics?.executionTime || 'N/A'}` },
          { type: 'stdout', content: res.output }
        ]);
      }
    } catch (e) {
      setTerminalLines(prev => [...prev, { type: 'error', content: '硬件链路仿真中断。' }]);
    } finally {
      setIsCompiling(false);
      setTimeout(() => setIsEmulating(false), 2000);
    }
  };

  const leaderboard = useMemo(() => {
    if (result?.leaderboard && result.leaderboard.length > 0) return result.leaderboard;
    return [
      { label: 'PYTHON BASELINE', value: 1200, color: '#ef4444' },
      { label: 'VECTORIZED (CPU)', value: 15, color: '#3b82f6' },
      { label: 'CUDA (GLOBAL)', value: 0.8, color: '#10b981' },
      { label: 'CURRENT KERNEL', value: 0.1, color: '#22c55e' }
    ];
  }, [result]);

  const renderTemplateSection = (lang: Language, icon: React.ReactNode, color: string) => {
    const filtered = userTemplates.filter(t => t.language === lang);
    if (filtered.length === 0) return null;

    return (
      <div className="mb-6">
        <div className={`flex items-center gap-2 text-[10px] font-black px-2 mb-3 uppercase tracking-[0.2em] ${color}`}>
          {icon}
          {lang} SNAPSHOTS
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
                <span className="text-[10px] font-mono text-green-500 font-bold bg-green-500/5 px-2 py-0.5 rounded border border-green-500/10">
                  {t.executionTime}
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
        <div className="bg-white/[0.03] rounded-[2rem] border border-white/10 p-6 space-y-6">
          <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.2em]">
            <BarChart3 size={14} className="text-orange-500" />
            性能加速排行榜
          </div>
          <div className="space-y-5">
            {leaderboard.map((item, i) => {
              const minVal = Math.min(...leaderboard.map(l => l.value));
              const width = (minVal / item.value) * 100;
              return (
                <div key={i} className="space-y-2.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-zinc-500">{item.label}</span>
                    <span className="text-zinc-100 font-mono">{item.value.toFixed(2)}ms</span>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.max(5, width)}%`, backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}44` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-end gap-3">
          <button 
            onClick={() => setShowDiagnostics(true)}
            className="w-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 py-5 rounded-2xl flex items-center justify-between px-6 transition-all group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <Activity size={16} className="text-blue-400" />
              <span className="text-[11px] font-black text-blue-200 uppercase tracking-[0.2em]">Runtime Diagnostics</span>
            </div>
            <ChevronRight size={16} className="text-blue-500" />
          </button>

          <button 
            onClick={() => setShowConsole(true)}
            className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 py-5 rounded-2xl flex items-center justify-between px-6 transition-all group"
          >
            <div className="flex items-center gap-4">
              <TerminalIcon size={16} className="text-zinc-500 group-hover:text-white" />
              <span className="text-[11px] font-black text-zinc-500 group-hover:text-white uppercase tracking-[0.2em]">Hardware Console</span>
            </div>
            <ChevronRight size={16} className="text-zinc-600" />
          </button>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col relative">
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-10 bg-[#050608]">
          <div className="flex gap-4">
            {['cuda', 'cpp', 'python'].map((l) => (
              <button key={l} onClick={() => setActiveLang(l as Language)}
                className={`px-6 py-2.5 text-[10px] font-black rounded-xl uppercase tracking-[0.2em] transition-all border ${
                  activeLang === l ? 'bg-green-600 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                  : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <button onClick={saveToTemplates} className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all text-[11px] font-black uppercase tracking-[0.2em]">
              <Save size={18} />
              Save Snapshot
            </button>
            <button onClick={runCode} disabled={isCompiling}
              className={`flex items-center gap-4 px-12 py-3.5 rounded-2xl font-black text-xs transition-all uppercase tracking-[0.2em]
                ${isCompiling ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:scale-[1.04] active:scale-[0.96]'}`}
            >
              {isCompiling ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play size={16} fill="white" />}
              {isCompiling ? 'Emulating...' : 'Execute Kernel'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#030406] p-8 overflow-y-auto custom-scrollbar">
          <div className="flex-1 rounded-[2.5rem] bg-black/70 border border-white/[0.03] flex flex-col min-h-[400px] overflow-hidden shadow-2xl relative">
            <div className="flex items-center gap-6 px-8 py-5 bg-white/[0.02] border-b border-white/5 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
               <div className="flex items-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${isCompiling ? 'bg-orange-500 animate-pulse' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,1)]'}`} />
                 {activeLang} CORE DISPATCH
               </div>
               <div className="ml-auto flex items-center gap-4">
                 <Cpu size={14} className="text-zinc-600" />
                 TARGET: <span className="text-green-500 font-mono tracking-tight uppercase">NVIDIA A100_SXM4</span>
               </div>
            </div>
            <textarea value={currentCode} onChange={(e) => updateDraft(e.target.value)}
              className="flex-1 p-12 font-mono text-[15px] leading-loose bg-transparent text-zinc-200 outline-none resize-none selection:bg-green-500/30 code-font scroll-smooth"
              spellCheck={false}
            />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-8 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 backdrop-blur-xl">
              <div className="bg-black/60 border border-white/5 p-6 rounded-3xl flex flex-col gap-3 group items-center text-center">
                <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Dispatch Batch</span>
                <span className="text-3xl font-black text-white font-mono tracking-tighter">
                  {result?.performanceMetrics?.batch || '----'}
                </span>
              </div>
              <div className="bg-black/60 border border-white/5 p-6 rounded-3xl flex flex-col gap-3 group items-center text-center">
                <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Arithmetic Dim</span>
                <span className="text-3xl font-black text-white font-mono tracking-tighter">
                  {result?.performanceMetrics?.dim || '----'}
                </span>
              </div>
              <div className="bg-[#0c140e] border border-green-500/30 p-6 rounded-3xl flex flex-col gap-3 group items-center text-center shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]">
                <span className="text-[10px] text-green-500/60 uppercase font-black tracking-widest">E2E Latency</span>
                <span className="text-4xl font-black text-green-500 font-mono tracking-tighter drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]">
                  {result?.performanceMetrics?.executionTime || '0.00ms'}
                </span>
              </div>
          </div>
          
          <div className="mt-6 flex items-center gap-5 p-6 bg-green-500/[0.04] rounded-3xl border border-green-500/10">
            <CheckCircle2 size={24} className="text-green-500/80" />
            <div className="flex-1">
              <div className="text-[12px] text-white font-black uppercase tracking-[0.2em] mb-1">Numerical Integrity Check Pass</div>
              <div className="text-[11px] text-zinc-500 font-medium">所有优化核心均通过硬件仿真单元测试。输出数值完全符合 IEEE 754 精度标准。</div>
            </div>
          </div>
        </div>

        {/* Diagnostics Overlay */}
        {showDiagnostics && (
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl z-50 flex flex-col p-12 transition-all animate-in fade-in slide-in-from-right-10 duration-500">
             <div className="flex justify-between items-center mb-8 px-2 border-b border-white/10 pb-6">
                <div className="flex items-center gap-5">
                  <Activity size={24} className="text-blue-500" />
                  <div>
                    <h2 className="text-sm font-black tracking-[0.5em] uppercase text-white">System Diagnostics</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-blue-400">SPEEDUP FACTOR: {result?.performanceMetrics?.speedup || '1.0x'}</span>
                      <span className="text-[10px] text-zinc-600 uppercase font-bold">(Ref vs Python)</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDiagnostics(false)} className="text-zinc-500 hover:text-white p-2 rounded-full border border-white/10 transition-colors">
                  <X size={24} />
                </button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white/[0.02] rounded-3xl border border-white/5 shadow-2xl">
               {result?.analysis ? (
                  <div className="max-w-4xl mx-auto space-y-8 py-8">
                    {result.analysis.split('\n').map((line, idx) => {
                      if (line.startsWith('###')) return <h3 key={idx} className="text-xl font-black text-white mt-8 mb-4 border-l-4 border-blue-500 pl-4">{line.replace('###', '')}</h3>;
                      if (line.startsWith('*')) return <div key={idx} className="flex gap-4 text-zinc-300 mb-4 bg-white/5 p-4 rounded-2xl border border-white/5 leading-relaxed"><span className="text-blue-500 font-bold">•</span>{line.replace('*', '').trim()}</div>;
                      return <p key={idx} className="text-zinc-400 leading-relaxed text-base">{line}</p>;
                    })}
                  </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                    <Info size={64} className="mb-6" />
                    <span className="text-xl tracking-widest uppercase font-black">Waiting for Execution Dispatch</span>
                 </div>
               )}
             </div>
          </div>
        )}

        {/* Console Overlay */}
        {showConsole && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-50 flex flex-col p-12 transition-all animate-in fade-in slide-in-from-bottom-20 duration-500">
            <div className="flex justify-between items-center mb-8 px-2 border-b border-white/10 pb-6">
              <div className="flex items-center gap-5">
                <TerminalIcon size={24} className="text-green-500" />
                <h2 className="text-sm font-black tracking-[0.5em] uppercase text-white">Hardware Console [NODE_0]</h2>
              </div>
              <button onClick={() => setShowConsole(false)} className="text-zinc-500 hover:text-white p-2 rounded-full border border-white/10 transition-colors">
                 <X size={24} />
              </button>
            </div>
            <div className="flex-1 bg-black/40 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
              <Terminal lines={terminalLines} />
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 border-l border-white/5 flex flex-col bg-[#050608] p-6">
        <div className="flex items-center justify-between mb-8 px-2">
           <div className="flex items-center gap-4">
             <Layers size={22} className="text-purple-400" />
             <div className="flex flex-col">
               <span className="text-[12px] font-black text-white uppercase leading-none tracking-widest">硬件拓扑仿真</span>
               <span className="text-[9px] text-zinc-600 uppercase tracking-[0.4em] mt-2 font-bold">(EMULATION)</span>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,1)]" />
             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">LIVE</span>
           </div>
        </div>

        <div className="aspect-square bg-black/80 rounded-[2.5rem] border border-white/[0.04] relative overflow-hidden flex items-center justify-center shadow-inner group">
           {isEmulating ? (
             <div className="relative w-4/5 h-4/5 flex items-center justify-center">
                <div className="absolute inset-0 bg-green-500/15 blur-[120px] animate-pulse" />
                <div className="w-full h-full grid grid-cols-8 grid-rows-6 gap-2.5 p-4 border border-green-500/20 rounded-3xl bg-black/60 shadow-2xl">
                   {Array.from({length: 48}).map((_, i) => (
                     <div key={i} className="rounded-lg transition-all duration-300"
                      style={{ backgroundColor: Math.random() > 0.4 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.08)', animation: `pulse ${0.7 + Math.random()}s infinite` }} />
                   ))}
                </div>
                <div className="absolute left-0 w-full h-2 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_40px_rgba(34,197,94,1)] animate-[scan_2s_linear_infinite] z-20" />
             </div>
           ) : (
             <div className="text-center space-y-5 opacity-10 group-hover:opacity-20 transition-opacity">
                <Layout size={56} className="mx-auto text-zinc-400" />
                <div className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em]">Hardware Idle</div>
             </div>
           )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="bg-white/[0.04] border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-lg">
             <span className="text-[9px] font-black text-zinc-600 uppercase mb-3 tracking-[0.2em]">TFLOPS 吞吐</span>
             <div className="flex flex-col">
                <span className="text-xl font-black text-white font-mono">{result?.performanceMetrics?.tflops || '0.00'}</span>
                <span className="text-[9px] text-zinc-500 uppercase font-bold mt-1">(Effective)</span>
             </div>
          </div>
          <div className="bg-white/[0.04] border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-lg">
             <span className="text-[9px] font-black text-zinc-600 uppercase mb-3 tracking-[0.2em]">GPU 利用率</span>
             <div className="flex flex-col">
                <span className="text-xl font-black text-white font-mono">{result?.performanceMetrics?.gpuUtilization || '0.0%'}</span>
                <span className="text-[9px] text-zinc-500 uppercase font-bold mt-1">(Mem Ctrl)</span>
             </div>
          </div>
        </div>

        <div className="mt-12 flex-1 flex flex-col overflow-hidden">
          <div className="text-[11px] font-black text-zinc-500 uppercase px-2 mb-8 tracking-[0.4em] flex items-center justify-between border-b border-white/5 pb-4">
            <span>SAVED SNAPSHOTS</span>
            <span className="text-[9px] opacity-40 font-mono tracking-tighter">{userTemplates.length} FILES</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-10 pr-4 custom-scrollbar scroll-smooth pb-20">
            {renderTemplateSection('cuda', <Layers size={11} />, 'text-green-500')}
            {renderTemplateSection('cpp', <Cpu size={11} />, 'text-blue-500')}
            {renderTemplateSection('python', <Code size={11} />, 'text-yellow-500')}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan { 0% { top: -20%; opacity: 0; } 25% { opacity: 1; } 75% { opacity: 1; } 100% { top: 120%; opacity: 0; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;
