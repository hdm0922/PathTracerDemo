//==========================================================================
// Data Structures =========================================================
//==========================================================================

struct Uniform
{
    ViewProjectionMatrix_Inverse        : mat4x4<f32>,

    Resolution          : vec2<u32>,
    Offset_LightBuffer  : u32,
    LightSourceCount    : u32,

    FrameIndex          : u32,
};



struct Light
{
    Position    : vec3<f32>,
    LightType   : u32,

    Direction   : vec3<f32>,
    Intensity   : f32,

    Color       : vec3<f32>,
    Area        : f32,

    U           : vec3<f32>,
    V           : vec3<f32>,
};

struct Reservoir
{
    SampleID    :i32,
    w_sum       :f32,
    Confidence  :u32,
};


//==========================================================================
// Constants ===============================================================
//==========================================================================

const STRIDE_LIGHT : u32 = 18u;
const LIGHT_SAMPLE : u32 = 16u;

const PI : f32 = 3.141592;

//==========================================================================
// GPU Bindings ============================================================
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer   : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer     : array<u32>;
@group(0) @binding(2) var<storage, read>    LightCDFBuffer  : array<f32>;

@group(0) @binding(10) var G_PositionTexture    : texture_2d<f32>;
@group(0) @binding(11) var G_NormalTexture      : texture_2d<f32>;
@group(0) @binding(12) var G_AlbedoTexture      : texture_2d<f32>;
@group(0) @binding(13) var G_EmissiveTexture    : texture_2d<f32>;

@group(0) @binding(14) var ReservoirTexture     : texture_storage_2d<rgba32float, write>;

//==========================================================================
// Helpers =================================================================
//==========================================================================

fn GetLight(LightID : u32) -> Light
{
    let Offset      : u32   = UniformBuffer.Offset_LightBuffer + (STRIDE_LIGHT * LightID);
    var OutLight    : Light = Light();

    OutLight.Position       = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 0u], SceneBuffer[Offset + 1u], SceneBuffer[Offset + 2u]));
    OutLight.LightType      = SceneBuffer[Offset + 3u];

    OutLight.Direction      = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 4u], SceneBuffer[Offset + 5u], SceneBuffer[Offset + 6u]));
    OutLight.Intensity      = bitcast<f32>(SceneBuffer[Offset + 7u]);

    OutLight.Color          = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 8u], SceneBuffer[Offset + 9u], SceneBuffer[Offset + 10u]));
    OutLight.Area           = bitcast<f32>(SceneBuffer[Offset + 11u]);

    OutLight.U              = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u]));
    OutLight.V              = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 15u], SceneBuffer[Offset + 16u], SceneBuffer[Offset + 17u]));

    return OutLight;
}

fn SampleLight(Value : f32) -> u32
{
    var L : u32 = 0u;
    var R : u32 = UniformBuffer.LightSourceCount - 1u;
    var M : u32 = (L + R) >> 1;

    while (L < R)
    {
        if (Value < LightCDFBuffer[M]) { R = M; }
        else { L = M + 1; }

        M = (L + R) >> 1;
    }

    return M;
}

fn GetHashValue(Seed : u32) -> u32
{
    let state = Seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn Random(pSeed : ptr<function, u32>) -> f32
{
    let Hash = GetHashValue(*pSeed); *pSeed++;
    return f32(Hash) / 4294967295.0;
}

//==========================================================================
// Functions ===============================================================
//==========================================================================

fn GGXDistribution(NdotH : f32, Roughness : f32) -> f32
{
    let Alpha   : f32 = Roughness * Roughness;
    let Alpha2  : f32 = Alpha * Alpha;
    let X       : f32 = NdotH * NdotH * (Alpha2 - 1.0) + 1.0;
    let Denom   : f32 = PI * X * X;

    return Alpha2 / max(Denom, 1e-4);
}

fn GeometryShadow_Optimized(NdotV : f32, NdotL : f32, Roughness : f32) -> f32
{
    let R : f32 = Roughness + 1.0;
    let K : f32 = R * R / 8.0;

    return 1.0 / ((NdotV * (1.0 - K) + K) * (NdotL * (1.0 - K) + K));
}

fn Frensel(Dot : f32, F0: vec3<f32>) -> vec3<f32>
{
    return F0 + (1.0 - F0) * pow(1.0 - saturate(Dot), 5.0);
}

fn BRDF(N : vec3<f32>, L : vec3<f32>,V : vec3<f32>, ThreadID : vec2<u32>) -> vec3<f32>
{
    let H : vec3<f32> = normalize(L + V);

    let NdotV : f32 = max(dot(N, V), 0.0);
    let NdotL : f32 = max(dot(N, L), 0.0);
    let NdotH : f32 = max(dot(N, H), 0.0);
    let VdotH : f32 = max(dot(V, H), 0.0);

    let BaseColor       : vec3<f32> = textureLoad(G_AlbedoTexture, ThreadID, 0).xyz; // 일단 알베도값으로 넣었습니다
    let Metalness       : f32       = textureLoad(G_EmissiveTexture, ThreadID, 0).w;
    let Roughness       : f32       = textureLoad(G_AlbedoTexture, ThreadID, 0).w;
    //let Transmission    : f32       = HitMaterial.Transmission;   사용되지 않아 일단 주석처리

    let F0  : vec3<f32> = mix(vec3f(0.04), BaseColor, Metalness);
    let D   : f32       = GGXDistribution(NdotH, Roughness);
    let G0  : f32       = GeometryShadow_Optimized(NdotV, NdotL, Roughness);
    let F   : vec3<f32> = Frensel(VdotH, F0);

    let kS  : vec3<f32> = F;
    let kD  : vec3<f32> = (1.0 - kS) * (1.0 - Metalness);

    let BRDF_Diffuse    : vec3<f32> = (kD / PI) * BaseColor;
    let BRDF_Specular   : vec3<f32> = kS * D * G0 * 0.25;

    return BRDF_Diffuse + BRDF_Specular;
}

fn BTDF(N : vec3<f32>, L : vec3<f32>,V : vec3<f32>, ThreadID : vec2<u32>) -> vec3<f32>
{
    let Albedo      : vec3<f32> = textureLoad(G_AlbedoTexture, ThreadID, 0).xyz;
    let Roughness   : f32       = textureLoad(G_AlbedoTexture, ThreadID, 0).w;

    let bViewNormalSameHemisphere : bool = (dot(V, N) > 0.0);
    let n_in    : f32 = 1.0;  //select(1.0, HitMaterial.IOR, bViewNormalSameHemisphere);  일단 보류. IOR값이 넘어오지 않음
    let n_out   : f32 = 1.0;  //select(HitMaterial.IOR, 1.0, bViewNormalSameHemisphere);  일단 보류. IOR값이 넘어오지 않음
    let H_norm  : f32 = length(n_in * L + n_out * V);

    let BTDF_N  = select(-N, N, bViewNormalSameHemisphere);
    let H : vec3<f32> = (n_in * L + n_out * V) / H_norm;

    let NdotL : f32 = abs(dot(BTDF_N,L));
    let NdotV : f32 = abs(dot(BTDF_N,V));
    let NdotH : f32 = abs(dot(BTDF_N,H));
    let LdotH : f32 = abs(dot(L,H));
    let VdotH : f32 = abs(dot(V,H));

    let G0  : f32       = GeometryShadow_Optimized(NdotL, NdotV, Roughness);
    let D   : f32       = GGXDistribution(NdotH, Roughness);
    let nr  : f32       = (n_out - n_in) / (n_out + n_in);
    let F0  : vec3<f32> = vec3f(nr * nr);
    let F   : vec3<f32> = Frensel(LdotH, F0);

    let Numerator : vec3<f32> = n_out * n_out * (1.0 - F) * LdotH * VdotH * G0 * D * Albedo;
    let BTDFValue : vec3<f32> = Numerator / max(H_norm * H_norm, 1e-4);

    return BTDFValue;
}


fn calculate_x0(ThreadID : vec2<u32>) -> vec3<f32>{
    let PixelUV             : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution);
    let PixelNDC            : vec3<f32> = vec3<f32>(2.0 * PixelUV - 1.0, 0.0);

    let PixelClip_NearPlane : vec3<f32> = vec3<f32>(PixelNDC.xy, 0.0);

    let TransformedVector: vec4<f32> = UniformBuffer.ViewProjectionMatrix_Inverse * vec4<f32>(PixelClip_NearPlane, 1.0);
    return TransformedVector.xyz / TransformedVector.w;   
}

fn BSDF(x0 : vec3<f32>, x1 : vec3<f32>, x2 : vec3<f32>, ThreadID : vec2<u32>) -> vec3<f32>
{
    let L : vec3<f32> = x1-x2;  //x1->x2
    let V : vec3<f32> = x0-x1; //x1->x0 
    let T : f32 = 1.0;  //투명도. Transmission 값이 넘어오지 않음
    let N : vec3<f32> = textureLoad(G_NormalTexture, ThreadID.xy, 0).xyz; //표면에서의 normal

    if (dot(L, N) * dot(V, N) > 0.0) { return (1.0 - T) * BRDF(N, L, V, ThreadID); }
    return T * BTDF(N, L, V, ThreadID);
}

/*
DI만 반영하는 경우 V항은 제외

fn Visibility(Start : vec3<f32>, End : vec3<f32>) -> vec3<f32>
{
    var Transmittance   : vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    var Distance        : f32       = length(End - Start);
    let Direction       : vec3<f32> = (End - Start) / Distance;

    var CurrentRay      : Ray       = Ray(Start, Direction);
    var RemainDistance  : f32       = Distance;

    for (var iter = 0u; iter < 5u; iter++)
    {
        let ClosestHit : HitResult = TraceRay(CurrentRay);
        if (!ClosestHit.IsValidHit || ClosestHit.HitDistance > RemainDistance) { return Transmittance; }

        let HitMaterial : Material = GetMaterialFromHit(ClosestHit);
        if (HitMaterial.Transmission == 0.0) { return vec3<f32>(0.0, 0.0, 0.0); }

        Transmittance   *= HitMaterial.Albedo.rgb;
        RemainDistance  -= ClosestHit.HitDistance;
        CurrentRay       = Ray(ClosestHit.HitPoint, CurrentRay.Direction);
    }
    return vec3<f32>(0.0, 0.0, 0.0);
}
*/

fn CalculateP_hat(ThreadID: vec3<u32>, SampledLightID: u32) -> vec3<f32>
{
    var p_hat : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var RandomSeed : u32 = GetHashValue(ThreadID.x * 1342u + ThreadID.y * 4233u + SampledLightID * 911u);

    let LightSource     : Light     = GetLight(SampledLightID);
    let LightRadiance   : vec3<f32> = LightSource.Intensity * LightSource.Color;
    var BSDFValue           : vec3<f32>;
    var VisibilityFactor    : vec3<f32>;
    var Geometry            : f32;
    var InvPDF              : f32;

    let x0 : vec3<f32> = calculate_x0(ThreadID.xy);
    let x1 : vec3<f32> = textureLoad(G_PositionTexture, ThreadID.xy, 0).xyz;    //hit point

    let HitNormal : vec3<f32> = textureLoad(G_NormalTexture, ThreadID.xy, 0).xyz;

    if (LightSource.LightType == 0u) // Directional Light
    {
        let L   : vec3<f32> = -LightSource.Direction;
        let x2 : vec3<f32> = x1 + L * 1e11;
        BSDFValue           = BSDF(x0, x1, x2, ThreadID.xy); 
        VisibilityFactor    = vec3<f32>(1.0); //Visibility(x1, x2);
        Geometry            = max(dot(L, HitNormal), 0.0);
        InvPDF              = 1.0; // Sampling을 하지 않는다는 의미의 항등원 1.0
    }
    else if (LightSource.LightType == 1u) // Point Light
    {
        let x2 : vec3<f32>  = LightSource.Position;
        let D : f32         = length(x2 - x1);
        let L : vec3<f32>   = (x2 - x1) / D;
        
        BSDFValue           = BSDF(x0, x1, x2, ThreadID.xy);
        VisibilityFactor    = vec3<f32>(1.0); //Visibility(x1, x2);
        Geometry            = max(dot(L, HitNormal), 0.0) / (D * D);
        InvPDF              = 1.0; // Sampling을 하지 않는다는 의미의 항등원 1.0
    }
    else if (LightSource.LightType == 2u) // Rect Light
    {
        let Random_U : f32 = (Random(&RandomSeed) * 2.0) - 1.0;
        let Random_V : f32 = (Random(&RandomSeed) * 2.0) - 1.0;
        let x2 : vec3<f32> = LightSource.Position + (Random_U * LightSource.U) + (Random_V * LightSource.V);
        let D : f32         = length(x2 - x1);
        let L : vec3<f32>   = (x2 - x1) / D;
        BSDFValue           = BSDF(x0, x1, x2, ThreadID.xy);
        VisibilityFactor    = vec3<f32>(1.0); //Visibility(x1, x2);
        Geometry            = max(dot(-L, LightSource.Direction), 0.0) * max(dot(L, HitNormal), 0.0) / (D * D);
        InvPDF              = LightSource.Area;
    }
    p_hat += BSDFValue *VisibilityFactor * Geometry * InvPDF * LightRadiance;
    
    return p_hat;
}

fn UpdateReservoir(LightSampleID: u32, RIS_Weight: f32, Confidence: u32, ThreadID: vec2<u32>){
    //리졸버 버퍼가 텍스처 스토리지 버퍼라 vec4로 저장이 됨. SampleID랑 W_sum의 자료형이 달라 고민 필요 (일단 f32로 통일)
    var RandomSeed : u32 = GetHashValue(ThreadID.x * 1342u + ThreadID.y * 4233u + UniformBuffer.FrameIndex * 21337u);
    var SampleID : u32 = u32(textureLoad(ReservoirTexture, ThreadID).x);
    var W_sum = textureLoad(ReservoirTexture, ThreadID).y;
    let P_Change = RIS_Weight / (RIS_Weight + W_sum);

    if(Random(&RandomSeed) < P_Change){
        SampleID = LightSampleID;
    }
    textureStore(ReservoirTexture, ThreadID, vec4<f32>(f32(SampleID), W_sum+RIS_Weight, 0.0, 0.0));

}

//==========================================================================
// Shader Main =============================================================
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{

    // 0. 범위 밖 스레드는 계산 X
    {
        let bPixelInBoundary_X : bool = (ThreadID.x < UniformBuffer.Resolution.x);
        let bPixelInBoundary_Y : bool = (ThreadID.y < UniformBuffer.Resolution.y);

        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }

    var RandomSeed : u32 = GetHashValue(ThreadID.x * 1342u + ThreadID.y * 4233u + UniformBuffer.FrameIndex * 21337u);

    let MIS_Weight : f32 = 1.0 / LIGHT_SAMPLE;  //m_i, DI에서는 1/M으로 고정
    // 1. M개의 광원 추출
    for (var iter : u32 = 0u; iter < LIGHT_SAMPLE; iter++)
    {
        let SampledLightID  : u32   = SampleLight(Random(&RandomSeed));
        let LightSample     : Light = GetLight(SampledLightID);
        let LightArea       : f32   = select(1.0, LightSample.Area, LightSample.LightType == 2u);
        let P_Light         : f32   = LightCDFBuffer[SampledLightID] - select(LightCDFBuffer[SampledLightID-1], 0.0, SampledLightID == 0u);

        // TODO : BSDF 등 캡슐화 완벽하게 한 후 P_hat 계산식 작성하기
        let P_hat : vec3<f32> = CalculateP_hat(ThreadID, SampledLightID);
        let P_hat_luminance = dot(P_hat, vec3<f32>(0.2126, 0.7152, 0.0722));
        let RIS_Weight  : f32 = MIS_Weight * P_hat_luminance / P_Light;  //ω_i , W_X = 1/p(X)
        let Confidence  : u32 = 1u;

        UpdateReservoir(SampledLightID, RIS_Weight, Confidence);
    }

    if (false)
    {
        let x1 = SceneBuffer[0];
        let x2 = LightCDFBuffer[0];
        let x3 = textureLoad(G_PositionTexture, ThreadID.xy, 0);
        let x4 = textureLoad(G_NormalTexture, ThreadID.xy, 0);
        let x5 = textureLoad(G_AlbedoTexture, ThreadID.xy, 0);
        let x6 = textureLoad(G_EmissiveTexture, ThreadID.xy, 0);
        textureStore(ReservoirTexture, ThreadID.xy, vec4<f32>(0.0, 0.0, 0.0, 1.0));
    }
    // textureLoad(G_PositionTexture, ThreadID.xy, 0);


    return;
}