# ReSTIR Pipeline

ReSTIR (Reservoir-based SpatioTemporal importance Resampling) 는 수많은 경로들과 광원들을 모두 추적하지 않고, 

좋은 품질의 샘플을 시/공간적으로 재사용해 무거운 PathTracing 의 수렴을 제한된 시간으로 낮추는 알고리즘이다.

## Reservoir

ReSTIR 는 수많은 샘플들을 여러 곳에서 가져온다. 

씬 정보로부터 얻는 Candidate Sample, 이전 Frame, 이웃 Pixel 등 다양한 출처의 샘플들이 순차적으로 섞인다.

이 마구잡이로 모인 샘플들을 토대로 RIS 를 수행, 최종 Sample 을 선택해야 한다.

하지만 이 모든 샘플들을 각 Pixel이 전부 가지고 다니며 모두 모일 때까지 두기에는 메모리 오버헤드가 너무 크다.

따라서 ReSTIR 는 Reservoir 구조를 사용해 "현재까지 들어온 모든 Sample 들의 RIS 결과" 하나를 저장하도록 한다.

C 로 표현한 Reservoir 의 간단한 구조는 아래와 같다.

```
struct Reservoir
{
    Sample X;
    float w_sum;
}

void Update(Reservoir* pReservoir, Sample X_S, float W_S)
{
    float Pr_Change = W_S / (W_S + pReservoir->w_sum);

    if ( Random() < Pr_Change ) pReservoir->X = X_S;

    pReservoir->w_sum += W_S;

    return;
}
```

---

이 구조가 어떻게 M개의 Candidate Sample 들의 RIS 결과를 저장할 수 있는지를 살펴보자.

Candidate Sample Set 과 가중치들을 각각

$$ \Big[ X_1, X_2, ... , X_M \Big] $$

$$ \Big[ \omega_1, \omega_2, ... , \omega_M \Big] $$

으로 두자.

$k$번째 샘플 $X_k$ 가 뽑힐 확률은 수학적으로 깔끔하게 정의된다.

$$ \text{Pr}(\text{choose } k) = \frac{ \omega_k }{ \sum_{i=1}^M \omega_i } $$

Reservoir 를 사용한 구조에서는, $\text{Pr}(\text{choose } k)$ 를 다음으로 계산한다:

$$ \text{Pr}(\text{choose } k) = \Big[ \text{Select } X_k \Big| k \Big] \times \prod_{t = k+1}^M \Big[ \text{Discard } X_t \Big| t \Big] $$

$k$ 번째 시도에서는 $X_k$를, $(k+1)$ 부터 $M$ 번째 시도까지 모두 $X_k$를 선택할 확률이다.

$$
\begin{aligned}
\Big[ \text{Select } X_k \Big| k \Big] &= \frac{ \omega_k }{ \sum_{i=1}^k \omega_i } \\
\Big[ \text{Discard } X_t \Big| t \Big] &= 1 - \frac{ \omega_t }{ \sum_{i=1}^t \omega_i } = \frac{ \sum_{i=1}^{t-1} \omega_i }{ \sum_{i=1}^t \omega_i }
\end{aligned}
$$

따라서 $\text{Pr}(\text{choose } k)$ 는

$$ \text{Pr}(\text{choose } k) = \frac{ \omega_k }{ \sum_{i=1}^k \omega_i } \times \frac{ \sum_{i=1}^{k} \omega_i }{ \sum_{i=1}^{k+1} \omega_i } \times ... \times \frac{ \sum_{i=1}^{M-1} \omega_i }{ \sum_{i=1}^M \omega_i } = \frac{ \omega_k }{ \sum_{i=1}^M \omega_i } $$

로, Reservoir 를 사용하지 않은 이론적 확률과 동일하다.

Reservoir 의 사용은 RIS Sampling 을 왜곡시키지 않는다.

## ReSTIR Direct Illumination

ReSTIR 의 아이디어는 "시/공간적으로 좋은 샘플을 재활용" 이다.

가장 가볍게 이 아이디어를 보일 수 있는 작업이 Monte-Carlo Path Tracer 의 "Direct Light" 를 샘플링하는 것이다.

최종 구현체인 ReSTIR PT 는 Shift Mapping, Jacobian, Path Tree 등 성가신 개념이 동시다발적으로 등장하기에, 

이들을 전혀 고려할 필요가 없는 ReSTIR DI는 ReSTIR 파이프라인의 동작 과정을 가볍게 설계하는 "Scaffolding" 과 같다.

자세한 이야기에 앞서, Rendering Equation 의 Direct Light 항을 다시 살펴보자.

$$
\int_{\mathrm{Light}} 
\text{BSDF}(\mathbf{x}, {\hat{\omega}}_i, {\hat{\omega}}_o) 
L_{\mathrm{emit}}(\mathbf{x}', -{\hat{\omega}}_i) 
V(\mathbf{x}' \leftrightarrow \mathbf{x}) 
G(\mathbf{x}' \leftrightarrow \mathbf{x}) 
dA
$$

Direct Light 의 경우는 Pixel $\rightarrow$ Surface $\rightarrow$ Light 경로만을 다룬다. 즉 이 경로를 $[\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow X_L]$ 로 표기해 적분을 다시 작성하면

$$
\int_{\mathrm{Light}} 
\text{BSDF}(\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow X_L) 
L_{\mathrm{emit}}( X_L \rightarrow \mathbf{x}_1 ) 
V(\mathbf{x}_1 \leftrightarrow X_L) 
G(\mathbf{x}_1 \leftrightarrow X_L) 
dA
$$

ReSTIR DI 의 구현에서 Target Function 은 이 모든 항들을 그대로 사용하는 것을 권장한다.

$$ \hat{p}(X_L) = f(X_L ; \mathbf{x}_0, \mathbf{x}_1) $$

$$ f(X_L ; \mathbf{x}_0, \mathbf{x}_1) = \text{BSDF}(\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow X_L) 
L_{\mathrm{emit}}( X_L \rightarrow \mathbf{x}_1 ) 
V(\mathbf{x}_1 \leftrightarrow X_L) 
G(\mathbf{x}_1 \leftrightarrow X_L) 
$$

Target Function $\hat{p}(\mathbf{x})$ 를 구했으니, 모든 Sample Set 의 MIS, Resampling Weight 를 알맞게 결정할 수 있을 터이다.

(주의 : 정의된 $\hat{p}(\mathbf{x})$ 의 자료형은 Vec3 이므로 $\hat{p}(\mathbf{x})$ 을 그대로 사용할 수 없다.

따라서 적당한 Scalar Proxy $\text{Luminance}(\hat{p}(\mathbf{x}))$ 를 실제 구현에 사용할 것이다.)

ReSTIR DI 는 총 4개의 순차적인 Pass 를 정의한다.

### GPU Buffers / Textures
---

ReSTIR DI 렌더러에서 관리하는 GPU Buffer / Texture 들이다.

+ SceneBuffers : 모든 씬의 정보를 담고있는 GPUBuffer. 상세한 구현체는 SceneBuffer / GeometryBuffer / AccelBuffer 로 나뉜다.

+ LightBuffer : 모든 광원의 정보를 담고있는 GPUBuffer

+ MotionVectorBuffer : 이전 Frame 과 현재 Frame 간 변환 정보를 담고있는 GPUTexture

+ G-Buffer : 각 Pixel의 First Hit Surface 정보를 담고있는 GPUTexture

+ ReservoirBuffer : 각 Pixel 이 관리하는 Reservoir 데이터를 저장하는 GPUTexture

+ FinalColorTexture : 현재 Frame 의 최종 색상(Direct Light)을 저장하는 GPUTexture

### Pre Pass 1 | Initialize G-Buffer
---

Input : SceneBuffers

Output : G-Buffer

Monte-Carlo Path Tracer 에서 했던 것 처럼 Ray(Camera $\rightarrow$ Pixel) 를 만들고 각 Thread 가 처음 충돌하는 표면의 정보를 G-Buffer에 작성한다.

```
// In Buffers
var<Buffer, read> SceneBuffers;

// Out Buffers
var<Texture, write> G_Buffer;

// Shader Entry
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    if (!In_Boundary(ThreadID.xy)) { return; }

    let CameraRay       : Ray       = CreateCameraRay(ThreadID.xy);
    let FirstHitInfo    : HitInfo   = TraceRay(CameraRay);
    let HitMaterial     : Material  = GetMaterial(FirstHitInfo);

    // First Hit Info 로부터 필요한 데이터들을 G_Buffer 에 작성
    {
        let Position    : vec3<f32> = ... ;
        let Depth       : f32       = ... ;
        let Normal      : vec3<f32> = ... ;
        let ValidHit    : f32       = ... ;

        let Albedo      : vec3<f32> = ... ;
        let Roughness   : f32       = ... ;
        let Emissive    : vec3<f32> = ... ;
        let Metalness   : f32       = ... ;

        textureStore(G_Buffer, ... );
    }

    return;
}
```
### Pre Pass 2 | Compute Motion Vector
---
Input : G-Buffer

Output : MotionVectorBuffer

각 Thread는 G-Buffer 값으로부터 현재 Pixel 의 HitSurface 가 이전 Frame 의 어느 Pixel 에 있었는가 계산해 Motion Vector 에 저장한다.

// 추후 완성할 예정

### Pass 1 | Generate Initial Candidates
---
Input : G-Buffer, SceneBuffers, LightBuffer

Output : ReservoirBuffer

LightBuffer 로부터 M개의 Light Sample 을 추출한다. 이 때 각 Light Sample 의 Resampling Weight 는

$$ \omega_i = \frac{ m_i(X_i) }{ p(X_i) } \hat{p}(X_i) = \frac{ 1 }{ M } \times \frac{ 1 }{ p(X_i) } \times \hat{p}(X_i) $$

이다. 이들을 모두 Reservoir 에 넣어 최종 Light Sample 을 얻는다. 선택된 $X_L$ 의 UCW 를 추가로 계산해 저장한다.

$$ W_{X_L} = \frac{ 1 }{ \hat{p}(X_L) } \sum_{i = 1}^M \omega_i $$

```
// In Buffers
var<Texture, read> G_Buffer;
var<Buffer,  read> SceneBuffers; // Visibility Term
var<Buffer,  read> LightBuffer;

// Out Buffers
var<Texture, write> ReservoirBuffer;

// Shader Entry
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    if (!In_Boundary(ThreadID.xy)) { return; }


    var Reservoir_Result : Reservoir = Reservoir();

    // M 개의 Light Sample 을 추출, WRS 수행
    {
        let MIS_Weight : f32 = 1.0 / M;

        for (var i = 0; i < M; i++)
        {
            let SampleID    : u32 = SampleLight(Random());
            let Pr_Light    : f32 = GetProbability(LightSampleID);
            let RIS_Weight  : f32 = MIS_Weight * p_hat(LightSampleID) / Pr_Light;
            let Confidence  : u32 = 1u;

            UpdateReservoir(&Reservoir_Result, LightSampleID, RIS_Weight, Confidence);
        }

        Reservoir_Result.UCW = Reservoir_Result.w_sum / p_hat( Reservoir_Result.SampleID );
    }
    
    // 최종 Reservoir를 Texture에 작성
    {
        let SampleID    : u32 = ... ;
        let Confidence  : u32 = ... ;
        let UCW         : f32 = ... ;

        textureStore(ReservoirBuffer, ... );
    }

    return;
}

```

### Pass 2 | Temportal Reuse
---
Input : ReservoirBuffer_Prev, ReservoirBuffer_Cur, MotionVectorBuffer, G-Buffer, SceneBuffers

Output : ReservoirBuffer_Cur (New)

현재 Frame 과 이전 Frame 의 두 Light Sample 을 구한다.

1. ReservoirBuffer_Cur [ CurrentPixel ]
2. ReservoirBuffer_Prev [ CurrentPixel - MotionVector ] (유효한 경우만)

이 둘은 서로 다른 PDF 로부터 샘플링됐으므로, MIS Weight 는 Generalized Balance Heuristic 을 사용해야 한다.

특히 각 Reservoir 는 Initial Sample 이 아닌, 일정 수 이상의 Sample 들이 쌓여있는 Reservoir 이다.

따라서 MIS Weight 에 각 Sample 들의 Confidence 를 추가적으로 고려해야 한다.

$$ m_i(X_i) = \frac{ c_i \hat{p}_i(X_i) }{ \sum_{j = 1}^2 c_j \hat{p}_j(X_i) } $$

각 Reservoir 가 갖는 Target Function 은 아래와 같다 :

$$ \hat{p}_{\text{cur}}(\mathbf{x}) = \hat{p}(\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow \mathbf{x}) $$
$$ \hat{p}_{\text{prev}}(\mathbf{x}) = \hat{p}(\mathbf{x}_0' \rightarrow \mathbf{x}_1' \rightarrow \mathbf{x}) $$

RIS Weight 도 그대로 정의할 수 있다 :

$$ \omega_i = m_i(X_i) \hat{p}_{\text{cur}}(X_i) W_{X_i} $$

```
// In Buffers
var<Texture, read> MotionVectorBuffer;
var<Texture, read> G_Buffer;
var<Texture, read> ReservoirBuffer_Prev;    // From Previous Frame
var<Texture, read> ReservoirBuffer_Cur;     // From Pass 1

var<Buffer,  read> SceneBuffers;            // Visibility Term

// Out Buffers
var<Texture, write> ReservoirBuffer;

// Shader Entry
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    if (!In_Boundary(ThreadID.xy)) { return; }

    let Reservoir_Result    : Reservoir = Reservoir();

    let Reservoir_Curr      : Reservoir = GetReservoir( ThreadID );
    let Reservoir_Prev      : Reservoir = GetReservoir( ThreadID - GetMotionVector(ThreadID) );

    // Current Frame Sample 삽입 (Reservoir_Curr)
    {
        let SampleID    : u32 = ... ;
        let Confidence  : u32 = ... ;

        let MIS_Weight  : f32 = ... ;
        let RIS_Weight  : f32 = ... ;

        UpdateReservoir(&Reservoir_Result, SampleID, RIS_Weight, Confidence);
    }

    // Previous Frame Sample 삽입 (Reservoir_Prev)
    {
        let SampleID    : u32 = ... ;
        let Confidence  : u32 = ... ;

        let MIS_Weight  : f32 = ... ;
        let RIS_Weight  : f32 = ... ;

        UpdateReservoir(&Reservoir_Result, SampleID, RIS_Weight, Confidence);
    }

    // 모든 Sample 들의 WRS 가 끝났기에 UCW 를 계산하고 Confidence 를 Capping
    {
        let UCW         : f32 = ... ;
        let Confidence  : u32 = ... ;

        Reservoir_Result.UCW        = UCW;
        Reservoir_Result.Confidence = Confidence;
    }

    // Result Reservoir 저장
    {
        let SampleID    : u32 = ... ;
        let Confidence  : u32 = ... ;
        let UCW         : f32 = ... ;

        textureStore(ReservoirBuffer, ... );
    }

    return;
}

```

### Pass 3 | Spacial Reuse
---

Input : ReservoirBuffer, G-Buffer, SceneBuffers

Output : ReservoirBuffer

현재 Pixel 기준으로, M개의 이웃 Pixel들을 선정한다.

가장 간단한 선정 방법은 현재 Pixel 을 중심으로 하는 정사각형을 정의, 난수를 발생시켜 픽셀을 얻는 방법이다.

( ReSTIR 는 Heuristic-Based Rejection 으로 성능을 끌어올리는 방법을 소개하지만, 첫 구현 단계에서는 난수 활용을 추천한다. )

이렇게 N개의 이웃 Sample 들을 얻었다면, 모두 Reservoir 에 넣으면 된다. MIS Weight, RIS Weight 의 정의는 모두 동일하다.

$$
\begin{aligned}
\hat{p}_j(\mathbf{x}) &= \hat{p}(\mathbf{x}_{0,j} \rightarrow \mathbf{x}_{1,j} \rightarrow \mathbf{x}) \\ \\
m_i(X_i) &= \frac{ c_i \hat{p}_i(X_i) }{ c_\text{cur} \hat{p}_\text{cur}(X_i) + \sum_{j = 1}^M c_j \hat{p}_j(X_i) } \\ \\
\omega_i &= m_i(X_i) \hat{p}_{\text{cur}}(X_i) W_{X_i}
\end{aligned}
$$

( ReSTIR 는 $O(M^2)$ 의 Generalized Balance Heuristic 대신 $O(M)$ 의 Pairwise MIS Weight 의 사용을 권장하지만, 구현이 먼저다. )

```
// In Buffers
var<Texture, read> G_Buffer;
var<Texture, read> ReservoirBuffer; // From Pass 2

var<Buffer,  read> SceneBuffers;    // Visibility Term

// Out Buffers
var<Texture, write> ReservoirBuffer_Final;

// Shader Entry
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    if (!In_Boundary(ThreadID.xy)) { return; }


    let CandidatePixels : array<u32, M + 1>; // U = Upper 16 bits | V = Lower 16 bits
    {
        CandidatePixels[0] = (ThreadID.x << 16) | ThreadID.y;

        for (var i = 1; i <= M; i++)
        {
            let Random_U : i32 = ... ;
            let Random_V : i32 = ... ;

            let CandidatePixel_U : u32 = ThreadID.x + Random_U;
            let CandidatePixel_V : u32 = ThreadID.y + Random_V;

            CandidatePixels[i] = (CandidatePixel_U << 16) | CandidatePixel_V;
        }

    }


    let RIS_Weights : array<f32, M + 1>;
    for (var i = 0; i <= M; i++)
    {
        let PixelUV_i   : vec2<u32> = vec2<u32>( CandidatePixels[i] & 0xffff0000, CandidatePixels[i] & 0x0000ffff );
        let Reservoir_i : Reservoir = GetReservoir(PixelUV_i);

        let MIS_Weight  : f32       = Compute_MIS_Weight(&CandidatePixels, i);
        let P_hat_i     : f32       = p_hat( Reservoir_i.SampleID );
        let UCW         : f32       = Reservoir_i.UCW;

        RIS_Weights[i] = MIS_Weight * P_hat_i * UCW
    }


    // 모든 Sample 들을 Result Reservoir 에 삽입
    let Reservoir_Result : Reservoir = Reservoir();
    for (var i = 0; i <= M; i++)
    {
        let PixelUV_i   : vec2<u32> = vec2<u32>( CandidatePixels[i] & 0xffff0000, CandidatePixels[i] & 0x0000ffff );
        let Reservoir_i : Reservoir = GetReservoir(PixelUV_i);

        let SampleID    : u32       = Reservoir_i.SampleID;
        let Confidence  : u32       = Reservoir_i.Confidence;
        let RIS_Weight  : f32       = RIS_Weights[i];

        UpdateReservoir(&Reservoir_Result, SampleID, RIS_Weight, Confidence);
    }

    // 모든 Sample 들의 WRS 가 끝났기에 UCW 를 계산하고 Confidence 를 Capping
    {
        let UCW         : f32 = ... ;
        let Confidence  : u32 = ... ;

        Reservoir_Result.UCW        = UCW;
        Reservoir_Result.Confidence = Confidence;
    }

    // Result Reservoir 저장
    {
        let SampleID    : u32 = ... ;
        let Confidence  : u32 = ... ;
        let UCW         : f32 = ... ;

        textureStore(ReservoirBuffer, ... );
    }

    return;
}

```

### Pass 4 | Final Shading

Input : ReservoirBuffer, G-Buffer, SceneBuffers

Output : FinalColorTexture

ReservoirBuffer 가 최종 Sample 을 갖고 있으니, 이 Sample 에 의한 최종 함숫값 $f(X_L)$를 구해 UCW 와 곱하면 된다.

$$ f(X_L ; \mathbf{x}_0, \mathbf{x}_1) = \text{BSDF}(\mathbf{x}_0 \rightarrow \mathbf{x}_1 \rightarrow X_L) 
L_{\mathrm{emit}}( X_L \rightarrow \mathbf{x}_1 ) 
V(\mathbf{x}_1 \leftrightarrow X_L) 
G(\mathbf{x}_1 \leftrightarrow X_L) 
$$

$$ \text{Color} = f(X_L) W_{X_L} $$

```
// In Buffers
var<Texture, read> G_Buffer;
var<Texture, read> ReservoirBuffer; // From Pass 3

var<Buffer,  read> SceneBuffers;    // Visibility Term

// Out Buffers
var<Texture, write> FinalColorTexture;

// Shader Entry
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    if (!In_Boundary(ThreadID.xy)) { return; }

    let Reservoir_Final : Reservoir = GetReservoir(ThreadID.xy);

    if (!IsValid(&Reservoir_Final)) { return; }

    let FinalColor : vec3<f32> = f( Reservoir_Final.SampleID ) * Reservoir_Final.UCW;
    textureStore(FinalColorTexture, ThreadID.xy, vec4<f32>(FinalColor, 1.0));

    return;
}

```