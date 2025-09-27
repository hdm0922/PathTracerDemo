# PathTracerDemo
Minimal Path Tracer Using WebGPU

# Installed
npm i gl-matrix

npm i @webgpu/types

npm install three
npm install --save-dev @types/three

npm install three three-mesh-bvh
npm install --save-dev @types/three

# GPU Storage Buffers

<SceneBuffer> : 씬의 모든 Instance | 모든 Mesh들의 Layout | 모든 Mesh들의 MaterialArray

Instance[0], ... , Instance[I] | MeshLayout[0], ... , MeshLayout[M] | MaterialArray[0], ... , MaterialArray[M]



<GeometryBuffer> : 모든 Mesh들의 VertexArray | 모든 Mesh들의 IndexArray | 모든 Mesh들의 PrimitiveToMaterialIDArray

VertexArray[0], ... , VertexArray[M] | IndexArray[0], ... , IndexArray[M] | PrimToMatArr[0], ... , PrimToMatArr[M]



<AccelBuffer> : Tlas | 모든 Mesh들의 BlasArray

Tlas | BlasArray[0], ... , BlasArray[M]

