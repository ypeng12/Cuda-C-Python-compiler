
export type Language = 'cpp' | 'cuda' | 'python';

export interface CodeTemplate {
  id: string;
  name: string;
  language: Language;
  code: string;
  description: string;
}

export interface CompilationResult {
  status: 'success' | 'error';
  output: string;
  analysis?: string;
  performanceMetrics?: {
    executionTime?: string;
    memoryUsage?: string;
    gpuUtilization?: string;
  };
}

export interface TerminalLine {
  type: 'info' | 'error' | 'success' | 'stdout';
  content: string;
}
