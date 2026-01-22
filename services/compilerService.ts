
import { GoogleGenAI, Type } from "@google/genai";
import { CompilationResult, Language } from "../types";

export class CompilerService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async compileAndRun(code: string, language: Language): Promise<CompilationResult> {
    const systemInstruction = `You are a High-Performance Computing (HPC) Compiler and Hardware Simulator. 
    Your task is to analyze the provided ${language.toUpperCase()} code and simulate its execution.
    
    1. Check for syntax errors. If found, return status: "error".
    2. If the code is valid, simulate the logic.
    3. For CUDA: Describe kernel launch, grid/block dimensions, and memory transfers.
    4. For Python: Describe the interpreted execution path and any library overhead.
    5. IMPORTANT: Your "analysis" MUST be written in Chinese (简体中文).

    Return a structured JSON response.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Compile and simulate this ${language} code execution:\n\n${code}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 32768 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ['success', 'error'] },
              output: { type: Type.STRING, description: 'Standard output of the program' },
              analysis: { type: Type.STRING, description: 'Deep technical analysis in CHINESE' },
              performanceMetrics: {
                type: Type.OBJECT,
                properties: {
                  executionTime: { type: Type.STRING },
                  memoryUsage: { type: Type.STRING },
                  gpuUtilization: { type: Type.STRING }
                }
              }
            },
            required: ['status', 'output', 'analysis']
          }
        },
      });

      return JSON.parse(response.text) as CompilationResult;
    } catch (error) {
      console.error("Simulation failed:", error);
      return {
        status: 'error',
        output: "模拟器内部错误：无法连接至执行引擎。请检查您的网络或代码复杂度。"
      };
    }
  }
}
