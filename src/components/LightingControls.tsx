import type {
  LightingSettings,
  TimeOfDay,
} from '../types/lightingSimulator.types';

interface LightingControlsProps {
  lightings: LightingSettings[];
  timeOfDay: TimeOfDay;
  ceilingHeight: number;
  onAddLighting: () => void;
  onRemoveLighting: (index: number) => void;
  onTimeChange: (time: TimeOfDay) => void;
  onUpdateLighting: (
    index: number,
    key: keyof LightingSettings,
    value: number
  ) => void;
  onCeilingHeightChange: (value: number) => void;
}

export default function LightingControls({
  lightings,
  timeOfDay,
  ceilingHeight,
  onAddLighting,
  onRemoveLighting,
  onTimeChange,
  onUpdateLighting,
  onCeilingHeightChange,
}: LightingControlsProps) {
  return (
    <div className="lighting-controls-container">
      {/* Time selector */}
      <div className="time-selector-box">
        <h3 className="section-title">시간대</h3>
        <div className="time-buttons">
          <button
            className={`time-button ${timeOfDay === 'day' ? 'active' : ''}`}
            onClick={() => onTimeChange('day')}
          >
            <span className="icon">☀️</span>
            <span>낮</span>
          </button>
          <button
            className={`time-button ${timeOfDay === 'night' ? 'active' : ''}`}
            onClick={() => onTimeChange('night')}
          >
            <span className="icon">🌙</span>
            <span>밤</span>
          </button>
        </div>

        <p className="ceiling-info">층고: {ceilingHeight.toFixed(1)}m</p>
        <input
          type="range"
          min="2.0"
          max="4.0"
          step="0.1"
          value={ceilingHeight}
          onChange={(e) => onCeilingHeightChange(parseFloat(e.target.value))}
          className="slider-input"
          style={
            {
              '--fill-percentage': `${
                ((ceilingHeight - 2.0) / (4.0 - 2.0)) * 100
              }%`,
            } as React.CSSProperties
          }
        />
      </div>

      {/* Lighting section header */}
      <div className="lighting-section-header">
        <h3 className="lighting-section-title">조명</h3>
        <button className="add-button" onClick={onAddLighting}>
          ➕ 추가
        </button>
      </div>

      {/* Lighting controls */}
      {lightings.map((lighting, index) => (
        <div key={index} className="lighting-control-panel">
          <div className="control-panel-header">
            <h4>조명 {index + 1}</h4>
            {lightings.length > 1 && (
              <button
                className="delete-button"
                onClick={() => onRemoveLighting(index)}
              >
                🗑️
              </button>
            )}
          </div>

          <div className="control-item">
            <p className="control-label">밝기: {lighting.brightness}%</p>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={lighting.brightness}
              onChange={(e) =>
                onUpdateLighting(index, 'brightness', parseInt(e.target.value))
              }
              className="slider-input"
              style={
                {
                  '--fill-percentage': `${lighting.brightness}%`,
                } as React.CSSProperties
              }
            />
          </div>

          <div className="control-item">
            <p className="control-label">색온도: {lighting.colorTemp}K</p>
            <input
              type="range"
              min="2700"
              max="6500"
              step="100"
              value={lighting.colorTemp}
              onChange={(e) =>
                onUpdateLighting(index, 'colorTemp', parseInt(e.target.value))
              }
              className="slider-input"
              style={
                {
                  '--fill-percentage': `${
                    ((lighting.colorTemp - 2700) / (6500 - 2700)) * 100
                  }%`,
                } as React.CSSProperties
              }
            />
          </div>

          <div className="control-item">
            <p className="control-label">조명각: {lighting.angle}°</p>
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={lighting.angle}
              onChange={(e) =>
                onUpdateLighting(index, 'angle', parseInt(e.target.value))
              }
              className="slider-input"
              style={
                {
                  '--fill-percentage': `${(lighting.angle / 90) * 100}%`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
