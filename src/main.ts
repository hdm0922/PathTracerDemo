import { Renderer } from "./Renderer";
import { ResourceManager } from "./ResourceManager";
import { World } from "./World";

async function main()
{

  // Create
  let RoomRenderer  : Renderer;
  let RoomScene     : World;
  {
    const Adapter   = await navigator.gpu?.requestAdapter()     as GPUAdapter;
    const Device    = await Adapter?.requestDevice()            as GPUDevice;
    const Canvas    = document.querySelector('canvas')          as HTMLCanvasElement;

    // TEMP : 바꾸고 싶으시면 언제든 바꾸셔도 좋습니다.
    Canvas.width    = 600;
    Canvas.height   = 450;

    //console.log(Device.limits);

    RoomScene       = new World();
    RoomRenderer    = new Renderer(Adapter, Device, Canvas);
  }





  // Load
  {
    const FileNamesToLoad : string[] = 
    [
      "TestScene", 
      "Lamp",
      "PureWindow",
      "Chair",
    ];

    await ResourceManager.LoadAssets(FileNamesToLoad);
  }




  // Initialize
  {
    RoomScene.Initialize();
    RoomRenderer.Initialize(RoomScene);
  }




  // Loop
  {
    function frame()
    {

      RoomRenderer.Update();
      RoomRenderer.Render();

      requestAnimationFrame(frame);
    }

    frame();
  }



  
  return 0;
}

main().catch(err => console.log(err));