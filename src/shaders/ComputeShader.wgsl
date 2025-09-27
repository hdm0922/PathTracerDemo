
//==========================================================================
//Data Structures ==========================================================
//==========================================================================

struct Uniforms
{
    Resolution                      : vec2<u32>,
    MAX_BOUNCE                      : u32,
    SAMPLE_PER_PIXEL                : u32,

    ViewProjectionMatrix_Inverse    : mat4x4<f32>,

    CameraWorldPosition             : vec3<f32>,
    FrameIndex                      : u32,

    Offset_MeshDescriptorBuffer     : u32,
    Offset_MaterialBuffer           : u32,
    Offset_PrimitiveBuffer          : u32,
    Offset_BlasBuffer               : u32,
};



struct Instance
{
    ModelMatrix         : mat4x4<f32>,
    ModelMatrix_Inverse : mat4x4<f32>,

    Padding_0           : vec3<u32>,
    MeshID              : u32,
};



struct MeshDescriptor
{
    BlasOffset      : u32,
    PrimitiveOffset : u32,
    VertexOffset    : u32,
    MaterialOffset  : u32,

    Padding_0       : vec3<u32>,
    TextureOffset   : u32,
};



struct Material
{
    BaseColor           : vec4<f32>,
    EmissiveColor       : vec3<f32>,
    EmissiveIntensity   : f32,

    Metalness           : f32,
    Roughness           : f32,
    BlendMode           : u32,   // OPAQUE: 0, MASK: 1, BLEND: 2
    OpacityMask         : f32,   // AlphaCutOff Value For MASK Mode

    NormalScale         : vec2<f32>,
    IOR                 : f32,
    Padding_0           : u32,

    BaseColorTextureID      : u32,
    ORMTextureID            : u32,
    EmissiveTextureID       : u32,
    NormalTextureID         : u32,
};



struct Vertex
{
    Position: vec3<f32>,
    Padding_0: u32,

    Normal: vec3<f32>,
    Padding_1: u32,

    UV: vec2<f32>,
    Padding_2: vec2<u32>
};



struct Primitive
{
    Index: vec3<u32>,
    MaterialID: u32,
};



struct BVHNode
{
    Boundary_Min    : vec3<f32>,
    PrimitiveCount  : u32,

    Boundary_Max    : vec3<f32>,
    PrimitiveOffset : u32
};

//==========================================================================
//GPU Bindings =============================================================
//==========================================================================

@group(0) @binding(0) var<uniform> UniformsBuffer : Uniforms;

@group(0) @binding(1) var<storage, read> SceneBuffer    : array<u32>;
@group(0) @binding(2) var<storage, read> GeometryBuffer : array<u32>;
@group(0) @binding(3) var<storage, read> AccelBuffer    : array<u32>;

@group(0) @binding(10) var SceneTexture : texture_2d<f32>;
@group(0) @binding(11) var AccumTexture : texture_storage_2d<rgba32float, write>;

//==========================================================================
// Functions ===============================================================
//==========================================================================


//==========================================================================
//Shader Main ==============================================================
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{

    //유효하지 않은 Pixel은 건너뜀
    {
        let bPixelInBoundary_X: bool = (ThreadID.x < UniformsBuffer.Resolution.x);
        let bPixelInBoundary_Y: bool = (ThreadID.y < UniformsBuffer.Resolution.y);

        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }

    // TEMP 
    {
        let x0 = UniformsBuffer.Resolution;
        let x1 = SceneBuffer[0];
        let x2 = GeometryBuffer[0];
        let x3 = AccelBuffer[0];
        let x4 = textureLoad(SceneTexture, vec2<u32>(0,0), 0);
    }

    // Test Code
    let ResultColor: vec3<f32> = vec3<f32>(f32(ThreadID.x) / f32(UniformsBuffer.Resolution.x), f32(ThreadID.y) / f32(UniformsBuffer.Resolution.y), 0.0);
    textureStore(AccumTexture, vec2<i32>(i32(ThreadID.x), i32(ThreadID.y)), vec4<f32>(ResultColor.rgb, 1.0));

    return;
}