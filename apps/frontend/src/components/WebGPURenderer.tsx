import { useEffect, useRef } from 'react';
import { vec3 } from 'wgpu-matrix';
import type { Vec3 } from 'wgpu-matrix';
import { ResourceManager } from '../graphics-core/ResourceManager';
import { World } from '../graphics-core/World';
import { DUMMY_SCENE_1, AVAILABLE_SCENES } from '../graphics-core/test/DummyScenes';
import type { Scene } from '../graphics-core/Structs';

// Renderer_TEST   Renderer
import { Renderer } from '../graphics-core/Renderer_TEST';

interface WebGPURendererProps {
  className?: string;
  width?: number;
  height?: number;
  sceneId?: string; // TODO: 차후 Backend API에서 Scene을 선택할 때 사용
  onCameraUpdate?: (position: { x: number; y: number; z: number }) => void;
}

export default function WebGPURenderer({
  className = '',
  width = 600,
  height = 450,
  sceneId,
  onCameraUpdate,
}: WebGPURendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const worldRef = useRef<World | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Camera control state
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const isMouseDownRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);
  const lastMouseYRef = useRef<number>(0);

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

          // Handle camera movement based on pressed keys
          const camera = rendererRef.current.GetCamera();
          let cameraMoved = false;

          const moveSpeed = 0.1; // 이동 속도
          const pressedKeys = pressedKeysRef.current;

          if (pressedKeys.size > 0) {
            const forwardVector: Vec3 = camera.GetForwardVector();
            const rightVector: Vec3 = camera.GetRightVector();
            const upVector: Vec3 = vec3.fromValues(0, 1, 0);
            const moveOffset: Vec3 = vec3.create(0, 0, 0);

            if (pressedKeys.has('w') || pressedKeys.has('W')) {
              // Forward
              vec3.addScaled(moveOffset, forwardVector, moveSpeed, moveOffset);
            }
            if (pressedKeys.has('s') || pressedKeys.has('S')) {
              // Backward
              vec3.addScaled(moveOffset, forwardVector, -moveSpeed, moveOffset);
            }
            if (pressedKeys.has('a') || pressedKeys.has('A')) {
              // Left
              vec3.addScaled(moveOffset, rightVector, -moveSpeed, moveOffset);
            }
            if (pressedKeys.has('d') || pressedKeys.has('D')) {
              // Right
              vec3.addScaled(moveOffset, rightVector, moveSpeed, moveOffset);
            }
            if (pressedKeys.has('q') || pressedKeys.has('Q')) {
              // Up (Unreal Engine style)
              vec3.addScaled(moveOffset, upVector, -moveSpeed, moveOffset);
            }
            if (pressedKeys.has('e') || pressedKeys.has('E')) {
              // Down (Unreal Engine style)
              vec3.addScaled(moveOffset, upVector, moveSpeed, moveOffset);
            }

            if (vec3.length(moveOffset) > 0) {
              camera.AddLocationOffset(moveOffset);
              cameraMoved = true;
            }
          }

          // Reset FrameCount if camera moved
          if (cameraMoved) {
            rendererRef.current.ResetFrameCount();
          }

          // Update camera position callback
          if (onCameraUpdate) {
            const cameraLocation = camera.GetLocation();
            onCameraUpdate({
              x: cameraLocation[0],
              y: cameraLocation[1],
              z: cameraLocation[2],
            });
          }

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
      await rendererRef.current!.Initialize(worldRef.current!);

      console.log(`Scene switched successfully to: ${newScene.name}`);
    }

    switchScene().catch((error) => {
      console.error('Error switching scene:', error);
    });
  }, [sceneId]);

  // Keyboard and Mouse input handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        pressedKeysRef.current.add(key);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      pressedKeysRef.current.delete(key);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!canvasRef.current) return;

      isMouseDownRef.current = true;
      lastMouseXRef.current = event.clientX;
      lastMouseYRef.current = event.clientY;

      // Lock pointer for better camera control
      canvasRef.current.requestPointerLock();
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      document.exitPointerLock();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDownRef.current || !rendererRef.current) return;

      const camera = rendererRef.current.GetCamera();

      // Use movementX/Y for smoother rotation when pointer is locked
      const deltaX = event.movementX;
      const deltaY = event.movementY;

      const mouseSensitivity = 0.1; // 마우스 감도

      // Update camera rotation
      camera.AddYaw(-deltaX * mouseSensitivity);
      camera.AddPitch(-deltaY * mouseSensitivity);

      // Reset FrameCount when camera rotates
      rendererRef.current.ResetFrameCount();
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      document.exitPointerLock();
    };
  }, []);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}
      />
    </div>
  );
}
