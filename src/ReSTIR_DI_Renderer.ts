import { vec3, mat4 } from "gl-matrix";

import computeShaderCode from './shaders/ComputeShader.wgsl?raw';
import vertexShaderCode from './shaders/VertexShader.wgsl?raw';
import fragmentShaderCode from './shaders/FragmentShader.wgsl?raw';

import ReSTIR_DI_Pass1 from "./shaders/ReSTIR_DI_Pass1.wgsl?raw";

import type { MeshDescriptor, SerializedMesh } from "./Structs";
import { World } from "./World";
import { ResourceManager } from "./ResourceManager";

function makeViewProjection(
  cameraPos: vec3,
  aspect: number,
  options?: {
    fovYDeg?: number;  // 기본 60도
    near?: number;     // 기본 0.1
    far?: number;      // 기본 1000
    zZeroToOne?: boolean; // 기본 true(WebGPU)
  }
): mat4 {
  const fovYDeg = options?.fovYDeg ?? 60;
  const near    = options?.near    ?? 0.1;
  const far     = options?.far     ?? 1000.0;
  const zZO     = options?.zZeroToOne ?? false; // WebGPU면 true 권장 => true하니까 이상해지던데?? false해야 잘됨;;;

  // --- View ---
  const eye    = vec3.clone(cameraPos);
  const center = vec3.fromValues(0, 0, 0);
  const up     = vec3.fromValues(0, 1, 0);

  // eye와 center가 같을 때 lookAt 불능 방지
  if (vec3.squaredDistance(eye, center) < 1e-20) {
    // 원점에 너무 가까우면 살짝 뒤로 밀어줌
    eye[2] = 1.0;
  }

  const view = mat4.create();
  mat4.lookAt(view, eye, center, up);

  // --- Projection (기본은 OpenGL 규약용) ---
  const fovYRad = (fovYDeg * Math.PI) / 180.0;
  const projGL = mat4.create();
  mat4.perspective(projGL, fovYRad, aspect, near, far);

  // --- Z 규약 보정: OpenGL(-1..1) → WebGPU/D3D/Vulkan(0..1) ---
  // z' = z*0.5 + 0.5 를 클립 공간에서 적용하는 행렬
  let proj = projGL;
  if (zZO) {
    const depthFix = mat4.fromValues(
      1, 0,   0,   0,
      0, 1,   0,   0,
      0, 0, 0.5, 0.5,
      0, 0,   0,   1
    );
    proj = mat4.create();
    mat4.multiply(proj, depthFix, projGL); // proj = depthFix * projGL
  }

  // --- ViewProjection ---
  const viewProj = mat4.create();
  mat4.multiply(viewProj, proj, view); // proj * view

  return viewProj;
}


export class ReSTIR_DI_Renderer
{

    // GPU Device Stuff
    public readonly Adapter         : GPUAdapter;
    public readonly Device          : GPUDevice;
    public readonly Canvas          : HTMLCanvasElement;
    public readonly Context         : GPUCanvasContext;
    public readonly PreferredFormat : GPUTextureFormat;

///////////////////// ReSTIR DI Stuffs /////////////////////

    public G_PositionTexture    : GPUTexture;
    public G_NormalTexture      : GPUTexture;
    public G_AlbedoTexture      : GPUTexture;
    public G_EmissiveTexture    : GPUTexture;


    public ComputePipeline_Pass1 : GPUComputePipeline;

    public ComputeBindGroup_Pass1 : GPUBindGroup;


///////////////////////////////////////////////////////////
    // WebGPU Resources
    public SceneTexture         : GPUTexture;
    public AccumTexture         : GPUTexture;

    public UniformBuffer        : GPUBuffer;
    public SceneBuffer          : GPUBuffer;
    public GeometryBuffer       : GPUBuffer;
    public AccelBuffer          : GPUBuffer;

    public Textures             : GPUTexture[];

    // WebGPU Pipelines
    public ComputePipeline : GPUComputePipeline;
    public RenderPipeline  : GPURenderPipeline;

    // WebGPU BindGroups
    public ComputeBindGroup : GPUBindGroup;
    public RenderBindGroup  : GPUBindGroup;

    // World Data
    public World        : World;
    public FrameCount   : number;

    // Data Offsets
    public Offset_MeshDescriptorBuffer      : number;
    public Offset_MaterialBuffer            : number;
    public Offset_LightBuffer               : number;
    public Offset_IndexBuffer               : number;
    public Offset_PrimitiveToMaterialBuffer : number;
    public Offset_BlasBuffer                : number;


    constructor
    (
        Adapter : GPUAdapter,
        Device  : GPUDevice,
        Canvas  : HTMLCanvasElement,
    )
    {

        // Get GPU Device Stuffs
        this.Adapter            = Adapter;
        this.Device             = Device;
        this.Canvas             = Canvas;
        this.Context            = Canvas.getContext('webgpu')!;
        this.PreferredFormat    = navigator.gpu.getPreferredCanvasFormat();

        // Configure Context
        {
            const CanvasConfiguration: GPUCanvasConfiguration =
            {
                device: this.Device,
                format: this.PreferredFormat,
                alphaMode: "opaque",
            };

            this.Context.configure(CanvasConfiguration);
        }
        

        // Declare Stuffs
        {
            this.G_PositionTexture  = GPUTexture.prototype;
            this.G_NormalTexture    = GPUTexture.prototype;
            this.G_AlbedoTexture    = GPUTexture.prototype;
            this.G_EmissiveTexture  = GPUTexture.prototype;

            this.ComputePipeline_Pass1 = GPUComputePipeline.prototype;

            this.ComputeBindGroup_Pass1 = GPUBindGroup.prototype;



            this.SceneTexture       = GPUTexture.prototype;
            this.AccumTexture       = GPUTexture.prototype;

            this.UniformBuffer      = GPUBuffer.prototype;
            this.SceneBuffer        = GPUBuffer.prototype;
            this.GeometryBuffer     = GPUBuffer.prototype;
            this.AccelBuffer        = GPUBuffer.prototype;

            this.Textures           = [];

            this.ComputePipeline    = GPUComputePipeline.prototype;
            this.RenderPipeline     = GPURenderPipeline.prototype;

            this.ComputeBindGroup   = GPUBindGroup.prototype;
            this.RenderBindGroup    = GPUBindGroup.prototype;

            this.World              = World.prototype;
        }

        // Initialize Data
        this.FrameCount                         = 0;
        this.Offset_BlasBuffer                  = 0;
        this.Offset_MaterialBuffer              = 0;
        this.Offset_LightBuffer                 = 0;
        this.Offset_MeshDescriptorBuffer        = 0;
        this.Offset_IndexBuffer                 = 0;
        this.Offset_PrimitiveToMaterialBuffer   = 0;
    }



    PrepareWorldData() : [ArrayBuffer, ArrayBuffer, ArrayBuffer, ImageBitmap[]]
    {

        // World의 모든 정보 취합
        const [InstanceArray, MeshArray, MeshIDToIndexMap] = this.World.PackWorldData();

        // World의 정보들로부터 GPU에 올릴 데이터들 Serialize
        let TlasData : Uint32Array; // TODO
        let InstanceRawData : Uint32Array;
        let LightRawData : Uint32Array;
        let MeshDescriptorRawData : Uint32Array;
        let SerializedMeshData : SerializedMesh;
        {
            TlasData = new Uint32Array();
            InstanceRawData = ResourceManager.SerializeInstanceArray(InstanceArray, MeshIDToIndexMap);
            LightRawData = ResourceManager.SerializeLightArray(this.World.Lights);

            const MeshCount = MeshArray.length;
            const ParsedMeshArray : Array<SerializedMesh> = new Array<SerializedMesh>(MeshCount);
            for (let iter = 0; iter < MeshArray.length; iter++) ParsedMeshArray[iter] = ResourceManager.SerializeMesh(MeshArray[iter]);

            // Merge Blas
            let MergedBlasArray     : Uint32Array;
            let BlasArrayDescriptor : Uint32Array;
            {
                const BlasArrays : Array<Uint32Array> = new Array<Uint32Array>();
                for (let iter = 0; iter < MeshCount; iter++) BlasArrays.push(ParsedMeshArray[iter].BlasArray);

                [MergedBlasArray, BlasArrayDescriptor] = ResourceManager.MergeArrays(BlasArrays);
            }

            // Merge Vertex
            let MergedVertexArray     : Uint32Array;
            let VertexArrayDescriptor : Uint32Array;
            {
                const VertexArrays : Array<Uint32Array> = new Array<Uint32Array>();
                for (let iter = 0; iter < MeshCount; iter++) VertexArrays.push(ParsedMeshArray[iter].VertexArray);

                [MergedVertexArray, VertexArrayDescriptor] = ResourceManager.MergeArrays(VertexArrays);
            }

            // Merge Index
            let MergedIndexArray     : Uint32Array;
            let IndexArrayDescriptor : Uint32Array;
            {
                const IndexArrays : Array<Uint32Array> = new Array<Uint32Array>();
                for (let iter = 0; iter < MeshCount; iter++) IndexArrays.push(ParsedMeshArray[iter].IndexArray);

                [MergedIndexArray, IndexArrayDescriptor] = ResourceManager.MergeArrays(IndexArrays);
            }

            // Merge PrimitiveToMaterial
            let MergedPrimitiveToMaterialArray     : Uint32Array;
            let PrimitiveToMaterialArrayDescriptor : Uint32Array;
            {
                const PrimitiveToMaterialArrays : Array<Uint32Array> = new Array<Uint32Array>();
                for (let iter = 0; iter < MeshCount; iter++) PrimitiveToMaterialArrays.push(ParsedMeshArray[iter].PrimitiveToMaterialArray);

                [MergedPrimitiveToMaterialArray, PrimitiveToMaterialArrayDescriptor] = ResourceManager.MergeArrays(PrimitiveToMaterialArrays);
            }

            // Merge Material
            let MergedMaterialArray     : Uint32Array;
            let MaterialArrayDescriptor : Uint32Array;
            {
                const MaterialArrays : Array<Uint32Array> = new Array<Uint32Array>();
                for (let iter = 0; iter < MeshCount; iter++) MaterialArrays.push(ParsedMeshArray[iter].MaterialArray);

                [MergedMaterialArray, MaterialArrayDescriptor] = ResourceManager.MergeArrays(MaterialArrays);
            }

            // Merge Texture TODO
            // ...

            SerializedMeshData =
            {
                BlasArray : MergedBlasArray,
                VertexArray : MergedVertexArray,
                IndexArray : MergedIndexArray,
                PrimitiveToMaterialArray : MergedPrimitiveToMaterialArray,
                MaterialArray : MergedMaterialArray,
                TextureArray : [] // TODO
            }

            // Make MeshDescriptorArray
            const MeshDescriptorArray = new Array<MeshDescriptor>(MeshCount);
            for (let iter = 0; iter < MeshCount; iter++)
            {
                MeshDescriptorArray[iter] =
                {
                    BlasOffset : BlasArrayDescriptor[iter],
                    VertexOffset : VertexArrayDescriptor[iter],
                    IndexOffset : IndexArrayDescriptor[iter],
                    PrimitiveToMaterialOffset : PrimitiveToMaterialArrayDescriptor[iter],
                    MaterialOffset : MaterialArrayDescriptor[iter],
                    TextureOffset : -1 // TODO
                }
            }

            MeshDescriptorRawData = ResourceManager.SerializeMeshDescriptorArray(MeshDescriptorArray);
        }

        // Scene Buffer에 들어갈 데이터 채우기 | Instance + Light + MeshDescriptor + Material
        const ArraysInSceneBuffer  = [InstanceRawData, LightRawData, MeshDescriptorRawData, SerializedMeshData.MaterialArray];
        const [SceneBufferData, SceneBufferOffsets] = ResourceManager.MergeArrays(ArraysInSceneBuffer);
        {
            this.Offset_LightBuffer = SceneBufferOffsets[1];
            this.Offset_MeshDescriptorBuffer = SceneBufferOffsets[2];
            this.Offset_MaterialBuffer = SceneBufferOffsets[3];
        }

        // Geometry Buffer에 들어갈 데이터 채우기 | Vertex + Index + PrimitiveToMaterial
        const ArraysInGeometryBuffer = [SerializedMeshData.VertexArray, SerializedMeshData.IndexArray, SerializedMeshData.PrimitiveToMaterialArray];
        const [GeometryBufferData, GeometryBufferOffsets] = ResourceManager.MergeArrays(ArraysInGeometryBuffer);
        {
            this.Offset_IndexBuffer = GeometryBufferOffsets[1];
            this.Offset_PrimitiveToMaterialBuffer = GeometryBufferOffsets[2];
        }

        // Accel Buffer에 들어갈 데이터 채우기 | Tlas + Blas
        const ArraysInAccelBuffer = [TlasData, SerializedMeshData.BlasArray];
        const [AccelBufferData, AccelBufferOffsets] = ResourceManager.MergeArrays(ArraysInAccelBuffer);
        {
            this.Offset_BlasBuffer = AccelBufferOffsets[1];
        }



        const SceneBufferRawData : ArrayBuffer = new ArrayBuffer(4 * SceneBufferData.length);
        {
            const Uint32View : Uint32Array = new Uint32Array(SceneBufferRawData);
            Uint32View.set(SceneBufferData);
        }

        const GeometryBufferRawData : ArrayBuffer = new ArrayBuffer(4 * GeometryBufferData.length);
        {
            const Uint32View : Uint32Array = new Uint32Array(GeometryBufferRawData);
            Uint32View.set(GeometryBufferData);
        }

        const AccelBufferRawData : ArrayBuffer = new ArrayBuffer(4 * AccelBufferData.length);
        {
            const Uint32View : Uint32Array = new Uint32Array(AccelBufferRawData);
            Uint32View.set(AccelBufferData);
        }

        return [SceneBufferRawData, GeometryBufferRawData, AccelBufferRawData, SerializedMeshData.TextureArray];
    }



    Initialize(World: World): void
    {
        // Initialize Scene Stuffs
        this.World = World;
        this.FrameCount = 0;

        // Build Scene
        const [SceneBufferData, GeometryBufferData, AccelBufferData, ImageBitmaps] = this.PrepareWorldData();

        // Create Uniform Buffer
        {
            const UniformBufferUsageFlags: GPUBufferUsageFlags = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

            this.UniformBuffer = this.Device.createBuffer({ size: 256, usage: UniformBufferUsageFlags });
        }

        // Create Storage Buffers
        {
            const StorageBufferUsageFlags: GPUBufferUsageFlags = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;


            // 1. Scene Buffer
            const SceneBufferDescriptor: GPUBufferDescriptor = { size: SceneBufferData.byteLength, usage: StorageBufferUsageFlags };
            
            this.SceneBuffer = this.Device.createBuffer(SceneBufferDescriptor);
            this.Device.queue.writeBuffer(this.SceneBuffer, 0, SceneBufferData);

            

            // 2. GeometryBuffer
            const GeometryBufferDescriptor: GPUBufferDescriptor = { size: GeometryBufferData.byteLength, usage: StorageBufferUsageFlags };

            this.GeometryBuffer = this.Device.createBuffer(GeometryBufferDescriptor);
            this.Device.queue.writeBuffer(this.GeometryBuffer, 0, GeometryBufferData);

            // 3. AccelBuffer
            const AccelBufferDescriptor: GPUBufferDescriptor = { size: AccelBufferData.byteLength, usage: StorageBufferUsageFlags };

            this.AccelBuffer = this.Device.createBuffer(AccelBufferDescriptor);
            this.Device.queue.writeBuffer(this.AccelBuffer, 0, AccelBufferData);
        }

        // Create TextureViews
        {
            const TextureFormat     : GPUTextureFormat      = "rgba8unorm";
            const TextureUsageFlags : GPUTextureUsageFlags  = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT;

            for (let iter=0; iter<ImageBitmaps.length; iter++)
            {
                const TextureDescriptor: GPUTextureDescriptor =
                {
                    size    : [ImageBitmaps[iter].width, ImageBitmaps[iter].height, 1],
                    format  : TextureFormat,
                    usage   : TextureUsageFlags
                };

                const TextureCreated = this.Device.createTexture(TextureDescriptor);

                this.Device.queue.copyExternalImageToTexture(
                    { source: ImageBitmaps[iter] },
                    { texture: TextureCreated },
                    [ImageBitmaps[iter].width, ImageBitmaps[iter].height]
                );

                this.Textures.push(TextureCreated);
            }

        }

        // Create Scene Texture, AccumTexture
        {
            const SceneTextureUsageFlags  : GPUTextureUsageFlags  = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST;
            const AccumTextureUsageFlags  : GPUTextureUsageFlags  = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;

            const SceneTextureDescriptor: GPUTextureDescriptor =
            {
                size: { width: this.Canvas.width, height: this.Canvas.height },
                format: "rgba32float",
                usage: SceneTextureUsageFlags
            };

            const AccumTextureDescriptor: GPUTextureDescriptor =
            {
                size: { width: this.Canvas.width, height: this.Canvas.height },
                format: "rgba32float",
                usage: AccumTextureUsageFlags
            };

            this.SceneTexture = this.Device.createTexture(SceneTextureDescriptor);
            this.AccumTexture = this.Device.createTexture(AccumTextureDescriptor);
        }

        // Create Compute Pipeline, Render Pipeline
        {
            const ComputeShaderModuleDescriptor     : GPUShaderModuleDescriptor = { code: computeShaderCode };
            const VertexShaderModuleDescriptor      : GPUShaderModuleDescriptor = { code: vertexShaderCode };
            const FragmentShaderModuleDescriptor    : GPUShaderModuleDescriptor = { code: fragmentShaderCode };

            const ComputeShaderEntryPoint           : string = "cs_main";
            const VertexShaderEntryPoint            : string = "vs_main";
            const FragmentShaderEntryPoint          : string = "fs_main";

            const ComputeShaderModule   : GPUShaderModule = this.Device.createShaderModule(ComputeShaderModuleDescriptor);
            const VertexShaderModule    : GPUShaderModule = this.Device.createShaderModule(VertexShaderModuleDescriptor);
            const FragmentShaderModule  : GPUShaderModule = this.Device.createShaderModule(FragmentShaderModuleDescriptor);

            const ComputePipelineDescriptor: GPUComputePipelineDescriptor =
            {
                layout  : "auto",
                compute : { module: ComputeShaderModule, entryPoint: ComputeShaderEntryPoint },
            };

            const RenderPipelineDescriptor: GPURenderPipelineDescriptor =
            {
                layout      : "auto",
                vertex      : { module: VertexShaderModule,     entryPoint: VertexShaderEntryPoint },
                fragment    : { module: FragmentShaderModule,   entryPoint: FragmentShaderEntryPoint, targets : [{ format: this.PreferredFormat }] },
                primitive   : { topology: "triangle-list" },
            };

            this.ComputePipeline = this.Device.createComputePipeline(ComputePipelineDescriptor);
            this.RenderPipeline = this.Device.createRenderPipeline(RenderPipelineDescriptor);
        }

        // Create Bindgroups
        {
            const SceneTextureView: GPUTextureView = this.SceneTexture.createView();
            const AccumTextureView: GPUTextureView = this.AccumTexture.createView();
            
            const ComputeBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout: this.ComputePipeline.getBindGroupLayout(0),
                entries:
                [
                    { binding: 0, resource: { buffer: this.UniformBuffer } },
                    { binding: 1, resource: { buffer: this.SceneBuffer }  },
                    { binding: 2, resource: { buffer: this.GeometryBuffer } },
                    { binding: 3, resource: { buffer: this.AccelBuffer } },

                    { binding: 10, resource: SceneTextureView },
                    { binding: 11, resource: AccumTextureView },
                ],
            };

            const RenderBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout: this.RenderPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: SceneTextureView }
                ],
            };

            this.ComputeBindGroup   = this.Device.createBindGroup(ComputeBindGroupDescriptor);
            this.RenderBindGroup    = this.Device.createBindGroup(RenderBindGroupDescriptor);
        }


        ///////////////////// ReSTIR DI Stuffs /////////////////////

        // Create G-Buffers
        {
            const GBufferDescriptor : GPUTextureDescriptor =
            {
                size: { width: this.Canvas.width, height: this.Canvas.height },
                format: "rgba32float",
                usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
            };

            this.G_PositionTexture  = this.Device.createTexture(GBufferDescriptor);
            this.G_NormalTexture    = this.Device.createTexture(GBufferDescriptor);
            this.G_AlbedoTexture    = this.Device.createTexture(GBufferDescriptor);
            this.G_EmissiveTexture  = this.Device.createTexture(GBufferDescriptor);
        }

        // Compute Pipeline
        {
            const Pass1_ShaderModule    : GPUShaderModule = this.Device.createShaderModule({ code: ReSTIR_DI_Pass1 });
            const Pass1_Descriptor      : GPUComputePipelineDescriptor =
            {
                layout  : "auto",
                compute : { module: Pass1_ShaderModule, entryPoint: "cs_main" },
            };

            this.ComputePipeline_Pass1 = this.Device.createComputePipeline(Pass1_Descriptor);
        }

        // Compute BindGroup
        {
            const G_PositionView    : GPUTextureView = this.G_PositionTexture.createView();
            const G_NormalView      : GPUTextureView = this.G_NormalTexture.createView();
            const G_AlbedoView      : GPUTextureView = this.G_AlbedoTexture.createView();
            const G_EmissiveView    : GPUTextureView = this.G_EmissiveTexture.createView();

            const Pass1_Descriptor  : GPUBindGroupDescriptor =
            {
                layout: this.ComputePipeline_Pass1.getBindGroupLayout(0),
                entries:
                [
                    { binding: 0, resource: { buffer: this.UniformBuffer } },
                    { binding: 1, resource: { buffer: this.SceneBuffer }  },
                    { binding: 2, resource: { buffer: this.GeometryBuffer } },
                    { binding: 3, resource: { buffer: this.AccelBuffer } },

                    { binding: 10, resource: G_PositionView },
                    { binding: 11, resource: G_NormalView },
                    { binding: 12, resource: G_AlbedoView },
                    { binding: 13, resource: G_EmissiveView }
                ],
            };

            this.ComputeBindGroup_Pass1 = this.Device.createBindGroup(Pass1_Descriptor);
        }
        
        ///////////////////////////////////////////////////////////

        return;
    }



    Update(): void
    {
        this.FrameCount++;

        // Camera Property
        const camDir = vec3.normalize(vec3.create(), vec3.fromValues(0,0,1));
        const camDist = 10;
        const camPos = vec3.scale(vec3.create(), camDir, camDist);
        const VP = makeViewProjection(camPos, this.Canvas.width / this.Canvas.height);
        const VPINV = mat4.invert(mat4.create(), VP);

        const ELEMENT_COUNT = 32;
        const UniformData = new ArrayBuffer(4 * ELEMENT_COUNT);
        {
            const Float32View = new Float32Array(UniformData);
            const Uint32View = new Uint32Array(UniformData);

            Uint32View[0] = this.Canvas.width;
            Uint32View[1] = this.Canvas.height;
            Uint32View[2] = 3; // Max Bounce
            Uint32View[3] = 1;
            
            for(let iter=0; iter<16; iter++) Float32View[4 + iter] = VPINV?.[iter]!;

            Float32View[20] = camPos[0];
            Float32View[21] = camPos[1];
            Float32View[22] = camPos[2];
            Uint32View [23] = this.FrameCount;

            Uint32View[24] = this.Offset_MeshDescriptorBuffer;
            Uint32View[25] = this.Offset_MaterialBuffer;
            Uint32View[26] = this.Offset_LightBuffer;
            Uint32View[27] = this.Offset_IndexBuffer;

            Uint32View[28] = this.Offset_PrimitiveToMaterialBuffer;
            Uint32View[29] = this.Offset_BlasBuffer;
            Uint32View[30] = this.World.InstancesPool.size;
            Uint32View[31] = this.World.Lights.length;
        }

        this.Device.queue.writeBuffer(this.UniformBuffer, 0, UniformData);

        return;
    }



    async Render(): Promise<void>
    {

        const CommandEncoder: GPUCommandEncoder = this.Device.createCommandEncoder();


        ///////////////////// ReSTIR DI Stuffs /////////////////////

        // Pass 1. Compute Every Pixel's First Hit Information
        {
            const ComputePass : GPUComputePassEncoder = CommandEncoder.beginComputePass();

            ComputePass.setPipeline(this.ComputePipeline_Pass1);
            ComputePass.setBindGroup(0, this.ComputeBindGroup_Pass1);
            ComputePass.dispatchWorkgroups(Math.ceil(this.Canvas.width/8), Math.ceil(this.Canvas.height/8), 1);

            ComputePass.end();
        }

        ///////////////////////////////////////////////////////////


        // Submit Encoder
        this.Device.queue.submit([CommandEncoder.finish()]);

        return;
    }


};