import type { MeshDescriptor, SerializedMesh }  from "./Structs";
import      { World }                           from "./World";
import      { Camera }                          from "./Camera";
import      { ResourceManager }                 from "./ResourceManager";
import      { ComputePass }                     from "./ComputePass";

import      { mat4 }                            from "wgpu-matrix";

import ReSTIR_DI_Pass1 from "./shaders/ReSTIR_DI_Pass1.wgsl?raw";




export class ReSTIR_DI_Renderer
{

    // GPU Device Stuff
    public readonly Adapter         : GPUAdapter;
    public readonly Device          : GPUDevice;
    public readonly Canvas          : HTMLCanvasElement;
    public readonly Context         : GPUCanvasContext;
    public readonly PreferredFormat : GPUTextureFormat;


    // Compute Pass
    private GBufferCreationPass!    : ComputePass;
    private InitialSamplingPass!    : ComputePass;
    private SpatialReusePass!       : ComputePass;
    private FinalShadingPass!       : ComputePass;


    // BindGroup Informations
    private GBufferCreationPassBindGroup! : GPUBindGroup;


    // WebGPU Resources
    private G_PositionTexture   : GPUTexture;
    private G_NormalTexture     : GPUTexture;
    private G_AlbedoTexture     : GPUTexture;
    private G_EmissiveTexture   : GPUTexture;

    private ReservoirTexture_A  : GPUTexture;

    private Textures : GPUTexture[];

    private UniformBuffer_GBufferCreationPass! : GPUBuffer;
    private UniformBuffer_InitialSamplingPass! : GPUBuffer;

    private SceneBuffer     : GPUBuffer;
    private GeometryBuffer  : GPUBuffer;
    private AccelBuffer     : GPUBuffer;
    private LightCDFBuffer  : GPUBuffer;



    // World Data
    public World : World;
    private Camera : Camera;

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
        {
            this.Adapter            = Adapter;
            this.Device             = Device;
            this.Canvas             = Canvas;
            this.Context            = Canvas.getContext('webgpu')!;
            this.PreferredFormat    = navigator.gpu.getPreferredCanvasFormat();
        }

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

            this.ReservoirTexture_A = GPUTexture.prototype;

            this.LightCDFBuffer     = GPUBuffer.prototype;

            this.SceneBuffer        = GPUBuffer.prototype;
            this.GeometryBuffer     = GPUBuffer.prototype;
            this.AccelBuffer        = GPUBuffer.prototype;

            this.Textures           = [];

            this.World              = World.prototype;
        }

        // Initialize Data
        {
            this.Offset_BlasBuffer                  = 0;
            this.Offset_MaterialBuffer              = 0;
            this.Offset_LightBuffer                 = 0;
            this.Offset_MeshDescriptorBuffer        = 0;
            this.Offset_IndexBuffer                 = 0;
            this.Offset_PrimitiveToMaterialBuffer   = 0;

            this.Camera = new Camera(this.Canvas.width, this.Canvas.height);
        }
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



    async Initialize(World: World): Promise<void>
    {
        // Initialize Scene Stuffs
        {
            this.World = World;
            this.Camera.SetLocationFromXYZ(0,0,10);
        }
        

        // Build Scene
        const [SceneBufferData, GeometryBufferData, AccelBufferData, ImageBitmaps] = this.PrepareWorldData();

        // Create Uniform Buffer
        {
            const UniformBufferUsageFlags : GPUBufferUsageFlags = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

            this.UniformBuffer_GBufferCreationPass = this.Device.createBuffer({ size: 256, usage: UniformBufferUsageFlags });
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

        ///////////////////// ReSTIR DI Stuffs /////////////////////

        // Create Resources used in ReSTIR DI
        {
            const GBufferDescriptor : GPUTextureDescriptor =
            {
                size: { width: this.Canvas.width, height: this.Canvas.height },
                format: "rgba32float",
                usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
            };

            const ReservoirBufferDescriptor : GPUTextureDescriptor =
            {
                size: { width: this.Canvas.width, height: this.Canvas.height },
                format: "rgba32float",
                usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
            };

            this.G_PositionTexture  = this.Device.createTexture(GBufferDescriptor);
            this.G_NormalTexture    = this.Device.createTexture(GBufferDescriptor);
            this.G_AlbedoTexture    = this.Device.createTexture(GBufferDescriptor);
            this.G_EmissiveTexture  = this.Device.createTexture(GBufferDescriptor);

            this.ReservoirTexture_A = this.Device.createTexture(ReservoirBufferDescriptor);
        }

        // Compute Pipeline & BindGroup
        {
            this.GBufferCreationPass = await ComputePass.Create(this.Device, ReSTIR_DI_Pass1);

            const G_PositionView    : GPUTextureView = this.G_PositionTexture.createView();
            const G_NormalView      : GPUTextureView = this.G_NormalTexture.createView();
            const G_AlbedoView      : GPUTextureView = this.G_AlbedoTexture.createView();
            const G_EmissiveView    : GPUTextureView = this.G_EmissiveTexture.createView();

            const GBufferCreationPass_Descriptor  : GPUBindGroupDescriptor =
            {
                layout: this.GBufferCreationPass.Pipeline.getBindGroupLayout(0),
                entries:
                [
                    { binding: 0, resource: { buffer: this.UniformBuffer_GBufferCreationPass } },
                    { binding: 1, resource: { buffer: this.SceneBuffer }  },
                    { binding: 2, resource: { buffer: this.GeometryBuffer } },
                    { binding: 3, resource: { buffer: this.AccelBuffer } },

                    { binding: 10, resource: G_PositionView },
                    { binding: 11, resource: G_NormalView },
                    { binding: 12, resource: G_AlbedoView },
                    { binding: 13, resource: G_EmissiveView }
                ],
            };

            this.GBufferCreationPassBindGroup = this.Device.createBindGroup(GBufferCreationPass_Descriptor);
        }
        
        ///////////////////////////////////////////////////////////

        return;
    }



    Update(): void
    {

        ///////////////////// Pass 1 /////////////////////

        {
            const CameraLocation = this.Camera.GetLocation();
            const VPINV = mat4.invert(this.Camera.GetViewProjectionMatrix());

            const ELEMENT_COUNT = 28;
            const UniformData = new ArrayBuffer(4 * ELEMENT_COUNT);
            {
                const Float32View = new Float32Array(UniformData);
                const Uint32View = new Uint32Array(UniformData);

                for(let iter=0; iter<16; iter++) Float32View[iter] = VPINV?.[iter]!;

                Float32View[16] = CameraLocation[0];
                Float32View[17] = CameraLocation[1];
                Float32View[18] = CameraLocation[2];
                Uint32View[19] = this.World.InstancesPool.size;

                Uint32View[20] = this.Canvas.width;
                Uint32View[21] = this.Canvas.height;
                Uint32View[22] = this.Offset_MeshDescriptorBuffer;
                Uint32View[23] = this.Offset_MaterialBuffer;

                Uint32View[24] = this.Offset_LightBuffer;
                Uint32View[25] = this.Offset_IndexBuffer;
                Uint32View[26] = this.Offset_PrimitiveToMaterialBuffer;
                Uint32View[27] = this.Offset_BlasBuffer;
                
            }

            this.Device.queue.writeBuffer(this.UniformBuffer_GBufferCreationPass, 0, UniformData);

        }
        

        //////////////////////////////////////////////////
        return;
    }



    Render() : void
    {

        const WorkgroupCount = [Math.ceil(this.Canvas.width/8), Math.ceil(this.Canvas.height/8), 1];
        const CommandEncoder : GPUCommandEncoder = this.Device.createCommandEncoder();

        ///////////////////// ReSTIR DI Stuffs /////////////////////

        // Pass 1. Compute Every Pixel's First Hit Information
        this.GBufferCreationPass.Dispatch(CommandEncoder, this.GBufferCreationPassBindGroup, WorkgroupCount);

        

        ///////////////////////////////////////////////////////////

        // Submit Encoder
        this.Device.queue.submit([CommandEncoder.finish()]);

        return;
    }


};