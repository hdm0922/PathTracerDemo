import { mat4 }             from "wgpu-matrix";

import { Camera }           from "./Camera";
import { ComputePass }      from "./ComputePass";
import { World }            from "./World";
import { ResourceManager }  from "./ResourceManager";
import { MeshDescriptor }   from "./Structs";

import ShaderCode_DEBUG             from './shaders/PT_00_DebugPass.wgsl?raw';
import ShaderCode_GBufferCreation   from './shaders/PT_01_GBufferPass.wgsl?raw';

import ShaderCode_Initialize        from './shaders/PT_1_InitPass.wgsl?raw';
import ShaderCode_FinalShading      from './shaders/PT_4_FinalShadingPass.wgsl?raw';

import ShaderCode_Vertex            from './shaders/VertexShader.wgsl?raw';
import ShaderCode_Fragment          from './shaders/FragmentShader.wgsl?raw';



const EBufferIndex =
{
    Uniform     : 0,
    Scene       : 1,
    Geometry    : 2,
    Accel       : 3,
    Reservoir   : 4,
    SIZE        : 5
} as const;

const ETextureIndex =
{
    G_Buffer    : 0,
    Scene       : 1,
    Result      : 2,
    SIZE        : 3
} as const;

const EDataOffsetIndex =
{
    MeshDescriptor      : 0,
    Material            : 1,
    Light               : 2,
    LightsCDF           : 3,
    Index               : 4,
    SubBlasRootArray    : 5,
    Blas                : 6,
    SIZE                : 7
} as const;

const EComputePassIndex =
{
    G_BufferCreation    : 0,
    DEBUG               : 1,
    SIZE                : 2
} as const;



export class Renderer
{
    // GPU Device Stuff
    private readonly Adapter         : GPUAdapter;
    private readonly Device          : GPUDevice;
    private readonly Canvas          : HTMLCanvasElement;
    private readonly Context         : GPUCanvasContext;
    private readonly PreferredFormat : GPUTextureFormat;

    // Resources
    private GPUBuffers  : GPUBuffer[];
    private GPUTextures : GPUTexture[];
    private Offsets     : number[];

    // Passes
    private ComputePasses   : ComputePass[];
    private RenderPipeline  : GPURenderPipeline;
    private RenderBindGroup : GPUBindGroup;

    // Scene Data
    private World       : World;
    private Camera      : Camera;
    private FrameCount  : number;


    constructor
    (
        Adapter : GPUAdapter,
        Device  : GPUDevice,
        Canvas  : HTMLCanvasElement,
    )
    {
        // Get GPU Device Stuffs
        {
            this.Adapter            = Adapter;
            this.Device             = Device;
            this.Canvas             = Canvas;
            this.Context            = Canvas.getContext('webgpu')!;
            this.PreferredFormat    = navigator.gpu.getPreferredCanvasFormat();
        }

        // Configure Context
        {
            const CanvasConfiguration : GPUCanvasConfiguration =
            {
                device : this.Device,
                format : this.PreferredFormat,
                alphaMode : "opaque",
            };

            this.Context.configure(CanvasConfiguration);
        }

        // Declare Resources
        {
            this.GPUBuffers         = new Array(EBufferIndex.SIZE);
            this.GPUTextures        = new Array(ETextureIndex.SIZE);
            this.Offsets            = new Array(EDataOffsetIndex.SIZE);

            this.ComputePasses      = new Array(EComputePassIndex.SIZE);
            this.RenderPipeline     = GPURenderPipeline.prototype;
            this.RenderBindGroup    = GPUBindGroup.prototype;

            this.World              = World.prototype;
            this.Camera             = Camera.prototype;
            this.FrameCount         = 0;
        }

    }


    public GetCamera() : Camera 
    { 
        return this.Camera;
    }

    public ResetFrameCount() : void 
    { 
        this.FrameCount = 0; 
    }



    public async Initialize(InWorld : World) : Promise<void>
    {

        // Prevent VRAM Leak
        this.DestroyGPUResources();

        // Initialize Scene Datas
        {
            this.Camera = new Camera(this.Canvas.width, this.Canvas.height);
            this.Camera.SetLocationFromXYZ(0,0,6);
            this.Camera.SetYaw(0);
            this.Camera.SetPitch(0);

            this.World = InWorld;
            this.ResetFrameCount();
        }

        this.CreateGPUResources();
        this.CreateRenderPass();
        await this.CreateComputePasses();

        return;
    }

    public Update() : void
    {
        this.FrameCount++;

        // Camera Properties
        const CameraLocation            = this.Camera.GetLocation();
        const ViewProjection            = this.Camera.GetViewProjectionMatrix();
        const ViewProjection_Inverse    = mat4.invert(ViewProjection);

        const ELEMENT_COUNT = 33;
        const UniformData = new ArrayBuffer(4 * ELEMENT_COUNT);
        {
            const Float32View = new Float32Array(UniformData);
            const Uint32View = new Uint32Array(UniformData);

            Uint32View[0] = this.Canvas.width;
            Uint32View[1] = this.Canvas.height;
            Uint32View[2] = 10; // Max Bounce
            Uint32View[3] = 1;
            
            for(let iter=0; iter<16; iter++) Float32View[4 + iter] = ViewProjection_Inverse?.[iter]!;

            Float32View[20] = CameraLocation[0];
            Float32View[21] = CameraLocation[1];
            Float32View[22] = CameraLocation[2];
            Uint32View [23] = this.FrameCount;

            Uint32View[24] = this.Offsets[EDataOffsetIndex.MeshDescriptor];
            Uint32View[25] = this.Offsets[EDataOffsetIndex.Material];
            Uint32View[26] = this.Offsets[EDataOffsetIndex.Light];
            Uint32View[27] = this.Offsets[EDataOffsetIndex.LightsCDF];
            Uint32View[28] = this.Offsets[EDataOffsetIndex.Index];

            Uint32View[29] = this.Offsets[EDataOffsetIndex.SubBlasRootArray];
            Uint32View[30] = this.Offsets[EDataOffsetIndex.Blas];
            Uint32View[31] = this.World.InstancesPool.size;
            Uint32View[32] = this.World.Lights.length;
        }

        this.Device.queue.writeBuffer(this.GPUBuffers[EBufferIndex.Uniform], 0, UniformData);

    }

    public Render() : void
    {
        const WorkgroupCount : number[]             = [Math.ceil(this.Canvas.width/8), Math.ceil(this.Canvas.height/8), 1];
        const CommandEncoder : GPUCommandEncoder    = this.Device.createCommandEncoder();

        // Dispatch All Compute Passes
        {
            const ComputePassEncoder : GPUComputePassEncoder = CommandEncoder.beginComputePass();

            for (var iter = 0; iter < this.ComputePasses.length; iter++) 
                this.ComputePasses[iter].Dispatch(ComputePassEncoder, WorkgroupCount);

            ComputePassEncoder.end();
        }

        // Copy Texture : ResultTexture -> SceneTexture
        {
            CommandEncoder.copyTextureToTexture
            ( 
                { texture : this.GPUTextures[ETextureIndex.Result] },
                { texture : this.GPUTextures[ETextureIndex.Scene] },
                { width : this.Canvas.width, height : this.Canvas.height }
            );
        }

        // RenderPass (Draw ResultTexture)
        {
            const RenderPassDescriptor : GPURenderPassDescriptor =
            {
                colorAttachments :
                [
                    {
                        view : this.Context.getCurrentTexture().createView(),
                        loadOp : "clear",
                        storeOp : "store",
                        clearValue : { r:0, g:0, b:0, a:1 }
                    }
                ]
            };

            const RenderPass : GPURenderPassEncoder = CommandEncoder.beginRenderPass(RenderPassDescriptor);

            RenderPass.setPipeline(this.RenderPipeline);
            RenderPass.setBindGroup(0, this.RenderBindGroup);
            RenderPass.draw(6);

            RenderPass.end();
        }

        // Submit Encoder
        this.Device.queue.submit( [ CommandEncoder.finish() ] );

        return;
    }



    

    private SerializeWorldData() : [ArrayBuffer, ArrayBuffer, ArrayBuffer, ImageBitmap[]]
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

        let LightsCDFRawData : Uint32Array;
        {
            const LightsCDFArrayBuffer : ArrayBuffer = this.World.GetLightCDFBuffer();
            LightsCDFRawData = new Uint32Array(LightsCDFArrayBuffer);
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

        // Scene Buffer에 들어갈 데이터 채우기 | Instance + MeshDescriptor + Material  + Light + LightsCDF
        const ArraysInSceneBuffer  = [InstanceRawData, MeshDescriptorRawData, MaterialRawData, LightRawData, LightsCDFRawData];
        const [SceneBufferData, SceneBufferOffsets] = ResourceManager.MergeArrays(ArraysInSceneBuffer);
        {
            this.Offsets[EDataOffsetIndex.MeshDescriptor]   = SceneBufferOffsets[1];
            this.Offsets[EDataOffsetIndex.Material]         = SceneBufferOffsets[2];
            this.Offsets[EDataOffsetIndex.Light]            = SceneBufferOffsets[3];
            this.Offsets[EDataOffsetIndex.LightsCDF]        = SceneBufferOffsets[4];
        }

        // Geometry Buffer에 들어갈 데이터 채우기 | Vertex + Index + PrimitiveToMaterial
        const ArraysInGeometryBuffer = [VertexRawData, IndexRawData, SubBlasRootRawData];
        const [GeometryBufferData, GeometryBufferOffsets] = ResourceManager.MergeArrays(ArraysInGeometryBuffer);
        {
            this.Offsets[EDataOffsetIndex.Index]            = GeometryBufferOffsets[1];
            this.Offsets[EDataOffsetIndex.SubBlasRootArray] = GeometryBufferOffsets[2];
        }

        // Accel Buffer에 들어갈 데이터 채우기 | Tlas + Blas
        const ArraysInAccelBuffer = [TlasRawData, BlasRawData];
        const [AccelBufferData, AccelBufferOffsets] = ResourceManager.MergeArrays(ArraysInAccelBuffer);
        {
            this.Offsets[EDataOffsetIndex.Blas] = AccelBufferOffsets[1];
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

    private CreateGPUStorageBuffer(InArrayBuffer : ArrayBuffer) : GPUBuffer
    {
        const StorageBufferUsageFlags   : GPUBufferUsageFlags   = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
        const BufferDescriptor          : GPUBufferDescriptor   = { size : InArrayBuffer.byteLength, usage : StorageBufferUsageFlags };
        const GPUBufferCreated          : GPUBuffer             = this.Device.createBuffer(BufferDescriptor);

        this.Device.queue.writeBuffer(GPUBufferCreated, 0, InArrayBuffer);

        return GPUBufferCreated;
    }

    private CreateGPUTexture() : GPUTexture
    {
        const TextureDescriptor : GPUTextureDescriptor =
        {
            size    : { width : this.Canvas.width, height : this.Canvas.height },
            format  : "rgba32float",
            usage   : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
        };

        return this.Device.createTexture(TextureDescriptor);
    }

    private CreateGPUResources() : void
    {
        const [SceneBufferData, GeometryBufferData, AccelBufferData, ImageBitmaps] = this.SerializeWorldData();

        this.GPUBuffers[EBufferIndex.Uniform]       = this.Device.createBuffer( { size : 256, usage : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST } );
        this.GPUBuffers[EBufferIndex.Scene]         = this.CreateGPUStorageBuffer(SceneBufferData);
        this.GPUBuffers[EBufferIndex.Geometry]      = this.CreateGPUStorageBuffer(GeometryBufferData);
        this.GPUBuffers[EBufferIndex.Accel]         = this.CreateGPUStorageBuffer(AccelBufferData);
        this.GPUBuffers[EBufferIndex.Reservoir]     = this.CreateGPUStorageBuffer(new ArrayBuffer(80 * this.Canvas.width * this.Canvas.height));

        this.GPUTextures[ETextureIndex.G_Buffer]    = this.CreateGPUTexture();
        this.GPUTextures[ETextureIndex.Scene]       = this.CreateGPUTexture();
        this.GPUTextures[ETextureIndex.Result]      = this.CreateGPUTexture();

        return;
    }

    private DestroyGPUResources() : void
    {

        for (let iter = 0; iter < EBufferIndex.SIZE; iter++)
        {
            this.GPUBuffers[iter]?.destroy();
        }

        for (let iter = 0; iter < ETextureIndex.SIZE; iter++)
        {
            this.GPUTextures[iter]?.destroy();
        }

        return;
    }

    private async CreateComputePasses() : Promise<void>
    {
        // Define All Compute Passes (Orders Respect To EComputePassIndex)
        const ComputePassesToCreate : Promise<ComputePass>[] =
        [
            ComputePass.Create
            (
                this.Device, 
                ShaderCode_GBufferCreation, 
                [   // Input, GPUBuffer
                    this.GPUBuffers[EBufferIndex.Uniform],
                    this.GPUBuffers[EBufferIndex.Scene],
                    this.GPUBuffers[EBufferIndex.Geometry],
                    this.GPUBuffers[EBufferIndex.Accel],
                ],
                [   // Input, GPUTextureView

                ],
                [   // Output, GPUBuffer

                ],
                [   // Output, GPUTextureView
                    this.GPUTextures[ETextureIndex.G_Buffer].createView(),
                ]
            ),

            ComputePass.Create
            (
                this.Device, 
                ShaderCode_Initialize, 
                [   // Input, GPUBuffer
                    this.GPUBuffers[EBufferIndex.Uniform],
                    this.GPUBuffers[EBufferIndex.Scene],
                    this.GPUBuffers[EBufferIndex.Geometry],
                    this.GPUBuffers[EBufferIndex.Accel],
                ],
                [   // Input, GPUTextureView
                    this.GPUTextures[ETextureIndex.G_Buffer].createView(),
                ],
                [   // Output, GPUBuffer
                    this.GPUBuffers[EBufferIndex.Reservoir],
                ],
                [   // Output, GPUTextureView

                ]
            ),

            ComputePass.Create
            (
                this.Device, 
                ShaderCode_FinalShading, 
                [   // Input, GPUBuffer
                    this.GPUBuffers[EBufferIndex.Uniform],
                    this.GPUBuffers[EBufferIndex.Scene],
                    this.GPUBuffers[EBufferIndex.Geometry],
                    this.GPUBuffers[EBufferIndex.Accel],
                    this.GPUBuffers[EBufferIndex.Reservoir],
                ],
                [   // Input, GPUTextureView
                    this.GPUTextures[ETextureIndex.G_Buffer].createView(),
                    this.GPUTextures[ETextureIndex.Scene].createView(),
                ],
                [   // Output, GPUBuffer
                    
                ],
                [   // Output, GPUTextureView
                    this.GPUTextures[ETextureIndex.Result].createView(),
                ]
            ),


        ];

        this.ComputePasses = await Promise.all(ComputePassesToCreate);

        return;
    }

    private CreateRenderPass() : void
    {

        // Create Render Pipeline
        {
            const ShaderModuleDescriptor_Vertex   : GPUShaderModuleDescriptor = { code : ShaderCode_Vertex };
            const ShaderModuleDescriptor_Fragment : GPUShaderModuleDescriptor = { code : ShaderCode_Fragment };

            const ShaderModule_Vertex    : GPUShaderModule = this.Device.createShaderModule(ShaderModuleDescriptor_Vertex);
            const ShaderModule_Fragment  : GPUShaderModule = this.Device.createShaderModule(ShaderModuleDescriptor_Fragment);

            const RenderPipelineDescriptor : GPURenderPipelineDescriptor =
            {
                layout      : "auto",
                vertex      : { module: ShaderModule_Vertex,    entryPoint: "vs_main" },
                fragment    : { module: ShaderModule_Fragment,  entryPoint: "fs_main", targets : [{ format: this.PreferredFormat }] },
                primitive   : { topology: "triangle-list" },
            };

            this.RenderPipeline = this.Device.createRenderPipeline(RenderPipelineDescriptor);
        }

        // Create Render BindGroup
        {
            const RenderBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout  : this.RenderPipeline.getBindGroupLayout(0),
                entries : 
                [
                    { binding : 0, resource : this.GPUTextures[ETextureIndex.Scene].createView() }
                ],
            };

            this.RenderBindGroup = this.Device.createBindGroup(RenderBindGroupDescriptor);
        }

        return;
    }
};