import TabNavigation from './TabNavigation';
import type { ActiveTab } from '../types/lightingSimulator.types';

interface RightPanelProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export default function RightPanel({
  activeTab,
  onTabChange,
  children,
}: RightPanelProps) {
  return (
    <div className="right-panel">
      <h1 className="simulator-title">시뮬레이터</h1>
      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />
      {children}
    </div>
  );
}
