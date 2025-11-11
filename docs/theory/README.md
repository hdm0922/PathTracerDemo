# ReSTIR Path Tracer 이론 문서

ReSTIR를 이용한 Path Tracer의 이론적 배경과 구현 가이드를 제공합니다.

## 📚 문서 목록

### 기본 Path Tracing 이론

1. **[Monte-Carlo Integration](./MonteCarloIntegration.md)**
   - Monte-Carlo 적분의 기초 이론
   - Path Tracing에서의 적용 방법

2. **[Rendering Equation](./RenderingEquation.md)**
   - 렌더링 방정식의 원리
   - 빛의 전달 과정 수학적 모델링

3. **[PBR Details](./PBRDetails.md)**
   - Physically Based Rendering 세부사항
   - BRDF/BSDF 모델
   - Microfacet 이론

### ReSTIR 확장

4. **[Sampling Methods](./Sampling.md)**
   - 다양한 샘플링 기법
   - Importance Sampling
   - Multiple Importance Sampling

5. **[ReSTIR Pipeline Guide](./ReSTIR_Pipeline.md)**
   - ReSTIR 알고리즘 파이프라인
   - Reservoir 기반 샘플링
   - 시공간 재사용(Spatio-Temporal Reuse)

## 🔗 참고 자료

- [Rendering equation(Wikipedia)](https://en.wikipedia.org/wiki/Rendering_equation)
- [Monte Carlo Path Tracing PDF](https://graphics.stanford.edu/courses/cs348b-01/course29.hanrahan.pdf)
- [LearnOpenGL PBR](https://learnopengl.com/PBR/Theory)
- [A Reflectance Model for Computer Graphics](https://graphics.pixar.com/library/ReflectanceModel/paper.pdf)
- [Microfacet Models for Refraction](https://www.graphics.cornell.edu/~bjw/microfacetbsdf.pdf)
- [A Gentle Introduction to ReSTIR](https://intro-to-restir.cwyman.org/)

## 📝 기타 문서

- [memo.md](./memo.md) - 개발 메모
- [Working.md](./Working.md) - 작업 진행 상황
