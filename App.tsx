
import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Box, Cpu, Zap, Github, Layers, Code } from 'lucide-react';
import { Language, TerminalLine, CompilationResult } from './types';
import { TEMPLATES } from './constants';
import { CompilerService } from './services/compilerService';
import Terminal from './components/Terminal';

const App: React.FC = () => {
  const [activeLang, setActiveLang] = useState<Language>('cuda');
  const [code, setCode] = useState(TEMPLATES[1].code);
  const [isCompiling, setIsCompiling] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CompilationResult['performanceMetrics'] | null>(null);

  const compilerRef = useRef<CompilerService | null>(null);

  useEffect(() => {
    compilerRef.current = new CompilerService();
  }, []);

  const handleLangSwitch = (lang: Language) => {
    setActiveLang(lang);
    const template = TEMPLATES.find(t => t.language === lang);
    if (template) setCode(template.code);
  };

  const clearTerminal = () => setTerminalLines([]);

  const runCode = async () => {
    if (isCompiling || !compilerRef.current) return;
    
    setIsCompiling(true);
    setAnalysis(null);
    setMetrics(null);
    setTerminalLines(prev => [...prev, { type: 'info', content: `正在使用 Nvidia-X 引擎编译/运行 ${activeLang.toUpperCase()} ...` }]);

    try {
      const result = await compilerRef.current.compileAndRun(code, activeLang);
      
      if (result.status === 'success') {
        setTerminalLines(prev => [
          ...prev, 
          { type: 'success', content: '执行成功！' },
          { type: 'stdout', content: result.output }
        ]);
        setAnalysis(result.analysis || null);
        setMetrics(result.performanceMetrics || null);
      } else {
        setTerminalLines(prev => [
          ...prev, 
          { type: 'error', content: '编译/执行失败：' },
          { type: 'stdout', content: result.output }
        ]);
      }
    } catch (e) {
      setTerminalLines(prev => [...prev, { type: 'error', content: '模拟运行过程中发生致命错误。' }]);
    } finally {
      setIsCompiling(false);
    }
  };

  const getLangExt = () => {
    if (activeLang === 'cuda') return 'cu';
    if (activeLang === 'python') return 'py';
    return 'cpp';
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-zinc-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 md:w-64 border-r border-zinc-800 flex flex-col bg-[#0d0d0d]">
        <div className="p-4 flex items-center gap-3 border-b border-zinc-800">
          <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
            <Zap className="text-white" size={18} fill="currentColor" />
          </div>
          <span className="hidden md:inline font-bold text-white tracking-tight">NVIDIA-X</span>
        </div>
        
        <div className="flex-1 py-4 px-2 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-bold text-zinc-500 uppercase px-4 mb-2 hidden md:block">执行环境</div>
          <button 
            onClick={() => handleLangSwitch('cuda')}
            className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${activeLang === 'cuda' ? 'bg-green-600/10 text-green-500' : 'hover:bg-zinc-800'}`}
          >
            <Layers size={18} />
            <span className="hidden md:block font-medium">CUDA C++</span>
          </button>
          <button 
             onClick={() => handleLangSwitch('cpp')}
            className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${activeLang === 'cpp' ? 'bg-blue-600/10 text-blue-500' : 'hover:bg-zinc-800'}`}
          >
            <Cpu size={18} />
            <span className="hidden md:block font-medium">C++ 20</span>
          </button>
          <button 
             onClick={() => handleLangSwitch('python')}
            className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${activeLang === 'python' ? 'bg-yellow-600/10 text-yellow-500' : 'hover:bg-zinc-800'}`}
          >
            <Code size={18} />
            <span className="hidden md:block font-medium">Python 3.12</span>
          </button>

          <div className="mt-8 text-[10px] font-bold text-zinc-500 uppercase px-4 mb-2 hidden md:block">示例代码</div>
          {TEMPLATES.filter(t => t.language === activeLang).map(t => (
            <button 
              key={t.id}
              onClick={() => setCode(t.code)}
              className="w-full text-left flex items-center gap-3 p-2 rounded hover:bg-zinc-800 transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span className="hidden md:block text-sm text-zinc-400">{t.name}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800">
           <a href="https://github.com/nvidia" target="_blank" className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors">
            <Github size={18} />
            <span className="hidden md:block text-xs">项目主页</span>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#0d0d0d]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded border border-zinc-700">
              <span className="text-xs text-zinc-500">文件:</span>
              <span className="text-xs font-mono text-zinc-300">main.{getLangExt()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={clearTerminal}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
              title="清空终端"
            >
              <RotateCcw size={18} />
            </button>
            <button 
              onClick={runCode}
              disabled={isCompiling}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all shadow-lg shadow-green-900/20 
                ${isCompiling ? 'bg-zinc-700 cursor-not-allowed text-zinc-400' : 'bg-green-600 hover:bg-green-500 text-white hover:scale-105 active:scale-95'}`}
            >
              {isCompiling ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Play size={16} fill="white" />
              )}
              {isCompiling ? '运行中...' : '启动程序'}
            </button>
          </div>
        </div>

        {/* Editor and Terminal Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-zinc-800 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 bg-[#0a0a0a] text-zinc-300 p-6 font-mono text-sm leading-relaxed outline-none resize-none code-font placeholder-zinc-800"
              placeholder="// 在此输入您的代码..."
            />
            
            {/* Simulation Sidebar / Floating Panel */}
            {analysis && (
              <div className="absolute right-0 top-0 h-full w-80 bg-[#111] border-l border-zinc-800 shadow-2xl overflow-y-auto transform transition-transform animate-in fade-in slide-in-from-right duration-500 z-10">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
                  <Box size={16} className="text-green-500" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">系统见解 (Insights)</h3>
                </div>
                <div className="p-4 space-y-6">
                  {metrics && (
                    <div className="grid grid-cols-1 gap-2">
                       <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold text-xs mb-1">模拟运行耗时</div>
                        <div className="text-lg font-mono text-green-400">{metrics.executionTime || 'N/A'}</div>
                      </div>
                      <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold text-xs mb-1">内存/带宽负载</div>
                        <div className="text-lg font-mono text-blue-400">{metrics.memoryUsage || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                  <div className="prose prose-invert prose-sm">
                    <div className="text-zinc-300 leading-relaxed border-l-2 border-green-700/50 pl-3 whitespace-pre-wrap">
                      {analysis}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Output Terminal */}
          <div className="h-1/3 md:h-full md:w-[40%] flex flex-col border-t md:border-t-0 border-zinc-800">
            <Terminal lines={terminalLines} />
          </div>
        </div>

        {/* Footer */}
        <div className="h-8 bg-[#0d0d0d] border-t border-zinc-800 flex items-center justify-between px-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              引擎: Gemini-3-Pro (深度推理已启用)
            </div>
            <div className="hidden sm:block">设备: 虚拟 NVIDIA A100 / CPU 仿真集群</div>
          </div>
          <div>
            UTF-8 | {activeLang.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
