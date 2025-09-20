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
    public readonly SceneTexture    : GPUTexture;   // Texture To Render
    public readonly AccumTexture    : GPUTexture;   // Texture To Write Path-Traced Result

    public readonly SceneTextureView: GPUTextureView;
    public readonly AccumTextureView: GPUTextureView;

    // World Data
    public World                    : World;

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
                this.Canvas.width,
                this.Canvas.height,
                "rgba32float",
                GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
            );

            this.AccumTexture = this.createTexture(
                this.Canvas.width,
                this.Canvas.height,
                "rgba32float",
                GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
            );

            this.SceneTextureView = this.SceneTexture.createView();
            this.AccumTextureView = this.AccumTexture.createView();
        }


    }

    Initialize(): void
    {
        this.clearTexture(this.SceneTexture);
        
        return;
    }

    Render(): void
    {

        console.log(this.AccumTexture);

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