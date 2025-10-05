import { ResourceManager } from "./ResourceManager";
import { Renderer } from "./Renderer";
import { World } from "./World";


async function main()
{

  // Create
  let TestRenderer  : Renderer;
  let TestWorld     : World;
  {
    const Adapter   = await navigator.gpu?.requestAdapter()     as GPUAdapter;
    const Device    = await Adapter?.requestDevice()            as GPUDevice;
    const Canvas    = document.querySelector('canvas')          as HTMLCanvasElement;

    Canvas.width    = 600;
    Canvas.height   = 450;

    TestWorld       = new World();
    TestRenderer    = new Renderer(Adapter, Device, Canvas);
  }

  // Load
  await TestWorld.Load();
  await ResourceManager.LoadResources();


  // Initialize
  TestWorld.Initialize();
  TestRenderer.Initialize(TestWorld);


  //TestRenderer.TEST_Pack();


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