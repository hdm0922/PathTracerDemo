import TabNavigation from './TabNavigation';
import CameraDebugInfo from './CameraDebugInfo';
import type { ActiveTab } from '../types/lightingSimulator.types';

interface RightPanelProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  cameraPosition: { x: number; y: number; z: number } | null;
  children: React.ReactNode;
}

export default function RightPanel({
  activeTab,
  onTabChange,
  cameraPosition,
  children,
}: RightPanelProps) {
  return (
    <div className="right-panel">
      <h1 className="simulator-title">시뮬레이터</h1>
      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />
      <CameraDebugInfo position={cameraPosition} />
      {children}
    </div>
  );
}
