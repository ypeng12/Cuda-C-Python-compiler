
import { GoogleGenAI, Type } from "@google/genai";
import { CompilationResult, Language } from "../types";

export class CompilerService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async compileAndRun(code: string, language: Language): Promise<CompilationResult> {
    const systemInstruction = `You are the Nvidia-X HPC Simulation Engine.
    
    1. Performance Analysis:
       - For CUDA: Focus on Warp efficiency, occupancy, and HBM3 throughput.
       - For CPP: Focus on SIMD vectorization (AVX-512, AVX2), Cache locality (L1/L2/L3), and branch prediction.
       - For Python: Identify interpreter overhead and recommend Numba/NumPy vectorization.
    
    2. Simulation Environment:
       - Target Hardware: NVIDIA A100-SXM4-80GB coupled with high-performance Xeon/EPYC host.
       - Execution Metrics: Generate realistic, stable benchmarks.
    
    3. Output Requirements:
       - Output MUST include specific memory shapes (e.g., [N, C, H, W]).
       - For CPP mode: Specifically detect if user is using AVX-512/SIMD and analyze 'Memory Bound' vs 'Compute Bound' stages.
       - For CUDA mode: Must report Grid/Block/SharedMem usage.
    
    4. Formatting: Response must be strict JSON. No Markdown in fields other than 'analysis'. No LaTeX.`;

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
              analysis: { type: Type.STRING, description: "Architectural and optimization analysis" },
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
