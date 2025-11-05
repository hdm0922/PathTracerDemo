import type { MaterialOption } from '../types/lightingSimulator.types';

interface SpaceControlsProps {
  floorMaterial: string;
  floorRoughness: number;
  floorMetallic: number;
  wallMaterial: string;
  wallRoughness: number;
  ceilingMaterial: string;
  floorMaterials: MaterialOption[];
  wallMaterials: MaterialOption[];
  ceilingMaterials: MaterialOption[];
  onFloorMaterialChange: (material: string) => void;
  onFloorRoughnessChange: (value: number) => void;
  onFloorMetallicChange: (value: number) => void;
  onWallMaterialChange: (material: string) => void;
  onWallRoughnessChange: (value: number) => void;
  onCeilingMaterialChange: (material: string) => void;
}

export default function SpaceControls({
  floorMaterial,
  floorRoughness,
  floorMetallic,
  wallMaterial,
  wallRoughness,
  ceilingMaterial,
  floorMaterials,
  wallMaterials,
  ceilingMaterials,
  onFloorMaterialChange,
  onFloorRoughnessChange,
  onFloorMetallicChange,
  onWallMaterialChange,
  onWallRoughnessChange,
  onCeilingMaterialChange,
}: SpaceControlsProps) {
  return (
    <div className="space-controls">
      {/* Floor Material */}
      <div className="material-section">
        <h3 className="material-title">바닥 재질</h3>
        <div className="material-grid">
          {floorMaterials.slice(0, 2).map((material) => (
            <button
              key={material.name}
              className={`material-button ${
                floorMaterial === material.name ? 'selected' : ''
              }`}
              onClick={() => onFloorMaterialChange(material.name)}
            >
              <div
                className="material-color"
                style={{ backgroundColor: material.color }}
              />
              <span>{material.name}</span>
            </button>
          ))}
        </div>
        <div className="material-grid">
          {floorMaterials.slice(2, 4).map((material) => (
            <button
              key={material.name}
              className={`material-button ${
                floorMaterial === material.name ? 'selected' : ''
              }`}
              onClick={() => onFloorMaterialChange(material.name)}
            >
              <div
                className="material-color"
                style={{ backgroundColor: material.color }}
              />
              <span>{material.name}</span>
            </button>
          ))}
        </div>

        <div className="control-group-spacing" />

        <p className="control-label">거칠기: {floorRoughness}</p>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={floorRoughness}
          onChange={(e) => onFloorRoughnessChange(parseInt(e.target.value))}
          className="slider-input"
          style={
            { '--fill-percentage': `${floorRoughness}%` } as React.CSSProperties
          }
        />

        <p className="control-label">금속성: {floorMetallic}</p>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={floorMetallic}
          onChange={(e) => onFloorMetallicChange(parseInt(e.target.value))}
          className="slider-input"
          style={
            { '--fill-percentage': `${floorMetallic}%` } as React.CSSProperties
          }
        />
      </div>

      {/* Wall Material */}
      <div className="material-section">
        <h3 className="material-title">벽 재질</h3>
        <div className="material-grid">
          {wallMaterials.slice(0, 2).map((material) => (
            <button
              key={material.name}
              className={`material-button ${
                wallMaterial === material.name ? 'selected' : ''
              }`}
              onClick={() => onWallMaterialChange(material.name)}
            >
              <div
                className="material-color"
                style={{ backgroundColor: material.color }}
              />
              <span>{material.name}</span>
            </button>
          ))}
        </div>
        <div className="material-grid">
          {wallMaterials.slice(2, 4).map((material) => (
            <button
              key={material.name}
              className={`material-button ${
                wallMaterial === material.name ? 'selected' : ''
              }`}
              onClick={() => onWallMaterialChange(material.name)}
            >
              <div
                className="material-color"
                style={{ backgroundColor: material.color }}
              />
              <span>{material.name}</span>
            </button>
          ))}
        </div>

        <div className="control-group-spacing" />

        <p className="control-label">거칠기: {wallRoughness}</p>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={wallRoughness}
          onChange={(e) => onWallRoughnessChange(parseInt(e.target.value))}
          className="slider-input"
          style={
            { '--fill-percentage': `${wallRoughness}%` } as React.CSSProperties
          }
        />
      </div>

      {/* Ceiling Material */}
      <div className="material-section">
        <h3 className="material-title">천장 재질</h3>
        <div className="material-grid">
          {ceilingMaterials.map((material) => (
            <button
              key={material.name}
              className={`material-button ${
                ceilingMaterial === material.name ? 'selected' : ''
              }`}
              onClick={() => onCeilingMaterialChange(material.name)}
            >
              <div
                className="material-color"
                style={{ backgroundColor: material.color }}
              />
              <span>{material.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
