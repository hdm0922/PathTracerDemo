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
    TestRenderer = new Renderer(Adapter, Device, Canvas);
  }

  TestRenderer.Test_Init();

  console.log(TestRenderer.TrianglesBuffer);

  function frame()
  {
    //console.log("Hi");


    TestRenderer.Test_Update();
    TestRenderer.Test_Render();

    requestAnimationFrame(frame);
  }

  frame();

  return 0;
}

main().catch(err => console.log(err));