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
    public readonly SceneTexture        : GPUTexture;   // Texture To Render
    public readonly AccumTexture        : GPUTexture;   // Texture To Write Path-Traced Result

    public readonly UniformBuffer       : GPUBuffer;
    public readonly TriangleBuffer      : GPUBuffer;
    public readonly BVHBuffer           : GPUBuffer;

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
        World   : World,
    )
    {

        // Get GPU Device Stuffs
        this.Adapter            = Adapter;
        this.Device             = Device;
        this.Canvas             = Canvas;
        this.Context            = Canvas.getContext('webgpu')!;
        this.PreferredFormat    = navigator.gpu.getPreferredCanvasFormat();
        this.World              = World;

        // Generate WebGPU Resources
        {
            this.SceneTexture = this.createTexture(
                this.Canvas.width, this.Canvas.height, "rgba32float",
                GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
            );

            this.AccumTexture = this.createTexture(
                this.Canvas.width, this.Canvas.height, "rgba32float",
                GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
            );


            this.UniformBuffer = this.createBuffer(
                256, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            );

            this.TriangleBuffer = this.createBuffer(
                48, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            );

            this.BVHBuffer = this.createBuffer(
                32, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            );
        }

        // Generate WebGPU Pipelines "FILL WITH SHADER CODE"
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
                    { binding: 3, resource: { buffer: this.TriangleBuffer } },
                    { binding: 4, resource: { buffer: this.BVHBuffer } },
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

    Initialize(): void
    {




        this.clearTexture(this.SceneTexture);
        this.clearTexture(this.AccumTexture);

        return;
    }

    Render(): void
    {

        console.log(this.UniformBuffer);

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