
# Requirements

$$ L_e, \text{BSDF}, G, V $$
$$ \text{PDF}_{\text{BSDF}}, \text{PDF}_{\text{BRDF}}, \text{PDF}_{\text{BTDF}}, \text{PDF}_{\text{NEE}} $$

### Light Emittance

가장 먼저 광원에서 방출되는 빛의 색을 구하는 함수 $L_e$ 를 결정하자. 현재 프로젝트의 광원들은 모두 광원의 방출 방향에 독립적이다.

하지만 확장성을 위해 (특히 Env Light 에 텍스쳐를 입힐 경우 필요) 일단은 두겠다.

```
vec3 L_e(Light L, vec3 Dir)
{
    return L.Color * L.Intensity;
}
```

### Geometry Factor

Lambert Cosine Law 와 면적분의 Jacobian 이 합쳐진 기하 항이다. 일반적인 경로(면적분)에서는 $$G = \frac{ \cos\theta_1 \cos\theta_2 }{ r^2 } $$ 로 표현되지만 광원의 종류에 따라 $G(\mathbf{x}_L \leftrightarrow \mathbf{x})$ 가 달라진다.

```
float G(Surface A, Surface B)
{
    vec3 r      = A.position - B.position;
    vec3 dir    = normalize(r);

    float Cos_A = abs( dot(A.normal, dir) );
    float Cos_B = abs( dot(B.normal, dir) );

    return Cos_A * Cos_B / dot(r, r);
}
```

```
float G_Light(Light L, Surface A)
{
    if (L.LightType == ENV_LIGHT) return 1.0;
    if (L.LightType == DIR_LIGHT) return abs( dot(A.normal, L.direction) );
    if (L.LightType == PNT_LIGHT)
    {
        vec3 r      = L.position - A.position;
        vec3 dir    = normalize(r);
        float Cos   = abs( dot(A.normal, dir) );

        return Cos / dot(r,r);
    }
    if (L.LightType == RCT_LIGHT)
    {
        Surface R;
        R.position  = L.position;
        R.normal    = L.normal;

        return G(A, R);
    }

    return 0.0;
}
```

### BSDF Value

```
vec3 BSDF(Surface A, Surface B, Surface C)
{
    vec3 V = normalize(C - B);
    vec3 L = normalize(A - B);

    return BSDF_MCPT(B, L, V);
}
```

```
vec3 BSDF(Light A, Surface B, Surface C)
{
    vec3 V = normalize(C - B);
    vec3 L = GetSurfaceToLightDirection(A, B);

    return BSDF_MCPT(B, L, V);
}
```

## BSDF Sample

$$
\begin{aligned}
\text{PDF}_{\text{BSDF}} &= \text{Lerp}( \text{PDF}_{\text{BRDF}}, \text{PDF}_{\text{BTDF}}, \text{Transmission} ) \\\\
\text{PDF}_{\text{BRDF}} &= \text{Lerp}( \text{PDF}_{\text{Diffuse}}, \text{PDF}_{\text{Specular}}, P_{Specular} ) \\\\
\text{PDF}_{\text{BTDF}} &= \text{PDF}_{\text{Specular}}
\end{aligned}
$$

## NEE Sample

$$ \text{PDF}_\text{NEE}(\mathbf{x}_L, L) = \text{Pr}( \text{Choose } L ) \times \text{PDF}( \mathbf{x}_L | L ) $$


# Init Pass

경로 $\chi$ 의 RIS Weight 는 $\omega$ 이다.

$$ \omega = m(\chi) \times \hat{p}(\chi) \times \frac{ 1 }{ p(\chi) } $$

$$ W_X = \frac{ 1 }{ \hat{p}(\chi) } \sum \omega_i $$

## Path 1 (1 Bounce NEE)

$$
\begin{aligned}

\chi &= \big[ \mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow X_L \big] \\\\

p(\chi) &= \text{PDF}_\text{NEE}(X_L, L) \\\\

m(\chi) &= \frac{ P(\chi) }{ P(\chi) + \text{PDF}_{\text{BSDF}}(\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow X_L) } \\\\

\hat{p}(\chi) &= \text{Luminance}(L_e(X_L \rightarrow \mathbf{x}_1) \times 
\Big[ \text{BSDF}(X_L \rightarrow \mathbf{x}_1 \rightarrow \mathbf{x}_0) \times 
G(X_L \leftrightarrow \mathbf{x}_1) \times V(X_L \leftrightarrow \mathbf{x}_1) \Big]) \\\\

\end{aligned}
$$

## Path 2 (1 Bounce BSDF - Geometry Miss)

$$
\begin{aligned}

\chi &= \big[ \mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow X_\text{env} \big] \\\\

p(\chi) &=  \text{PDF}_\text{BSDF}(\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow X_\text{env}) \\\\

m(\chi) &= 1 \\\\

\hat{p}(\chi) &= \text{Luminance}(L_e(X_\text{env} \rightarrow \mathbf{x}_1) \times 
\Big[ \text{BSDF}(X_\text{env} \rightarrow \mathbf{x}_1 \rightarrow \mathbf{x}_0) 
\times G(X_\text{env} \leftrightarrow \mathbf{x}_1) \times V(X_\text{env} \leftrightarrow \mathbf{x}_1) \Big]) \\\\

\end{aligned}
$$

## Path 3 (1 Bounce BSDF + 1 Bounce NEE)

$$
\begin{aligned}

\chi &= \big[ \mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow \mathbf{x}_2 \rightarrow X_L \big] \\\\

p(\chi) &= \text{PDF}_\text{BSDF}(\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow \mathbf{x}_2) \times \text{PDF}_\text{NEE}(X_L, L) \\\\

m(\chi) &= \frac{ P(\chi) }{ P(\chi) + \Big[ \text{PDF}_\text{BSDF}(\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow \mathbf{x}_2) \times \text{PDF}_\text{BSDF}(\mathbf{x}_1 \rightarrow \mathbf{x}_2 \rightarrow X_L) \Big] } \\\\

\hat{p}(\chi) &= \text{Luminance}(L_e(X_L \rightarrow \mathbf{x}_2) \times 

\Big[ \text{BSDF}(X_L \rightarrow \mathbf{x}_2 \rightarrow \mathbf{x}_1) \times 
G(X_L \leftrightarrow \mathbf{x}_2) \times V(X_L \leftrightarrow \mathbf{x}_2) \Big] \times

\Big[ \text{BSDF}(\mathbf{x}_2 \rightarrow \mathbf{x}_1 \rightarrow \mathbf{x}_0) \times 
G(\mathbf{x}_2 \leftrightarrow \mathbf{x}_1) \times V(\mathbf{x}_2 \leftrightarrow \mathbf{x}_1) \Big]) \\\\

\end{aligned}
$$

# Reuse Pass

다른 Domain 의 경로는

$$ \chi = \Big[ \mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow ... \rightarrow \mathbf{x}_{k-1} \rightarrow \mathbf{x}_k \rightarrow \mathbf{x}_{k+1} \rightarrow \mathbf{x}_L \Big] $$

으로 표현된다. $\mathbf{x}_k$ 가 Reconnection Vertex 이다.

"현재 픽셀의 도메인"으로 변환된 경로 (Hybrid Shift)는

$$ Y = \Big[ \mathbf{y}_0 \rightarrow \mathbf{y}_1 \rightarrow ... \rightarrow \mathbf{y}_{k-1} \rightarrow \mathbf{x}_k \rightarrow \mathbf{x}_{k+1} \rightarrow \mathbf{x}_L \Big] $$

로 나타난다.

이 변환을 $Y = T_i(\chi)$ 라 정의하며 변환의 Jacobian $J_i$ 에 대해 아래의 값들이 결정된다.

$$
\begin{aligned}
\hat{p}_{\leftarrow i}(Y) &= \hat{p}_i(\chi) \times J_i^{-1} \\\\
m_i(Y) &= \frac{ c_i \hat{p}_{\leftarrow i}(Y) }{ \sum_j c_j \hat{p}_{\leftarrow j}(Y) } \\\\
W_Y &= W_X \times J_i \\\\
\omega_i &= m_i(Y) \times \hat{p}_{\leftarrow i}(Y) \times W_Y
\end{aligned}
$$

최종적으로 선택된 경로 샘플 $Y_S$ 에 대한 UCW

$$ W_S = \frac{ 1 }{ \hat{p}(Y_S) } \sum \omega_i $$

## Jacobian

$$ 
J = 
\frac
{ \big[ \text{Pick } \mathbf{x}_k | \mathbf{y}_{k-2} \rightarrow \mathbf{y}_{k-1} \big] }
{ \big[ \text{Pick } \mathbf{x}_k | \mathbf{x}_{k-2} \rightarrow \mathbf{x}_{k-1} \big] } \times
\frac{ | \hat{\mathbf{n}}_k \cdot \hat{\omega}_y | }{ | \hat{\mathbf{n}}_k \cdot \hat{\omega}_x | } \times
\frac{ (\mathbf{x}_k - \mathbf{x}_{k-1})^2 }{ (\mathbf{x}_k - \mathbf{y}_{k-1})^2 } \times
\frac{ \big[ \text{Pick } \mathbf{x}_{k+1} | \mathbf{y}_{k-1} \rightarrow \mathbf{x}_k \big] }{ \big[ \text{Pick } \mathbf{x}_{k+1} | \mathbf{x}_{k-1} \rightarrow \mathbf{x}_k \big] }
$$

Init Pass 에서 $J_{\mathbf{x}}$ 미리 계산.

$$
J_{\mathbf{x}} = 
\big[ \text{Pick } \mathbf{x}_k | \mathbf{x}_{k-2} \rightarrow \mathbf{x}_{k-1} \big] \times
\big[ \text{Pick } \mathbf{x}_{k+1} | \mathbf{x}_{k-1} \rightarrow \mathbf{x}_k \big] \times
| \hat{\mathbf{n}}_k \cdot \hat{\omega}_{\mathbf{x}} | \times
\frac{ 1 }{ (\mathbf{x}_k - \mathbf{x}_{k-1})^2 }
$$

Reuse Pass 에서 $J_{\mathbf{y}}$ 만 계산.

$$
J_{\mathbf{y}} = 
\big[ \text{Pick } \mathbf{x}_k | \mathbf{y}_{k-2} \rightarrow \mathbf{y}_{k-1} \big] \times
\big[ \text{Pick } \mathbf{x}_{k+1} | \mathbf{y}_{k-1} \rightarrow \mathbf{x}_k \big] \times
| \hat{\mathbf{n}}_k \cdot \hat{\omega}_{\mathbf{y}} | \times
\frac{ 1 }{ (\mathbf{x}_k - \mathbf{y}_{k-1})^2 }
$$

정확한 Jacobian 계산 가능.

$$ J = \frac{ J_{\mathbf{y}} }{ J_{\mathbf{x}} } $$

여기서 $\big[ \text{Pick } \mathbf{x}_k | \mathbf{x}_{k-2} \rightarrow \mathbf{x}_{k-1} \big]$ 과 같은 항들은 "실제 경로를 생성한 전략의 단일 PDF" 값이다.
