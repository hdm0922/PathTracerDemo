# Capstone Backend API

Spring Boot 기반 백엔드 API 서버

## 기술 스택

- Spring Boot 3.2.0
- Java 17
- PostgreSQL
- Spring Security (JWT 인증 - 현재 비활성화)
- Spring Data JPA
- Lombok

## 주요 기능

### 1. 회원 관리
- 회원가입 (username, password, email, nickname)
- 로그인
- JWT 토큰 인증 (현재 주석처리 - 테스트 단계)

### 2. Scene CRUD
- Scene 생성, 조회, 수정, 삭제
- 사용자별 Scene 목록 조회
- Scene 데이터는 JSON 형태로 저장 (PostgreSQL JSONB)

## 데이터베이스 설정

PostgreSQL 데이터베이스가 필요합니다:

```sql
CREATE DATABASE capstone_db;
```

`application.yml`에서 데이터베이스 연결 정보를 수정하세요:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/capstone_db
    username: postgres
    password: postgres
```

## 실행 방법

### Gradle을 이용한 실행

```bash
# Windows
.\gradlew bootRun

# Linux/Mac
./gradlew bootRun
```

### IDE에서 실행

`BackendApplication.java`의 main 메서드를 실행

## API 엔드포인트

기본 URL: `http://localhost:8080/api`

### 인증 API

#### 회원가입
```
POST /auth/signup
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com",
  "nickname": "테스트유저"
}
```

#### 로그인
```
POST /auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

### Scene API

#### Scene 생성
```
POST /scenes
Content-Type: application/json

{
  "name": "My Scene",
  "description": "Test scene",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "assets": "[{\"id\":\"obj1\",\"type\":\"object\",\"meshName\":\"Chair\"}]",
  "userId": 1
}
```

#### Scene 조회 (ID로)
```
GET /scenes/{id}
```

#### 모든 Scene 조회
```
GET /scenes
```

#### 사용자별 Scene 조회
```
GET /scenes/user/{userId}
```

#### Scene 수정
```
PUT /scenes/{id}
Content-Type: application/json

{
  "name": "Updated Scene",
  "description": "Updated description",
  "thumbnailUrl": "https://example.com/new-thumb.jpg",
  "assets": "[{\"id\":\"obj2\",\"type\":\"object\",\"meshName\":\"Table\"}]",
  "userId": 1
}
```

#### Scene 삭제
```
DELETE /scenes/{id}?userId={userId}
```

## JWT 인증 활성화

현재 JWT 인증은 테스트를 위해 비활성화되어 있습니다. 배포 시 활성화하려면:

1. `SecurityConfig.java`에서 주석을 해제하고 현재 설정을 주석처리
2. `JwtTokenProvider.java`의 코드 주석 해제
3. `JwtAuthenticationFilter.java`의 코드 주석 해제
4. `AuthService.java`에서 JWT 토큰 생성 코드 주석 해제

## Scene 데이터 구조

Scene의 assets 필드는 JSON 문자열로, 다음과 같은 구조를 가집니다:

```typescript
interface SceneAsset {
  id: string;
  type: 'object' | 'directional-light' | 'point-light' | 'rect-light';

  // Object용
  meshName?: string;
  transform?: {
    position: [number, number, number];
    rotation: [number, number, number]; // degrees
    scale: [number, number, number];
  };

  // Light용
  lightParams?: {
    position?: [number, number, number];
    direction?: [number, number, number];
    color: [number, number, number];
    intensity: number;
    // ... 기타 light 속성
  };
}
```

## 개발자

Capstone Project Team
