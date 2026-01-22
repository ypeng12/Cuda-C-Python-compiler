
import { GoogleGenAI, Type } from "@google/genai";
import { CompilationResult, Language } from "../types";

export class CompilerService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async compileAndRun(code: string, language: Language): Promise<CompilationResult> {
    const systemInstruction = `你是一位 NVIDIA 高级 HPC 性能分析工程师。
    分析提供的 ${language.toUpperCase()} 代码，并在 NVIDIA A100 (80GB) 上仿真其性能表现。

    1. 执行仿真：模拟代码逻辑。如果有语法错误，状态返回 "error"。
    2. 性能排行榜：必须严格包含以下四个类别的对比（单位：ms）：
       - "Python Baseline (NumPy Loop)"
       - "Vectorized (CPU/MKL)"
       - "Optimized CUDA (Shared Mem + Half)"
       - "CURRENT KERNEL" (当前代码的性能估算)
    3. 系统分析：提供专业的中文深度分析（简体中文）。
       重要：严禁使用 LaTeX 符号（如 $, \times, \approx）。
       使用纯文本描述维度和公式，例如用 "17x17" 代替 "$17 \times 17$"。
       重点关注：显存带宽瓶颈、计算密度、寄存器压力。
    4. 性能指标：估算 TFLOPS (Effective)、GPU 利用率 (Mem Ctrl) 和延迟。
       加速比需真实合理。

    返回结构化 JSON。`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `项目仿真分析任务：\n语言: ${language}\n源代码内容:\n${code}`,
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
        output: "仿真引擎响应失败。请检查网络或代码复杂度。"
      };
    }
  }
}
