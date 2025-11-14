import { useEffect, useRef, useState } from 'react';
import { WebGPUEngine } from '../graphics-core/service';

interface WebGPURendererProps {
  className?: string;
  width?: number;
  height?: number;
  sceneId?: string;
  onCameraUpdate?: (position: { x: number; y: number; z: number }) => void;
}

/**
 * WebGPURenderer - WebGPU 렌더링을 위한 얇은 React 래퍼 컴포넌트
 */
export default function WebGPURenderer({
  className = '',
  width = 800,
  height = 600,
  sceneId,
  onCameraUpdate,
}: WebGPURendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WebGPUEngine | null>(null);
  const [frameTime, setFrameTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // 반응형 크기 처리 (ResizeObserver)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect;

        // WebGPU 내부 해상도 제한 (성능 최적화)
        // CSS로는 크게 표시되지만, 실제 렌더링은 낮은 해상도로
        const MAX_WIDTH = 640;   // 최대 내부 렌더 너비
        const MAX_HEIGHT = 688;  // 최대 내부 렌더 높이 (953:1024 비율 유지)

        // 최소 크기 보장
        const minWidth = Math.max(containerWidth, 400);
        const minHeight = Math.max(containerHeight, 300);

        // 최대 크기 제한
        const newWidth = Math.min(minWidth, MAX_WIDTH);
        const newHeight = Math.min(minHeight, MAX_HEIGHT);

        setCanvasSize({ width: newWidth, height: newHeight });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 초기 렌더러 설정
  useEffect(() => {
    let isMounted = true;

    async function initEngine() {
      if (!canvasRef.current) return;

      try {
        const engine = new WebGPUEngine(canvasRef.current);

        // Setup callbacks
        engine.onFrameTimeUpdate = (ft) => {
          if (isMounted) setFrameTime(ft);
        };

        engine.onCameraUpdate = (pos) => {
          if (isMounted && onCameraUpdate) {
            onCameraUpdate(pos);
          }
        };

        // Initialize and start
        await engine.initialize(canvasSize.width, canvasSize.height, sceneId);

        if (!isMounted) {
          engine.dispose();
          return;
        }

        engineRef.current = engine;
        engine.start();
      } catch (err) {
        console.error('Error initializing WebGPU engine:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
      }
    }

    initEngine();

    // Cleanup
    return () => {
      isMounted = false;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [canvasSize.width, canvasSize.height]);

  // Canvas 크기 변경 시 리사이즈
  useEffect(() => {
    if (!engineRef.current) return;

    async function resizeEngine() {
      try {
        await engineRef.current!.resize(canvasSize.width, canvasSize.height);
      } catch (err) {
        console.error('Error resizing engine:', err);
      }
    }

    resizeEngine();
  }, [canvasSize]);

  // sceneId 변경 시 Scene 전환
  useEffect(() => {
    if (!sceneId || !engineRef.current) return;

    async function switchScene() {
      try {
        await engineRef.current!.switchScene(sceneId);
      } catch (err) {
        console.error('Error switching scene:', err);
        setError(err instanceof Error ? err.message : 'Failed to switch scene');
      }
    }

    switchScene();
  }, [sceneId]);

  // 에러 화면
  if (error) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#ff4444',
          fontFamily: 'monospace',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div>
          <h3>WebGPU Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}
      />

      {/* Frame Time Display */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#0f0',
          padding: '8px 12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '14px',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Frame Time: {frameTime.toFixed(2)} ms
        <br />
        FPS: {frameTime > 0 ? (1000 / frameTime).toFixed(0) : '0'}
      </div>
    </div>
  );
}
