
//==========================================================================
//Data Structures ==========================================================
//==========================================================================

// Uniforms : (b0) UniformsBuffer에 저장된 정보들 [16Byte Alignment]
struct Uniforms
{
    TextureSize                     : vec2<u32>,
    MAX_BOUNCE                      : u32,
    SAMPLE_PER_PIXEL                : u32,

    ViewProjectionMatrix_Inverse    : mat4x4<f32>,

    CameraWorldPosition             : vec3<f32>,
    FrameIndex                      : u32,

    InstancesCount                  : u32,
};

// Instance : (b1) InstancesBuffer에 저장된 정보들 [16Byte Alignment]
struct Instance
{
    ModelMatrix         : mat4x4<f32>,
    ModelMatrix_Inverse : mat4x4<f32>,

    BVHRootIndex        : u32,
};

// BVH : (b2) BVHBuffer에 저장된 정보들 [16Byte Alignment]
struct BVH
{
    Boundary_Min    : vec3<f32>,
    PrimitiveCount  : u32,
    Boundary_Max    : vec3<f32>,
    PrimitiveOffset : u32
};

/** 
    BVH 구조?

    Internal Node의 경우 :
    PrimitiveCount = 0 | Left Child = this.Index + 1 | Right Child = PrimitiveOffset

    Leaf Node의 경우 :
    PrimitiveBuffer의 [PrimitiveOffset, PrimitiveOffset + PrimitiveCount) 구간의 Primitive 커버
*/

// SubMesh : (b3) SubMeshesBuffer에 저장된 정보들 [16Byte Alignment]
struct SubMesh
{
    MaterialIndex: u32,
};

// Material: (b4) MaterialsBuffer에 저장된 정보들 [16Byte Alignment]
struct Material
{
    BaseColor: vec4<f32>,
    EmissiveColor: vec3<f32>,
    Metalic: f32,

    Roughness: f32,
    IOR: f32,
    NormalScale: f32,

    TextureIndex_BaseColor: i32,
    TextureIndex_EmissiveColor: i32,
    TextureIndex_Normal: i32,
    TextureIndex_ORM: i32,
};


//==========================================================================
//GPU Bindings =============================================================
//==========================================================================

@group(0) @binding(0) var<uniform> UniformsBuffer           : Uniforms;

@group(0) @binding(1) var<storage, read> InstancesBuffer    : array<Instance>;
@group(0) @binding(2) var<storage, read> BVHBuffer          : array<BVH>;
@group(0) @binding(3) var<storage, read> SubMeshesBuffer    : array<SubMesh>;
@group(0) @binding(4) var<storage, read> MaterialsBuffer    : array<Material>;
@group(0) @binding(5) var<storage, read> VerticesBuffer     : array<vec3<f32>>;
@group(0) @binding(6) var<storage, read> NormalsBuffer      : array<vec3<f32>>;
@group(0) @binding(7) var<storage, read> UVsBuffer          : array<vec2<f32>>;
@group(0) @binding(8) var<storage, read> TangentsBuffer     : array<vec4<f32>>;
@group(0) @binding(9) var<storage, read> IndicesBuffer      : array<u32>;
@group(0) @binding(10) var<storage, read> PrimitiveToSubMesh : array<u32>;

@group(0) @binding(11)  var MaterialSampler                  : sampler;
// @group(0) @binding(9)  var TexturePool_BaseColor            : binding_array<texture_2d<f32>, MAX_BASE_COLOR_TEXTURES>;
// @group(0) @binding(10) var TexturePool_EmissiveColor        : binding_array<texture_2d<f32>, MAX_BASE_COLOR_TEXTURES>; 
// @group(0) @binding(11) var TexturePool_Normal               : binding_array<texture_2d<f32>, MAX_BASE_COLOR_TEXTURES>; 
// @group(0) @binding(12) var TexturePool_ORM                  : binding_array<texture_2d<f32>, MAX_BASE_COLOR_TEXTURES>;

@group(0) @binding(12) var SceneTexture                     : texture_2d<f32>;
@group(0) @binding(13) var AccumTexture                     : texture_storage_2d<rgba32float, write>;

//==========================================================================
//Functions ================================================================
//==========================================================================



//==========================================================================
//Shader Main ==============================================================
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    let PixelUV: vec2<u32> = ThreadID.xy;

    // 유효하지 않은 Pixel은 건너뜀
    {
        let bPixelInBoundary_X: bool = (PixelUV.x < UniformsBuffer.TextureSize.x);
        let bPixelInBoundary_Y: bool = (PixelUV.y < UniformsBuffer.TextureSize.y);

        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }


    
    // TEST : 초록색으로 색칠하기
    {
        let color: vec3<f32> = vec3<f32>(1.0,1.0,1.0);
        textureStore(AccumTexture, vec2<i32>(i32(ThreadID.x), i32(ThreadID.y)), vec4<f32>(color.rgb, 1.0));
    }

    return;
}