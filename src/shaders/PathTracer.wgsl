
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



struct Vertex
{
    Position: vec3<f32>,
    Padding_0: u32,

    Normal: vec3<f32>,
    Padding_1: u32,

    UV: vec2<f32>,
    Padding_2: vec2<u32>,

    Tangent: vec4<f32>,
};
//==========================================================================
//GPU Bindings =============================================================
//==========================================================================

@group(0) @binding(0) var<uniform> UniformsBuffer           : Uniforms;
@group(0) @binding(1) var<storage, read> InstancesBuffer    : array<Instance>;
@group(0) @binding(2) var<storage, read> BVHBuffer          : array<BVH>;
@group(0) @binding(3) var<storage, read> SubMeshesBuffer    : array<SubMesh>;
@group(0) @binding(4) var<storage, read> MaterialsBuffer    : array<Material>;
@group(0) @binding(5) var<storage, read> PrimitiveToSubMesh : array<u32>;
@group(0) @binding(6) var<storage, read> VerticesBuffer     : array<Vertex>;
@group(0) @binding(7) var<storage, read> IndicesBuffer      : array<u32>;
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

    //유효하지 않은 Pixel은 건너뜀
    {
        let bPixelInBoundary_X: bool = (ThreadID.x < UniformsBuffer.TextureSize.x);
        let bPixelInBoundary_Y: bool = (ThreadID.y < UniformsBuffer.TextureSize.y);
        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }

    // Buffer들 참조하는 쓰레기코드
    {
        let x1 = InstancesBuffer[0].ModelMatrix[1][1];
        let x2 = BVHBuffer[0].PrimitiveCount;
        let x3 = SubMeshesBuffer[0].MaterialIndex;
        let x4 = MaterialsBuffer[0];
        let x5 = VerticesBuffer[0];
        let x6 = IndicesBuffer[0];
        let x7 = PrimitiveToSubMesh[0];
    }

    // TEST : 초록색으로 색칠하기
    let ResultColor: vec3<f32> = vec3<f32>(f32(ThreadID.x) / 600.0, f32(ThreadID.y) / 450.0, 0.0);
    textureStore(AccumTexture, vec2<i32>(i32(ThreadID.x), i32(ThreadID.y)), vec4<f32>(ResultColor.rgb, 1.0));

    return;
}