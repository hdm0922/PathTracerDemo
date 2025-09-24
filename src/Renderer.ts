import { World } from "./World";
import { vec3, mat4 } from "gl-matrix";

import computeShaderCode from './shaders/PathTracer.wgsl?raw';
import vertexShaderCode from './shaders/testVertex.wgsl?raw';
import fragmentShaderCode from './shaders/testFragment.wgsl?raw';

export class Renderer
{

    // GPU Device Stuff
    public readonly Adapter         : GPUAdapter;
    public readonly Device          : GPUDevice;
    public readonly Canvas          : HTMLCanvasElement;
    public readonly Context         : GPUCanvasContext;
    public readonly PreferredFormat : GPUTextureFormat;


    // WebGPU Resources
    public SceneTexture     : GPUTexture;   // Texture To Render
    public AccumTexture     : GPUTexture;   // Texture To Write Path-Traced Result

    public UniformsBuffer   : GPUBuffer;
    public InstancesBuffer  : GPUBuffer;
    public BVHBuffer        : GPUBuffer;
    public SubMeshesBuffer  : GPUBuffer;
    public MaterialsBuffer  : GPUBuffer;
    public GeometriesBuffer : GPUBuffer;
    public PrimitiveToSubMesh: GPUBuffer;

    // WebGPU Pipelines
    public ComputePipeline : GPUComputePipeline;
    public RenderPipeline  : GPURenderPipeline;


    // WebGPU BindGroups
    public ComputeBindGroup: GPUBindGroup;
    public RenderBindGroup: GPUBindGroup;


    // World Data
    public World    : World;
    public FrameCount : number;


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

        this.UniformsBuffer     = GPUBuffer.prototype;
        this.InstancesBuffer    = GPUBuffer.prototype;
        this.BVHBuffer          = GPUBuffer.prototype;
        this.SubMeshesBuffer    = GPUBuffer.prototype;
        this.MaterialsBuffer    = GPUBuffer.prototype;
        this.GeometriesBuffer   = GPUBuffer.prototype;
        this.PrimitiveToSubMesh = GPUBuffer.prototype;


        // Create WebGPU Pipelines
        this.ComputePipeline    = GPUComputePipeline.prototype;
        this.RenderPipeline     = GPURenderPipeline.prototype;


        // Create WebGPU BindGroups
        this.ComputeBindGroup   = GPUBindGroup.prototype;
        this.RenderBindGroup    = GPUBindGroup.prototype;


        // World Data
        this.World              = World.prototype;
        this.FrameCount           = 0;
    }


    // Test_Init(): void
    // {
    //     this.World = World.makeDummy();
    //     this.FrameCount = 0;

    //     const instAB = this.World.packInstances();
    //     const bvhAB  = this.World.packBVH();
    //     const triAB  = this.World.packTriangles();
    //     const matAB  = this.World.packMaterials();
        
    //     function setGPUBuffer(device: GPUDevice, arrayBuffer: ArrayBuffer, usage: GPUBufferUsageFlags): GPUBuffer
    //     {
    //         const size = (arrayBuffer.byteLength + 3) & ~3;
    //         const buffer = device.createBuffer({ size, usage, mappedAtCreation: false });
    //         device.queue.writeBuffer(buffer, 0, arrayBuffer);

    //         return buffer;
    //     }

    //     this.InstancesBuffer    = setGPUBuffer(this.Device, instAB, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    //     this.BVHBuffer          = setGPUBuffer(this.Device, bvhAB,  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    //     this.TrianglesBuffer    = setGPUBuffer(this.Device, triAB,  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    //     this.MaterialsBuffer    = setGPUBuffer(this.Device, matAB,  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);

        
    //     this.UniformBuffer = this.Device.createBuffer({
    //         size: 256,
    //         usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    //         mappedAtCreation: false,
    //     });

    //     // Initialize WebGPU Resources
    //     {
    //         const SceneTextureFlag  : GPUTextureUsageFlags  = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
    //         const AccumTextureFlag  : GPUTextureUsageFlags  = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;
    //         //const UniformBufferFlag : GPUBufferUsageFlags   = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

    //         this.SceneTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba32float", SceneTextureFlag);
    //         this.AccumTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba32float", AccumTextureFlag);
    //     }

    //     // this.clearTexture(this.SceneTexture);
    //     // this.clearTexture(this.AccumTexture);

    //     // Generate WebGPU Pipelines "FILL WITH SHADER CODE"
    //     {
    //         const ComputeShaderModuleDescriptor     : GPUShaderModuleDescriptor = { code: computeShaderCode };
    //         const VertexShaderModuleDescriptor      : GPUShaderModuleDescriptor = { code: vertexShaderCode };
    //         const FragmentShaderModuleDescriptor    : GPUShaderModuleDescriptor = { code: fragmentShaderCode };

    //         const ComputeShaderEntryPoint           : string = "main";
    //         const VertexShaderEntryPoint            : string = "vs_main";
    //         const FragmentShaderEntryPoint          : string = "fs_main";

    //         const ComputeShaderModule   : GPUShaderModule = this.Device.createShaderModule(ComputeShaderModuleDescriptor);
    //         const VertexShaderModule    : GPUShaderModule = this.Device.createShaderModule(VertexShaderModuleDescriptor);
    //         const FragmentShaderModule  : GPUShaderModule = this.Device.createShaderModule(FragmentShaderModuleDescriptor);

    //         const ComputePipelineDescriptor: GPUComputePipelineDescriptor =
    //         {
    //             layout  : "auto",
    //             compute : { module: ComputeShaderModule, entryPoint: ComputeShaderEntryPoint },
    //         };

    //         const RenderPipelineDescriptor: GPURenderPipelineDescriptor =
    //         {
    //             layout      : "auto",
    //             vertex      : { module: VertexShaderModule,     entryPoint: VertexShaderEntryPoint },
    //             fragment    : { module: FragmentShaderModule,   entryPoint: FragmentShaderEntryPoint, targets : [{ format: this.PreferredFormat }] },
    //             primitive   : { topology: "triangle-list" },
    //         };

    //         this.ComputePipeline = this.Device.createComputePipeline(ComputePipelineDescriptor);
    //         this.RenderPipeline = this.Device.createRenderPipeline(RenderPipelineDescriptor);
    //     }

    //     // Generate WebGPU BindGroups
    //     {
    //         const SceneTextureView: GPUTextureView = this.SceneTexture.createView();
    //         const AccumTextureView: GPUTextureView = this.AccumTexture.createView();

    //         const ComputeBindGroupDescriptor: GPUBindGroupDescriptor =
    //         {
    //             layout: this.ComputePipeline.getBindGroupLayout(0),
    //             entries:
    //             [
    //                 { binding: 0, resource: { buffer: this.UniformBuffer } },
    //                 { binding: 1, resource: { buffer: this.InstancesBuffer } },
    //                 { binding: 2, resource: { buffer: this.BVHBuffer } },
    //                 { binding: 3, resource: { buffer: this.TrianglesBuffer } },
    //                 { binding: 4, resource: { buffer: this.MaterialsBuffer } },
    //                 { binding: 5, resource: AccumTextureView },
    //             ],
    //         };

    //         const RenderBindGroupDescriptor: GPUBindGroupDescriptor =
    //         {
    //             layout: this.RenderPipeline.getBindGroupLayout(0),
    //             entries: [{ binding: 0, resource: SceneTextureView }],
    //         }

    //         this.ComputeBindGroup = this.Device.createBindGroup(ComputeBindGroupDescriptor);
    //         this.RenderBindGroup = this.Device.createBindGroup(RenderBindGroupDescriptor);
    //     }


    //     return;
    // }

    // Test_Update(): void
    // {
    //     const w = this.Canvas.width >>> 0;
    //     const h = this.Canvas.height >>> 0;

    //     // 카메라 파라미터(씬이 잘 보이도록 기본값)
    //     const camPos: vec3 = vec3.fromValues(0.0, 0.0, 1.5);
    //     const camTarget: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
    //     const worldUp: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
    //     const fovY_deg = 55.0;
    //     const aspect = w / Math.max(1, h);
    //     const tanHalfFovy = Math.tan((fovY_deg * Math.PI / 180) * 0.5);

    //     let forward : vec3 = [0,0,0];
    //     vec3.subtract(forward, camTarget, camPos);
    //     vec3.normalize(forward, forward);

    //     let rightW : vec3 = [0,0,0];
    //     vec3.cross(rightW, forward, worldUp);
    //     vec3.normalize(rightW, rightW);

    //     let upW : vec3 = [0,0,0];
    //     vec3.cross(upW, rightW, forward);
    //     vec3.normalize(upW, upW);


    //     // 카메라 기저 계산 (셰이더의 rayDir = cam_dir + sx*cam_right + sy*cam_up 에 맞춤)
    //     //const forward = norm3(camTarget - camPos);     // cam_dir
    //     // const rightW  = norm3(cross(forward, worldUp));     // 오른손 기준
    //     // const upW     = norm3(cross(rightW, forward));

    //     const cam_dir   = forward;
        
    //     let cam_right : vec3 = [0,0,0]; 
    //     vec3.scale(cam_right, rightW, tanHalfFovy * aspect);

    //     let cam_up : vec3 = [0,0,0];
    //     vec3.scale(cam_up, upW, tanHalfFovy);

    //     // WGSL SceneParams 레이아웃(총 96B)
    //     // struct SceneParams {
    //     //   img_size: vec2<u32>;              // 0
    //     //   max_bounces: u32;                 // 8
    //     //   samples_per_launch: u32;          // 12
    //     //   cam_pos: vec3<f32>; _pad0:f32;    // 16
    //     //   cam_dir: vec3<f32>; _pad1:f32;    // 32
    //     //   cam_right: vec3<f32>; _pad2:f32;  // 48
    //     //   cam_up: vec3<f32>; _pad3:f32;     // 64
    //     //   frame_index: u32; _pad4:vec3<u32>;// 80
    //     // }
    //     const buf = new ArrayBuffer(96);
    //     const dv = new DataView(buf);

    //     // img_size
    //     dv.setUint32(0, w, true);
    //     dv.setUint32(4, h, true);
    //     // max_bounces, samples_per_launch
    //     dv.setUint32(8,  2, true);
    //     dv.setUint32(12, 2, true);

    //     // cam_pos
    //     dv.setFloat32(16, camPos[0], true);
    //     dv.setFloat32(20, camPos[1], true);
    //     dv.setFloat32(24, camPos[2], true);
    //     // pad at 28

    //     // cam_dir
    //     dv.setFloat32(32, cam_dir[0], true);
    //     dv.setFloat32(36, cam_dir[1], true);
    //     dv.setFloat32(40, cam_dir[2], true);
    //     // pad at 44

    //     // cam_right
    //     dv.setFloat32(48, cam_right[0], true);
    //     dv.setFloat32(52, cam_right[1], true);
    //     dv.setFloat32(56, cam_right[2], true);
    //     // pad at 60

    //     // cam_up
    //     dv.setFloat32(64, cam_up[0], true);
    //     dv.setFloat32(68, cam_up[1], true);
    //     dv.setFloat32(72, cam_up[2], true);
    //     // pad at 76

    //     // frame_index
    //     dv.setUint32(80, (this.FrameCount >>> 0), true);
    //     // pad u32*3 at 84,88,92 (자동 0)

    //     this.Device.queue.writeBuffer(this.UniformBuffer, 0, buf);
    // }

    // Test_Render(): void
    // {

    //     const CommandEncoder: GPUCommandEncoder = this.Device.createCommandEncoder();

    //     // ComputePass (Path Tracing)
    //     {
    //         const ComputePass: GPUComputePassEncoder = CommandEncoder.beginComputePass();
            
    //         ComputePass.setPipeline(this.ComputePipeline);
    //         ComputePass.setBindGroup(0, this.ComputeBindGroup);
    //         ComputePass.dispatchWorkgroups(Math.ceil(this.Canvas.width/8), Math.ceil(this.Canvas.height/8), 1);

    //         ComputePass.end();
    //     }

    //     // Copy Texture : AccumTexture -> SceneTexture
    //     {
    //         const SourceTextureInfo     : GPUTexelCopyTextureInfo   = { texture: this.AccumTexture };
    //         const DestTextureInfo       : GPUTexelCopyTextureInfo   = { texture: this.SceneTexture };
    //         const TextureSize           : GPUExtent3DStrict         = { width: this.SceneTexture.width, height: this.SceneTexture.height };
        
    //         CommandEncoder.copyTextureToTexture(SourceTextureInfo, DestTextureInfo, TextureSize);
    //     }
        
    //     // RenderPass (Draw SceneTexture)
    //     {
    //         const RenderPassDescriptor: GPURenderPassDescriptor =
    //         {
    //             colorAttachments:
    //             [
    //                 {
    //                     view: this.Context.getCurrentTexture().createView(),
    //                     loadOp: "clear",
    //                     storeOp: "store",
    //                     clearValue: { r:0, g:0, b:0, a:1 }
    //                 }
    //             ]
    //         };


    //         const RenderPass: GPURenderPassEncoder = CommandEncoder.beginRenderPass(RenderPassDescriptor);

    //         RenderPass.setPipeline(this.RenderPipeline);
    //         RenderPass.setBindGroup(0, this.RenderBindGroup);
    //         RenderPass.draw(3);

    //         RenderPass.end();
    //     }

    //     // Submit Encoder
    //     this.Device.queue.submit([CommandEncoder.finish()]);
    //     this.FrameCount++;

    //     return;
    // }




    Initialize(World: World): void
    {

        console.log(this.Adapter.features.has('sized_binding_array'));

        const NUM_INSTANCES = 1;
        const NUM_SUBMESHES = 1;
        const NUM_MATERIALS = 1;
        const NUM_VERTICES = 4;
        const NUM_TRIANGLES = 2;
        const uniformsData = new ArrayBuffer(128); // 예시 크기, 실제 구조체에 맞게 조정 필요
        const uniformsF32View = new Float32Array(uniformsData);
        const uniformsU32View = new Uint32Array(uniformsData);
        uniformsU32View[0] = 1280;
        uniformsU32View[1] = 720;
        uniformsU32View[2] = 8;
        uniformsU32View[3] = 1;
        uniformsF32View[4] = 0.0;
        uniformsF32View[5] = 0.0;
        uniformsF32View[6] = 5.0;
        uniformsF32View[7] = 1.0;
        mat4.identity(uniformsF32View.subarray(8, 24));
        uniformsU32View[24] = 1;
        const vertices = new Float32Array([
            // x, y, z, (padding)
            -0.5, 0.5, 0.0, 0.0,  // v0 (top-left)
            0.5, 0.5, 0.0, 0.0,   // v1 (top-right)
            -0.5, -0.5, 0.0, 0.0, // v2 (bottom-left)
            0.5, -0.5, 0.0, 0.0,  // v3 (bottom-right)
        ]);
        const normals = new Float32Array([
            // nx, ny, nz, (padding)
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
        ]);
        const uvs = new Float32Array([
            // u, v, (padding)
            0.0, 1.0, 0.0, 0.0,
            1.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0,
            1.0, 0.0, 0.0, 0.0,
        ]);
        const tangents = new Float32Array([
            // tx, ty, tz, tw
            1.0, 0.0, 0.0, 1.0,
            1.0, 0.0, 0.0, 1.0,
            1.0, 0.0, 0.0, 1.0,
            1.0, 0.0, 0.0, 1.0,
        ]);
        const indices = new Uint32Array([
            0, 2, 1, // 첫 번째 삼각형
            1, 2, 3, // 두 번째 삼각형
        ]);
        const instanceData = new Float32Array(NUM_INSTANCES * 20); // 80 bytes = 20 floats
        const instanceU32View = new Uint32Array(instanceData.buffer);
        const modelMatrix = mat4.create(); // 단위 행렬
        const modelMatrixInverse = mat4.invert(mat4.create(), modelMatrix)!;
        instanceData.set(modelMatrix, 0);
        //instanceData.set(modelMatrixInverse, 16);
        instanceU32View[32] = 0; // BVHRootIndex: 0
        const submeshData = new Uint32Array(NUM_SUBMESHES * 4); // 16 bytes = 4 u32s
        submeshData[0] = 0; // MaterialIndex: 0
        submeshData[1] = 0;
        submeshData[2] = 0;
        submeshData[3] = 0;
        const materialData = new Float32Array(NUM_MATERIALS * 16); // 64 bytes = 16 floats
        const materialI32View = new Int32Array(materialData.buffer);
        materialData.set([1.0, 0.5, 0.5, 1.0], 0); // BaseColor: Reddish
        materialData.set([0.0, 0.0, 0.0], 4);    // EmissiveColor
        materialData[7] = 0.1; // Metalic
        materialData[8] = 0.8; // Roughness
        materialData[9] = 1.5; // IOR
        materialData[10] = 1.0; // NormalScale
        materialI32View[11] = 0; // TextureIndex_BaseColor: 첫 번째 텍스처 사용
        materialI32View[12] = -1; // TextureIndex_EmissiveColor: 사용 안 함
        materialI32View[13] = 0; // TextureIndex_Normal: 첫 번째 텍스처 사용
        materialI32View[14] = -1; // TextureIndex_ORM: 사용 안 함
        const bvhData = new Float32Array(1 * 8); // 32 bytes = 8 floats
        const bvhU32View = new Uint32Array(bvhData.buffer);
        bvhData.set([-0.5, -0.5, 0.0], 0); // Boundary_Min
        bvhU32View[3] = NUM_TRIANGLES;     // PrimitiveCount: 2
        bvhData.set([0.5, 0.5, 0.0], 4);   // Boundary_Max
        bvhU32View[7] = 0;                 // PrimitiveOffset: 0
        const primitiveToSubMeshData = new Uint32Array(NUM_TRIANGLES);
        primitiveToSubMeshData[0] = 0; // 삼각형 0번은 서브메쉬 0번에 속함
        primitiveToSubMeshData[1] = 0; // 삼각형 1번도 서브메쉬 0번에 속함
        const vertexOffset = 0;
        const vertexSize = vertices.byteLength;
        const normalOffset = vertexOffset + vertexSize; // 정점 데이터 바로 뒤에 법선 데이터 시작
        const normalSize = normals.byteLength;
        const uvOffset = normalOffset + normalSize;
        const uvSize = uvs.byteLength;
        const tangentOffset = uvOffset + uvSize;
        const tangentSize = tangents.byteLength;
        const indexOffset = tangentOffset + tangentSize;
        const indexSize = indices.byteLength;
        const geometrieslBufferSize = indexOffset + indexSize;
        const materialSampler = this.Device.createSampler({
            magFilter: 'linear', // 확대 필터: 선형 보간
            minFilter: 'linear', // 축소 필터: 선형 보간
            addressModeU: 'repeat', // U 좌표 래핑 모드: 반복
            addressModeV: 'repeat', // V 좌표 래핑 모드: 반복
            // mipmapFilter 등 추가 설정 가능
        });

        /**
         * 디버깅용 플레이스홀더 텍스처 배열을 생성합니다.
         * @param device - 현재 GPUDevice
         * @param layerCount - 생성할 텍스처 레이어의 수
         * @returns 생성된 GPUTexture 객체
         */
        function createPlaceholderTextureArray(device: GPUDevice, layerCount: number): GPUTexture {
            const width = 1;
            const height = 1;

            // 1. 1x1 크기의 텍스처 배열(스택)을 생성합니다.
            const placeholderTexture = device.createTexture({
                dimension: '2d',
                size: {
                    width: width,
                    height: height,
                    depthOrArrayLayers: layerCount, // 스택에 쌓을 텍스처의 개수
                },
                format: 'rgba8unorm', // 가장 일반적인 텍스처 포맷
                usage:
                    GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST, // CPU에서 데이터를 복사해 넣을 것이므로 COPY_DST가 필수
            });

            // 2. 1x1 마젠타 색상 픽셀 데이터를 생성합니다. (R=255, G=0, B=255, A=255)
            const pixelData = new Uint8Array([255, 0, 255, 255]);

            // 3. 각 레이어에 픽셀 데이터를 씁니다.
            for (let i = 0; i < layerCount; i++) {
                device.queue.writeTexture(
                    // 대상: 어느 텍스처의 어느 위치에 쓸 것인가
                    {
                        texture: placeholderTexture,
                        origin: { x: 0, y: 0, z: i }, // z 오프셋으로 레이어를 선택
                    },
                    // 소스: 어떤 데이터를 쓸 것인가
                    pixelData,
                    // 소스 데이터 레이아웃: 데이터가 메모리에 어떻게 배치되어 있는가
                    {
                        bytesPerRow: width * 4, // 1픽셀 가로줄의 바이트 크기 (1px * 4 channels)
                        rowsPerImage: height,   // 이미지 하나의 세로줄 수
                    },
                    // 크기: 얼마만큼의 크기를 쓸 것인가
                    {
                        width: width,
                        height: height,
                    }
                );
            }

            return placeholderTexture;
        }
        const baseColorArrayTexture = createPlaceholderTextureArray(this.Device, 3);
        const emissiveColorArrayTexture = createPlaceholderTextureArray(this.Device, 3);
        const normalArrayTexture = createPlaceholderTextureArray(this.Device, 3);
        const ORMArrayTexture = createPlaceholderTextureArray(this.Device, 3);



        // Initialize Scene Stuffs
        this.World = World;
        this.FrameCount = 0;


        // Initialize WebGPU Resources : Uniform Buffer
        {
            const UniformBufferUsageFlags: GPUBufferUsageFlags = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
            
            this.UniformsBuffer = this.Device.createBuffer({ size: 256, usage: UniformBufferUsageFlags });
        }

        const buf = new ArrayBuffer(96);
        this.Device.queue.writeBuffer(this.UniformsBuffer, 0, buf);

        // Initialize WebGPU Resources : Storage Buffers
        {
            const StorageBufferUsageFlags: GPUBufferUsageFlags = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
            
            this.InstancesBuffer        = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.BVHBuffer              = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.SubMeshesBuffer        = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.MaterialsBuffer        = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.GeometriesBuffer       = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.PrimitiveToSubMesh     = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
        }

        // Initialize WebGPU Resources : Texture
        {
            const SceneTextureUsageFlags  : GPUTextureUsageFlags  = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
            const AccumTextureUsageFlags  : GPUTextureUsageFlags  = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;

            this.SceneTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba32float", SceneTextureUsageFlags);
            this.AccumTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba32float", AccumTextureUsageFlags);
        }


        // Generate WebGPU Pipelines
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

        // Generate WebGPU BindGroups
        {
            const SceneTextureView: GPUTextureView = this.SceneTexture.createView();
            const AccumTextureView: GPUTextureView = this.AccumTexture.createView();

            const ComputeBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout: this.ComputePipeline.getBindGroupLayout(0),
                entries:
                [
                    { binding: 0, resource: { buffer: this.UniformsBuffer } },
                    // { binding: 1, resource: { buffer: this.InstancesBuffer }  },
                    // { binding: 2, resource: { buffer: this.BVHBuffer } },
                    // { binding: 3, resource: { buffer: this.SubMeshesBuffer } },
                    // { binding: 4, resource: { buffer: this.MaterialsBuffer } },
                    // { binding: 5, resource: { buffer: this.GeometriesBuffer, offset: vertexOffset, size: vertexSize } },
                    // { binding: 6, resource: { buffer: this.GeometriesBuffer, offset: normalOffset, size: normalSize } },
                    // { binding: 7, resource: { buffer: this.GeometriesBuffer, offset: uvOffset, size: uvSize } },
                    // { binding: 8, resource: { buffer: this.GeometriesBuffer, offset: tangentOffset, size: tangentSize } },
                    // { binding: 9, resource: { buffer: this.GeometriesBuffer, offset: indexOffset, size: indexSize } },
                    // { binding: 10, resource: { buffer: this.PrimitiveToSubMesh } },
                    // { binding: 11, resource: materialSampler },
                                // { binding: 9, resource: baseColorArrayTexture.createView() },
                                // { binding: 10, resource: emissiveColorArrayTexture.createView() },
                                // { binding: 11, resource: normalArrayTexture.createView() },
                                // { binding: 12, resource: ORMArrayTexture.createView() },
                    //{ binding: 12, resource: SceneTextureView },
                    { binding: 13, resource: AccumTextureView },
                ],
            };

            const RenderBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout: this.RenderPipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: SceneTextureView }],
            }

            this.ComputeBindGroup = this.Device.createBindGroup(ComputeBindGroupDescriptor);
            this.RenderBindGroup = this.Device.createBindGroup(RenderBindGroupDescriptor);
        }


        return;
    }

    Update(): void
    {

        return;
    }



    Render(): void
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
                        clearValue: { r:0, g:0, b:1, a:1 }
                    }
                ]
            };


            const RenderPass: GPURenderPassEncoder = CommandEncoder.beginRenderPass(RenderPassDescriptor);

            RenderPass.setPipeline(this.RenderPipeline);
            RenderPass.setBindGroup(0, this.RenderBindGroup);
            RenderPass.draw(3);

            RenderPass.end();
        }

        // Submit Encoder
        this.Device.queue.submit([CommandEncoder.finish()]);
        this.FrameCount++;

        return;
    }



    private createTexture(
        TextureWidth    : number,
        TextureHeight   : number,
        TextureFormat   : GPUTextureFormat,
        TextureUsage    : GPUTextureUsageFlags
    ): GPUTexture
    {
        const TextureDescriptor: GPUTextureDescriptor =
        {
            size: { width: TextureWidth, height: TextureHeight },
            format: TextureFormat,
            usage: TextureUsage,
        }

        return this.Device.createTexture(TextureDescriptor);
    }



    private createBuffer(BufferSize: number, BufferUsage: GPUBufferUsageFlags): GPUBuffer
    {
        const BufferDescriptor: GPUBufferDescriptor =
        {
            size: BufferSize,
            usage: BufferUsage,
        };

        return this.Device.createBuffer(BufferDescriptor);
    }



    private clearTexture(Texture: GPUTexture): void
    {

        const bpp       = 16;
        const unpadded  = Texture.width * bpp;
        const padded    = Math.ceil(unpadded >> 8) << 8;

        const DestinationInfo   : GPUTexelCopyTextureInfo       = { texture: Texture };
        const DataToWrite       : GPUAllowSharedBufferSource    = new Uint8Array(Texture.height * padded);
        const DataLayout        : GPUTexelCopyBufferLayout      = { bytesPerRow: padded, rowsPerImage: Texture.height };
        const WriteSize         : GPUExtent3DStrict             = { width: Texture.width, height: Texture.height };

        this.Device.queue.writeTexture(DestinationInfo, DataToWrite, DataLayout, WriteSize);

        return;
    }
};