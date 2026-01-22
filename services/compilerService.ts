
import { GoogleGenAI, Type } from "@google/genai";
import { CompilationResult, Language } from "../types";

export class CompilerService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async compileAndRun(code: string, language: Language): Promise<CompilationResult> {
    const systemInstruction = `You are an NVIDIA A100 HPC Simulation Engine.
    
    1. Performance Analysis: Be extremely concise. Focus on kernel efficiency and memory throughput.
    2. Simulation Logic:
       - Generate realistic execution metrics for an A100-SXM4-80GB.
       - Python: High latency (ms).
       - C++: Moderate latency.
       - CUDA: Ultra-low latency.
    3. Console Log Requirements:
       - MUST include output tensor shapes (e.g., [Batch, Dim]).
       - MUST include Grid/Block dimensions for CUDA.
       - MUST include memory allocation details (VRAM).
    4. Data formatting: Use clean JSON. No LaTeX. No markdown outside of the 'analysis' field.`;

    try {
      const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await aiInstance.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Language: ${language}\nSource Code:\n${code}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ['success', 'error'] },
              output: { type: Type.STRING, description: "Raw console output including shapes and logs" },
              analysis: { type: Type.STRING, description: "HPC architectural analysis" },
              performanceMetrics: {
                type: Type.OBJECT,
                properties: {
                  executionTime: { type: Type.STRING },
                  gpuUtilization: { type: Type.STRING },
                  tflops: { type: Type.STRING },
                  batch: { type: Type.STRING },
                  dim: { type: Type.STRING }
                }
              }
            },
            required: ['status', 'output', 'analysis', 'performanceMetrics']
          }
        },
      });

      return JSON.parse(response.text) as CompilationResult;
    } catch (error) {
      console.error("Simulation failed:", error);
      return {
        status: 'error',
        output: "Hardware dispatch timeout. Check network or API configuration."
      };
    }
  }
}
