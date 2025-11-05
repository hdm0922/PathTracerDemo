import { useEffect, useRef } from 'react';
import { ResourceManager } from '../graphics-core/ResourceManager';
import { World } from '../graphics-core/World';
// import { RendererTEST } from '../graphics-core/Renderer_TEST';
import { Renderer } from '../graphics-core/Renderer';

interface WebGPURendererProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function WebGPURenderer({
  className = '',
  width = 600,
  height = 450,
}: WebGPURendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const worldRef = useRef<World | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

        // Create world and renderer
        const world = new World();
        const renderer = new Renderer(adapter, device, canvas);

        // Load assets (same as main.ts)
        const fileNamesToLoad: string[] = [
          'TestScene',
          'Lamp',
          'PureWindow',
          'Chair',
        ];

        await ResourceManager.LoadAssets(fileNamesToLoad);

        // Initialize world and renderer
        world.Initialize();
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

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
