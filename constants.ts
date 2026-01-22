
import { CodeTemplate } from './types';

export const TEMPLATES: CodeTemplate[] = [
  {
    id: 'cpp-hello',
    name: 'Hello World',
    language: 'cpp',
    description: 'Basic C++ structure',
    code: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, Nvidia-X World!" << std::endl;\n    return 0;\n}`
  },
  {
    id: 'cuda-vector-add',
    name: 'Vector Addition',
    language: 'cuda',
    description: 'Standard CUDA kernel for adding two vectors',
    code: `__global__ void vectorAdd(const float *A, const float *B, float *C, int numElements) {\n    int i = blockDim.x * blockIdx.x + threadIdx.x;\n    if (i < numElements) {\n        C[i] = A[i] + B[i];\n    }\n}\n\nint main() {\n    int n = 1024;\n    size_t size = n * sizeof(float);\n    // Simulation logic here...\n    return 0;\n}`
  },
  {
    id: 'cuda-matrix-mul',
    name: 'Matrix Multiplication',
    language: 'cuda',
    description: 'Tiled matrix multiplication kernel',
    code: `__global__ void matrixMul(float* C, float* A, float* B, int wA, int wB) {\n    // Implementation logic\n}`
  },
  {
    id: 'python-numpy',
    name: 'NumPy Simulation',
    language: 'python',
    description: 'High-performance Python with NumPy',
    code: `import numpy as np\n\ndef main():\n    a = np.array([1, 2, 3])\n    b = np.array([4, 5, 6])\n    c = a + b\n    print(f"Result: {c}")\n\nif __name__ == "__main__":\n    main()`
  }
];
