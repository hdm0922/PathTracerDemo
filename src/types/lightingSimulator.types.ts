export type MaterialOption = {
  name: string;
  color: string;
};

export type LightingSettings = {
  brightness: number;
  colorTemp: number;
  angle: number;
};

export type FurnitureItem = {
  id: string;
  type: 'table' | 'chair' | 'sofa' | 'shelf';
  name: string;
  x: number;
  z: number;
  rotation: number;
};

export type FurnitureOption = {
  type: 'table' | 'chair' | 'sofa' | 'shelf';
  name: string;
  color: string;
  icon?: string;
};

export type ActiveTab = 'lighting' | 'space' | 'furniture';

export type TimeOfDay = 'day' | 'night';

export type FurnitureType = 'table' | 'chair' | 'sofa' | 'shelf';
