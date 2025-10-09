# Theory

Path Tracing은 물리적으로 정확한 빛을 계산하는 방법입니다.

하나의 Pixel의 색을 결정하기 위해선, 직접광뿐만 아니라 모든 방향에서 입사하는 간접광들도 함께 고려해야 합니다.

## Rendering Equation

$$L_o(\vec{x}, \hat{\omega_o}) = L_e(\vec{x}, \hat{\omega_o}) + \int_{\Omega} f_r(\vec{x}, \hat{\omega_i}, \hat{\omega_o}) L_i(\vec{x}, \hat{\omega_i}) (\hat{\omega_i} \cdot \hat{\mathbf{n}}) d\omega_i$$

($\hat{\omega_i}, \hat{\omega_o}$ 모두 $\vec{x}$ 에서 나가는 방향입니다.)

위 Rendering Equation이 말하는 점은 명확합니다.

"표면 위 점 $\vec{x}$ 에서 $\hat{\omega_o}$ 방향으로 나가는 빛의 세기 $L_o(\vec{x}, \hat{\omega_o})$는, 표면 자체의 빛나는 양 $L_e(\vec{x}, \hat{\omega_o})$ 과 임의의 입사 방향 $\hat{\omega_i}$ 로부터 온 빛의 세기 $L_i(\vec{x}, \hat{\omega_i})$ 가 반사된 양 $f_r(\vec{x}, \hat{\omega_i}, \hat{\omega_o}) L_i(\vec{x}, \hat{\omega_i}) (\hat{\omega_i} \cdot \hat{\mathbf{n}})$ 들의 합과 같다."

또한 진공에서 빛의 전파는 에너지를 보존시키기에, $L_i(\vec{x}, \hat{\omega_i})$ 는 다른 위치 $(\vec{x} + t_i\hat{\omega_i})$ 에서 $-\hat{\omega_i}$ 방향으로 출발한 빛의 세기와 같을 것입니다.

$$L_i(\vec{x}, \hat{\omega_i}) = L_o(\vec{x} + t_i\hat{\omega_i}, -\hat{\omega_i}) $$

이로부터 Rendering Equation을 다시 작성하면

$$L_o(\vec{x}, \hat{\omega_o}) = L_e(\vec{x}, \hat{\omega_o}) + \int_{\Omega} f_r(\vec{x}, \hat{\omega_i}, \hat{\omega_o}) L_o(\vec{x} + t_i\hat{\omega_i}, -\hat{\omega_i}) (\hat{\omega_i} \cdot \hat{\mathbf{n}}) d\omega_i$$

의 재귀적 형태로 나타납니다. Path Tracing은 이 방정식을 푸는 방법입니다.


## Monte Carlo Integration

영역 ${\Omega}$에서 정의된 어떤 함수 $f(\vec{x})$의 값은 구할 수 있지만 $\int_{\Omega}f(\vec{x})d\vec{x}$ 를 구하기 힘들 때 사용하는 방법입니다.

먼저 충분히 큰 자연수 $M$과 영역 ${\Omega}$에서 잘 정의된 확률밀도함수 $\rho(\vec{x})$를 정의해 $M$개의 표본을 추출합니다.

그 후 확률변수의 기댓값 관점으로 주어진 적분을 해석합니다.

$$\int_{\Omega}f(\vec{x})d\vec{x} = \int_{\Omega}\frac{f(\vec{x})}{\rho(\vec{x})}\rho(\vec{x})d\vec{x} =  \langle \frac{f(X)}{\rho(X)} \rangle$$

여기서 $X$는 영역 ${\Omega}$에서 정의되며 확률밀도함수 $\rho(\vec{x})$ 를 따르는 확률변수입니다.

큰 수의 법칙에 의해 이 기댓값은 $M$이 충분히 크다면 앞서 추출한 표본들의 평균으로 표현할 수 있습니다.

$$\langle \frac{f(X)}{\rho(X)} \rangle \approx \frac{1}{M}\sum_{i=1}^M\frac{f(X_i)}{\rho(X_i)}$$

이 방식은 Rendering Equation에 나타나는 복잡한 적분의 Reflection Term을 구하는데 유용하게 사용됩니다.

## Direct Light

프로젝트에 사용할 광원은 총 3가지 입니다.

1. Directional Light
2. Point Light
3. Rect Light

즉 표면 $\vec{x}$에서 고려할 Direct Light는 위 3가지 경우 뿐입니다.

### Directional Light

명시적인 위치가 없고, 방향만 있는 광원입니다. Directional Light의 발광 함수는 

$$L_e(\vec{x}, \hat{\omega}) = L_0\delta(\hat{\omega} - \hat{\omega_L}) $$

와 같이 쓸 수 있습니다.

### Point Light

명시적인 위치만 있고, 위치로부터 주위로 고르게 퍼져나가는 점 광원입니다. Directional Light와 유사하게, Point Light의 발광 함수는

$$L_e(\vec{x}, \hat{\omega}) = \frac{L_0}{|\vec{x} - \vec{p}|^2}\delta(\hat{\omega} - \hat{\omega_L}) $$

가 됩니다.

### Rect Light

Rect Light 는 사각형 영역에 모여있는 Point Light의 집합입니다.


## Path Sampling


Rendering Equation을 수치적으로 풀기 전에, 모든 입사광의 경로 집합 $\Omega$ 를 직접광과 간접광의 두 경우로 나누겠습니다. 이 때 Rendering Equation은

$$L_o(\vec{x}, \hat{\omega_o}) = L_e(\vec{x}, \hat{\omega_o}) + \int_{Direct} f_r(\vec{x}, \hat{\omega_i}, \hat{\omega_o}) L_o(\vec{x} + t_i\hat{\omega_i}, -\hat{\omega_i}) (\hat{\omega_i} \cdot \hat{\mathbf{n}}) d\omega_i + \int_{Indirect} f_r(\vec{x}, \hat{\omega_i}, \hat{\omega_o}) L_o(\vec{x} + t_i\hat{\omega_i}, -\hat{\omega_i}) (\hat{\omega_i} \cdot \hat{\mathbf{n}}) d\omega_i$$

으로 쓸 수 있습니다.

------------

Direct Light에서 나온 빛은, 곧 광원 자신이 만들어낸 빛입니다.

$$L_o(\vec{x}, \hat{\omega}) = L_e(\vec{x}, \hat{\omega})$$



Directional Light, Point Light와 같이 특별한 발광함수를 갖는 광원들은, 이 적분을 해석적으로 결정할 수 있게 됩니다. 예를 들어 Directional Light 는

$$ \int_{Directional} f_r(\vec{x}, \hat{\omega_i}, \hat{\omega_o}) L_o(\vec{x} + t_i\hat{\omega_i}, -\hat{\omega_i}) (\hat{\omega_i} \cdot \hat{\mathbf{n}}) d\omega_i = L_0f_r(\vec{x}, -\hat{\omega_L}, \hat{\omega_o}) (-\hat{\omega_L} \cdot \hat{\mathbf{n}})$$

가 되겠습니다. 이처럼 해석적으로 적분을 결정할 수 있는 Direct Light 항이 있는 반면, Indirect Light는 그렇게 하지 못합니다. 

따라서 우리는 Monte-Carlo Integration 을 이용해 Indirect Light 항의 적분을 근사할 것입니다 (계산의 부하를 줄이기 위해 $M = 1$ 을 선택합니다). 확률밀도함수 $\rho(\vec{x})$ 를 사용해 하나의 방향 샘플 $\hat{\omega_X}$ 를 추출하면, 적분은

$$ \int_{Indirect} f_r(\vec{x}, \hat{\omega_i}, \hat{\omega_o}) L_o(\vec{x} + t_i\hat{\omega_i}, -\hat{\omega_i}) (\hat{\omega_i} \cdot \hat{\mathbf{n}}) d\omega_i \approx  \frac{1}{\rho(\vec{x} + t_X\hat{\omega_X})}f_r(\vec{x}, \hat{\omega_X}, \hat{\omega_o})(\hat{\omega_X} \cdot \hat{\mathbf{n}})L_o(\vec{x} + t_i\hat{\omega_X}, -\hat{\omega_X})$$

로 근사할 수 있습니다.

------------

Rendering Equation에서 해석적으로 결정할 수 있는 항들을 묶고, 


$$EmitAndDirect(\vec{x}, \hat{\omega_o}) = L_e(\vec{x}, \hat{\omega_o}) + \int_{Direct} f_r(\vec{x}, \hat{\omega_i}, \hat{\omega_o}) L_o(\vec{x} + t_i\hat{\omega_i}, -\hat{\omega_i}) (\hat{\omega_i} \cdot \hat{\mathbf{n}}) d\omega_i$$

Indirect Path Sample에서 결정한 $L_o$의 계수를 하나로 묶겠습니다.


$$Attenuation(\vec{x}, \hat{\omega_o}, \hat{\omega_X}) = \frac{1}{\rho(\vec{x} + t_X\hat{\omega_X})}f_r(\vec{x}, \hat{\omega_X}, \hat{\omega_o})(\hat{\omega_X} \cdot \hat{\mathbf{n}})$$

이렇게 묶으면, Rendering Equation은 최종적으로

$$L_o(\vec{x}, \hat{\omega_o}) = EmitAndDirect(\vec{x}, \hat{\omega_o}) + Attenuation(\vec{x}, \hat{\omega_o}, \hat{\omega_X})L_o(\vec{x} + t_i\hat{\omega_X}, -\hat{\omega_X})$$

로 요약할 수 있습니다.

## Path Tracing

상태 $(\vec{x}, \hat{\omega_o})$ 에서의 빛을 계산하기 위해서는 이전 상태 $(\vec{x} + t_i\hat{\omega_X}, -\hat{\omega_X})$ 가 필요합니다. 

Rendering Equation이 준 점화식에 따라, 이 상태들만 결정할 수 있다면 간단한 Dynamic Programming과 같은 기법으로 $L_o(\vec{x}, \hat{\omega_o})$ 를 구할 수 있습니다.

아래는 Path Tracing의 흐름을 생각해볼 수 있는 PseudoCode 입니다.

```

PixelColor = vec3(0.0, 0.0, 0.0);
Throughput = vec3(1.0, 1.0, 1.0);
CurrentState = (X, W);


for (int bounce = 0; bounce < MAX_BOUNCE; bounce++)
{
    PixelColor += Throughput * EmitAndDirect(X, W);

    W_new = NewDirection(X);
    X_new = TraceRay(X, W_new);

    Throughput *= Attenuation(X, W, W_new);
    CurrentState = (X_new, W_new);
}

return PixelColor;

```

프로젝트는 이런 흐름으로 작성됐으며, 구체적인 계산 등은 [LearnOpenGL PBR][LearnOpenGL-PBR-Theory] 을 참고해 수행했습니다.

# References

+ [Rendering equation(Wikipedia)][Rendering-Equation-Wiki]
+ [Stanford Computer Graphics PDF][Stanford-Computer-Graphics-pdf]
+ [LearnOpenGL PBR][LearnOpenGL-PBR-Theory]





[LearnOpenGL-PBR-Theory]: https://learnopengl.com/PBR/Theory
[Rendering-Equation-Wiki]: https://en.wikipedia.org/wiki/Rendering_equation
[Stanford-Computer-Graphics-pdf]: https://graphics.stanford.edu/courses/cs348b-01/course29.hanrahan.pdf