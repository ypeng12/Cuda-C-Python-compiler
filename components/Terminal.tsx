
import React from 'react';
import { TerminalLine } from '../types';

interface TerminalProps {
  lines: TerminalLine[];
}

const Terminal: React.FC<TerminalProps> = ({ lines }) => {
  return (
    <div className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto border-t border-zinc-800">
      <div className="flex items-center gap-2 mb-4 text-zinc-500 uppercase tracking-widest text-[10px] font-bold">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Execution Output
      </div>
      <div className="space-y-1">
        {lines.length === 0 ? (
          <div className="text-zinc-700 italic">Ready for execution...</div>
        ) : (
          lines.map((line, idx) => (
            <div 
              key={idx} 
              className={`
                ${line.type === 'error' ? 'text-red-400' : ''}
                ${line.type === 'success' ? 'text-green-400' : ''}
                ${line.type === 'info' ? 'text-blue-400' : ''}
                ${line.type === 'stdout' ? 'text-zinc-300' : ''}
                break-all whitespace-pre-wrap
              `}
            >
              {line.type === 'info' && <span className="mr-2 text-blue-500">➜</span>}
              {line.type === 'error' && <span className="mr-2 text-red-500">✖</span>}
              {line.type === 'success' && <span className="mr-2 text-green-500">✔</span>}
              {line.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Terminal;
