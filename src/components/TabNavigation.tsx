import type { ActiveTab } from '../types/lightingSimulator.types';

interface TabNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className="tab-nav">
      <button
        className={`tab-button ${activeTab === 'lighting' ? 'active' : ''}`}
        onClick={() => onTabChange('lighting')}
      >
        조명
      </button>
      <button
        className={`tab-button ${activeTab === 'space' ? 'active' : ''}`}
        onClick={() => onTabChange('space')}
      >
        공간
      </button>
      <button
        className={`tab-button ${activeTab === 'furniture' ? 'active' : ''}`}
        onClick={() => onTabChange('furniture')}
      >
        가구
      </button>
    </div>
  );
}
