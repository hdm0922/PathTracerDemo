## BRDF

$$ f_r(L, V) = 0.25 \times F(L,H) \times G_0(N,V,L) \times D(N,H) $$
$$ H = \text{normalize}(L + V) $$

## BTDF

$$ f_t(L, V) = |L \cdot H| \times |V \cdot H| \times \frac{\eta_o^2 \times (1 - F(L,H))}{(\eta_i(L \cdot H) + \eta_o(V \cdot H))^2} \times G_0(N,V,L) \times D(N,H)$$

$$ H = \text{normalize}(\eta_iL + \eta_oV) $$

## Factors

$$ D(N, H) = \frac{R^4}{\pi[(N \cdot H)^2 (R^4 - 1) + 1]^2} $$

$$ G_0(N,V,L) = \frac{1}{(N \cdot L)(1 - k) + k} \times \frac{1}{(N \cdot V)(1 - k) + k}$$

$$ k = \frac{(R + 1)^2}{8} $$

$$ F(L, H) = F_0 + (1 - F_0) \times [1 - \text{saturate}(L \cdot H)]^5 $$

$$ F_0 = \text{lerp}((\frac{1 - IOR}{1 + IOR})^2, \text{Albedo}, \text{Metalness}) $$