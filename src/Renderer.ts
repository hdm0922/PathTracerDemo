import { World } from "./World";
import { vec3 } from "gl-matrix";

import computeShaderCode from './shaders/testCompute.wgsl?raw';
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

    public UniformBuffer    : GPUBuffer;
    public InstancesBuffer  : GPUBuffer;
    public BVHBuffer        : GPUBuffer;
    public TrianglesBuffer  : GPUBuffer;
    public MaterialsBuffer  : GPUBuffer;

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


        // Create WebGPU Resources
        this.SceneTexture       = GPUTexture.prototype;
        this.AccumTexture       = GPUTexture.prototype;

        this.UniformBuffer      = GPUBuffer.prototype;
        this.InstancesBuffer    = GPUBuffer.prototype;
        this.BVHBuffer          = GPUBuffer.prototype;
        this.TrianglesBuffer    = GPUBuffer.prototype;
        this.MaterialsBuffer    = GPUBuffer.prototype;


        // Create WebGPU Pipelines
        this.ComputePipeline    = GPUComputePipeline.prototype;
        this.RenderPipeline     = GPURenderPipeline.prototype;


        // Create WebGPU BindGroups
        this.ComputeBindGroup   = GPUBindGroup.prototype;
        this.RenderBindGroup    = GPUBindGroup.prototype;


        // World Data
        this.World              = World.prototype;
        this.FrameCount           = 0;

        this.Context.configure({
            device: this.Device,
            format: this.PreferredFormat,
            alphaMode: 'opaque',                    // or 'premultiplied'
            // usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC, // 선택
        });
    }


    Test_Init(): void
    {
        this.World = World.makeDummy();
        this.FrameCount = 0;

        const instAB = this.World.packInstances();
        const bvhAB  = this.World.packBVH();
        const triAB  = this.World.packTriangles();
        const matAB  = this.World.packMaterials();
        
        function setGPUBuffer(device: GPUDevice, arrayBuffer: ArrayBuffer, usage: GPUBufferUsageFlags): GPUBuffer
        {
            const size = (arrayBuffer.byteLength + 3) & ~3;
            const buffer = device.createBuffer({ size, usage, mappedAtCreation: false });
            device.queue.writeBuffer(buffer, 0, arrayBuffer);

            return buffer;
        }

        this.InstancesBuffer = setGPUBuffer(this.Device, instAB, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        this.BVHBuffer = setGPUBuffer(this.Device, bvhAB, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        this.TrianglesBuffer = setGPUBuffer(this.Device, triAB, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        this.MaterialsBuffer = setGPUBuffer(this.Device, matAB, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);

        
        this.UniformBuffer = this.Device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });

        // Initialize WebGPU Resources
        {
            const SceneTextureFlag  : GPUTextureUsageFlags  = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
            const AccumTextureFlag  : GPUTextureUsageFlags  = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;
            //const UniformBufferFlag : GPUBufferUsageFlags   = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

            this.SceneTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba16float", SceneTextureFlag);
            this.AccumTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba16float", AccumTextureFlag);
        }

        // this.clearTexture(this.SceneTexture);
        // this.clearTexture(this.AccumTexture);

        // Generate WebGPU Pipelines "FILL WITH SHADER CODE"
        {
            const ComputeShaderModuleDescriptor     : GPUShaderModuleDescriptor = { code: computeShaderCode };
            const VertexShaderModuleDescriptor      : GPUShaderModuleDescriptor = { code: vertexShaderCode };
            const FragmentShaderModuleDescriptor    : GPUShaderModuleDescriptor = { code: fragmentShaderCode };

            const ComputeShaderEntryPoint           : string = "main";
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
                    { binding: 0, resource: { buffer: this.UniformBuffer } },
                    { binding: 1, resource: { buffer: this.InstancesBuffer } },
                    { binding: 2, resource: { buffer: this.BVHBuffer } },
                    { binding: 3, resource: { buffer: this.TrianglesBuffer } },
                    { binding: 4, resource: { buffer: this.MaterialsBuffer } },
                    { binding: 5, resource: AccumTextureView },
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

    Test_Update(): void
    {
        const w = this.Canvas.width >>> 0;
        const h = this.Canvas.height >>> 0;

        // 카메라 파라미터(씬이 잘 보이도록 기본값)
        const camPos: vec3 = vec3.fromValues(0.0, 0.0, 1.5);
        const camTarget: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
        const worldUp: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
        const fovY_deg = 55.0;
        const aspect = w / Math.max(1, h);
        const tanHalfFovy = Math.tan((fovY_deg * Math.PI / 180) * 0.5);

        let forward : vec3 = [0,0,0];
        vec3.subtract(forward, camTarget, camPos);
        vec3.normalize(forward, forward);

        let rightW : vec3 = [0,0,0];
        vec3.cross(rightW, forward, worldUp);
        vec3.normalize(rightW, rightW);

        let upW : vec3 = [0,0,0];
        vec3.cross(upW, rightW, forward);
        vec3.normalize(upW, upW);


        // 카메라 기저 계산 (셰이더의 rayDir = cam_dir + sx*cam_right + sy*cam_up 에 맞춤)
        //const forward = norm3(camTarget - camPos);     // cam_dir
        // const rightW  = norm3(cross(forward, worldUp));     // 오른손 기준
        // const upW     = norm3(cross(rightW, forward));

        const cam_dir   = forward;
        
        let cam_right : vec3 = [0,0,0]; 
        vec3.scale(cam_right, rightW, tanHalfFovy * aspect);

        let cam_up : vec3 = [0,0,0];
        vec3.scale(cam_up, upW, tanHalfFovy);

        // WGSL SceneParams 레이아웃(총 96B)
        // struct SceneParams {
        //   img_size: vec2<u32>;              // 0
        //   max_bounces: u32;                 // 8
        //   samples_per_launch: u32;          // 12
        //   cam_pos: vec3<f32>; _pad0:f32;    // 16
        //   cam_dir: vec3<f32>; _pad1:f32;    // 32
        //   cam_right: vec3<f32>; _pad2:f32;  // 48
        //   cam_up: vec3<f32>; _pad3:f32;     // 64
        //   frame_index: u32; _pad4:vec3<u32>;// 80
        // }
        const buf = new ArrayBuffer(96);
        const dv = new DataView(buf);

        // img_size
        dv.setUint32(0, w, true);
        dv.setUint32(4, h, true);
        // max_bounces, samples_per_launch
        dv.setUint32(8,  2, true);
        dv.setUint32(12, 2, true);

        // cam_pos
        dv.setFloat32(16, camPos[0], true);
        dv.setFloat32(20, camPos[1], true);
        dv.setFloat32(24, camPos[2], true);
        // pad at 28

        // cam_dir
        dv.setFloat32(32, cam_dir[0], true);
        dv.setFloat32(36, cam_dir[1], true);
        dv.setFloat32(40, cam_dir[2], true);
        // pad at 44

        // cam_right
        dv.setFloat32(48, cam_right[0], true);
        dv.setFloat32(52, cam_right[1], true);
        dv.setFloat32(56, cam_right[2], true);
        // pad at 60

        // cam_up
        dv.setFloat32(64, cam_up[0], true);
        dv.setFloat32(68, cam_up[1], true);
        dv.setFloat32(72, cam_up[2], true);
        // pad at 76

        // frame_index
        dv.setUint32(80, (this.FrameCount >>> 0), true);
        // pad u32*3 at 84,88,92 (자동 0)

        this.Device.queue.writeBuffer(this.UniformBuffer, 0, buf);
    }

    Test_Render(): void
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
            RenderPass.draw(3);

            RenderPass.end();
        }

        // Submit Encoder
        this.Device.queue.submit([CommandEncoder.finish()]);
        this.FrameCount++;

        return;
    }




    Initialize(World: World): void
    {
        this.World = World;


        // Initialize WebGPU Resources
        {
            const SceneTextureFlag  : GPUTextureUsageFlags  = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
            const AccumTextureFlag  : GPUTextureUsageFlags  = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;
            //const UniformBufferFlag : GPUBufferUsageFlags   = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

            this.SceneTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba16float", SceneTextureFlag);
            this.AccumTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba16float", AccumTextureFlag);
        }

        this.clearTexture(this.SceneTexture);
        this.clearTexture(this.AccumTexture);

        return;
    }

    Update(): void
    {

        return;
    }



    Render(): void
    {

        // Create Command Encoder
        const CommandEncoder: GPUCommandEncoder = this.Device.createCommandEncoder();

        // ComputePass (Path Tracing)
        {
            //const ComputePass: GPUComputePassEncoder = CommandEncoder.beginComputePass();
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

        }

        // Submit Encoder
        this.Device.queue.submit([CommandEncoder.finish()]);

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