import { ResourceManager } from "./ResourceManager";
import { Renderer } from "./Renderer";
import { World } from "./World";

import { ReSTIR_DI_Renderer } from "./ReSTIR_DI_Renderer";


async function main()
{

  // Create
  let TestRenderer  : Renderer;
  let ReSTIR_Renderer : ReSTIR_DI_Renderer;

  let TestWorld     : World;
  {
    const Adapter   = await navigator.gpu?.requestAdapter()     as GPUAdapter;
    const Device    = await Adapter?.requestDevice()            as GPUDevice;
    const Canvas    = document.querySelector('canvas')          as HTMLCanvasElement;

    Canvas.width    = 600;
    Canvas.height   = 450;

    //console.log(Device.limits);

    TestWorld       = new World();
    TestRenderer    = new Renderer(Adapter, Device, Canvas);
    ReSTIR_Renderer = new ReSTIR_DI_Renderer(Adapter, Device, Canvas);
  }



  // Load
  await ResourceManager.LoadResources();

  // Initialize

  TestWorld.Initialize();
  TestRenderer.Initialize(TestWorld);
  ReSTIR_Renderer.Initialize(TestWorld);

  ReSTIR_Renderer.Update();

  // Loop
  function frame()
  {

    TestRenderer.Update();
    TestRenderer.Render();

    requestAnimationFrame(frame);
  }

  frame();

  return 0;
}

main().catch(err => console.log(err));