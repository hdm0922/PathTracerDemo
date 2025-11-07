interface CameraDebugInfoProps {
  position: { x: number; y: number; z: number } | null;
}

export default function CameraDebugInfo({ position }: CameraDebugInfoProps) {
  if (!position) {
    return null;
  }

  return (
    <div className="camera-debug-info">
      <div className="debug-title">카메라 위치 (개발용)</div>
      <div className="debug-content">
        <span className="debug-label">X:</span>
        <span className="debug-value">{position.x.toFixed(2)}</span>
        <span className="debug-label">Y:</span>
        <span className="debug-value">{position.y.toFixed(2)}</span>
        <span className="debug-label">Z:</span>
        <span className="debug-value">{position.z.toFixed(2)}</span>
      </div>
    </div>
  );
}