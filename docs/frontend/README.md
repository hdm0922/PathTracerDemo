# Lighting Simulator (조명 시뮬레이터)

React + TypeScript + Vite를 사용한 조명 시뮬레이션 웹 애플리케이션

## 프로젝트 소개

3D 공간에서 조명, 바닥/벽/천장 재질, 가구 배치를 시뮬레이션할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- **조명 제어**: 밝기, 색온도, 각도 조정
- **공간 설정**: 바닥/벽/천장 재질 및 거칠기 설정
- **가구 배치**: 테이블, 의자, 소파, 선반 추가 및 위치 조정
- **시간대 선택**: 낮/밤 모드

## 시작하기

### 설치

```bash
pnpm install
```

### 개발 서버 실행

```bash
pnpm dev
```

### 빌드

```bash
pnpm build
```

### 배포

```bash
pnpm preview
```

## 이미지 교체

현재 플레이스홀더 이미지가 사용되고 있습니다. 실제 3D 시각화 이미지로 교체하려면:

1. **3D 뷰 이미지 교체**

   - `public/placeholder-3d-view.svg` 파일을 실제 3D 뷰 이미지로 교체
   - 또는 `src/LightingSimulator.tsx`의 `imgFrame1` 경로를 수정

2. **아이콘 교체**
   - `public/plus-icon.svg` - 추가 버튼 아이콘
   - `public/refresh-icon.svg` - 새로고침/회전 아이콘

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── FurnitureControls.tsx
│   ├── ImageViewer.tsx
│   ├── LightingControls.tsx
│   ├── RightPanel.tsx
│   ├── SpaceControls.tsx
│   └── TabNavigation.tsx
├── types/               # TypeScript 타입 정의
│   └── lightingSimulator.types.ts
├── LightingSimulator.tsx   # 메인 컴포넌트
└── main.tsx            # 애플리케이션 진입점
```

## 기술 스택

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **CSS** - 스타일링

## 라이선스

MIT License
