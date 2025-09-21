import { World } from "./World";

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
    public readonly ComputePipeline : GPUComputePipeline;
    public readonly RenderPipeline  : GPURenderPipeline;


    // WebGPU BindGroups
    public readonly ComputeBindGroup: GPUBindGroup;
    public readonly RenderBindGroup: GPUBindGroup;


    // World Data
    public World    : World;



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


        // Generate WebGPU Pipelines "FILL WITH SHADER CODE"
        if (false)
        {
            const ComputeShaderModuleDescriptor     : GPUShaderModuleDescriptor = { code: "" };
            const VertexShaderModuleDescriptor      : GPUShaderModuleDescriptor = { code: "" };
            const FragmentShaderModuleDescriptor    : GPUShaderModuleDescriptor = { code: "" };

            const ComputeShaderEntryPoint           : string = "";
            const VertexShaderEntryPoint            : string = "";
            const FragmentShaderEntryPoint          : string = "";

            const ComputeShaderModule   : GPUShaderModule = this.Device.createShaderModule(ComputeShaderModuleDescriptor);
            const VertexShaderModule    : GPUShaderModule = this.Device.createShaderModule(VertexShaderModuleDescriptor);
            const FragmentShaderModule  : GPUShaderModule = this.Device.createShaderModule(FragmentShaderModuleDescriptor);

            const ComputePipelineDescriptor: GPUComputePipelineDescriptor =
            {
                layout: "auto",
                compute: { module: ComputeShaderModule, entryPoint: ComputeShaderEntryPoint },
            };

            const RenderPipelineDescriptor: GPURenderPipelineDescriptor =
            {
                layout: "auto",
                vertex: { module: VertexShaderModule, entryPoint: VertexShaderEntryPoint },
                fragment: { module: FragmentShaderModule, entryPoint: FragmentShaderEntryPoint, targets: [] },
                primitive: { topology: "triangle-list" },
            }

            this.ComputePipeline = this.Device.createComputePipeline(ComputePipelineDescriptor);
            this.RenderPipeline = this.Device.createRenderPipeline(RenderPipelineDescriptor);
        }
        // Generate WebGPU BindGroups
        if (false)
        {
            const SceneTextureView: GPUTextureView = this.SceneTexture.createView();
            const AccumTextureView: GPUTextureView = this.AccumTexture.createView();

            const ComputeBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout: this.ComputePipeline.getBindGroupLayout(0),
                entries:
                [
                    { binding: 0, resource: { buffer: this.UniformBuffer } },
                    { binding: 1, resource: SceneTextureView },
                    { binding: 2, resource: AccumTextureView },

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
    }


    Initialize(World: World): void
    {
        this.World = World;

        
        // Initialize WebGPU Resources
        {
            const SceneTextureFlag  : GPUTextureUsageFlags  = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
            const AccumTextureFlag  : GPUTextureUsageFlags  = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;
            //const UniformBufferFlag : GPUBufferUsageFlags   = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

            this.SceneTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba32float", SceneTextureFlag);
            this.AccumTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba32float", AccumTextureFlag);
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