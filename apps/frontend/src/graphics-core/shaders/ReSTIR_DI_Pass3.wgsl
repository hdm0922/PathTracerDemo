//==========================================================================
// Data Structures
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

    PrevViewProjectionMatrix        : mat4x4<f32>,
};

struct Instance
{
    ModelMatrix : mat4x4<f32>,
    MeshID      : u32,
};

struct MeshDescriptor
{
    Offset_Vertex      : u32,
    Offset_Index       : u32,
    Offset_Material    : u32,
    Offset_SubBlasRoot : u32,
    Offset_Blas        : u32,
    Count_SubMesh      : u32,
};

struct Vertex
{
    Position : vec3<f32>,
    Normal   : vec3<f32>,
    UV       : vec2<f32>,
};

struct Triangle
{
    Vertex_0 : vec3<f32>,
    Vertex_1 : vec3<f32>,
    Vertex_2 : vec3<f32>,
};

//==========================================================================
// Constants
//==========================================================================

const STRIDE_INSTANCE   : u32 = 33u;
const STRIDE_DESCRIPTOR : u32 =  6u;
const STRIDE_VERTEX     : u32 =  8u;

//==========================================================================
// GPU Bindings
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer       : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer         : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer      : array<u32>;

@group(0) @binding(10) var G_Buffer              : texture_2d<f32>;
@group(0) @binding(11) var ReservoirTexture_Prev : texture_2d<f32>;   // prev frame (read)
@group(0) @binding(12) var ReservoirTexture_Read : texture_2d<f32>;   // current frame (input)

@group(1) @binding(10) var ReservoirTexture      : texture_storage_2d<rgba32float, write>; // output

//==========================================================================
// Helpers: Scene / Mesh
//==========================================================================

fn GetInstance(InstanceID : u32) -> Instance
{
    let offset      : u32      = STRIDE_INSTANCE * InstanceID;
    var inst        : Instance = Instance();

    inst.ModelMatrix = mat4x4<f32>(
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[offset +  0u], SceneBuffer[offset +  1u], SceneBuffer[offset +  2u], SceneBuffer[offset +  3u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[offset +  4u], SceneBuffer[offset +  5u], SceneBuffer[offset +  6u], SceneBuffer[offset +  7u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[offset +  8u], SceneBuffer[offset +  9u], SceneBuffer[offset + 10u], SceneBuffer[offset + 11u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[offset + 12u], SceneBuffer[offset + 13u], SceneBuffer[offset + 14u], SceneBuffer[offset + 15u]))
    );

    inst.MeshID = SceneBuffer[offset + 32u];

    return inst;
}

fn GetOffset_Vertex(meshID : u32) -> u32 {
    let offset : u32 = UniformBuffer.Offset_MeshDescriptorBuffer + (STRIDE_DESCRIPTOR * meshID);
    return SceneBuffer[offset + 0u];
}

fn GetOffset_Index(meshID : u32) -> u32 {
    let offset : u32 = UniformBuffer.Offset_MeshDescriptorBuffer + (STRIDE_DESCRIPTOR * meshID);
    return SceneBuffer[offset + 1u];
}

fn GetVertex(offsetVertex : u32, vertexID : u32) -> vec3<f32>
{
    let offset : u32 = offsetVertex + (STRIDE_VERTEX * vertexID);
    let pos    : vec3<f32> = bitcast<vec3<f32>>(
        vec3<u32>(
            GeometryBuffer[offset + 0u],
            GeometryBuffer[offset + 1u],
            GeometryBuffer[offset + 2u]
        )
    );
    return pos;
}

fn GetTriangle(offsetIndex : u32, offsetVertex : u32, primitiveID : u32) -> Triangle
{
    let base   : u32 = UniformBuffer.Offset_IndexBuffer + offsetIndex;
    var tri    : Triangle;

    let v0 : u32 = GeometryBuffer[base + (3u * primitiveID) + 0u];
    let v1 : u32 = GeometryBuffer[base + (3u * primitiveID) + 1u];
    let v2 : u32 = GeometryBuffer[base + (3u * primitiveID) + 2u];

    tri.Vertex_0 = GetVertex(offsetVertex, v0);
    tri.Vertex_1 = GetVertex(offsetVertex, v1);
    tri.Vertex_2 = GetVertex(offsetVertex, v2);

    return tri;
}

fn TransformVec3WithMat4x4(v: vec3<f32>, m: mat4x4<f32>) -> vec3<f32>
{
    let t : vec4<f32> = m * vec4<f32>(v, 1.0);
    return t.xyz / t.w;
}

fn GetTriangleWorldSpace(modelMatrix : mat4x4<f32>, triLocal : Triangle) -> Triangle
{
    var tri : Triangle;
    tri.Vertex_0 = TransformVec3WithMat4x4(triLocal.Vertex_0, modelMatrix);
    tri.Vertex_1 = TransformVec3WithMat4x4(triLocal.Vertex_1, modelMatrix);
    tri.Vertex_2 = TransformVec3WithMat4x4(triLocal.Vertex_2, modelMatrix);
    return tri;
}

fn GetTriangleFromPrimitive(primitiveID : u32, instanceID : u32) -> Triangle
{
    let inst          : Instance = GetInstance(instanceID);
    let offsetVertex  : u32     = GetOffset_Vertex(inst.MeshID);
    let offsetIndex   : u32     = GetOffset_Index(inst.MeshID);

    let triLocal      : Triangle = GetTriangle(offsetIndex, offsetVertex, primitiveID);
    let triWorld      : Triangle = GetTriangleWorldSpace(inst.ModelMatrix, triLocal);
    return triWorld;
}

//==========================================================================
// RNG
//==========================================================================

fn GetHashValue(seed : u32) -> u32
{
    let state = seed * 747796405u + 2891336453u;
    let word  = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn Random(pSeed : ptr<function, u32>) -> f32
{
    let hash = GetHashValue(*pSeed);
    *pSeed = hash;
    return f32(hash) / 4294967295.0;
}

//==========================================================================
// Reprojection: 현재 픽셀 → 이전 프레임 스크린 좌표
//  - 실패 시 vec2<i32>(-1, -1) 리턴
//==========================================================================

fn GetPrevScreenPx(curPixel : vec2<u32>) -> vec2<i32>
{
    let gbuf : vec4<f32> = textureLoad(G_Buffer, vec2<i32>(curPixel), 0);

    // bit-packed valid/instance/material
    let packed_r  : u32 = bitcast<u32>(gbuf.r);
    let valid     : bool = (packed_r & 0x80000000u) != 0u;
    if (!valid) {
        return vec2<i32>(-1, -1);
    }

    // barycentric
    let alpha : f32 = gbuf.b;
    let beta  : f32 = gbuf.a;
    let gamma : f32 = 1.0 - alpha - beta;

    // primitive ID (Pass2에서 bitcast<f32>(PrimitiveID)로 저장했다고 가정)
    let primitiveID : u32 = bitcast<u32>(gbuf.g);

    // instance ID (bit 16~30)
    let instanceID : u32 = (packed_r >> 16u) & 0x7FFFu;

    // 히트 포인트 월드 위치 복원
    let tri        : Triangle = GetTriangleFromPrimitive(primitiveID, instanceID);
    let hitPos     : vec3<f32> =
          tri.Vertex_0 * alpha
        + tri.Vertex_1 * beta
        + tri.Vertex_2 * gamma;

    // 이전 프레임 VP로 투영
    let prevClip   : vec4<f32> = UniformBuffer.PrevViewProjectionMatrix * vec4<f32>(hitPos, 1.0);

    // 카메라 뒤쪽이면 무효
    if (prevClip.w <= 0.0) {
        return vec2<i32>(-1, -1);
    }

    let prevNdc : vec3<f32> = prevClip.xyz / prevClip.w;

    // NDC가 [-1, 1] 범위 밖이면 무효
    if (any(prevNdc.xy < vec2<f32>(-1.0, -1.0)) ||
        any(prevNdc.xy > vec2<f32>( 1.0,  1.0))) {
        return vec2<i32>(-1, -1);
    }

    let prevScreen01 : vec2<f32> = prevNdc.xy * 0.5 + vec2<f32>(0.5, 0.5);
    let prevScreenPx : vec2<f32> = prevScreen01 * vec2<f32>(UniformBuffer.Resolution);

    var pi : vec2<i32> = vec2<i32>(prevScreenPx);
    let resi : vec2<i32> = vec2<i32>(UniformBuffer.Resolution);

    // 혹시 1.0에 걸려서 width/height가 나오는 경우를 대비해 clamp
    pi = clamp(pi, vec2<i32>(0, 0), resi - vec2<i32>(1, 1));

    return pi;
}

//==========================================================================
// Temporal Reservoir Update
//==========================================================================

fn UpdateReservoirTemporal(
    curPixel      : vec2<u32>,
    prevSampleID  : u32,
    prevWeight    : f32,
    prevConf      : u32,
) {
    let curCoords = vec2<i32>(curPixel);

    // 현재 프레임 리저버 (A) 읽기
    let curRes : vec4<f32> = textureLoad(ReservoirTexture_Read, curCoords, 0);
    var sampleID : u32 = u32(curRes.x);
    var W_sum    : f32 = curRes.y;
    var conf     : u32 = u32(curRes.z);

    let w_prev   : f32 = prevWeight;

    // TODO: 나중에는 w_prev를 p_hat_current / p_hat_prev 로 보정하는 게 ReSTIR 정석

    if (W_sum <= 0.0 && w_prev > 0.0) {
        // 현재 프레임 샘플이 없으면 이전 프레임 것을 그대로 사용
        sampleID = prevSampleID;
        W_sum    = w_prev;
        conf     = prevConf;
    } else if (w_prev > 0.0) {
        // 두 후보만 있는 reservoir sampling
        let new_w_sum = W_sum + w_prev;
        let p_change  = w_prev / new_w_sum;

        var seed : u32 = GetHashValue(
            curPixel.x * 1342u +
            curPixel.y * 4233u +
            UniformBuffer.FrameIndex * 21337u
        );
        let r = Random(&seed);

        if (r < p_change) {
            sampleID = prevSampleID;
        }

        W_sum = new_w_sum;

        // confidence는 단순 누적 + 클램프 (예: 255)
        conf  = min(conf + prevConf, 255u);
    }

    textureStore(
        ReservoirTexture,
        curCoords,
        vec4<f32>(
            f32(sampleID),
            W_sum,
            f32(conf),
            0.0
        )
    );
}

//==========================================================================
// Shader Main
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    let curPixel : vec2<u32> = ThreadID.xy;

    // 화면 밖 스레드 무시
    if (curPixel.x >= UniformBuffer.Resolution.x ||
        curPixel.y >= UniformBuffer.Resolution.y) {
        return;
    }

    // 1. 현재 픽셀의 히트를 이전 프레임으로 reprojection
    let prevPixel : vec2<i32> = GetPrevScreenPx(curPixel);

    // 2. 이전 프레임 리저버 읽기 (유효할 때만)
    var prevSampleID : u32 = 0u;
    var prevW_sum    : f32 = 0.0;
    var prevConf     : u32 = 0u;

    let resi : vec2<i32> = vec2<i32>(UniformBuffer.Resolution);

    if (all(prevPixel >= vec2<i32>(0, 0)) &&
        all(prevPixel <  resi)) {

        let prevRes : vec4<f32> = textureLoad(
            ReservoirTexture_Prev,
            prevPixel,
            0
        );
        prevSampleID = u32(prevRes.x);
        prevW_sum    = prevRes.y;
        prevConf     = u32(prevRes.z);
    }

    // 3. 현재 프레임 리저버(A)와 이전 프레임 후보(prev)를 합쳐서 B에 저장
    UpdateReservoirTemporal(
        curPixel,
        prevSampleID,
        prevW_sum,
        prevConf
    );
}
