import { vec3, mat4 } from "gl-matrix";

import computeShaderCode from './shaders/ComputeShader.wgsl?raw';
import vertexShaderCode from './shaders/testVertex.wgsl?raw';
import fragmentShaderCode from './shaders/testFragment.wgsl?raw';

import { type Mesh } from "./Mesh";
import { type Instance, World } from "./World";
import { Wrapper } from "./Wrapper";

import { buildTLAS } from "./TlasBuilder";

function createHumanEyeViewProjection(camWorldPosition: vec3): mat4 {
    // 1. 최종 결과를 저장할 행렬과 중간 계산용 행렬들을 생성합니다.
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const viewProjectionMatrix = mat4.create();

    // 2. View Matrix 계산 (카메라의 위치와 방향)
    const cameraTarget = vec3.fromValues(0, 0, 0); // 바라볼 목표 지점
    const worldUp = vec3.fromValues(0, 1, 0);       // 월드의 '위' 방향

    mat4.lookAt(viewMatrix, camWorldPosition, cameraTarget, worldUp);
    
    // 3. Projection Matrix 계산 (카메라의 렌즈 특성)
    const fieldOfView = (55 * Math.PI) / 180; // 55도를 라디안으로 변환
    const aspectRatio = 16.0 / 9.0;
    const zNear = 0.1;
    const zFar = 1000.0;

    mat4.perspective(projectionMatrix, fieldOfView, aspectRatio, zNear, zFar);

    // 4. 두 행렬을 곱하여 최종 View-Projection 행렬을 만듭니다.
    // 순서가 매우 중요합니다: Projection * View
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
    
    return viewProjectionMatrix;
}

export class Renderer
{

    // GPU Device Stuff
    public readonly Adapter         : GPUAdapter;
    public readonly Device          : GPUDevice;
    public readonly Canvas          : HTMLCanvasElement;
    public readonly Context         : GPUCanvasContext;
    public readonly PreferredFormat : GPUTextureFormat;

 /////////////////////////////////////
 /////////////////////////////////////



    public UniformsBuffer       : GPUBuffer;
    public InstancesBuffer      : GPUBuffer;
    public BVHBuffer            : GPUBuffer;
    public SubMeshesBuffer      : GPUBuffer;
    public MaterialsBuffer      : GPUBuffer;
    public PrimitiveToSubMesh   : GPUBuffer;
    
    public VerticesBuffer       : GPUBuffer;
    public IndicesBuffer        : GPUBuffer;

    // 텍스처 관련 (Gemini)
    public MaterialSampler: GPUSampler;


    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////

    // WebGPU Resources
    public SceneTexture         : GPUTexture;
    public AccumTexture         : GPUTexture;

    public SceneBuffer          : GPUBuffer;
    public GeometryBuffer       : GPUBuffer;
    public AccelBuffer          : GPUBuffer;

    public Textures             : GPUTexture[];

    // WebGPU Pipelines
    public ComputePipeline : GPUComputePipeline;
    public RenderPipeline  : GPURenderPipeline;

    // WebGPU BindGroups
    public ComputeBindGroup: GPUBindGroup;
    public RenderBindGroup: GPUBindGroup;

    // World Data
    public World    : World;
    public FrameCount : number;

    // Data Offsets
    public Offset_MeshDescriptorBuffer: number;
    public Offset_MaterialBuffer : number;
    public Offset_PrimitiveBuffer: number;
    public Offset_BlasBuffer : number;


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
        


        // Create WebGPU Resources
        this.SceneTexture       = GPUTexture.prototype;
        this.AccumTexture       = GPUTexture.prototype;

        this.SceneBuffer        = GPUBuffer.prototype;
        this.GeometryBuffer     = GPUBuffer.prototype;
        this.AccelBuffer        = GPUBuffer.prototype;

        this.Textures           = [];


        this.UniformsBuffer     = GPUBuffer.prototype;
        this.InstancesBuffer    = GPUBuffer.prototype;
        this.BVHBuffer          = GPUBuffer.prototype;
        this.SubMeshesBuffer    = GPUBuffer.prototype;
        this.MaterialsBuffer    = GPUBuffer.prototype;
        this.PrimitiveToSubMesh = GPUBuffer.prototype;

        this.VerticesBuffer     = GPUBuffer.prototype;
        this.IndicesBuffer      = GPUBuffer.prototype;


        // Create WebGPU Pipelines
        this.ComputePipeline    = GPUComputePipeline.prototype;
        this.RenderPipeline     = GPURenderPipeline.prototype;


        // Create WebGPU BindGroups
        this.ComputeBindGroup   = GPUBindGroup.prototype;
        this.RenderBindGroup    = GPUBindGroup.prototype;


        // World Data
        this.World              = World.prototype;
        this.FrameCount         = 0;



        this.MaterialSampler = this.Device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        });


        this.Offset_BlasBuffer = 0;
        this.Offset_MaterialBuffer = 0;
        this.Offset_MeshDescriptorBuffer = 0;
        this.Offset_PrimitiveBuffer = 0;
    }

    BuildMeshData(World: World): [Float32Array, Float32Array, Float32Array, ImageBitmap[]]
    {

        interface MeshRawData
        {
            BlasArray       : Float32Array,
            VertexArray     : Float32Array,
            PrimitiveArray  : Uint32Array,
            MaterialArray   : Float32Array,
            TextureArray    : Array<ImageBitmap>,
        };



        interface MeshDescriptor
        {
            BlasOffset      : number,
            VertexOffset    : number,
            PrimitiveOffset : number,
            MaterialOffset  : number,
            TextureOffset   : number,
        };



        function convertMapToArray<T>(InMap: Map<string, T>): [T[], Map<string, number>]
        {
            const ArrayData: T[] = [...InMap.values()];

            const IDToIndexMap: Map<string, number> = new Map<string, number>();
            {
                const IDData: string[] = [...InMap.keys()];

                for (let iter=0; iter<IDData.length; iter++)
                    IDToIndexMap.set(IDData[iter], iter);
            }

            return [ArrayData, IDToIndexMap];
        }




        // World로부터 Instance, Mesh 정보들 모두 가져오기
        let InstanceArray           : Instance[];
        let MeshArray               : Mesh[];
        let MeshIDToIndexMap        : Map<string, number>;
        {
            InstanceArray = convertMapToArray(World.InstancesPool)[0];

            const UsedMeshes: Map<string, Mesh> = new Map<string, Mesh>();
            for (const instance of InstanceArray) UsedMeshes.set(instance.MeshID, World.MeshesPool.get(instance.MeshID)!);

            [MeshArray, MeshIDToIndexMap] = convertMapToArray(UsedMeshes);
        }



        // 모든 메시를 하나의 RawData로 병합하기
        let MergedMeshRawData: MeshRawData;
        const MeshDescriptorArray : Array<MeshDescriptor> = new Array<MeshDescriptor>(MeshArray.length);
        {
            const MergedMeshDescriptor: MeshDescriptor =
            {
                BlasOffset      : 0,
                VertexOffset    : 0,
                PrimitiveOffset : 0,
                MaterialOffset  : 0,
                TextureOffset   : 0,
            };

            const MeshRawDataArray : Array<MeshRawData> = new Array<MeshRawData>(MeshArray.length);
            for (let iter=0; iter<MeshArray.length; iter++)
            {
                const BlasArray                     = Wrapper.WrapBlasArray(MeshArray[iter]);
                const VertexArray                   = Wrapper.WrapVertexArray(MeshArray[iter]);
                const PrimitiveArray                = Wrapper.WrapPrimitiveArray(MeshArray[iter]);
                const [MaterialArray, TextureArray] = Wrapper.WrapMaterialsAndTexturesArray(MeshArray[iter]);

                const RawData: MeshRawData =
                {
                    BlasArray       : BlasArray,
                    VertexArray     : VertexArray,
                    PrimitiveArray  : PrimitiveArray,
                    MaterialArray   : MaterialArray,
                    TextureArray    : TextureArray
                };

                const Descriptor: MeshDescriptor =
                {
                    BlasOffset      : MergedMeshDescriptor.BlasOffset,
                    VertexOffset    : MergedMeshDescriptor.VertexOffset,
                    PrimitiveOffset : MergedMeshDescriptor.PrimitiveOffset,
                    MaterialOffset  : MergedMeshDescriptor.MaterialOffset,
                    TextureOffset   : MergedMeshDescriptor.TextureOffset,
                };

                MeshRawDataArray[iter] = RawData;
                MeshDescriptorArray[iter] = Descriptor;

                MergedMeshDescriptor.BlasOffset       += BlasArray.length;
                MergedMeshDescriptor.VertexOffset     += VertexArray.length;
                MergedMeshDescriptor.PrimitiveOffset  += PrimitiveArray.length;
                MergedMeshDescriptor.MaterialOffset   += MaterialArray.length;
                MergedMeshDescriptor.TextureOffset    += TextureArray.length;
            }
            
            MergedMeshRawData =
            {
                BlasArray       : new Float32Array(MergedMeshDescriptor.BlasOffset),
                VertexArray     : new Float32Array(MergedMeshDescriptor.VertexOffset),
                PrimitiveArray  : new Uint32Array(MergedMeshDescriptor.PrimitiveOffset),
                MaterialArray   : new Float32Array(MergedMeshDescriptor.MaterialOffset),
                TextureArray    : new Array<ImageBitmap>(MergedMeshDescriptor.TextureOffset),
            };

            for (let iter=0; iter<MeshArray.length; iter++)
            {
                const RawData = MeshRawDataArray[iter];
                const Descriptor = MeshDescriptorArray[iter];

                MergedMeshRawData.BlasArray.set(RawData.BlasArray, Descriptor.BlasOffset);
                MergedMeshRawData.VertexArray.set(RawData.VertexArray, Descriptor.VertexOffset);
                MergedMeshRawData.PrimitiveArray.set(RawData.PrimitiveArray, Descriptor.PrimitiveOffset);
                MergedMeshRawData.MaterialArray.set(RawData.MaterialArray, Descriptor.MaterialOffset);

                for (let idx=0; idx<RawData.TextureArray.length; idx++)
                    MergedMeshRawData.TextureArray[Descriptor.TextureOffset + idx] = RawData.TextureArray[idx];
            }

        }


        // Tlas 빌드하기
        const TlasArray : Float32Array = buildTLAS(InstanceArray, MeshArray, MeshIDToIndexMap);


        // Instance 정보들과 MeshDescriptor정보들을 RawData로 변환
        const InstanceRawData: Float32Array = Wrapper.WrapInstances(InstanceArray, MeshIDToIndexMap);
        const MeshDescriptorRawData: Float32Array = new Float32Array(8 * MeshDescriptorArray.length);
        for (let iter=0; iter<MeshDescriptorArray.length; iter++)
        {
            const Offset = 8 * iter;

            MeshDescriptorRawData[Offset + 0] = MeshDescriptorArray[iter].BlasOffset;
            MeshDescriptorRawData[Offset + 1] = MeshDescriptorArray[iter].PrimitiveOffset;
            MeshDescriptorRawData[Offset + 2] = MeshDescriptorArray[iter].VertexOffset;
            MeshDescriptorRawData[Offset + 3] = MeshDescriptorArray[iter].MaterialOffset;
            
            MeshDescriptorRawData[Offset + 7] = MeshDescriptorArray[iter].TextureOffset;
        }
    




        // SceneBuffer에 쓸 데이터 준비하기 (Instance, MeshDescriptor, Material)
        this.Offset_MeshDescriptorBuffer = InstanceRawData.length;
        this.Offset_MaterialBuffer = this.Offset_MeshDescriptorBuffer + MeshDescriptorRawData.length;
        
        const SceneBufferLength = this.Offset_MaterialBuffer + MergedMeshRawData.MaterialArray.length;
        const SceneBufferData: Float32Array = new Float32Array(SceneBufferLength);
        {
            SceneBufferData.set(InstanceRawData, 0);
            SceneBufferData.set(MeshDescriptorRawData, this.Offset_MeshDescriptorBuffer);
            SceneBufferData.set(MergedMeshRawData.MaterialArray, this.Offset_MaterialBuffer);
        }



        // GeometryBuffer에 쓸 데이터 준비하기 (Vertex, Primitive)
        this.Offset_PrimitiveBuffer = MergedMeshRawData.VertexArray.length;

        const GeometryBufferLength = this.Offset_PrimitiveBuffer + MergedMeshRawData.PrimitiveArray.length;
        const GeometryBufferData: Float32Array = new Float32Array(GeometryBufferLength);
        {
            GeometryBufferData.set(MergedMeshRawData.VertexArray, 0);
            GeometryBufferData.set(MergedMeshRawData.PrimitiveArray, this.Offset_PrimitiveBuffer);     
        }



        // AccelBuffer에 쓸 데이터 준비하기 (Tlas, Blas)
        this.Offset_BlasBuffer = TlasArray.length;

        const AccelBufferLength = this.Offset_BlasBuffer + MergedMeshRawData.BlasArray.length;
        const AccelBufferData: Float32Array = new Float32Array(AccelBufferLength);
        {
            AccelBufferData.set(TlasArray, 0);
            AccelBufferData.set(MergedMeshRawData.BlasArray, this.Offset_BlasBuffer);
        }


        // TextureArray에 쓸 데이터 준비하기 (Textures)
        MergedMeshRawData.TextureArray;


        return [SceneBufferData, GeometryBufferData, AccelBufferData, MergedMeshRawData.TextureArray];
    }
    

    async Initialize(World: World): Promise<void>
    {
        // Initialize Scene Stuffs
        this.World = World;
        this.FrameCount = 0;

        // Build Scene
        const [SceneBufferData, GeometryBufferData, AccelBufferData, ImageBitmaps] = this.BuildMeshData(World);


        // Create Uniform Buffer
        {
            const UniformBufferUsageFlags: GPUBufferUsageFlags = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

            this.UniformsBuffer = this.Device.createBuffer({ size: 256, usage: UniformBufferUsageFlags });
        }

        // Create Storage Buffers
        {
            const StorageBufferUsageFlags: GPUBufferUsageFlags = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;


            // 1. Scene Buffer
            const SceneBufferDescriptor: GPUBufferDescriptor = { size: SceneBufferData.byteLength, usage: StorageBufferUsageFlags };
            
            this.SceneBuffer = this.Device.createBuffer(SceneBufferDescriptor);
            this.Device.queue.writeBuffer(this.SceneBuffer, 0, SceneBufferData.buffer);

            

            // 2. GeometryBuffer
            const GeometryBufferDescriptor: GPUBufferDescriptor = { size: GeometryBufferData.byteLength, usage: StorageBufferUsageFlags };

            this.GeometryBuffer = this.Device.createBuffer(GeometryBufferDescriptor);
            this.Device.queue.writeBuffer(this.GeometryBuffer, 0, GeometryBufferData.buffer);



            // 3. AccelBuffer
            const AccelBufferDescriptor: GPUBufferDescriptor = { size: AccelBufferData.byteLength, usage: StorageBufferUsageFlags };

            this.AccelBuffer = this.Device.createBuffer(AccelBufferDescriptor);
            this.Device.queue.writeBuffer(this.AccelBuffer, 0, AccelBufferData.buffer);
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
                    { binding: 0, resource: { buffer: this.UniformsBuffer } },
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


        return;
    }


    Update(): void
    {

        const data = new Uint32Array(2);
        data[0] = this.Canvas.width;
        data[1] = this.Canvas.height;

        this.Device.queue.writeBuffer(this.UniformsBuffer, 0, data);

        const camData = new Float32Array(19);
        
        const camPos = vec3.fromValues(0.6,1,1);
        const VP = createHumanEyeViewProjection(camPos);
        const VPINV = mat4.invert(mat4.create(), VP);

        for(let iter=0; iter<16; iter++) camData[iter] = VPINV?.[iter]!;

        camData[16] = camPos[0];
        camData[17] = camPos[1];
        camData[18] = camPos[2];


        this.Device.queue.writeBuffer(this.UniformsBuffer, 16, camData);

        return;
    }



    async Render(): Promise<void>
    {

        const CommandEncoder: GPUCommandEncoder = this.Device.createCommandEncoder();

        // ComputePass (Path Tracing)
        {
            const ComputePass: GPUComputePassEncoder = CommandEncoder.beginComputePass();
            
            ComputePass.setPipeline(this.ComputePipeline);
            ComputePass.setBindGroup(0, this.ComputeBindGroup);
            ComputePass.dispatchWorkgroups(Math.ceil(this.Canvas.width/8), Math.ceil(this.Canvas.height/8), 1);

            ComputePass.end();
        }

        // Copy Texture : AccumTexture -> SceneTexture
        {
            const SourceTextureInfo     : GPUTexelCopyTextureInfo   = { texture: this.AccumTexture };
            const DestTextureInfo       : GPUTexelCopyTextureInfo   = { texture: this.SceneTexture };
            const TextureSize           : GPUExtent3DStrict         = { width: this.SceneTexture.width, height: this.SceneTexture.height };

            CommandEncoder.copyTextureToTexture(SourceTextureInfo, DestTextureInfo, TextureSize);
        }
        


        // RenderPass (Draw SceneTexture)
        {
            const RenderPassDescriptor: GPURenderPassDescriptor =
            {
                colorAttachments:
                [
                    {
                        view: this.Context.getCurrentTexture().createView(),
                        loadOp: "clear",
                        storeOp: "store",
                        clearValue: { r:0, g:0, b:0, a:1 }
                    }
                ]
            };


            

            const RenderPass: GPURenderPassEncoder = CommandEncoder.beginRenderPass(RenderPassDescriptor);

            RenderPass.setPipeline(this.RenderPipeline);
            RenderPass.setBindGroup(0, this.RenderBindGroup);
            RenderPass.draw(6);

            RenderPass.end();
        }

        // Submit Encoder
        this.Device.queue.submit([CommandEncoder.finish()]);
        this.FrameCount++;

        return;
    }


};