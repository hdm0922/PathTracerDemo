
export class Renderer
{

    public readonly Adapter         : GPUAdapter;
    public readonly Device          : GPUDevice;
    public readonly Canvas          : HTMLCanvasElement;
    public readonly Context         : GPUCanvasContext;
    public readonly PreferredFormat : GPUTextureFormat;



    constructor
    (
        Adapter : GPUAdapter,
        Device  : GPUDevice,
        Canvas  : HTMLCanvasElement
    )
    {
        this.Adapter            = Adapter;
        this.Device             = Device;
        this.Canvas             = Canvas;
        this.Context            = Canvas.getContext('webgpu')!;
        this.PreferredFormat    = navigator.gpu.getPreferredCanvasFormat();
    }

};