import { useState } from 'react';
import './LightingSimulator.css';
import Header from './components/Header';
import WebGPURenderer from './components/WebGPURenderer';
import RightPanel from './components/RightPanel';
import LightingControls from './components/LightingControls';
import SpaceControls from './components/SpaceControls';
import FurnitureControls from './components/FurnitureControls';
import type {
  MaterialOption,
  LightingSettings,
  FurnitureItem,
  FurnitureOption,
  ActiveTab,
  TimeOfDay,
  FurnitureType,
} from './types/lightingSimulator.types';

// Icon paths
const imgIcBaselinePlus = '/plus-icon.svg';
const imgMaterialSymbolsRefreshRounded = '/refresh-icon.svg';

export default function LightingSimulator() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('lighting');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [ceilingHeight, setCeilingHeight] = useState(3.0);
  const [lightings, setLightings] = useState<LightingSettings[]>([
    { brightness: 30, colorTemp: 4000, angle: 40 },
  ]);

  // Space tab settings
  const [floorMaterial, setFloorMaterial] = useState<string>('원목');
  const [floorRoughness, setFloorRoughness] = useState(75);
  const [floorMetallic, setFloorMetallic] = useState(50);
  const [wallMaterial, setWallMaterial] = useState<string>('페인트');
  const [wallRoughness, setWallRoughness] = useState(50);
  const [ceilingMaterial, setCeilingMaterial] = useState<string>('흰색');
  const [imageOpacity, setImageOpacity] = useState(1);

  // Furniture tab settings
  const [furnitureItems, setFurnitureItems] = useState<FurnitureItem[]>([
    { id: '1', type: 'table', name: '테이블 1', x: 0, z: 0, rotation: 0 },
  ]);
  const [selectedFurniture, setSelectedFurniture] = useState<string>('1');

  // Camera position for debugging
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  const furnitureOptions: FurnitureOption[] = [
    { type: 'table', name: '테이블', color: '#8b6f47' },
    { type: 'chair', name: '의자', color: '#6b5d4f' },
    { type: 'sofa', name: '소파', color: '#798b99' },
    { type: 'shelf', name: '선반', color: '#9c8b7e' },
  ];

  const floorMaterials: MaterialOption[] = [
    { name: '원목', color: '#d5c4af' },
    { name: '대리석', color: '#f5f5f0' },
    { name: '콘크리트', color: '#9e9e9e' },
    { name: '타일', color: '#e0e0e0' },
  ];

  const wallMaterials: MaterialOption[] = [
    { name: '페인트', color: '#e8e0d5' },
    { name: '벽지', color: '#f5f0e8' },
    { name: '콘크리트', color: '#b0b0b0' },
    { name: '목재', color: '#c9b8a0' },
  ];

  const ceilingMaterials: MaterialOption[] = [
    { name: '흰색', color: '#ffffff' },
    { name: '아이보리', color: '#f8f5f0' },
    { name: '회색', color: '#d0d0d0' },
  ];

  // Lighting handlers
  const addLighting = () => {
    setLightings((prev) => [
      ...prev,
      { brightness: 50, colorTemp: 4000, angle: 45 },
    ]);
  };

  const removeLighting = (index: number) => {
    setLightings((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLighting = (
    index: number,
    key: keyof LightingSettings,
    value: number
  ) => {
    setLightings((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  // Furniture handlers
  const addFurniture = (type: FurnitureType) => {
    const newId = `${Date.now()}`;
    const newItem: FurnitureItem = {
      id: newId,
      type,
      name: `${furnitureOptions.find((f) => f.type === type)?.name} ${
        furnitureItems.filter((f) => f.type === type).length + 1
      }`,
      x: 0,
      z: 0,
      rotation: 0,
    };
    setFurnitureItems([...furnitureItems, newItem]);
    setSelectedFurniture(newId);
  };

  const removeFurniture = (id: string) => {
    setFurnitureItems(furnitureItems.filter((item) => item.id !== id));
    if (selectedFurniture === id && furnitureItems.length > 1) {
      setSelectedFurniture(furnitureItems[0].id);
    }
  };

  const rotateFurniture = (id: string) => {
    const item = furnitureItems.find((f) => f.id === id);
    if (item) {
      const newRotation = (item.rotation + 90) % 360;
      setFurnitureItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, rotation: newRotation } : i))
      );
    }
  };

  const updateFurniturePosition = (
    id: string,
    key: 'x' | 'z' | 'rotation',
    value: number
  ) => {
    setFurnitureItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  return (
    <>
      <Header />
      <div className="simulator-container">
        <div className="simulator-layout">
          {/* Left side - WebGPU Renderer */}
          <div className={`${activeTab}-image-wrapper`} style={{ opacity: activeTab === 'space' ? imageOpacity : 1 }}>
            <WebGPURenderer
              className={`${activeTab}-image`}
              onCameraUpdate={setCameraPosition}
            />
          </div>

        {/* Right side - Title, Tabs, and Controls */}
        <RightPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          cameraPosition={cameraPosition}
        >
          {activeTab === 'lighting' && (
            <LightingControls
              lightings={lightings}
              timeOfDay={timeOfDay}
              ceilingHeight={ceilingHeight}
              onAddLighting={addLighting}
              onRemoveLighting={removeLighting}
              onTimeChange={setTimeOfDay}
              onUpdateLighting={updateLighting}
              onCeilingHeightChange={setCeilingHeight}
            />
          )}

          {activeTab === 'space' && (
            <SpaceControls
              floorMaterial={floorMaterial}
              floorRoughness={floorRoughness}
              floorMetallic={floorMetallic}
              wallMaterial={wallMaterial}
              wallRoughness={wallRoughness}
              ceilingMaterial={ceilingMaterial}
              floorMaterials={floorMaterials}
              wallMaterials={wallMaterials}
              ceilingMaterials={ceilingMaterials}
              onFloorMaterialChange={setFloorMaterial}
              onFloorRoughnessChange={setFloorRoughness}
              onFloorMetallicChange={setFloorMetallic}
              onWallMaterialChange={setWallMaterial}
              onWallRoughnessChange={setWallRoughness}
              onCeilingMaterialChange={setCeilingMaterial}
            />
          )}

          {activeTab === 'furniture' && (
            <FurnitureControls
              furnitureItems={furnitureItems}
              selectedFurniture={selectedFurniture}
              furnitureOptions={furnitureOptions}
              imgIcBaselinePlus={imgIcBaselinePlus}
              imgMaterialSymbolsRefreshRounded={
                imgMaterialSymbolsRefreshRounded
              }
              onAddFurniture={addFurniture}
              onRemoveFurniture={removeFurniture}
              onSelectFurniture={setSelectedFurniture}
              onRotateFurniture={rotateFurniture}
              onUpdatePosition={updateFurniturePosition}
            />
          )}
        </RightPanel>
      </div>
    </div>
    </>
  );
}
