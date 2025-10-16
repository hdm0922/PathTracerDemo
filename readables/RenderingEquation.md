# Rendering Equation

Pixel의 색을 결정하는 문제는 곧, Pixel $\rightarrow$ Camera 방향에 대한 빛의 색을 결정하는 문제다.

이 광선은 씬의 특정 표면에서 출발했을 것이다. 표면의 위치 $\mathbf{x}$ 에서 방향 ${\hat{\omega}}_o$ 로 방출되는 빛의 색은

$$
L_{out}(\mathbf{x}, {\hat{\omega}}_o) = 
L_{emit}(\mathbf{x}, {\hat{\omega}}_o) + 
\int_{\Omega} 
f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o) 
L_{in}(\mathbf{x}, {\hat{\omega}}_i) 
(\hat{\mathbf{n}} \cdot {\hat{\omega}}_i) 
d\omega_i
$$

의 식으로 주어진다(영역 $\Omega$ 는 $\mathbf{x}$ 를 중심으로 하는 단위 구).

이 식을 Rendering Equation이라고 칭하며, 한 점에서 나가는 빛의 색은 "자신이 방출하는 색 + 모든 방향에서 입사하는 빛이 반사/굴절된 색" 이라는 사실을 수식으로 나타낸 것이다.

진공에서 에너지는 보존되기에, 빛 $\mathbf{x}' \rightarrow \mathbf{x}$ 에 대하여

$$L_{in}(\mathbf{x}, \hat{\omega}) = L_{out}(\mathbf{x}', -\hat{\omega})$$

로 표현할 수 있겠다. 실제로는 $\mathbf{x}' \rightarrow \mathbf{x}$ 의 경로가 막히지 않아야 하므로 더 정확하게는

$$L_{in}(\mathbf{x}, \hat{\omega}) = L_{out}(\mathbf{x}', -\hat{\omega}) V(\mathbf{x}' \leftrightarrow \mathbf{x})$$

의 표현이 적절하다.

즉 Rendering Equation은 그 자체로 $L_{out}$ 에 대한 재귀적 방정식이다.

$$
L_{out}(\mathbf{x}, {\hat{\omega}}_o) = 
L_{emit}(\mathbf{x}, {\hat{\omega}}_o) + 
\int_{\Omega} 
f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o)
L_{out}(\mathbf{x}', -{\hat{\omega}}_i) 
V(\mathbf{x}' \leftrightarrow \mathbf{x}) 
(\hat{\mathbf{n}} \cdot {\hat{\omega}}_i)
d\omega_i
$$

표면의 고유 정보들로부터 $L_{emit}$ 은 쉽게 결정할 수 있는 반면, 반사/굴절항을 표현하는 적분은 값을 구하기 매우 힘들다.

결론부터 말하자면 이 적분을 Monte-Carlo 방법으로 풀어야 할 것인데, 하나의 일관된 PDF 의 선택은 필연적으로 큰 분산을 낳을 것이다. 

따라서 적분 영역을 여러 기준에 따라 나눈 후 각 적분을 독립적으로 추정하는 방식으로 총 적분을 계산하는 방법을 사용할 것이다.

## Direct Light

Rendering Equation에 나타나는 반사/굴절항을 한 번 살펴보자.

$$
L_{reflect}(\mathbf{x}, {\hat{\omega}}_o) = 
\int_{\Omega} 
f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o)
L_{out}(\mathbf{x}', -{\hat{\omega}}_i) 
V(\mathbf{x}' \leftrightarrow \mathbf{x}) 
(\hat{\mathbf{n}} \cdot {\hat{\omega}}_i) 
d\omega_i
$$

영역 $\Omega$ 는 빛이 올 가능성이 있는 모든 방향들을 담고 있다. 

$\Omega$ 를 두 독립적인 집합 $\Omega_{Direct}, \Omega_{Indirect}$ 로 나누자. 빛의 출처가 광원이라면 해당 방향은 $\Omega_{Direct}$ 에 속하며, 그렇지 않다면 $\Omega_{Indirect}$ 에 속한다.

$$
\begin{aligned}
L_{\mathrm{reflect}}(\mathbf{x}, {\hat{\omega}}_o) &= \int_{\mathrm{Direct}} f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o) L_{\mathrm{out}}(\mathbf{x}', -{\hat{\omega}}_i) V(\mathbf{x}' \leftrightarrow \mathbf{x}) (\hat{\mathbf{n}} \cdot {\hat{\omega}}_i) d\omega_i \\
&+ \int_{\mathrm{Indirect}} f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o) L_{\mathrm{out}}(\mathbf{x}', -{\hat{\omega}}_i) V(\mathbf{x}' \leftrightarrow \mathbf{x}) (\hat{\mathbf{n}} \cdot {\hat{\omega}}_i) d\omega_i
\end{aligned}
$$

이며, 광원에서 나오는 빛은 광원이 만들어낸 빛 뿐이므로

$$ L_{out}(\mathbf{x_L}, \hat{\omega}) = L_{emit}(\mathbf{x_L}, \hat{\omega}) $$

이 성립하겠다.

또한 $\Omega_{Direct}$ 는 결국 씬에 존재하는 모든 광원들의 합집합이므로, 이에 대한 적분은 최종적으로

$$
\sum\int_{Light} 
f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o)
L_{emit}(\mathbf{x}', -{\hat{\omega}}_i) 
V(\mathbf{x}' \leftrightarrow \mathbf{x}) 
(\hat{\mathbf{n}} \cdot {\hat{\omega}}_i) 
d\omega_i
$$

의 형태로 표현될 것이다.

어떤 광원에 대한 적분인가에 따라 Monte-Carlo Integration이 필요할 수도, 혹은 적분 자체가 해석적으로 결정될 수도 있다.

## Indirect Light

Rendering Equation 에서 표현되는 Indirect Light 항은

$$
\int_{Indirect} 
f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o)
L_{out}(\mathbf{x}', -{\hat{\omega}}_i)
V(\mathbf{x}' \leftrightarrow \mathbf{x}) 
(\hat{\mathbf{n}} \cdot {\hat{\omega}}_i) 
d\omega_i
$$

이다. 이 적분은 Monte-Carlo Integration을 사용해 값을 추정해야 하고, 앞서 논의한 바에 따르자면 PDF의 선택은 피적분함수와 유사할수록 좋다.

현재 단계에서는 $L_{out}(\mathbf{x}', -{\hat{\omega}}_i), V(\mathbf{x}' \leftrightarrow \mathbf{x})$ 를 모두 알지 못하기에 사용할 수 없고, 이들을 제외한 함수를 PDF의 선택에 사용하는 것이 최선이다.

$$ \rho(\hat{\omega}) \propto f_s(\mathbf{x}, \hat{\omega}, {\hat{\omega}}_o)(\hat{\mathbf{n}} \cdot \hat{\omega}) $$

최종적으로 Indirect Light 항은 샘플 ${\hat{\omega}}_X \sim \rho(\hat{\omega})$ 에 대해

$$ 
\frac{1}{\rho({\hat{\omega}}_X)}
f_s(\mathbf{x}, {\hat{\omega}}_X, {\hat{\omega}}_o) 
(\hat{\mathbf{n}} \cdot {\hat{\omega}}_X)
L_{out}(\mathbf{x}', -{\hat{\omega}}_X)
V(\mathbf{x}' \leftrightarrow \mathbf{x})
$$

꼴로 표현될 수 있다.


## Summary

Rendering Equation의 최종 형태는

$$
\begin{aligned}
L_{\mathrm{out}}(\mathbf{x}, {\hat{\omega}}_o) &= L_{\mathrm{emit}}(\mathbf{x}, {\hat{\omega}}_o) + \sum\int_{\mathrm{Light}} f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o) L_{\mathrm{emit}}(\mathbf{x}', -{\hat{\omega}}_i) V(\mathbf{x}' \leftrightarrow \mathbf{x}) (\hat{\mathbf{n}} \cdot {\hat{\omega}}_i) d\omega_i \\
&+ \frac{1}{\rho({\hat{\omega}}_X)} f_s(\mathbf{x}, {\hat{\omega}}_X, {\hat{\omega}}_o) (\hat{\mathbf{n}} \cdot {\hat{\omega}}_X) L_{\mathrm{out}}(\mathbf{x}', -{\hat{\omega}}_X) V(\mathbf{x}' \leftrightarrow \mathbf{x})
\end{aligned}
$$

로 풀이된다. 

식의 흐름이 $\mathbf{x} \rightarrow \mathbf{x}' \rightarrow ... \rightarrow \mathbf{x_L}$ 의 경로를 요구하는데, 이 경로를 따라가며 적분을 계산하는 과정을 Path Tracing 이라고 한다.

식의 특정 항들을 새로이 정의해

$$
\begin{aligned}
\mathrm{EmitAndDirectLight}[\text{i}] &= 
L_{\mathrm{emit}}(\mathbf{x}, {\hat{\omega}}_o) + 
\sum\int_{\mathrm{Light}} 
f_s(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o) 
L_{\mathrm{emit}}(\mathbf{x}', -{\hat{\omega}}_i) 
V(\mathbf{x}' \leftrightarrow \mathbf{x}) 
(\hat{\mathbf{n}} \cdot {\hat{\omega}}_i) 
d\omega_i
\\ \\
\mathrm{Attenuation}[\text{i}] &= 
\frac{1}{\rho({\hat{\omega}}_X)} 
f_s(\mathbf{x}, {\hat{\omega}}_X, {\hat{\omega}}_o) 
(\hat{\mathbf{n}} \cdot {\hat{\omega}}_X)
\end{aligned}
$$


으로 표현하면, 간소화된 Rendering Equation

$$ L[\text{i}] = EmitAndDirectLight[\text{i}] + Attenuation[\text{i}] \times L[\text{i+1}] $$

이 나타난다. 

이 점화식은 간단한 Dynamic Programming 기법으로 쉽게 구할 수 있다.