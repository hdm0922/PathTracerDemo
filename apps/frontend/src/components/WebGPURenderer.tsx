import { useEffect, useRef } from 'react';
import { ResourceManager } from '../graphics-core/ResourceManager';
import { World } from '../graphics-core/World';
// import { RendererTEST } from '../graphics-core/Renderer_TEST';
import { Renderer } from '../graphics-core/Renderer';
import { DUMMY_SCENE_1, AVAILABLE_SCENES } from '../graphics-core/test/DummyScenes';
import type { Scene } from '../graphics-core/Structs';

interface WebGPURendererProps {
  className?: string;
  width?: number;
  height?: number;
  sceneId?: string; // TODO: 차후 Backend API에서 Scene을 선택할 때 사용
}

export default function WebGPURenderer({
  className = '',
  width = 600,
  height = 450,
  sceneId,
}: WebGPURendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const worldRef = useRef<World | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 초기 렌더러 설정
  useEffect(() => {
    let isMounted = true;

    async function initRenderer() {
      if (!canvasRef.current) return;

      // Check WebGPU support
      if (!navigator.gpu) {
        console.error('WebGPU is not supported in this browser');
        return;
      }

      try {
        // Create GPU resources
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          console.error('Failed to get GPU adapter');
          return;
        }

        const device = await adapter.requestDevice();
        if (!device) {
          console.error('Failed to get GPU device');
          return;
        }

        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;

        // TODO: 차후 Backend API에서 Scene을 가져오도록 수정
        // 현재는 sceneId로 AVAILABLE_SCENES에서 찾거나 기본 Scene 사용
        let currentScene: Scene = DUMMY_SCENE_1;
        if (sceneId) {
          const foundScene = AVAILABLE_SCENES.find((s) => s.id === sceneId);
          if (foundScene) {
            currentScene = foundScene;
          } else {
            console.warn(`Scene with id "${sceneId}" not found, using default scene`);
          }
        }

        // Scene에서 사용된 모든 Mesh 이름 추출
        const meshNamesToLoad: string[] = [];
        for (const asset of currentScene.assets) {
          if (asset.type === 'object' && asset.meshName) {
            if (!meshNamesToLoad.includes(asset.meshName)) {
              meshNamesToLoad.push(asset.meshName);
            }
          }
        }

        // 필요한 Asset 로드
        await ResourceManager.LoadAssets(meshNamesToLoad);

        // World와 Renderer 생성 및 초기화
        const world = new World();
        const renderer = new Renderer(adapter, device, canvas);

        // Scene 데이터로부터 World 구성
        world.LoadFromScene(currentScene);

        // Renderer 초기화
        await renderer.Initialize(world);

        if (!isMounted) return;

        rendererRef.current = renderer;
        worldRef.current = world;

        // Start render loop
        function frame() {
          if (!isMounted || !rendererRef.current) return;

          rendererRef.current.Update();
          rendererRef.current.Render();

          animationFrameRef.current = requestAnimationFrame(frame);
        }

        frame();
      } catch (error) {
        console.error('Error initializing WebGPU renderer:', error);
      }
    }

    initRenderer();

    // Cleanup
    return () => {
      isMounted = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // GPU resources will be cleaned up automatically when the device is lost
      rendererRef.current = null;
      worldRef.current = null;
    };
  }, [width, height]);

  // sceneId 변경 시 Scene 전환
  useEffect(() => {
    if (!sceneId || !rendererRef.current || !worldRef.current) return;

    async function switchScene() {
      // TODO: 차후 Backend API에서 Scene을 가져오도록 수정
      const newScene = AVAILABLE_SCENES.find((s) => s.id === sceneId);
      if (!newScene) {
        console.warn(`Scene with id "${sceneId}" not found`);
        return;
      }

      console.log(`Switching to scene: ${newScene.name}`);

      // 새 Scene에서 사용된 모든 Mesh 이름 추출
      const meshNamesToLoad: string[] = [];
      for (const asset of newScene.assets) {
        if (asset.type === 'object' && asset.meshName) {
          // 이미 로드된 Mesh는 건너뛰기
          if (
            !ResourceManager.MeshPool.has(asset.meshName) &&
            !meshNamesToLoad.includes(asset.meshName)
          ) {
            meshNamesToLoad.push(asset.meshName);
          }
        }
      }

      // 필요한 Asset 로드 (아직 로드되지 않은 것만)
      if (meshNamesToLoad.length > 0) {
        await ResourceManager.LoadAssets(meshNamesToLoad);
      }

      // World에 새 Scene 로드
      worldRef.current!.LoadFromScene(newScene);

      // Renderer 재초기화
      await rendererRef.current!.Reinitialize(worldRef.current!);

      console.log(`Scene switched successfully to: ${newScene.name}`);
    }

    switchScene().catch((error) => {
      console.error('Error switching scene:', error);
    });
  }, [sceneId]);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
