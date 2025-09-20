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

    TestWorld = new World();
    TestRenderer = new Renderer(Adapter, Device, Canvas, TestWorld);
  }

  // Initialize
  {
    TestWorld.Initialize();
    TestRenderer.Initialize();
  }

  // Render
  TestRenderer.Render();



  return 0;
}

main().catch(err => console.log(err));