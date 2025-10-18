import { mat4 } from "wgpu-matrix";

import computeShaderCode from './shaders/ComputeShader.wgsl?raw';
import vertexShaderCode from './shaders/VertexShader.wgsl?raw';
import fragmentShaderCode from './shaders/FragmentShader.wgsl?raw';

import { World } from "./World";
import { Camera } from "./Camera";
import { ResourceManager } from "./ResourceManager";
import { MeshDescriptor } from "./Structs";

export class Renderer
{
    // GPU Device Stuff
    public readonly Adapter         : GPUAdapter;
    public readonly Device          : GPUDevice;
    public readonly Canvas          : HTMLCanvasElement;
    public readonly Context         : GPUCanvasContext;
    public readonly PreferredFormat : GPUTextureFormat;

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
    public Offset_SubBlasRootArrayBuffer    : number;
    public Offset_BlasBuffer                : number;

    // Camera
    private Camera! : Camera;

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

        this.UniformBuffer      = GPUBuffer.prototype;
        this.SceneBuffer        = GPUBuffer.prototype;
        this.GeometryBuffer     = GPUBuffer.prototype;
        this.AccelBuffer        = GPUBuffer.prototype;

        this.Textures           = [];

        // Create WebGPU Pipelines
        this.ComputePipeline    = GPUComputePipeline.prototype;
        this.RenderPipeline     = GPURenderPipeline.prototype;


        // Create WebGPU BindGroups
        this.ComputeBindGroup   = GPUBindGroup.prototype;
        this.RenderBindGroup    = GPUBindGroup.prototype;


        // World Data
        this.World              = World.prototype;
        this.FrameCount         = 0;


        this.Offset_BlasBuffer = 0;
        this.Offset_MaterialBuffer = 0;
        this.Offset_LightBuffer = 0;
        this.Offset_MeshDescriptorBuffer = 0;
        this.Offset_IndexBuffer = 0;
        this.Offset_SubBlasRootArrayBuffer = 0;

        {
            this.Camera = new Camera(this.Canvas.width, this.Canvas.height);

            this.Camera.SetLocationFromXYZ(0,0,10);
        }
    }



    PrepareWorldData() : [ArrayBuffer, ArrayBuffer, ArrayBuffer, ImageBitmap[]]
    {

        // World의 모든 정보 취합
        const [InstanceArray, MeshArray, MeshIDToIndexMap] = this.World.PackWorldData();

        // World의 정보들로부터 GPU에 올릴 데이터들 모두 병합

        let InstanceRawData : Uint32Array;
        {
            const SerializedInstanceArray : Uint32Array[] = [];
            for (const InstanceToSerialize of InstanceArray) 
            {
                const InstanceSerialized : Uint32Array = InstanceToSerialize.Serialize(MeshIDToIndexMap);
                SerializedInstanceArray.push( InstanceSerialized ); 
            }

            InstanceRawData = ResourceManager.MergeArrays(SerializedInstanceArray)[0];
        }

        let LightRawData : Uint32Array;
        {
            const SerializedLightArray : Uint32Array[] = [];
            for (const LightToSerialize of this.World.Lights)
            {
                const LightSerialized : Uint32Array = LightToSerialize.Serialize();
                SerializedLightArray.push(LightSerialized);
            }

            LightRawData = ResourceManager.MergeArrays(SerializedLightArray)[0];
        }

        let VertexRawData       : Uint32Array;
        let VertexOffsetData    : Uint32Array;
        {
            const SerializedVertexArray : Uint32Array[] = [];
            for (const SerializedMesh of MeshArray) { SerializedVertexArray.push( SerializedMesh.VertexArray ); }

            [VertexRawData, VertexOffsetData] = ResourceManager.MergeArrays(SerializedVertexArray);
        }

        let IndexRawData    : Uint32Array;
        let IndexOffsetData : Uint32Array;
        {
            const SerializedIndexArray : Uint32Array[] = [];
            for (const SerializedMesh of MeshArray) { SerializedIndexArray.push( SerializedMesh.IndexArray ); }

            [IndexRawData, IndexOffsetData] = ResourceManager.MergeArrays(SerializedIndexArray);
        }

        let MaterialRawData     : Uint32Array;
        let MaterialOffsetData  : Uint32Array;
        {
            const SerializedMaterialArray : Uint32Array[] = [];
            for (const SerializedMesh of MeshArray) { SerializedMaterialArray.push( SerializedMesh.MaterialArray ); }

            [MaterialRawData, MaterialOffsetData] = ResourceManager.MergeArrays(SerializedMaterialArray);
        }

        let SubBlasRootRawData      : Uint32Array;
        let SubBlasRootOffsetData   : Uint32Array;
        {
            const SerializedSubBlasRootArray : Uint32Array[] = [];
            for (const SerializedMesh of MeshArray) { SerializedSubBlasRootArray.push( SerializedMesh.SubBlasRootArray ); }

            [SubBlasRootRawData, SubBlasRootOffsetData] = ResourceManager.MergeArrays(SerializedSubBlasRootArray);
        }

        let BlasRawData     : Uint32Array;
        let BlasOffsetData  : Uint32Array;
        {
            const SerializedBlasArray : Uint32Array[] = [];
            for (const SerializedMesh of MeshArray) { SerializedBlasArray.push( SerializedMesh.BlasArray ); }

            [BlasRawData, BlasOffsetData] = ResourceManager.MergeArrays(SerializedBlasArray);
        }

        let TlasRawData : Uint32Array; // TODO
        {
            TlasRawData = new Uint32Array();
        }

        let MeshDescriptorRawData : Uint32Array;
        {

            const SerializedMeshDescriptorArray : Uint32Array[] = [];

            for (let iter = 0; iter < MeshArray.length; iter++)
            {
                const CurrentMeshDescriptor : MeshDescriptor = new MeshDescriptor
                (
                    VertexOffsetData[iter],
                    IndexOffsetData[iter],
                    MaterialOffsetData[iter],
                    SubBlasRootOffsetData[iter],
                    BlasOffsetData[iter],
                    MeshArray[iter].SubBlasRootArray.length,
                );
                
                SerializedMeshDescriptorArray.push( CurrentMeshDescriptor.Serialize() );
            }

            

            MeshDescriptorRawData = ResourceManager.MergeArrays(SerializedMeshDescriptorArray)[0];
        }
                
        // Scene Buffer에 들어갈 데이터 채우기 | Instance + Light + MeshDescriptor + Material
        const ArraysInSceneBuffer  = [InstanceRawData, LightRawData, MeshDescriptorRawData, MaterialRawData];
        const [SceneBufferData, SceneBufferOffsets] = ResourceManager.MergeArrays(ArraysInSceneBuffer);
        {
            this.Offset_LightBuffer             = SceneBufferOffsets[1];
            this.Offset_MeshDescriptorBuffer    = SceneBufferOffsets[2];
            this.Offset_MaterialBuffer          = SceneBufferOffsets[3];
        }

        // Geometry Buffer에 들어갈 데이터 채우기 | Vertex + Index + PrimitiveToMaterial
        const ArraysInGeometryBuffer = [VertexRawData, IndexRawData, SubBlasRootRawData];
        const [GeometryBufferData, GeometryBufferOffsets] = ResourceManager.MergeArrays(ArraysInGeometryBuffer);
        {
            this.Offset_IndexBuffer             = GeometryBufferOffsets[1];
            this.Offset_SubBlasRootArrayBuffer  = GeometryBufferOffsets[2];
        }

        // Accel Buffer에 들어갈 데이터 채우기 | Tlas + Blas
        const ArraysInAccelBuffer = [TlasRawData, BlasRawData];
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

        return [SceneBufferRawData, GeometryBufferRawData, AccelBufferRawData, []]; // TODO : Texture 채우기
    }



    async Initialize(World: World): Promise<void>
    {
        // Initialize Scene Stuffs
        {
            this.World = World;
            this.FrameCount = 0;
            this.Camera.SetLocationFromXYZ(0,0,6);
            this.Camera.SetYaw(0);
            this.Camera.SetPitch(0);
        }

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

        return;
    }



    Update(): void
    {
        this.FrameCount++;

        // Camera Property
        const CameraLocation = this.Camera.GetLocation();
        const VP = this.Camera.GetViewProjectionMatrix();
        const VPINV = mat4.invert(VP);

        const ELEMENT_COUNT = 32;
        const UniformData = new ArrayBuffer(4 * ELEMENT_COUNT);
        {
            const Float32View = new Float32Array(UniformData);
            const Uint32View = new Uint32Array(UniformData);

            Uint32View[0] = this.Canvas.width;
            Uint32View[1] = this.Canvas.height;
            Uint32View[2] = 10; // Max Bounce
            Uint32View[3] = 1;
            
            for(let iter=0; iter<16; iter++) Float32View[4 + iter] = VPINV?.[iter]!;

            Float32View[20] = CameraLocation[0];
            Float32View[21] = CameraLocation[1];
            Float32View[22] = CameraLocation[2];
            Uint32View [23] = this.FrameCount;

            Uint32View[24] = this.Offset_MeshDescriptorBuffer;
            Uint32View[25] = this.Offset_MaterialBuffer;
            Uint32View[26] = this.Offset_LightBuffer;
            Uint32View[27] = this.Offset_IndexBuffer;

            Uint32View[28] = this.Offset_SubBlasRootArrayBuffer;
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

        return;
    }


};