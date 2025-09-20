import { Renderer } from "./Renderer";
import { World } from "./World";

async function main()
{
  
  // Initialize
  let TestRenderer: Renderer;
  let TestWorld: World;
  {
    const Adapter   = await navigator.gpu?.requestAdapter()     as GPUAdapter;
    const Device    = await Adapter?.requestDevice()            as GPUDevice;
    const Canvas    = document.querySelector('canvas')          as HTMLCanvasElement;

    TestWorld = new World();
    TestRenderer = new Renderer(Adapter, Device, Canvas, TestWorld);
  }

  TestWorld.Initialize();

  TestRenderer.Render();

  return 0;
}

main().catch(err => console.log(err));