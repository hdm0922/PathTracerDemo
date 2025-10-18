import { AnotherRenderer } from "./AnotherRenderer";
import { ResourceManager } from "./ResourceManager";
import { SerializedMesh } from "./SerializedMesh";
import { World } from "./World";

async function main()
{

  // Create
  let TestRenderer  : AnotherRenderer;
  let TestWorld     : World;
  {
    const Adapter   = await navigator.gpu?.requestAdapter()     as GPUAdapter;
    const Device    = await Adapter?.requestDevice()            as GPUDevice;
    const Canvas    = document.querySelector('canvas')          as HTMLCanvasElement;

    Canvas.width    = 600;
    Canvas.height   = 450;

    //console.log(Device.limits);

    TestWorld       = new World();
    TestRenderer    = new AnotherRenderer(Adapter, Device, Canvas);
  }


  // Load
  {
    // Dodecahedron TestScene Monkey
    const SceneMesh = await SerializedMesh.Load("TestScene");
    ResourceManager.MeshPool.set("TestScene", SceneMesh);

    const LampMesh = await SerializedMesh.Load("Lamp");
    ResourceManager.MeshPool.set("Lamp", LampMesh);
  }

  // Initialize
  TestWorld.Initialize();
  TestRenderer.Initialize(TestWorld);

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