import { Renderer } from "./Renderer";
import { World } from "./World";

async function main()
{
  
  // Create
  let TestRenderer: Renderer;
  let TestWorld: World;
  {
    const Adapter   = await navigator.gpu?.requestAdapter()     as GPUAdapter;
    const Device    = await Adapter?.requestDevice()            as GPUDevice;
    const Canvas    = document.querySelector('canvas')          as HTMLCanvasElement;

    Canvas.width = 600;
    Canvas.height = 450;

    console.log(Device.limits);
    console.log(GPUBufferUsage);

    TestWorld = new World();
    TestRenderer = new Renderer(Adapter, Device, Canvas);
  }

  TestRenderer.Initialize(TestWorld);

  function frame()
  {

    //TestRenderer.Test_Update();
    TestRenderer.Render();

    requestAnimationFrame(frame);
  }

  frame();

  return 0;
}

main().catch(err => console.log(err));