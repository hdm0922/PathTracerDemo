//==========================================================================
// Data Structures =========================================================
//==========================================================================

struct Uniform
{
    Resolution                      : vec2<u32>,
    MAX_BOUNCE                      : u32,
    SAMPLE_PER_PIXEL                : u32,

    ViewProjectionMatrix_Inverse    : mat4x4<f32>,

    CameraWorldPosition             : vec3<f32>,
    FrameIndex                      : u32,

    Offset_MeshDescriptorBuffer     : u32,
    Offset_MaterialBuffer           : u32,
    Offset_LightBuffer              : u32,
    Offset_LightsCDFBuffer          : u32,

    Offset_IndexBuffer              : u32,
    Offset_SubBlasRootArrayBuffer   : u32,
    Offset_BlasBuffer               : u32,
    InstanceCount                   : u32,

    LightSourceCount                : u32,
};

struct CompactSurface
{
    InstanceID  : u32,
    MaterialID  : u32,
    PrimitiveID : u32,
    Barycentric : vec2<f32>,
}

//==========================================================================
// Constants ===============================================================
//==========================================================================

const STRIDE_INSTANCE   : u32 = 33u;
const STRIDE_LIGHT      : u32 = 18u;
const STRIDE_DESCRIPTOR : u32 =  6u;
const STRIDE_MATERIAL   : u32 = 15u;
const STRIDE_VERTEX     : u32 =  8u;
const STRIDE_BLAS       : u32 =  8u;

const PI : f32 = 3.141592;

//==========================================================================
// GPU Bindings ============================================================
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer   : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer     : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer  : array<u32>;
@group(0) @binding(3) var<storage, read>    AccelBuffer     : array<u32>;

@group(1) @binding(0) var G_Buffer      : texture_2d<f32>;
@group(1) @binding(1) var ResultTexture : texture_storage_2d<rgba32float, write>;

//==========================================================================
// Helpers =================================================================
//==========================================================================

fn GetCompactSurface(CompactSurfaceRawData : vec4<f32>) -> CompactSurface
{
    var OutCompactSurface       : CompactSurface    = CompactSurface();
    let InstanceID_MaterialID   : u32               = bitcast<u32>(CompactSurfaceRawData.r);

    OutCompactSurface.InstanceID    = ( InstanceID_MaterialID & 0xffff0000u );
    OutCompactSurface.MaterialID    = ( InstanceID_MaterialID & 0x0000ffffu );
    OutCompactSurface.PrimitiveID   = bitcast<u32>(CompactSurfaceRawData.g);
    OutCompactSurface.Barycentric   = vec2<f32>( CompactSurfaceRawData.b, CompactSurfaceRawData.a );

    return OutCompactSurface;
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

    var ResultColor : vec3<f32>;

    // 1. G_Buffer 값 읽어오기
    let G_Buffer_Raw    : vec4<f32>         = textureLoad(G_Buffer, ThreadID.xy, 0);
    let CSurface        : CompactSurface    = GetCompactSurface(G_Buffer_Raw);
    let IsNull          : bool              =  bool(CSurface.InstanceID & 0x80000000u );

    if ( IsNull )
    {
        ResultColor = vec3<f32>(0.0, 0.0, 0.0);
    }
    else
    {
        ResultColor = vec3<f32>(1.0, 0.0, 0.0);
    }

    textureStore(ResultTexture, ThreadID.xy, vec4<f32>(ResultColor, 1.0));

    return;
}