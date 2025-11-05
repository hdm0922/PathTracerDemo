import type {
  FurnitureItem,
  FurnitureOption,
  FurnitureType,
} from '../types/lightingSimulator.types';

interface FurnitureControlsProps {
  furnitureItems: FurnitureItem[];
  selectedFurniture: string;
  furnitureOptions: FurnitureOption[];
  imgIcBaselinePlus: string;
  imgMaterialSymbolsRefreshRounded: string;
  onAddFurniture: (type: FurnitureType) => void;
  onRemoveFurniture: (id: string) => void;
  onSelectFurniture: (id: string) => void;
  onRotateFurniture: (id: string) => void;
  onUpdatePosition: (
    id: string,
    key: 'x' | 'z' | 'rotation',
    value: number
  ) => void;
}

export default function FurnitureControls({
  furnitureItems,
  selectedFurniture,
  furnitureOptions,
  imgIcBaselinePlus,
  imgMaterialSymbolsRefreshRounded,
  onAddFurniture,
  onRemoveFurniture,
  onSelectFurniture,
  onRotateFurniture,
  onUpdatePosition,
}: FurnitureControlsProps) {
  return (
    <div className="furniture-controls-container">
      {/* Add Furniture Section */}
      <div className="furniture-add-section">
        <h3 className="furniture-section-title">가구 추가</h3>
        <div className="furniture-options-grid">
          {furnitureOptions.slice(0, 2).map((option) => (
            <button
              key={option.type}
              className="furniture-option-button"
              onClick={() => onAddFurniture(option.type)}
            >
              <div
                className="furniture-icon"
                style={{ backgroundColor: option.color }}
              >
                <img src={imgIcBaselinePlus} alt="Add icon" />
              </div>
              <span>{option.name}</span>
            </button>
          ))}
        </div>
        <div className="furniture-options-grid">
          {furnitureOptions.slice(2, 4).map((option) => (
            <button
              key={option.type}
              className="furniture-option-button"
              onClick={() => onAddFurniture(option.type)}
            >
              <div
                className="furniture-icon"
                style={{ backgroundColor: option.color }}
              >
                <img src={imgIcBaselinePlus} alt="Add icon" />
              </div>
              <span>{option.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Placed Furniture List */}
      <p className="furniture-list-title">
        배치된 가구 ({furnitureItems.length})
      </p>

      {furnitureItems.map((item) => {
        const selected = selectedFurniture === item.id;
        return (
          <div
            key={item.id}
            className={`furniture-item-panel ${selected ? 'selected' : ''}`}
            onClick={() => onSelectFurniture(item.id)}
          >
            <div className="furniture-item-header">
              <h4>{item.name}</h4>
              <button
                className="delete-button"
                onClick={() => onRemoveFurniture(item.id)}
              >
                🗑️
              </button>
            </div>

            <div className="control-group-spacing" />

            <p className="control-label">위치 X: {item.x.toFixed(1)}m</p>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={item.x}
              onChange={(e) =>
                onUpdatePosition(item.id, 'x', parseFloat(e.target.value))
              }
              className="slider-input"
              style={
                {
                  '--fill-percentage': `${((item.x + 5) / 10) * 100}%`,
                } as React.CSSProperties
              }
            />

            <p className="control-label">위치 Z: {item.z.toFixed(1)}m</p>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={item.z}
              onChange={(e) =>
                onUpdatePosition(item.id, 'z', parseFloat(e.target.value))
              }
              className="slider-input"
              style={
                {
                  '--fill-percentage': `${((item.z + 5) / 10) * 100}%`,
                } as React.CSSProperties
              }
            />

            <p className="control-label">회전: {item.rotation}°</p>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={item.rotation}
              onChange={(e) =>
                onUpdatePosition(item.id, 'rotation', parseInt(e.target.value))
              }
              className="slider-input"
              style={
                {
                  '--fill-percentage': `${(item.rotation / 360) * 100}%`,
                } as React.CSSProperties
              }
            />

            <button
              className="rotate-button"
              onClick={() => onRotateFurniture(item.id)}
            >
              <img src={imgMaterialSymbolsRefreshRounded} alt="Rotate" />
              <span>90도 회전</span>
            </button>
          </div>
        );
      })}

      {/* Selected Furniture Info */}
      <div className="selected-furniture-info">
        <p className="selected-furniture-title">
          {furnitureItems.find((f) => f.id === selectedFurniture)?.type ===
          'table'
            ? '테이블'
            : furnitureItems.find((f) => f.id === selectedFurniture)?.type ===
              'chair'
            ? '의자'
            : furnitureItems.find((f) => f.id === selectedFurniture)?.type ===
              'sofa'
            ? '소파'
            : '선반'}
        </p>
        <p className="selected-furniture-hint">
          3D 뷰에서 클릭하여 선택하거나 위 슬라이더로 조정하세요
        </p>
      </div>
    </div>
  );
}
