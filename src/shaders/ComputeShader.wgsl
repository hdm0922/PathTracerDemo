//==========================================================================
//Data Structures From CPU =================================================
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

    Padding_0           : vec3<u32>,
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
    Padding_0                   : vec2<u32>,
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



struct Light
{
    Position    : vec3<f32>,
    LightType   : u32,

    Direction   : vec3<f32>,
    Intensity   : f32,

    Color       : vec3<f32>,
    Area        : f32,

    U           : vec3<f32>,
    Padding_0   : u32,

    V           : vec3<f32>,
    Padding_1   : u32,
}



struct Vertex
{
    Position: vec3<f32>,
    Padding_0: u32,

    Normal: vec3<f32>,
    Padding_1: u32,

    UV: vec2<f32>,
    Padding_2: vec2<u32>
};



struct BVHNode
{
    Boundary_Min    : vec3<f32>,
    PrimitiveCount  : u32,

    Boundary_Max    : vec3<f32>,
    PrimitiveOffset : u32,
};

//==========================================================================
//Data Structures Used Only In Shader ======================================
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
    InstanceID  : u32,
    PrimitiveID : u32,
    HitDistance : f32,
    IsValidHit  : bool,
};



struct PathSample
{
    Weight      : vec3<f32>,
    Direction   : vec3<f32>,
}

//==========================================================================
//GPU Bindings =============================================================
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
    let Offset: u32 = InstanceID * 36u;

    var OutInstance: Instance = Instance();

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
    OutInstance.MeshID = SceneBuffer[Offset + 35u];

    return OutInstance;
}

fn GetMeshDescriptor(MeshID : u32) -> MeshDescriptor
{

    let Offset : u32 = UniformBuffer.Offset_MeshDescriptorBuffer + (8u * MeshID);

    var OutMeshDescriptor : MeshDescriptor = MeshDescriptor();

    OutMeshDescriptor.BlasOffset                    = SceneBuffer[Offset + 0u];
    OutMeshDescriptor.VertexOffset                  = SceneBuffer[Offset + 1u];
    OutMeshDescriptor.IndexOffset                   = SceneBuffer[Offset + 2u];
    OutMeshDescriptor.PrimitiveToMaterialOffset     = SceneBuffer[Offset + 3u];
    OutMeshDescriptor.MaterialOffset                = SceneBuffer[Offset + 4u];
    OutMeshDescriptor.TextureOffset                 = SceneBuffer[Offset + 5u];

    return OutMeshDescriptor;
}

fn GetMaterial(MaterialID : u32) -> Material
{

    let Offset : u32 = UniformBuffer.Offset_MeshDescriptorBuffer + (20u * MaterialID);

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

    OutMaterial.BaseColorTextureID  = SceneBuffer[Offset + 16u];
    OutMaterial.ORMTextureID        = SceneBuffer[Offset + 17u];
    OutMaterial.EmissiveTextureID   = SceneBuffer[Offset + 18u];
    OutMaterial.NormalTextureID     = SceneBuffer[Offset + 19u];

    return OutMaterial;
}

fn GetLight(LightID : u32) -> Light
{
    let Offset : u32 = UniformBuffer.Offset_LightBuffer + (20u * LightID);

    var OutLight : Light = Light();

    OutLight.Position = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 0u], SceneBuffer[Offset + 1u], SceneBuffer[Offset + 2u]));
    OutLight.LightType = SceneBuffer[Offset + 3u];

    OutLight.Direction = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 4u], SceneBuffer[Offset + 5u], SceneBuffer[Offset + 6u]));
    OutLight.Intensity = bitcast<f32>(SceneBuffer[Offset + 7u]);

    OutLight.Color = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 8u], SceneBuffer[Offset + 9u], SceneBuffer[Offset + 10u]));
    OutLight.Area = bitcast<f32>(SceneBuffer[Offset + 11u]);

    OutLight.U = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u]));
    OutLight.V = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 16u], SceneBuffer[Offset + 17u], SceneBuffer[Offset + 18u]));

    return OutLight;
}

fn GetBVHNode(InMeshDescriptor : MeshDescriptor, BlasID : u32) -> BVHNode
{

    let Offset: u32 = UniformBuffer.Offset_BlasBuffer + InMeshDescriptor.BlasOffset + (8u * BlasID);

    var OutBVHNode: BVHNode = BVHNode();

    OutBVHNode.Boundary_Min = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 0u], AccelBuffer[Offset + 1u], AccelBuffer[Offset + 2u]));
    OutBVHNode.Boundary_Max = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 3u], AccelBuffer[Offset + 4u], AccelBuffer[Offset + 5u]));

    OutBVHNode.PrimitiveOffset  = AccelBuffer[Offset + 6u];
    OutBVHNode.PrimitiveCount   = AccelBuffer[Offset + 7u];

    return OutBVHNode;
}

fn GetVertex(InMeshDescriptor : MeshDescriptor, VertexID : u32) -> Vertex
{
    let Offset : u32 = InMeshDescriptor.VertexOffset + (12u * VertexID);

    var OutVertex: Vertex = Vertex();

    OutVertex.Position  = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 0u], GeometryBuffer[Offset + 1u], GeometryBuffer[Offset + 2u]));
    OutVertex.Normal    = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 4u], GeometryBuffer[Offset + 5u], GeometryBuffer[Offset + 6u]));
    OutVertex.UV        = bitcast<vec2<f32>>(vec2<u32>(GeometryBuffer[Offset + 8u], GeometryBuffer[Offset + 9u]));

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

//==========================================================================
// Light Helpers ===========================================================
//==========================================================================

fn GetDirectionalLightContribution(InLight : Light, View : vec3<f32>, HitPoint : vec3<f32>, HitNormal : vec3<f32>, HitMaterial : Material) -> vec4<f32>
{
    let PointToLightDirection   : vec3<f32> = -InLight.Direction;

    let ShadowRay               : Ray       = Ray(HitPoint, PointToLightDirection);
    let ShadowRayHitResult      : HitResult = TraceRay(ShadowRay);

    if (ShadowRayHitResult.IsValidHit) { return vec4<f32>(0.0, 0.0, 0.0, 0.0); }

    let BRDFValue               : vec3<f32> = ComputeBRDF(PointToLightDirection, View, HitNormal, HitMaterial);
    let LightContribution       : vec3<f32> = BRDFValue * max(dot(PointToLightDirection,HitNormal), 0.0);

    return vec4<f32>(LightContribution, 1.0);
}

fn GetPointLightContribution(InLight : Light, View : vec3<f32>, HitPoint : vec3<f32>, HitNormal : vec3<f32>, HitMaterial : Material) -> vec4<f32>
{
    let PointToLight            : vec3<f32> = InLight.Position - HitPoint;

    let PointToLightDistance    : f32       = length(PointToLight);
    let PointToLightDirection   : vec3<f32> = PointToLight / PointToLightDistance;

    let ShadowRay               : Ray       = Ray(HitPoint, PointToLightDirection);
    let ShadowRayHitResult      : HitResult = TraceRay(ShadowRay);

    //if (ShadowRayHitResult.IsValidHit && (ShadowRayHitResult.HitDistance < PointToLightDistance)) { return vec4<f32>(0.0, 0.0, 0.0, 0.0); }

    let Attenuation             : f32       = 1.0 / (PointToLightDistance * PointToLightDistance);
    let BRDFValue               : vec3<f32> = ComputeBRDF(PointToLightDirection, View, HitNormal, HitMaterial);
    let LightContribution       : vec3<f32> = BRDFValue * max(dot(PointToLightDirection,HitNormal), 0.0) * Attenuation;

    return vec4<f32>(InLight.Position, 1.0);
}

//==========================================================================
// PBR Helpers =============================================================
//==========================================================================

fn GetGGXDistributionFactor(N : vec3<f32>, H : vec3<f32>, Roughness : f32) -> f32
{
    let a: f32 = Roughness * Roughness;
    let a2: f32 = a * a;
    let NdotH: f32 = max(dot(N, H), 0.0);
    let NdotH2: f32 = NdotH * NdotH;

    let num: f32 = a2;
    var den: f32 = (NdotH2 * (a2 - 1.0) + 1.0);
    den = 3.141592 * den * den;

    // 분모가 0에 가까워지는 것을 방지
    return num / max(den, 0.000001);
}

fn GetGeometrySchlickGGX(NdotV: f32, Roughness: f32) -> f32
{
    let r: f32 = (Roughness + 1.0);
    let k: f32 = (r * r) / 8.0;
    let num: f32 = NdotV;
    let den: f32 = NdotV * (1.0 - k) + k;
    return num / den;
}

fn GetGeometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, Roughness: f32) -> f32
{
    let NdotV: f32 = max(dot(N, V), 0.0);
    let NdotL: f32 = max(dot(N, L), 0.0);
    let ggx2: f32 = GetGeometrySchlickGGX(NdotV, Roughness);
    let ggx1: f32 = GetGeometrySchlickGGX(NdotL, Roughness);
    return ggx1 * ggx2;
}

fn GetFresnelSchlick(Cosine: f32, F0: vec3<f32>) -> vec3<f32>
{
    return F0 + (vec3f(1.0) - F0) * pow(clamp(1.0 - Cosine, 0.0, 1.0), 5.0);
}


fn CreateONB(N : vec3<f32>) -> mat3x3<f32>
{
    // let normal = N;
    // var up = vec3f(0.0, 1.0, 0.0);
    // if (abs(dot(normal, up)) > 0.999) { up = vec3f(1.0, 0.0, 0.0); }
    // let tangent = normalize(cross(up, normal));
    // let bitangent = cross(normal, tangent);
    // return mat3x3f(tangent, bitangent, normal);
    let sign_val = select(-1.0, 1.0, N.z >= 0.0);
    let a = -1.0 / (sign_val + N.z);
    let b = N.x * N.y * a;
    let tangent = vec3f(1.0 + sign_val * N.x * N.x * a, sign_val * b, -sign_val * N.x);
    let bitangent = vec3f(b, sign_val + N.y * N.y * a, -N.y);
    return mat3x3f(tangent, bitangent, N);
}

fn SampleGGX(pRandomSeed : ptr<function, u32>, Roughness: f32) -> vec3<f32>
{
    let Random_1 : f32 = Random(pRandomSeed);
    let Random_2 : f32 = Random(pRandomSeed);

    let a = Roughness * Roughness;
    let phi = 2.0 * 3.141592 * Random_1;
    let cos_theta = sqrt((1.0 - Random_2) / (1.0 + (a * a - 1.0) * Random_2));
    let sin_theta = sqrt(1.0 - cos_theta * cos_theta);

    let h_x = sin_theta * cos(phi);
    let h_y = sin_theta * sin(phi);
    let h_z = cos_theta;

    return normalize(vec3f(h_x, h_y, h_z));
}

fn SampleCosineHemisphere(pRandomSeed : ptr<function, u32>) -> vec3<f32>
{
    let Random_1 : f32 = Random(pRandomSeed);
    let Random_2 : f32 = Random(pRandomSeed);

    let r = sqrt(Random_1);
    let phi = 2.0 * 3.141592 * Random_2;
    let x = r * cos(phi);
    let y = r * sin(phi);
    let z = sqrt(max(0.0, 1.0 - Random_1));
    return vec3f(x, y, z);
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

    BestHitResult.HitDistance = RayValidRange.y;

    return BestHitResult;
}

fn ComputeBRDF(HitPointToLight: vec3<f32>, HitPointToRayStart: vec3<f32>, HitNormal: vec3<f32>, HitMaterial: Material) -> vec3<f32>
{
    let L : vec3<f32> = HitPointToLight;
    let V : vec3<f32> = HitPointToRayStart;
    let N : vec3<f32> = HitNormal;

    // 1. 재질 속성 준비
    let baseColor   : vec3<f32> = vec3f(1.0);
    let metallic    : f32       = HitMaterial.Metalness;
    let roughness   : f32       = HitMaterial.Roughness;

    // 2. 핵심 벡터 및 값 계산
    let H           : vec3<f32> = normalize(V + L);
    let NdotV       : f32       = max(dot(N, V), 0.0);
    let NdotL       : f32       = max(dot(N, L), 0.0);
    let VdotH       : f32       = max(dot(V, H), 0.0);
    
    // 3. 반사율(F0) 및 난반사/정반사 색상 결정 (메탈릭 워크플로우)
    let F0          : vec3<f32> = mix(vec3f(0.04), baseColor, metallic);
    let diffuse     : vec3<f32> = baseColor * (1.0 - metallic);

    // 4. Cook-Torrance BRDF의 D, G, F 항 계산
    let D           : f32       = GetGGXDistributionFactor(N, H, roughness);
    let G           : f32       = GetGeometrySmith(N, V, L, roughness);
    let F           : vec3<f32> = GetFresnelSchlick(VdotH, F0);

    // 5. 정반사(specular) BRDF 항 조합
    let numerator: vec3f = D * G * F;
    let denominator: f32 = 4.0 * NdotV * NdotL + 0.001; // 0으로 나누는 것 방지
    let specular_brdf: vec3f = numerator / denominator;

    // 6. 에너지 보존을 고려하여 최종 BRDF 계산
    let kS: vec3f = F; // 프레넬 항이 정반사광의 비율
    var kD: vec3f = vec3f(1.0) - kS;
    kD *= (1.0 - metallic); // 금속은 난반사가 없도록 처리

    // 최종 BRDF = (난반사 기여도) + (정반사 기여도)
    // 난반사 BRDF는 Lambertian 모델(diffuse_color / PI)을 따름
    return kD * diffuse / 3.141592 + specular_brdf;
}

fn SampleNextPath(HitPointToRayStart: vec3<f32>, HitNormal: vec3<f32>, HitMaterial: Material, pRandomSeed : ptr<function, u32>) -> PathSample
{

    let V               : vec3<f32>     = HitPointToRayStart;
    let N               : vec3<f32>     = HitNormal;

    var OutPathSample   : PathSample    = PathSample();
    var PDF             : f32           = 0.0;


    let baseColor           = HitMaterial.BaseColor.rgb;
    let metallic            = HitMaterial.Metalness;
    let F0                  = mix(vec3f(0.04), baseColor, metallic);

    let specularColor       = mix(F0, baseColor, metallic);
    let diffuseColor        = baseColor * (1.0 - metallic);

    let specularWeight      = max(specularColor.r, max(specularColor.g, specularColor.b));
    let diffuseWeight       = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
    let specularProbability = specularWeight / max(specularWeight + diffuseWeight, 0.0001);



    // 2. 경로에 따라 방향 샘플링
    let onb = CreateONB(N);

    if (Random(pRandomSeed) < specularProbability) // 정반사
    {
        let H_tangent = SampleGGX(pRandomSeed, HitMaterial.Roughness);
        let H = onb * H_tangent;

        OutPathSample.Direction = reflect(-V, H);
        
        let D = GetGGXDistributionFactor(N, H, HitMaterial.Roughness);
        PDF = (D * max(0.0, dot(N, H))) / max(4.0 * dot(V, H), 0.0001);
    } else // 난반사
    {
        let dir_tangent = SampleCosineHemisphere(pRandomSeed);

        OutPathSample.Direction = onb * dir_tangent;
        
        PDF = max(0.0, dot(N, OutPathSample.Direction)) / 3.141592;
    }

    // 3. 최종 가중치 계산 및 반환
    let Cosine = max(0.0, dot(N, OutPathSample.Direction));
    
    // 샘플링이 유효하지 않은 경우 (예: 방향이 표면 아래로 향함) 가중치를 0으로 처리
    if (PDF <= 0.0 || Cosine <= 0.0) { return PathSample(vec3f(0.0), vec3f(0.0)); }

    OutPathSample.Weight = ComputeBRDF(OutPathSample.Direction, V, N, HitMaterial) * Cosine / PDF;

    return OutPathSample;
}

//==========================================================================
// TEST Functions ==========================================================
//==========================================================================



//==========================================================================
//Shader Main ==============================================================
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{

    //유효하지 않은 Pixel은 건너뜀
    {
        let bPixelInBoundary_X: bool = (ThreadID.x < UniformBuffer.Resolution.x);
        let bPixelInBoundary_Y: bool = (ThreadID.y < UniformBuffer.Resolution.y);

        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }


    var RandomSeed          : u32       = GetHashValue(ThreadID.x * 1973u + ThreadID.y * 9277u + UniformBuffer.FrameIndex * 26699u);
    var CurrentRay          : Ray       = GenerateRayFromThreadID(ThreadID.xy);
    var ResultColor         : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    let EnvironmentColor    : vec3<f32> = vec3<f32>(0.2, 0.1, 0.1);
    var Weight              : vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);

    // BounceDepth 만큼 Ray Trace
    for (var BounceDepth : u32 = 0u; BounceDepth < UniformBuffer.MAX_BOUNCE; BounceDepth++)
    {
        // Current Ray가 씬에서 처음 만나는 Primitive의 정보 계산
        let HitPrimitiveData : HitResult = TraceRay(CurrentRay);

        // 부딪히지 않았다면 환경구에 부딪힌 것으로 간주, 저장된 가중치 정산하고 Bounce Loop 탈출
        if (!HitPrimitiveData.IsValidHit) { ResultColor = Weight * EnvironmentColor; break; }


        // HitPrimitiveData 를 해석
        let HitInstance         : Instance          = GetInstance(HitPrimitiveData.InstanceID);
        let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
        let HitPrimitive        : Triangle          = GetTriangle(HitMeshDescriptor, HitPrimitiveData.PrimitiveID);

        let HitPoint            : vec3<f32>         = CurrentRay.Start + (HitPrimitiveData.HitDistance * CurrentRay.Direction);
        let HitNormal           : vec3<f32>         = GetHitNormal(HitPoint, HitPrimitive);
        let HitMaterial         : Material          = GetMaterial(HitPrimitive.MaterialID);

        let bHitPointIsLight    : bool              = false;

        // Ray가 광원에 직접 닿았을 경우
        if (bHitPointIsLight)
        {
            if (BounceDepth == 0) { ResultColor = HitMaterial.EmissiveIntensity * HitMaterial.EmissiveColor; }
            
            break;
        }

        // Direct Light 계산 : NEE(Next Event Estimation) 기법
        for (var LightID : u32 = 0u; LightID < UniformBuffer.LightSourceCount; LightID++)
        {
            let CurrentLight        : Light     = GetLight(LightID);
            var LightContribution   : vec4<f32> = vec4<f32>();

            switch (CurrentLight.LightType)
            {
                case 0u : { LightContribution = GetDirectionalLightContribution(CurrentLight, -CurrentRay.Direction, HitPoint, HitNormal, HitMaterial); break; }
                case 1u : { LightContribution = GetPointLightContribution(CurrentLight, -CurrentRay.Direction, HitPoint, HitNormal, HitMaterial); break; }
                default : { break; }
            }

            if (LightContribution.w == 0.0) { continue; }

            //ResultColor += Weight * LightContribution.rgb * CurrentLight.Color * CurrentLight.Intensity;
        }


        // Indirect Light 계산
        let NextPathSample : PathSample = SampleNextPath(-CurrentRay.Direction, HitNormal, HitMaterial, &RandomSeed);

        ResultColor = (NextPathSample.Direction + 1.0) / 2.0;

        Weight *= NextPathSample.Weight;
        CurrentRay = Ray(HitPoint, NextPathSample.Direction);
    }




    // Write Pixel Color To AccumTexture
    let ColorUsed       : vec4<f32> = textureLoad(SceneTexture, ThreadID.xy, 0);
    let ColorToWrite    : vec3<f32> = mix(ColorUsed.rgb, ResultColor, 1.0 / f32(UniformBuffer.FrameIndex + 1));
    textureStore(AccumTexture, ThreadID.xy, vec4<f32>(ColorToWrite, 1.0));

    return;
}