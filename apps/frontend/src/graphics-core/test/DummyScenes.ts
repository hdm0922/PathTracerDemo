import type { Scene } from '../Structs';

/**
 * Dummy Scene 데이터
 * TODO: 차후 Backend API에서 Scene 데이터를 가져오도록 수정 필요
 * TODO: Scene 편집 UI 구현 후 사용자가 Scene을 생성/수정할 수 있도록 구현
 */

/**
 * 현재 하드코딩된 정적 Scene을 Dummy Object로 변환
 * 기존 World.Initialize()의 내용을 Scene 형식으로 표현
 */
export const DUMMY_SCENE_1: Scene = {
  id: 'dummy_scene_1',
  name: 'Test Room Scene',
  description: 'Default test scene with TestScene, Window, and Directional Light',
  assets: [
    // TestScene Instance
    {
      id: 'scene_instance_0',
      type: 'object',
      meshName: 'TestScene',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0], // Euler angles in degrees [x, y, z]
        scale: [1, 1, 1],
      },
    },
    // PureWindow Instance

    // {
    //   id: 'glass_instance_0',
    //   type: 'object',
    //   meshName: 'Glass',
    //   transform: {
    //     position: [0, 0, 0],
    //     rotation: [0, 0, 0], // Euler angles in degrees [x, y, z]
    //     scale: [1, 1, 1],
    //   },
    // },

    {
      id: 'window_instance_0',
      type: 'object',
      meshName: 'PureWindow',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 90, 0], // 90 degrees rotation around Y axis
        scale: [1, 1, 1],
      },
    },

    //Directional Light
    {
      id: 'sun_light',
      type: 'directional-light',
      lightParams: {
        direction: [0, 0, -1],
        color: [1, 1, 1],
        intensity: 2.0,
      },
    },

    // Point Light
    // {
    //   id: 'bulb',
    //   type: 'point-light',
    //   lightParams: {
    //     position: [0, 0, -1],
    //     color: [1, 1, 1],
    //     intensity: 20.0,
    //   },
    // },

    // Rect Light
    {
      id: 'rect',
      type: 'rect-light',
      lightParams: {
        position: [0, 1, -2],
        u: [0.4, 0, 0],
        v: [0, 0, 0.4],
        color: [1, 1, 1],
        intensity: 10.0,
      }
    },

  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * 추가 Dummy Scene (의자 포함)
 */
export const DUMMY_SCENE_2: Scene = {
  id: 'dummy_scene_2',
  name: 'Room with Chair',
  description: 'Test scene with furniture',
  assets: [
    // TestScene Instance
    {
      id: 'scene_instance_0',
      type: 'object',
      meshName: 'TestScene',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0], // Euler angles in degrees [x, y, z]
        scale: [1, 1, 1],
      },
    },
    // PureWindow Instance
    {
      id: 'window_instance_0',
      type: 'object',
      meshName: 'PureWindow',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 90, 0], // 90 degrees rotation around Y axis
        scale: [1, 1, 1],
      },
    },
    // Chair Instance
    {
      id: 'chair_instance_0',
      type: 'object',
      meshName: 'Chair',
      transform: {
        position: [0, -90, 0],
        rotation: [0, 0, 0], // Euler angles in degrees [x, y, z]
        scale: [0.02, 0.02, 0.02],
      },
    },
    // Directional Light
    {
      id: 'sun_light',
      type: 'directional-light',
      lightParams: {
        direction: [0, 0, -1],
        color: [1, 1, 1],
        intensity: 2.0,
      },
    },
    // Rect Light (주석 해제된 버전)
    {
      id: 'rect_light_0',
      type: 'rect-light',
      lightParams: {
        position: [0, 1, 0],
        u: [0.4, 0, 0],
        v: [0, 0, 0.4],
        color: [1, 1, 1],
        intensity: 50,
      },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * 사용 가능한 Dummy Scene 목록
 * TODO: 차후 Backend API로 대체
 */
export const AVAILABLE_SCENES: Scene[] = [DUMMY_SCENE_1, DUMMY_SCENE_2];
