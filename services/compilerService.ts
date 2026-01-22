
import { GoogleGenAI, Type } from "@google/genai";
import { CompilationResult, Language } from "../types";

export class CompilerService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async compileAndRun(code: string, language: Language): Promise<CompilationResult> {
    const systemInstruction = `You are an NVIDIA HPC Performance Engineer.
    Analyze the provided ${language.toUpperCase()} code and simulate its performance on an NVIDIA A100 (80GB).

    1. EXECUTION: Simulate the code logic. If there are syntax errors, return "error" status.
    2. LEADERBOARD: Create a REALISTIC performance comparison (in ms). 
       Include the current code as "CURRENT KERNEL".
       Compare it against: "Python Baseline", "Vectorized (CPU)", and "Optimized CUDA".
    3. ANALYSIS: Provide "System Insights" in professional Chinese (简体中文). 
       CRITICAL: DO NOT use LaTeX symbols like $, \times, or \approx. 
       Use plain text for dimensions, e.g., use "17x17" instead of "$17 \times 17$".
       Focus on: Memory Bandwidth, Compute Intensity, and Occupancy.
       Format with clear headers and bullet points.
    4. METRICS: Estimate TFLOPS, GPU Utilization, and Latency. 
       Keep speedup factors realistic (e.g., 10x to 150x, not 1500x).

    Return a structured JSON response.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Project Analysis:\nLanguage: ${language}\nSource Code:\n${code}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 24576 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ['success', 'error'] },
              output: { type: Type.STRING },
              analysis: { type: Type.STRING },
              performanceMetrics: {
                type: Type.OBJECT,
                properties: {
                  executionTime: { type: Type.STRING },
                  memoryUsage: { type: Type.STRING },
                  gpuUtilization: { type: Type.STRING },
                  tflops: { type: Type.STRING },
                  speedup: { type: Type.STRING },
                  batch: { type: Type.STRING },
                  dim: { type: Type.STRING }
                }
              },
              leaderboard: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.NUMBER },
                    color: { type: Type.STRING }
                  }
                }
              }
            },
            required: ['status', 'output', 'analysis', 'leaderboard', 'performanceMetrics']
          }
        },
      });

      return JSON.parse(response.text) as CompilationResult;
    } catch (error) {
      console.error("Simulation failed:", error);
      return {
        status: 'error',
        output: "仿真引擎响应失败。请检查代码是否有严重逻辑错误或尝试缩减代码规模。"
      };
    }
  }
}
