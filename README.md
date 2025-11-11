# ResTIR를 이용한 Web 기반 인테리어 시뮬레이터

> **팀명**: 인테리
> **과정**: 서울시립대학교 캡스톤 디자인 2025-2학기
> **프로젝트**: WebGPU 기반 실시간 Path Tracing 인테리어 시뮬레이터

## 📋 프로젝트 소개

ReSTIR(Reservoir-based Spatiotemporal Importance Resampling) 알고리즘을 활용하여 웹 브라우저에서 실시간으로 사실적인 조명 시뮬레이션을 제공하는 인테리어 디자인 도구입니다.

사용자는 웹 환경에서:
- 🏠 3D 공간에 가구와 조명을 배치
- 💡 실시간으로 사실적인 조명 효과 확인
- 🎨 다양한 재질과 색상 적용
- 💾 작업 내용 저장 및 불러오기

## ✨ 주요 기능

### 실시간 Path Tracing
- WebGPU 기반 고성능 렌더링
- ReSTIR 알고리즘을 통한 효율적인 조명 계산
- Physically Based Rendering (PBR) 지원

### 인터랙티브 시뮬레이터
- 직관적인 UI/UX
- 실시간 조명 제어 (밝기, 색온도, 각도)
- 가구 배치 및 재질 설정
- 낮/밤 모드 지원

### 클라우드 저장
- 사용자 계정 시스템
- Scene 저장 및 관리
- 프로젝트 공유 기능

## 🏗️ 프로젝트 구조

```
UOS_Capstone_2025/
├── apps/
│   ├── frontend/          # React + TypeScript 웹 애플리케이션
│   └── backend/           # Spring Boot API 서버
├── docs/
│   ├── frontend/          # 프론트엔드 문서
│   ├── backend/           # 백엔드 API 문서
│   └── theory/            # Path Tracing & ReSTIR 이론
└── infra/                 # 인프라 설정
```

## 🚀 시작하기

### 필수 요구사항

- **Node.js** 18+ (프론트엔드)
- **Java** 17+ (백엔드)
- **PostgreSQL** 14+ (데이터베이스)
- **WebGPU 지원 브라우저** (Chrome 113+, Edge 113+)

### 프론트엔드 실행

```bash
cd apps/frontend
pnpm install
pnpm dev
```

프론트엔드는 `http://localhost:5173`에서 실행됩니다.

자세한 내용은 [Frontend 문서](./docs/frontend/README.md)를 참고하세요.

### 백엔드 실행

1. PostgreSQL 데이터베이스 생성:
```sql
CREATE DATABASE capstone_db;
```

2. `apps/backend/src/main/resources/application.yml` 설정

3. 백엔드 실행:
```bash
cd apps/backend
./gradlew bootRun  # Linux/Mac
.\gradlew bootRun  # Windows
```

백엔드는 `http://localhost:8080`에서 실행됩니다.

자세한 내용은 [Backend 문서](./docs/backend/README.md)를 참고하세요.

## 📚 문서

### 기술 문서
- **[Frontend 가이드](./docs/frontend/README.md)** - React 애플리케이션 구조 및 개발 가이드
- **[Backend API](./docs/backend/README.md)** - REST API 명세 및 데이터베이스 스키마
- **[Theory](./docs/theory/README.md)** - Path Tracing 및 ReSTIR 이론 문서

### 이론 문서 (Theory)
- [Monte-Carlo Integration](./docs/theory/MonteCarloIntegration.md)
- [Rendering Equation](./docs/theory/RenderingEquation.md)
- [PBR Details](./docs/theory/PBRDetails.md)
- [Sampling Methods](./docs/theory/Sampling.md)
- [ReSTIR Pipeline Guide](./docs/theory/ReSTIR_Pipeline.md)

## 🛠️ 기술 스택

### Frontend
- **React 19** - UI 프레임워크
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **WebGPU** - GPU 가속 렌더링

### Backend
- **Spring Boot 3.2** - 서버 프레임워크
- **Spring Data JPA** - ORM
- **PostgreSQL** - 데이터베이스
- **Spring Security + JWT** - 인증/인가

### Rendering
- **Path Tracing** - 물리 기반 렌더링
- **ReSTIR** - 효율적인 조명 샘플링
- **PBR** - Physically Based Rendering

## 📸 결과물

<img width="717" height="508" alt="ResTIR Path Tracer Result" src="https://github.com/user-attachments/assets/0a8a60ae-a557-4426-a5fe-ccfd7388d922" />

## 🔗 참고 자료

- [Rendering equation (Wikipedia)](https://en.wikipedia.org/wiki/Rendering_equation)
- [Monte Carlo Path Tracing PDF](https://graphics.stanford.edu/courses/cs348b-01/course29.hanrahan.pdf)
- [LearnOpenGL PBR](https://learnopengl.com/PBR/Theory)
- [A Gentle Introduction to ReSTIR](https://intro-to-restir.cwyman.org/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)

## 👥 팀원

**팀 인테리** - 서울시립대학교 캡스톤 디자인 2025-2학기

## 📄 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.
