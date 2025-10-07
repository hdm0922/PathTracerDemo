//==========================================================================
// Data Structures From CPU ================================================
//==========================================================================

struct Uniform
{
    Resolution                          : vec2<u32>,
    MAX_BOUNCE                          : u32,
    SAMPLE_PER_PIXEL                    : u32,

    ViewProjectionMatrix_Inverse        : mat4x4<f32>,

    CameraWorldPosition                 : vec3<f32>,
    FrameIndex                          : u32,

    Offset_MeshDescriptorBuffer         : u32,
    Offset_MaterialBuffer               : u32,
    Offset_LightBuffer                  : u32,
    Offset_IndexBuffer                  : u32,

    Offset_PrimitiveToMaterialBuffer    : u32,
    Offset_BlasBuffer                   : u32,
    InstanceCount                       : u32,
    LightSourceCount                    : u32,
};



struct Instance
{
    ModelMatrix         : mat4x4<f32>,
    ModelMatrix_Inverse : mat4x4<f32>,

    MeshID              : u32,
};



struct MeshDescriptor
{
    BlasOffset                  : u32,
    VertexOffset                : u32,
    IndexOffset                 : u32,
    PrimitiveToMaterialOffset   : u32,

    MaterialOffset              : u32,
    TextureOffset               : u32,
};



struct Material
{
    BaseColor               : vec4<f32>,
    EmissiveColor           : vec3<f32>,
    EmissiveIntensity       : f32,

    Metalness               : f32,
    Roughness               : f32,
    BlendMode               : u32,   // OPAQUE: 0, MASK: 1, BLEND: 2
    OpacityMask             : f32,   // AlphaCutOff Value For MASK Mode

    NormalScale             : vec2<f32>,
    IOR                     : f32,

    BaseColorTextureID      : u32,
    ORMTextureID            : u32,
    EmissiveTextureID       : u32,
    NormalTextureID         : u32,
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
}



struct Vertex
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    UV          : vec2<f32>,
};



struct BVHNode
{
    Boundary_Min    : vec3<f32>,
    PrimitiveCount  : u32,

    Boundary_Max    : vec3<f32>,
    PrimitiveOffset : u32,
};

//==========================================================================
// Data Structures Used Only In Shader =====================================
//==========================================================================

struct Ray
{
    Start       : vec3<f32>,
    Direction   : vec3<f32>,
};



struct Triangle
{
    Vertex_0    : Vertex,
    Vertex_1    : Vertex,
    Vertex_2    : Vertex,

    MaterialID  : u32,
};



struct HitResult
{
    IsValidHit      : bool,
    InstanceID      : u32,
    PrimitiveID     : u32,
    HitDistance     : f32,

    HitPoint        : vec3<f32>,
    HitNormal       : vec3<f32>,
    MaterialID      : u32,
};



struct PathSample
{
    Attenuation : vec3<f32>,
    Direction   : vec3<f32>,
}

//==========================================================================
// Constants ===============================================================
//==========================================================================

const STRIDE_INSTANCE   : u32 = 33u;
const STRIDE_LIGHT      : u32 = 18u;
const STRIDE_DESCRIPTOR : u32 =  6u;
const STRIDE_MATERIAL   : u32 = 19u;
const STRIDE_VERTEX     : u32 =  8u;
const STRIDE_BLAS       : u32 =  8u;

const PI : f32 = 3.141592;

//==========================================================================
// GPU Bindings ============================================================
//==========================================================================

@group(0) @binding(0) var<uniform> UniformBuffer : Uniform;

@group(0) @binding(1) var<storage, read> SceneBuffer    : array<u32>;
@group(0) @binding(2) var<storage, read> GeometryBuffer : array<u32>;
@group(0) @binding(3) var<storage, read> AccelBuffer    : array<u32>;

@group(0) @binding(10) var SceneTexture : texture_2d<f32>;
@group(0) @binding(11) var AccumTexture : texture_storage_2d<rgba32float, write>;

//==========================================================================
// Helpers =================================================================
//==========================================================================

fn GetInstance(InstanceID : u32) -> Instance
{
    let Offset : u32 = STRIDE_INSTANCE * InstanceID;

    var OutInstance : Instance = Instance();

    // Model Matrix
    {
        let RowData_0: vec4<u32> = vec4<u32>(SceneBuffer[Offset +  0u], SceneBuffer[Offset +  1u], SceneBuffer[Offset +  2u], SceneBuffer[Offset +  3u]);
        let RowData_1: vec4<u32> = vec4<u32>(SceneBuffer[Offset +  4u], SceneBuffer[Offset +  5u], SceneBuffer[Offset +  6u], SceneBuffer[Offset +  7u]);
        let RowData_2: vec4<u32> = vec4<u32>(SceneBuffer[Offset +  8u], SceneBuffer[Offset +  9u], SceneBuffer[Offset + 10u], SceneBuffer[Offset + 11u]);
        let RowData_3: vec4<u32> = vec4<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u], SceneBuffer[Offset + 15u]);

        OutInstance.ModelMatrix = mat4x4<f32>(bitcast<vec4<f32>>(RowData_0), bitcast<vec4<f32>>(RowData_1), bitcast<vec4<f32>>(RowData_2), bitcast<vec4<f32>>(RowData_3));
    }

    // Model Matrix Inverse
    {
        let RowData_0: vec4<u32> = vec4<u32>(SceneBuffer[Offset + 16u], SceneBuffer[Offset + 17u], SceneBuffer[Offset + 18u], SceneBuffer[Offset + 19u]);
        let RowData_1: vec4<u32> = vec4<u32>(SceneBuffer[Offset + 20u], SceneBuffer[Offset + 21u], SceneBuffer[Offset + 22u], SceneBuffer[Offset + 23u]);
        let RowData_2: vec4<u32> = vec4<u32>(SceneBuffer[Offset + 24u], SceneBuffer[Offset + 25u], SceneBuffer[Offset + 26u], SceneBuffer[Offset + 27u]);
        let RowData_3: vec4<u32> = vec4<u32>(SceneBuffer[Offset + 28u], SceneBuffer[Offset + 29u], SceneBuffer[Offset + 30u], SceneBuffer[Offset + 31u]);

        OutInstance.ModelMatrix_Inverse = mat4x4<f32>(bitcast<vec4<f32>>(RowData_0), bitcast<vec4<f32>>(RowData_1), bitcast<vec4<f32>>(RowData_2), bitcast<vec4<f32>>(RowData_3));
    }

    // Mesh ID
    OutInstance.MeshID = SceneBuffer[Offset + 32u];

    return OutInstance;
}

fn GetLight(LightID : u32) -> Light
{
    let Offset : u32 = UniformBuffer.Offset_LightBuffer + (STRIDE_LIGHT * LightID);

    var OutLight : Light = Light();

    OutLight.Position = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 0u], SceneBuffer[Offset + 1u], SceneBuffer[Offset + 2u]));
    OutLight.LightType = SceneBuffer[Offset + 3u];

    OutLight.Direction = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 4u], SceneBuffer[Offset + 5u], SceneBuffer[Offset + 6u]));
    OutLight.Intensity = bitcast<f32>(SceneBuffer[Offset + 7u]);

    OutLight.Color = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 8u], SceneBuffer[Offset + 9u], SceneBuffer[Offset + 10u]));
    OutLight.Area = bitcast<f32>(SceneBuffer[Offset + 11u]);

    OutLight.U = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u]));
    OutLight.V = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 15u], SceneBuffer[Offset + 16u], SceneBuffer[Offset + 17u]));

    return OutLight;
}

fn GetMeshDescriptor(MeshID : u32) -> MeshDescriptor
{

    let Offset : u32 = UniformBuffer.Offset_MeshDescriptorBuffer + (STRIDE_DESCRIPTOR * MeshID);

    var OutMeshDescriptor : MeshDescriptor = MeshDescriptor();

    OutMeshDescriptor.BlasOffset                    = SceneBuffer[Offset + 0u];
    OutMeshDescriptor.VertexOffset                  = SceneBuffer[Offset + 1u];
    OutMeshDescriptor.IndexOffset                   = SceneBuffer[Offset + 2u];
    OutMeshDescriptor.PrimitiveToMaterialOffset     = SceneBuffer[Offset + 3u];
    OutMeshDescriptor.MaterialOffset                = SceneBuffer[Offset + 4u];
    OutMeshDescriptor.TextureOffset                 = SceneBuffer[Offset + 5u];

    return OutMeshDescriptor;
}

fn GetMaterial(InMeshDescriptor : MeshDescriptor, MaterialID : u32) -> Material
{
    let Offset      : u32       = UniformBuffer.Offset_MaterialBuffer + InMeshDescriptor.MaterialOffset + (STRIDE_MATERIAL * MaterialID);
    var OutMaterial : Material = Material();

    OutMaterial.BaseColor.r         = bitcast<f32>(SceneBuffer[Offset + 0u]);
    OutMaterial.BaseColor.g         = bitcast<f32>(SceneBuffer[Offset + 1u]);
    OutMaterial.BaseColor.b         = bitcast<f32>(SceneBuffer[Offset + 2u]);
    OutMaterial.BaseColor.a         = bitcast<f32>(SceneBuffer[Offset + 3u]);

    OutMaterial.EmissiveColor.r     = bitcast<f32>(SceneBuffer[Offset + 4u]);
    OutMaterial.EmissiveColor.g     = bitcast<f32>(SceneBuffer[Offset + 5u]);
    OutMaterial.EmissiveColor.b     = bitcast<f32>(SceneBuffer[Offset + 6u]);
    OutMaterial.EmissiveIntensity   = bitcast<f32>(SceneBuffer[Offset + 7u]);

    OutMaterial.Metalness           = bitcast<f32>(SceneBuffer[Offset + 8u]);
    OutMaterial.Roughness           = bitcast<f32>(SceneBuffer[Offset + 9u]);
    OutMaterial.BlendMode           = SceneBuffer[Offset + 10u];
    OutMaterial.OpacityMask         = bitcast<f32>(SceneBuffer[Offset + 11u]);

    OutMaterial.NormalScale.x       = bitcast<f32>(SceneBuffer[Offset + 12u]);
    OutMaterial.NormalScale.y       = bitcast<f32>(SceneBuffer[Offset + 13u]);
    OutMaterial.IOR                 = bitcast<f32>(SceneBuffer[Offset + 14u]);

    OutMaterial.BaseColorTextureID  = SceneBuffer[Offset + 15u];
    OutMaterial.ORMTextureID        = SceneBuffer[Offset + 16u];
    OutMaterial.EmissiveTextureID   = SceneBuffer[Offset + 17u];
    OutMaterial.NormalTextureID     = SceneBuffer[Offset + 18u];

    return OutMaterial;
}

fn GetBVHNode(InMeshDescriptor : MeshDescriptor, BlasID : u32) -> BVHNode
{

    let Offset: u32 = UniformBuffer.Offset_BlasBuffer + InMeshDescriptor.BlasOffset + (STRIDE_BLAS * BlasID);

    var OutBVHNode: BVHNode = BVHNode();

    OutBVHNode.Boundary_Min = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 0u], AccelBuffer[Offset + 1u], AccelBuffer[Offset + 2u]));
    OutBVHNode.Boundary_Max = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 3u], AccelBuffer[Offset + 4u], AccelBuffer[Offset + 5u]));

    OutBVHNode.PrimitiveOffset  = AccelBuffer[Offset + 6u];
    OutBVHNode.PrimitiveCount   = AccelBuffer[Offset + 7u];

    return OutBVHNode;
}

fn GetVertex(InMeshDescriptor : MeshDescriptor, VertexID : u32) -> Vertex
{
    let Offset : u32 = InMeshDescriptor.VertexOffset + (STRIDE_VERTEX * VertexID);

    var OutVertex: Vertex = Vertex();

    OutVertex.Position  = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 0u], GeometryBuffer[Offset + 1u], GeometryBuffer[Offset + 2u]));
    OutVertex.Normal    = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 3u], GeometryBuffer[Offset + 4u], GeometryBuffer[Offset + 5u]));
    OutVertex.UV        = bitcast<vec2<f32>>(vec2<u32>(GeometryBuffer[Offset + 6u], GeometryBuffer[Offset + 7u]));

    return OutVertex;
}

fn GetTriangle(InMeshDescriptor : MeshDescriptor, PrimitiveID : u32) -> Triangle
{
    let Offset = UniformBuffer.Offset_IndexBuffer + InMeshDescriptor.IndexOffset;

    var OutTriangle : Triangle = Triangle();

    let VertexID_0 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 0u];
    let VertexID_1 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 1u];
    let VertexID_2 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 2u];

    OutTriangle.Vertex_0 = GetVertex(InMeshDescriptor, VertexID_0);
    OutTriangle.Vertex_1 = GetVertex(InMeshDescriptor, VertexID_1);
    OutTriangle.Vertex_2 = GetVertex(InMeshDescriptor, VertexID_2);

    let PrimitiveToMaterialIndex : u32 = UniformBuffer.Offset_PrimitiveToMaterialBuffer + InMeshDescriptor.PrimitiveToMaterialOffset + PrimitiveID;
    OutTriangle.MaterialID = GeometryBuffer[PrimitiveToMaterialIndex];

    return OutTriangle;
}

fn GetTriangleWorldSpace(InInstance : Instance, InTriangle : Triangle) -> Triangle
{
    var OutTriangle : Triangle  = Triangle();

    OutTriangle.Vertex_0.Position    = TransformVec3WithMat4x4(InTriangle.Vertex_0.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_0.Normal      = TransformVec3WithMat4x4(InTriangle.Vertex_0.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_0.UV          = InTriangle.Vertex_0.UV;

    OutTriangle.Vertex_1.Position    = TransformVec3WithMat4x4(InTriangle.Vertex_1.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_1.Normal      = TransformVec3WithMat4x4(InTriangle.Vertex_1.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_1.UV          = InTriangle.Vertex_1.UV;

    OutTriangle.Vertex_2.Position    = TransformVec3WithMat4x4(InTriangle.Vertex_2.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_2.Normal      = TransformVec3WithMat4x4(InTriangle.Vertex_2.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_2.UV          = InTriangle.Vertex_2.UV;

    OutTriangle.MaterialID = InTriangle.MaterialID;

    return OutTriangle;
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
// Maths ===================================================================
//==========================================================================

fn DoesRangesOverlap(Range1: vec2<f32>, Range2: vec2<f32>) -> bool
{
    return Range1.x <= Range2.y && Range2.x <= Range1.y;
}

fn TransformVec3WithMat4x4(InVector3: vec3<f32>, TransformMatrix: mat4x4<f32>) -> vec3<f32>
{
    let TransformedVector: vec4<f32> = TransformMatrix * vec4<f32>(InVector3, 1.0);
    return TransformedVector.xyz / TransformedVector.w;
}

fn TransformRayWithMat4x4(InRay: Ray, TransformMatrix: mat4x4<f32>, bNormalize: bool) -> Ray
{
    let TransformedRay_Start        : vec3<f32> = TransformVec3WithMat4x4(InRay.Start, TransformMatrix);
    let TransformedRay_End          : vec3<f32> = TransformVec3WithMat4x4(InRay.Start + InRay.Direction, TransformMatrix);
    
    let TransformedRay_Direction    : vec3<f32> = TransformedRay_End - TransformedRay_Start;
    let Direction_Normalized        : vec3<f32> = normalize(TransformedRay_Direction);

    if (bNormalize) { return Ray(TransformedRay_Start, Direction_Normalized); }
    return Ray(TransformedRay_Start, TransformedRay_Direction);
}

fn GetRayTriangleHitDistance(InRay: Ray, InTriangle : Triangle) -> f32
{
    let P0 = InTriangle.Vertex_0.Position;
    let P1 = InTriangle.Vertex_1.Position;
    let P2 = InTriangle.Vertex_2.Position;

    let Edge_1 = P1 - P0;
    let Edge_2 = P2 - P0;

    let pvec = cross(InRay.Direction, Edge_2);
    let det = dot(Edge_1, pvec);
    let EPS  : f32 = 1e-8;

    if (abs(det) < EPS) { return 1e11; }

    let invDet = 1.0 / det;
    let tvec   = InRay.Start - P0;

    let u = dot(tvec, pvec) * invDet;
    if (u < 0.0 || u > 1.0) { return 1e11; }

    let qvec = cross(tvec, Edge_1);
    let v = dot(InRay.Direction, qvec) * invDet;
    if (v < 0.0 || (u + v) > 1.0) { return 1e11; }

    let t = dot(Edge_2, qvec) * invDet;

    //★ 추가: 앞쪽 히트만 유효(자기교차 방지용 최소값 포함)
    let tMin: f32 = 1e-4;          // 필요에 따라 조정/파라미터화
    if (t <= tMin) { return 1e11; }

    return t;
}

fn GetRayAABBIntersectionRange(InRay: Ray, InBVHNode: BVHNode) -> vec2<f32>
{
    // 광선 방향의 역수를 계산하여 나눗셈을 곱셈으로 최적화합니다.
    let InvDirection = 1.0 / InRay.Direction;

    // 각 축(x, y, z)에 대해 광선이 경계 상자의 '슬랩'에 들어오고 나가는 시간을 계산합니다.
    let t1 = (InBVHNode.Boundary_Min - InRay.Start) * InvDirection;
    let t2 = (InBVHNode.Boundary_Max - InRay.Start) * InvDirection;

    // 각 축에 대한 최소(t_min) 및 최대(t_max) 충돌 시간을 찾습니다.
    // min()과 max()를 사용하여 방향에 관계없이 올바른 값을 보장합니다.
    let t_min_vec = min(t1, t2);
    let t_max_vec = max(t1, t2);

    // 모든 축에서 가장 '늦게' 들어오는 시간(최소 충돌 거리)과
    // 가장 '빨리' 나가는 시간(최대 충돌 거리)을 찾습니다.
    let t_min = max(t_min_vec.x, max(t_min_vec.y, t_min_vec.z));
    let t_max = min(t_max_vec.x, min(t_max_vec.y, t_max_vec.z));

    // t_min이 t_max보다 크면 광선이 AABB와 교차하지 않는 것입니다.
    // 이 경우 음수 값을 포함한 vec2를 반환하여 교차하지 않음을 나타낼 수 있습니다.
    if (t_min > t_max) { return vec2<f32>(-1.0, -1.0); }

    // 최소 및 최대 충돌 거리를 반환합니다.
    return vec2<f32>(t_min, t_max);
}

fn GetBaryCentricWeights(Point: vec3<f32>, InTriangle: Triangle) -> vec3<f32>
{
    let A = InTriangle.Vertex_0.Position;
    let B = InTriangle.Vertex_1.Position;
    let C = InTriangle.Vertex_2.Position;

    let v0 = B - A;
    let v1 = C - A;
    let v2 = Point - A;

    let d00 = dot(v0, v0);
    let d01 = dot(v0, v1);
    let d11 = dot(v1, v1);
    let d20 = dot(v2, v0);
    let d21 = dot(v2, v1);

    let denom = d00 * d11 - d01 * d01;

    if (abs(denom) < 1e-6) { return vec3<f32>(1.0, 0.0, 0.0); }

    let invDenom = 1.0 / denom;
    let u = (d11 * d20 - d01 * d21) * invDenom;
    let v = (d00 * d21 - d01 * d20) * invDenom;
    let w = 1.0 - u - v;

    return vec3f(w, u, v);
}

fn GetHitNormal(Point: vec3<f32>, InTriangle: Triangle) -> vec3<f32>
{
    let BaryCentricWeight : vec3<f32> = GetBaryCentricWeights(Point, InTriangle);

    let VertexAttribute_0 : vec3<f32> = InTriangle.Vertex_0.Normal * BaryCentricWeight.x;
    let VertexAttribute_1 : vec3<f32> = InTriangle.Vertex_1.Normal * BaryCentricWeight.y;
    let VertexAttribute_2 : vec3<f32> = InTriangle.Vertex_2.Normal * BaryCentricWeight.z;

    return normalize(VertexAttribute_0 + VertexAttribute_1 + VertexAttribute_2);
}

fn TBNMatrix(N : vec3<f32>) -> mat3x3<f32>
{
    let WorldUp     : vec3<f32> = vec3<f32>(0.0, 1.0, 0.0);
    let WorldRight  : vec3<f32> = vec3<f32>(1.0, 0.0, 0.0);

    let IsNormalWorldUpSame : bool      = abs(dot(N, WorldUp)) > 0.9999;
    let CrossVector         : vec3<f32> = select(WorldUp, WorldRight, IsNormalWorldUpSame);

    let T     : vec3<f32> = normalize(cross(CrossVector, N));
    let B     : vec3<f32> = cross(N, T);

    return mat3x3<f32>(T, B, N);
}

//==========================================================================
// Light Helpers ===========================================================
//==========================================================================

fn DirectionalLightAttenuation(InLight : Light, HitInfo : HitResult, OutDirection : vec3<f32>) -> vec4<f32>
{
    let L : vec3<f32> = -InLight.Direction;
    let V : vec3<f32> = OutDirection;
    let N : vec3<f32> = HitInfo.HitNormal;

    let ShadowRay           : Ray       = Ray(HitInfo.HitPoint, L);
    let ShadowRayHitResult  : HitResult = TraceRay(ShadowRay);

    if (ShadowRayHitResult.IsValidHit) { return vec4<f32>(0.0, 0.0, 0.0, 0.0); }

    // PDF -> Dirac-Delta Function
    // Attenuation -> No Attenuation
    let BRDF    : vec3<f32> = BRDF(HitInfo, L, V);
    let Cosine  : f32       = max(dot(L, N), 0.0);

    return vec4<f32>(Cosine * BRDF, 1.0);
}

fn PointLightAttenuation(InLight : Light, HitInfo : HitResult, OutDirection : vec3<f32>) -> vec4<f32>
{
    let PointToLight : vec3<f32> = InLight.Position - HitInfo.HitPoint;

    let D : f32         = length(PointToLight);
    let L : vec3<f32>   = PointToLight / D;
    let V : vec3<f32>   = OutDirection;
    let N : vec3<f32>   = HitInfo.HitNormal;

    let ShadowRay           : Ray       = Ray(HitInfo.HitPoint, L);
    let ShadowRayHitResult  : HitResult = TraceRay(ShadowRay);

    if (ShadowRayHitResult.IsValidHit && (ShadowRayHitResult.HitDistance < D)) { return vec4<f32>(0.0, 0.0, 0.0, 0.0); }

    // PDF -> Dirac-Delta Function
    let Attenuation : f32       = 1.0 / (D * D);
    let Cosine      : f32       = max(dot(L, N), 0.0);
    let BRDF        : vec3<f32> = BRDF(HitInfo, L, V);

    return vec4<f32>(Attenuation * Cosine * BRDF, 1.0);
}

fn RectLightAttenuation(InLight : Light, HitInfo : HitResult, OutDirection : vec3<f32>, pRandomSeed : ptr<function, u32>) -> vec4<f32>
{
    let Random_U : f32 = (Random(pRandomSeed) * 2.0) - 1.0;
    let Random_V : f32 = (Random(pRandomSeed) * 2.0) - 1.0;

    let SamplePoint : vec3<f32> = InLight.Position + (Random_U * InLight.U) + (Random_V * InLight.V);
    var SampleLight : Light = InLight; SampleLight.Position = SamplePoint;

    let PointLightAttenuation : vec4<f32> = PointLightAttenuation(SampleLight, HitInfo, OutDirection);
    if (!bool(PointLightAttenuation.w)) { return vec4<f32>(0.0, 0.0, 0.0, 0.0); }

    let L                       : vec3<f32> = normalize(SamplePoint - HitInfo.HitPoint);
    let RectLightAttenuation    : f32       = max(dot(-L, InLight.Direction), 0.0);
    let InvPDF                  : f32       = InLight.Area;

    return vec4<f32>(PointLightAttenuation.rgb * RectLightAttenuation * InvPDF, 1.0);
}

//==========================================================================
// PBR Helpers =============================================================
//==========================================================================

fn GGXDistribution(NdotH : f32, Roughness : f32) -> f32
{
    let Alpha   : f32 = Roughness * Roughness;
    let Alpha2  : f32 = Alpha * Alpha;
    let X       : f32 = NdotH * NdotH * (Alpha2 - 1.0) + 1.0;
    let Denom   : f32 = PI * X * X;

    return Alpha2 / max(Denom, 1e-4);
}

fn GeometrySchlickGGX(Dot : f32, K : f32) -> f32
{    
    return Dot / (Dot * (1.0 - K) + K);
}

fn GeometryShadow(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, Roughness : f32) -> f32
{
    let NdotV   : f32 = max(dot(N, V), 0.0);
    let NdotL   : f32 = max(dot(N, L), 0.0);

    let R       : f32 = Roughness + 1.0;
    let K       : f32 = R * R / 8.0;

    let GGX1    : f32 = GeometrySchlickGGX(NdotV, K);
    let GGX2    : f32 = GeometrySchlickGGX(NdotL, K);

    return GGX1 * GGX2;
}

fn Frensel(VdotH : f32, F0: vec3<f32>) -> vec3<f32>
{
    return F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
}

fn SampleCosineHemisphere(pRandomSeed : ptr<function, u32>) -> vec3<f32>
{
    let Random_1 : f32 = Random(pRandomSeed);
    let Random_2 : f32 = Random(pRandomSeed);

    let R       : f32 = sqrt(Random_1);
    let Phi     : f32 = 2.0 * PI * Random_2;

    let X   : f32 = R * cos(Phi);
    let Y   : f32 = R * sin(Phi);
    let Z   : f32 = sqrt(1.0 - Random_1);

    return vec3<f32>(X, Y, Z);
}

fn SampleGGX(pRandomSeed : ptr<function, u32>, Roughness: f32) -> vec3<f32>
{
    let Random_1 : f32 = Random(pRandomSeed);
    let Random_2 : f32 = Random(pRandomSeed);

    let Alpha   : f32 = Roughness * Roughness;
    let Phi     : f32 = 2.0 * PI * Random_1;

    let CosTheta : f32 = sqrt((1.0 - Random_2) / (1.0 + (Alpha * Alpha - 1.0) * Random_2));
    let SinTheta : f32 = sqrt(1.0 - CosTheta * CosTheta);

    let H_X : f32 = SinTheta * cos(Phi);
    let H_Y : f32 = SinTheta * sin(Phi);
    let H_Z : f32 = CosTheta;

    return normalize(vec3<f32>(H_X, H_Y, H_Z));
}

//==========================================================================
// Functions ===============================================================
//==========================================================================

fn GenerateRayFromThreadID(ThreadID: vec2<u32>) -> Ray
{
    let PixelUV             : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution);
    let PixelNDC            : vec3<f32> = vec3<f32>(2.0 * PixelUV - 1.0, 0.0);

    let PixelClip_NearPlane : vec3<f32> = vec3<f32>(PixelNDC.xy, 0.0);
    let PixelClip_Direction : vec3<f32> = vec3<f32>(0.0, 0.0, 1.0);

    let Ray_Clip            : Ray = Ray(PixelClip_NearPlane, PixelClip_Direction);

    return TransformRayWithMat4x4(Ray_Clip, UniformBuffer.ViewProjectionMatrix_Inverse, true);
}

fn TraceRay(InRay: Ray) -> HitResult
{
    var BestHitResult : HitResult = HitResult();
    var RayValidRange : vec2<f32> = vec2<f32>(1e-4, 1e10);
    
    BestHitResult.IsValidHit = false;

    // Trace Ray
    for (var InstanceID: u32 = 0u; InstanceID < UniformBuffer.InstanceCount; InstanceID++)
    {

        // 현재 Instance 기준으로 정보 가져오기
        let CurrentInstance         : Instance          = GetInstance(InstanceID);
        let CurrentMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(CurrentInstance.MeshID);
        let LocalRay                : Ray               = TransformRayWithMat4x4(InRay, CurrentInstance.ModelMatrix_Inverse, false);
        let IntersectionRange       : vec2<f32>         = GetRayAABBIntersectionRange(LocalRay, GetBVHNode(CurrentMeshDescriptor, 0u));

        if (!DoesRangesOverlap(RayValidRange, IntersectionRange)) { continue; }
        
        // Blas Tree 순회
        var Stack           : array<u32, 96>;
        var StackPointer    : i32 = -1;
        StackPointer++; Stack[StackPointer] = 0;
       
        while (StackPointer > -1)
        {
            let BlasID          : u32       = Stack[StackPointer]; StackPointer--;
            let CurrentBVHNode  : BVHNode   = GetBVHNode(CurrentMeshDescriptor, BlasID);
            let bIsLeafNode     : bool      = bool(CurrentBVHNode.PrimitiveCount & 0xffff0000u);
                   
            if (!bIsLeafNode)
            {
                let LChildBlasID : u32 = BlasID + 1u;
                let RChildBlasID : u32 = CurrentBVHNode.PrimitiveOffset;

                let LChildBVH   : BVHNode = GetBVHNode(CurrentMeshDescriptor, LChildBlasID);
                let RChildBVH   : BVHNode = GetBVHNode(CurrentMeshDescriptor, RChildBlasID);

                let LIntersectionRange  : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, LChildBVH);
                let RIntersectionRange  : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, RChildBVH);

                let bLDidHit : bool = DoesRangesOverlap(RayValidRange, LIntersectionRange);
                let bRDidHit : bool = DoesRangesOverlap(RayValidRange, RIntersectionRange);

                let HitState : u32 = (u32(bLDidHit) << 1) + u32(bRDidHit);

                switch (HitState)
                {
                    case 1u: { StackPointer++; Stack[StackPointer] = RChildBlasID; break; }
                    case 2u: { StackPointer++; Stack[StackPointer] = LChildBlasID; break; }
                    case 3u: 
                    {

                        if (LIntersectionRange.x < RIntersectionRange.x)
                        {
                            StackPointer++; Stack[StackPointer] = RChildBlasID;
                            StackPointer++; Stack[StackPointer] = LChildBlasID;
                        }
                        else
                        {
                            StackPointer++; Stack[StackPointer] = LChildBlasID;
                            StackPointer++; Stack[StackPointer] = RChildBlasID;
                        }

                        break;
                    }

                    default: { break; }
                }

                continue;
            }

            let PrimitiveStartID : u32 = CurrentBVHNode.PrimitiveOffset;
            let PrimitiveEndID   : u32 = PrimitiveStartID + (CurrentBVHNode.PrimitiveCount & 0x0000ffffu);

            for (var PrimitiveID : u32 = PrimitiveStartID; PrimitiveID < PrimitiveEndID; PrimitiveID++)
            {
                let CurrentTriangle         : Triangle  = GetTriangle(CurrentMeshDescriptor, PrimitiveID);
                let PrimitiveHitDistance    : f32       = GetRayTriangleHitDistance(LocalRay, CurrentTriangle);
                
                if (RayValidRange.y < PrimitiveHitDistance) { continue; }

                // // Temp : BackFace Culling 사용...
                // if (false)
                // {
                //     let Point : vec3<f32> = LocalRay.Start + PrimitiveHitDistance * LocalRay.Direction;
                //     let Normal : vec3<f32> = GetHitNormal(Point, CurrentTriangle);

                //     if (dot(Normal, LocalRay.Direction) < 0.0) { continue; }
                // }

                // Material의 Alpha Test 여부 읽기...
                // if (bAlphaTestResult_IgnorePrimitive) { continue; }
                
                // 최종 살아남은 Primitive를 선택
                RayValidRange.y = PrimitiveHitDistance;

                BestHitResult.IsValidHit    = true;
                BestHitResult.InstanceID    = InstanceID;
                BestHitResult.PrimitiveID   = PrimitiveID;
            }
        }
    }

    // 충돌했다면 충돌 지점의 정보 채워넣기
    if (BestHitResult.IsValidHit)
    {
        BestHitResult.HitDistance                   = RayValidRange.y;

        let HitInstance         : Instance          = GetInstance(BestHitResult.InstanceID);
        let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
        let HitPrimitiveLocal   : Triangle          = GetTriangle(HitMeshDescriptor, BestHitResult.PrimitiveID);
        let HitPrimitive        : Triangle          = GetTriangleWorldSpace(HitInstance, HitPrimitiveLocal);

        BestHitResult.HitPoint                      = InRay.Start + (BestHitResult.HitDistance * InRay.Direction);
        BestHitResult.HitNormal                     = GetHitNormal(BestHitResult.HitPoint, HitPrimitive);
        BestHitResult.MaterialID                    = HitPrimitiveLocal.MaterialID;
    }
    
    return BestHitResult;
}

fn BRDF(HitInfo : HitResult, InDirection : vec3<f32>, OutDirection : vec3<f32>) -> vec3<f32>
{

    let L : vec3<f32> = InDirection;
    let V : vec3<f32> = OutDirection;
    let N : vec3<f32> = HitInfo.HitNormal;
    let H : vec3<f32> = normalize(L + V);

    let NdotV : f32 = max(dot(N, V), 0.0);
    let NdotL : f32 = max(dot(N, L), 0.0);
    let NdotH : f32 = max(dot(N, H), 0.0);
    let VdotH : f32 = max(dot(V, H), 0.0);

    let HitInstance : Instance = GetInstance(HitInfo.InstanceID);
    let HitMeshDescriptor : MeshDescriptor = GetMeshDescriptor(HitInstance.MeshID);

    let HitMaterial : Material  = GetMaterial(HitMeshDescriptor, HitInfo.MaterialID);
    let BaseColor   : vec3<f32> = HitMaterial.BaseColor.rgb; // TEMP : Use White As BaseColor
    let Metalness   : f32       = HitMaterial.Metalness;
    let Roughness   : f32       = HitMaterial.Roughness;

    let F0  : vec3<f32> = mix(vec3f(0.04), BaseColor, Metalness);
    let D   : f32       = GGXDistribution(NdotH, Roughness);
    let G   : f32       = GeometryShadow(N, V, L, Roughness);
    let F   : vec3<f32> = Frensel(VdotH, F0);

    let kS  : vec3<f32> = F;
    let kD  : vec3<f32> = (1.0 - kS) * (1.0 - Metalness);

    let BRDF_Diffuse    : vec3<f32> = (kD / PI) * BaseColor;
    let BRDF_Specular   : vec3<f32> = (D * G * F) / max(4.0 * NdotV * NdotL, 1e-4);

    return BRDF_Diffuse + BRDF_Specular;
}

fn SampleIndirectPath(HitInfo : HitResult, OutDirection : vec3<f32>, pRandomSeed : ptr<function, u32>) -> PathSample
{

    // HitInfo 해석
    let HitInstance         : Instance          = GetInstance(HitInfo.InstanceID);
    let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
    let HitMaterial         : Material          = GetMaterial(HitMeshDescriptor, HitInfo.MaterialID);
    let BaseColor           : vec3<f32>         = HitMaterial.BaseColor.rgb;
    let Metalness           : f32               = HitMaterial.Metalness;
    let Roughness           : f32               = HitMaterial.Roughness;

    // 정반사 확률 P_specular 계산
    let F0                  : vec3<f32> = mix(vec3f(0.04), BaseColor, Metalness);
    let SpecularReflectance : f32       = dot(F0, vec3f(0.299, 0.587, 0.114));
    let P_specular          : f32       = mix(SpecularReflectance, 1.0, Metalness);

    // 새로운 방향 L 결정
    let V   : vec3<f32>     = OutDirection;
    let N   : vec3<f32>     = HitInfo.HitNormal;
    let TBN : mat3x3<f32>   = TBNMatrix(N);
    var L   : vec3<f32>;
    if (Random(pRandomSeed) < P_specular) // 정반사 -> GGX Distribution
    {
        let H = TBN * SampleGGX(pRandomSeed, Roughness);
        L = reflect(-V, H);
    }
    else // 난반사 -> Cosine-Weighted Distribution
    {
        L = TBN * SampleCosineHemisphere(pRandomSeed);
    }

    let Cosine  : f32       = dot(L, N); 
    if (Cosine < 0.0) { return PathSample(vec3f(0.0), L); }

    let H       : vec3<f32> = normalize(L + V);
    let NdotH   : f32       = max(dot(N, H), 0.0);
    let VdotH   : f32       = max(dot(V, H), 0.0);

    // 결정된 L에 대한 실제 PDF 계산 (Lerp)
    let PDF_Specular    : f32       = GGXDistribution(NdotH, Roughness) / (4.0 * VdotH);
    let PDF_Diffuse     : f32       = Cosine / PI;
    let PDF             : f32       = mix(PDF_Diffuse, PDF_Specular, P_specular);
    let BRDF            : vec3<f32> = BRDF(HitInfo, L, V);

    let Attenuation     : vec3<f32> = BRDF * Cosine / PDF;

    return PathSample(Attenuation, L);
}

//==========================================================================
// TEST Functions ==========================================================
//==========================================================================

fn SampleTransmissivePath(HitInfo : HitResult, OutDirection : vec3<f32>, pRandomSeed : ptr<function, u32>) -> PathSample
{

    // 1. Transmissive 재질로 들어오는지, 나가는지 판별

    return PathSample();
}

fn TEST_SampleTransmissionPath(HitData: HitResult, InRay: Ray, Mat: Material, RandomSeed: ptr<function, u32>) -> PathSample 
{
    var Result: PathSample;

    // 1. 광선이 매질 안팎 중 어디로 향하는지 판별
    let cos_theta_in = dot(InRay.Direction, HitData.HitNormal);
    var normal: vec3<f32>;
    var eta_ratio: f32; // 굴절률 비율

    if (cos_theta_in < 0.0) { // 매질로 진입
        normal = HitData.HitNormal;
        eta_ratio = 1.0 / Mat.IOR;
    } else { // 매질에서 탈출
        normal = -HitData.HitNormal;
        eta_ratio = Mat.IOR / 1.0;
    }

    // 2. 프레넬 방정식 및 전반사(TIR) 계산
    let cos_theta = abs(dot(InRay.Direction, normal));
    let sin_theta2_sq = eta_ratio * eta_ratio * (1.0 - cos_theta * cos_theta);

    var reflectance: f32;
    if (sin_theta2_sq > 1.0) { // 전반사 조건
        reflectance = 1.0;
    } else {
        // 슐릭의 근사 (Schlick's Approximation)
        var r0 = (1.0 - eta_ratio) / (1.0 + eta_ratio);
        r0 = r0 * r0;
        reflectance = r0 + (1.0 - r0) * pow(1.0 - cos_theta, 5.0);
    }

    // 3. 확률적으로 반사 또는 굴절 경로 선택
    if (Random(RandomSeed) < reflectance) {
        // 반사 경로 선택
        Result.Direction = reflect(InRay.Direction, normal);
        Result.Attenuation = vec3<f32>(1.0, 1.0, 1.0); // 유리는 반사 시 색상 변화 없음
    } else {
        // 굴절 경로 선택
        let cos_theta2 = sqrt(1.0 - sin_theta2_sq);
        let refract_dir_perp = eta_ratio * (InRay.Direction + cos_theta * normal);
        let refract_dir_para = -cos_theta2 * normal;
        Result.Direction = refract_dir_perp + refract_dir_para;
        Result.Attenuation = Mat.BaseColor.rgb; // 유색 유리의 경우 색상 적용
    }
    
    return Result;
}

//==========================================================================
// Shader Main =============================================================
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{

    // 범위 밖의 스레드는 계산 X
    {
        let bPixelInBoundary_X: bool = (ThreadID.x < UniformBuffer.Resolution.x);
        let bPixelInBoundary_Y: bool = (ThreadID.y < UniformBuffer.Resolution.y);

        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }



    // PathTrace 수행
    var RandomSeed          : u32       = GetHashValue(ThreadID.x * 1973u + ThreadID.y * 9277u + UniformBuffer.FrameIndex * 26699u);
    var CurrentRay          : Ray       = GenerateRayFromThreadID(ThreadID.xy);
    var ResultColor         : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var Throughput          : vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    let EnvironmentColor    : vec3<f32> = vec3<f32>(0.3, 0.3, 0.3);


    // let TESTTrace = TraceRay(CurrentRay);
    // if (TESTTrace.IsValidHit)
    // {
    //     //ResultColor.r = 1.0;
    //     ResultColor = abs(TESTTrace.HitNormal);
    // }
    // else { ResultColor = EnvironmentColor; }
    // if (true) { textureStore(AccumTexture, ThreadID.xy, vec4<f32>(ResultColor, 1.0)); return; }




    for (var BounceDepth : u32 = 0u; BounceDepth < 1u; BounceDepth++)
    {
        let HitPrimitiveData : HitResult = TraceRay(CurrentRay);
        if (!HitPrimitiveData.IsValidHit) { ResultColor = Throughput * EnvironmentColor; break; }

        // TEMP : Emissive Triangle의 경우 자체 발광 빛도 색에 추가
        {
            let HitInstance         : Instance          = GetInstance(HitPrimitiveData.InstanceID);
            let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
            let HitMaterial         : Material          = GetMaterial(HitMeshDescriptor, HitPrimitiveData.MaterialID);

            ResultColor += Throughput * HitMaterial.EmissiveIntensity * HitMaterial.EmissiveColor;
        }

        // Direct Light 계산 : NEE(Next Event Estimation) 기법
        for (var LightID : u32 = 0u; LightID < UniformBuffer.LightSourceCount; LightID++)
        {
            let CurrentLight        : Light     = GetLight(LightID);
            let OutDirection        : vec3<f32> = -CurrentRay.Direction;
            var LightAttenuation    : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);

            switch (CurrentLight.LightType)
            {
                case 0u : { LightAttenuation = DirectionalLightAttenuation(CurrentLight, HitPrimitiveData, OutDirection);         break; }
                case 1u : { LightAttenuation = PointLightAttenuation(CurrentLight, HitPrimitiveData, OutDirection);               break; }
                case 2u : { LightAttenuation = RectLightAttenuation(CurrentLight, HitPrimitiveData, OutDirection, &RandomSeed);   break; }     
                default : { break; }
            }
            
            let LightRadiance : vec3<f32> = CurrentLight.Intensity * CurrentLight.Color; // 원본 광원 색
            let LightAttenuationRGB : vec3<f32> = LightAttenuation.w *  LightAttenuation.rgb; // 반사율, 감쇠 등 표면에서 상호작용하는 값
            
            ResultColor += Throughput * LightAttenuationRGB * LightRadiance;
        }

        // Indirect Light 계산
        let NextPathSample : PathSample = SampleIndirectPath(HitPrimitiveData, -CurrentRay.Direction, &RandomSeed);
        Throughput *= NextPathSample.Attenuation;
        CurrentRay = Ray(HitPrimitiveData.HitPoint, NextPathSample.Direction);
    }



    // 최종 색을 AccumTexture에 작성
    {
        let ColorUsed       : vec4<f32> = textureLoad(SceneTexture, ThreadID.xy, 0);
        let ColorToWrite    : vec3<f32> = mix(ColorUsed.rgb, ResultColor, 1.0 / f32(UniformBuffer.FrameIndex + 1));
        textureStore(AccumTexture, ThreadID.xy, vec4<f32>(ColorToWrite, 1.0));
    }

    return;
}