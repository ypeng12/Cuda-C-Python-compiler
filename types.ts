
export type Language = 'cpp' | 'cuda' | 'python';

export interface CodeTemplate {
  id: string;
  name: string;
  language: Language;
  code: string;
  description: string;
  isUserSaved?: boolean;
  executionTime?: string;
}

export interface PerformanceComparison {
  label: string;
  value: number; // in ms
  color: string;
}

export interface CompilationResult {
  status: 'success' | 'error';
  output: string;
  analysis?: string;
  performanceMetrics?: {
    executionTime?: string;
    memoryUsage?: string;
    gpuUtilization?: string;
    tflops?: string;
    speedup?: string;
    batch?: string;
    dim?: string;
  };
  leaderboard?: PerformanceComparison[];
}

export interface TerminalLine {
  type: 'info' | 'error' | 'success' | 'stdout';
  content: string;
}
