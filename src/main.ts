import { Renderer } from "./Renderer";

async function main()
{
  
  // Initialize
  let TestRenderer: Renderer;
  {
    const Adapter   = await navigator.gpu?.requestAdapter()     as GPUAdapter;
    const Device    = await Adapter?.requestDevice()            as GPUDevice;
    const Canvas    = document.querySelector('canvas')          as HTMLCanvasElement;

    TestRenderer = new Renderer(Adapter, Device, Canvas);
  }

    console.log('f');

  return 0;
}

main().catch(err => console.log(err));