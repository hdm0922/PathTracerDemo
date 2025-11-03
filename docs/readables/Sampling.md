
# Sampling Methods

## Importance Sampling

Monte-Carlo Integration Form은 Sampling PDF $p(\mathbf{x})$ 에 대해

$$ I = \int_\Omega f(\mathbf{x}) dV = \frac{ 1 }{ M } \sum_{i=1}^M \frac{ f(X_i) }{ p(X_i )} $$

이며, $p(\mathbf{x})$ 의 품질에 따라 작은 $M$ 에서도 충분히 만족스러운 근사값을 계산할 수 있음을 보았다. 

샘플링이 가능한 PDF $p(\mathbf{x})$ 를 $f(\mathbf{x})$ 와 최대한 비슷한 분포를 갖도록 선택하고, $p(\mathbf{x})$ 로부터 샘플들을 추출해 $\hat{I}$ 를 결정하는 과정을 Importance Sampling 이라 칭한다.

## Sampling From Independent PDFs

$M = 1$ 에서의 Monte-Carlo Estimator

$$ \hat{I} = \frac{f(X)}{p(X)} $$

를 고려하자. $\hat{I}$ 는 항상

$$ \mathrm{E}(\hat{I}) = I $$

임이 보장된다.

어떤 PDF를 쓰는지 구체적인 형태에 대한 제약은 없었기에, 여러 독립적인 PDF $p_i(\mathbf{x})$ 들로부터 정의된 Monte-Carlo Estimator $\hat{I}_1, \hat{I}_2, ... , \hat{I}_M$ 는 모두

$$ \mathrm{E}(\hat{I}_i) = I $$

이다.

$M$개의 Estimator들의 산술평균과 그 기댓값을 구하면

$$ \hat{I}_{avg} = \frac{ 1 }{ M } \sum_{i=1}^M \hat{I}_i $$

$$ \mathrm{E}(\hat{I}_{avg}) = \frac{ 1 }{ M } \sum_{i=1}^M \mathrm{E}(\hat{I}_i) = I $$

이다.

즉, 아래의 표현은 유효한 Monte-Carlo Estimator 이다.

$$ \hat{I} = \frac{ 1 }{ M } \sum_{i=1}^M \frac{f(X_i)}{p_i(X_i)} $$

자유로운 PDF의 선택은 필히 더 낮은 분산(최적)의 추정치를 얻을 수 있게 해 줄 것이다. 

하지만 개별 추정치들의 가중치 $M^{-1}$ 가 과연 최적의 가중치일까?

## Multiple Importance Sampling

독립적인 $M$ 개의 PDF 들로부터 만든 Estimator의 분산은

$$ \text{Var}(\hat{I}) = \frac{ 1 }{ M^2 } \sum_{i=1}^M \text{Var}(\frac{f(X_i)}{p_i(X_i)}) $$

이다.

$\text{Var}(\mathbf{x}) \geq 0$ 의 제약으로부터 $\text{Var}(\hat{I})$ 는 불안정한 소수의 Sample 때문에 매우 큰 분산을 갖게될 수 있으며, Estimator 의 수렴을 느리게 만드는 주요한 원인으로 동작한다.

이를 보정하기 위해, Monte-Carlo Estimator

$$ \hat{I} = \frac{ 1 }{ M } \sum_{i=1}^M \frac{f(X_i)}{p_i(X_i)} $$

를 새로운 형태

$$ \hat{I} = \sum_{i=1}^M m_i(X_i) \frac{f(X_i)}{p_i(X_i)} $$

로 바꾸어 각 Sample 의 기여도를 조절하려고 한다.

Estimator의 비편향성을 보장하기 위해서는 아래 두 값이 서로 같아야한다.

$$ \mathrm{E}(\hat{I}) = \sum_{i=1}^M \mathrm{E}(m_i(X_i) \frac{f(X_i)}{p_i(X_i)}) = \sum_{i=1}^M \int_\Omega m_i(\mathbf{x}) f(\mathbf{x}) dV = \int_\Omega (\sum_{i=1}^M m_i(\mathbf{x})) f(\mathbf{x}) dV $$

$$ I = \int_\Omega f(\mathbf{x}) dV $$

임의의 $f(\mathbf{x})$ 에 대하여 이 관계가 항상 성립하기 위해서는

$$ \sum_{i=1}^M m_i(\mathbf{x}) = 1 $$

의 선택이 요구된다.

우리의 목표는 Estimator 가 튀는 상황 $( p_i(X_i) \approx 0 )$ 을 줄이는 것이기에

$$ m_i(X_i) \propto p_i(X_i) $$

의 선택이 가장 이상적이며, Balance Heuristic 의 선택은 이들을 모두 만족시킨다.

$$ m_i(X_i) = \frac{ p_i(X_i) }{ \sum_{j} p_j(X_i) }  $$


## Resampled Importance Sampling

Multiple Importance Sampling 은 Monte-Carlo Estimator 의 분산을 낮추는 훌륭한 전략이다.

하지만 $m_i(\mathbf{x})$ 와 $\hat{I}$ 모두 Sampling PDF 를 계산할 수 있어야한다.

$$ m_i(\mathbf{x}) = \frac{ p_i(\mathbf{x}) }{ \sum_{j} p_j(\mathbf{x}) }  $$

$$ \hat{I} = \sum_{i=1}^M m_i(X_i) \frac{f(X_i)}{p_i(X_i)} $$

만약에 Sampling PDF 의 분포가 계산 불가능하다면? Balance Heuristic 을 계산할 수 없고, $\hat{I}$ 를 얻을 수 없다.

(주의 : $p_i(X_i)$ 는 알고 있지만 $p_j(X_i)$ 를 모른다.)

Resampled Importance Sampling 은 "PDF 의 정확한 계산" 을 포기하는 대신, "좋은 샘플을 선택" 하는 방법을 소개한다.

기존의 MIS 가 각 Sample 의 기여도 ${f(X_i)}/{p_i(X_i)}$ 를 계산해 최종 추정치를 계산했다면,

RIS 는 이들 Sample 들로부터 Target Function 을 따르도록 하나의 최종 Sample 을 추출해 해당 Sample 만으로 추정치를 계산한다.

$$ \hat{I} = \frac{f(X_S)}{\text{RIS}(X_S)} $$

각 Candidate Sample 들로부터 하나의 최종 Sample 을 추출하려면, 이들이 실제 뽑힐 확률을 정의해야 한다. 

RIS 에서는 각 Sample 에 고유의 Resampling Weight $\omega_i$ 를 부여한다.

$$ \omega_i \propto \frac{ \hat{p}(X_i) }{ p(X_i) } $$

이 선택이 각 Sample 의 출신 분포의 영향을 지우며 새로운 분포 $\hat{p}(\mathbf{x})$ 를 따르도록 할 것이다. 이상적인 값은 $\hat{p}(\mathbf{x}) = f(\mathbf{x})$ 이다.

---

하지만 단순히 이 선택만으로는 $p_i(X_i) \approx 0$ 인 Sample 이 뽑힌다면, Sample 의 희귀성을 보상하기 위해 과도하게 높은 $\omega_i$ 가 계산될 것이며 높은 분산으로 이어질 것이다.

따라서 MIS 에서 논의했던 바와 같이, MIS Weight $m_i$ 를 포함한 가중치를 정의함이 타당하다.

$$ \omega_i = m_i(X_i) \frac{ \hat{p}(X_i) }{ p_i(X_i) } $$

그러나 현재로서는 여전히 Balance Heuristic 을 계산할 수 없다 ($p_j(X_i)$ 계산 불가).

따라서 새로운 형태인 Generalized Balance Heuristic 을 소개한다.

$$ m_i(\mathbf{x}) = \frac{ \hat{p_i}(\mathbf{x}) }{ \sum_{j} \hat{p_j}(\mathbf{x}) } $$

여기서 $\hat{p_i}(\mathbf{x})$ 는 $X_i$ 가 따르고자 했던 Target Function 이다. 

( RIS Sample 들은 주로 이전 단계들의 RIS 결과물이므로, $\hat{p_i}(\mathbf{x})$ 을 이전 단계 RIS 의 $\hat{p}(\mathbf{x})$ 로 이해해도 무방하다. )

$$ \omega_i = \left(\frac{ \hat{p_i}(X_i) }{ \sum_{j} \hat{p_j}(X_i) }\right) \frac{ \hat{p}(X_i) }{ p_i(X_i) } $$

$$ \text{Pr}(\text{choose } i) = \frac{ \omega_i }{ \sum_j \omega_j } $$

이제 각 Sample 이 선택될 확률을 정의했으니 최종적으로 하나의 Sample 을 추출할 수 있다.

Monte-Carlo Estimator 는 Resampling Weight 들로 표현된다.

$$ \hat{I} = \sum_{i = 1}^M \frac{ \omega_i }{ \hat{p}(X_i) } f(X_i) $$

-------

최종적으로 추출된 단 하나의 Sample $X_S$ 에 대한 Monte-Carlo Estimator 는

$$ \hat{I} = \frac{f(X_S)}{\text{RIS}(X_S)} $$

이다. 하지만 계산 불가능한 PDF 들을 조합해 얻은 $X_S$ 의 PDF 는 마찬가지로 계산이 불가능하다.

계산할 수 없는 $\text{RIS}(X_S)$ 대신에, 새로운 가중치 $W_{X}$ 를 고려하자. 이 가중치를 이용한 Monte-Carlo Estimator 를 다시 정의하려고 한다.

$$ \hat{I}_{\text{RIS}} = W_{X_S} f(X_S) $$

이 추정치가 올바르게 동작하기 위해서는 비편향성이 보장돼야 하며,

$$ \mathrm{E}( W_{X_S} f(X_S) ) = \int_\Omega f(\mathbf{x}) \times \Big[ \mathrm{E}( W_X | X = \mathbf{x} ) \text{RIS}(\mathbf{x}) \Big] \times dV = \int_\Omega f(\mathbf{x}) dV $$

즉

$$ \mathrm{E}( W_X | X) = \frac{ 1 }{ \text{RIS}(X) } $$

임이 요구된다. 

이를 만족시키는 적당한 $W_X$ 의 표현을 정의하자. 

우리가 아는 정보는 RIS 이전의 Sample Set 이 Unbiased Estimator 를 갖고 있었다는 것 뿐이다.

$$ \hat{I}_\text{MIS} = \sum_{i = 1}^M \frac{ \omega_i }{ \hat{p}(X_i) } f(X_i) $$

RIS 의 결과로 선정된 $X_S$ 의 추정치는

$$ \hat{I}_\text{RIS} = W_{X} f(X) $$

이다. 이들은 비편향성을 요구받는다.

$$ \mathrm{E}( \hat{I}_\text{MIS} ) = \mathrm{E}( \hat{I}_\text{RIS} ) = I $$

간단한 $W_X$ 를 결정하기 위해, 조금 강한 제약조건을 두고자 한다.

$$ \mathrm{E}( \hat{I}_\text{RIS} | X ) = \hat{I}_\text{MIS} $$

이 제약조건을 만족하는 $W_X$ 는 모든 요구사항을 만족할 것이다.

$$ \mathrm{E}( \hat{I}_\text{RIS} ) = \mathrm{E}( W_{X} f(X) ) = I $$

$$ \mathrm{E}( W_X | X) = \frac{ 1 }{ \text{RIS}(X) } $$

이로부터 $W_X$ 를 명시적으로 결정할 수 있다.

$$ \mathrm{E}( \hat{I}_\text{RIS} | X ) = \sum_{i = 1}^M \text{Pr}(\text{choose } i) \times W_{X_i} f(X_i) = \sum_{i = 1}^M \Big[ \frac{ \omega_i }{ \sum_j \omega_j } \Big] \times W_{X_i} f(X_i) $$

$$ \hat{I}_\text{MIS} = \sum_{i = 1}^M \frac{ \omega_i }{ \hat{p}(X_i) } f(X_i) $$

$$ \sum_{i = 1}^M \Big[ \frac{ \omega_i }{ \sum_j \omega_j } \Big] \times W_{X_i} f(X_i) = \sum_{i = 1}^M \frac{ \omega_i }{ \hat{p}(X_i) } f(X_i) $$

위 식이 항상 성립하기 위한 조건은 간단하다.

$$ W_{X} = \frac{ 1 }{ \hat{p}(X) } \sum_{i = 1}^M \omega_i $$

이 Unbiased Contribution Weight $W_X$ 를 이용하면, 계산할 수 없는 분포로 얻은 Sample 들의 Monte-Carlo Estimator 를 결정할 수 있다.

$$ \hat{I} = W_{X} f(X) = \frac{ f(X) }{ \hat{p}(X) } \sum_{i = 1}^M \omega_i $$

계산한 $W_X$ 를 실제 다음 RIS 단계에서 $1/p(X)$ 로 두면 다음 RIS 단계의 입력 또한 모두 정의되므로 다시 RIS 를 수행할 수 있다.
