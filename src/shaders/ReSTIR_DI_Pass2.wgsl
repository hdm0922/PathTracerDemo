//==========================================================================
// Data Structures =========================================================
//==========================================================================

struct Uniform
{
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

    // 1. M개의 광원 추출
    for (var iter : u32 = 0u; iter < LIGHT_SAMPLE; iter++)
    {
        let SampledLightID  : u32   = SampleLight(Random(&RandomSeed));
        let LightSample     : Light = GetLight(SampledLightID);
        let LightArea       : f32   = select(1.0, LightSample.Area, LightSample.LightType == 2u);
        let P_Light         : f32   = LightCDFBuffer[SampledLightID] - select(LightCDFBuffer[SampledLightID-1], 0.0, SampledLightID == 0u);

        // TODO : BSDF 등 캡슐화 완벽하게 한 후 P_hat 계산식 작성하기
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