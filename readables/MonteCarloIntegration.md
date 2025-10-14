
# Monte Carlo Integration

## Background

Monte Carlo Integration은 어느 함수 $f(\mathbf{x})$ 의 영역 $\Omega$ 에서의 정적분

$$ I = \int_\Omega f(\mathbf{x}) dV $$

를 구하는 방법 중 하나다.

먼저 영역 $\Omega$ 에서 잘 정의된 임의의 확률밀도함수 $\rho(\mathbf{x})$ 를 정의하고, 이를 따르는 확률변수를 $X$ 라고 하자.

$$ X \sim \rho(X) $$

기댓값의 관점에서 $I$ 는

$$ 
I = \int_\Omega f(\mathbf{x}) dV = 
\int_\Omega \left[ \frac{ f(\mathbf{x}) }{ \rho(\mathbf{x}) } \right] \rho(\mathbf{x}) dV =
\langle \frac{f(X)}{\rho(X)} \rangle
$$

로 표현된다.

확률밀도함수 $\rho(\mathbf{x})$ 를 따라 샘플링한 $M$ 개의 Candidte Sample Set을 $\left[ X_1, X_2, ... , X_M \right]$ 이라고 하자.

대수의 법칙은 $M$ 이 충분히 크다면, 이들의 이산 평균을 실제 기댓값의 근사치로 사용할 수 있음을 보여준다.

$$
\langle \frac{f(X)}{\rho(X)} \rangle \approx 
\frac{ 1 }{ M } \sum_{i=1}^M \frac{ f(X_i) }{ \rho(X_i )}
$$

## Importance Sampling

$M = 1$ 에서 $I$ 의 Monte Carlo Estimator 는

$$ \hat{I} = \frac{f(X)}{\rho(X)} $$

이다. 하나의 Sample을 사용했기에 추정치 자체는 $I$ 와 차이가 날 수 있다. 하지만 $\hat{I}$ 의 평균은 반드시 $I$ 임이 보장된다.

$$ \mathrm{E}(\hat{I}) = I $$

확률변수 $X$ 의 Sampling Logic인 확률밀도함수 $\rho(X)$ 는 온전히 사용자의 선택에 의해 결정된다.

제약 없는 $\rho(X)$ 의 선택은 거의 필연적으로 높은 분산을 유발할 것이며, 이는 $\hat{I} \rightarrow I$ 의 수렴을 느리게 만들 것이다.

반대로 $\rho(X)$ 를 잘 선택해 낮은 분산을 만들어낼 수 있다면, $\hat{I} \rightarrow I$ 의 수렴을 빠르게 만들 수 있다.

### Perfect Importance Sampling

가장 이상적인 전략은 $\rho \propto f$ 인 경우로, $X$ 의 선택에 관계없이 $\hat{I}$ 가 일정하기 때문에 $M = 1$ 의 선택만으로 분산 없는 추정치를 얻을 수 있다. 이 경우를 Perfect Importance Sampling 이라고 한다.

$\rho(X)$ 는 확률밀도함수의 정규화 조건으로부터

$$ \int_\Omega \rho(\mathbf{x}) dV = A\int_\Omega f(\mathbf{x}) dV = 1 $$

$$ \rho(X) = I^{-1} f(X)  $$

이다. $I$ 를 구하기 위해 $I$를 알아야 하므로 이 선택은 사실상 불가능하다.

현실적인 전략으로는 최대한 $\rho(X)$ 를 $f(X)$ 의 분포에 맞게 가져가서, 오차에 따라 커지는 분산과 함께 추정치

$$ \hat{I} = \frac{f(X)}{\rho(X)} $$

의 수렴을 기다릴 수 밖에 없다.