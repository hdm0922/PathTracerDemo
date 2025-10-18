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
    Offset_IndexBuffer              : u32,

    Offset_SubBlasRootArrayBuffer   : u32,
    Offset_BlasBuffer               : u32,
    InstanceCount                   : u32,
    LightSourceCount                : u32,
};



struct Instance
{
    ModelMatrix         : mat4x4<f32>,
    ModelMatrix_Inverse : mat4x4<f32>,

    MeshID              : u32,
};



struct MeshDescriptor
{
    Offset_Vertex       : u32,
    Offset_Index        : u32,
    Offset_Material     : u32,
    Offset_SubBlasRoot  : u32,

    Offset_Blas         : u32,
    Count_SubMesh       : u32,
};



struct Material
{
    Albedo              : vec4<f32>,
    EmissiveColor       : vec3<f32>,
    EmissiveIntensity   : f32,

    Metalness           : f32,
    Roughness           : f32,
    Transmission        : f32,
    IOR                 : f32,

    BaseColorTextureID  : u32,
    ORMTextureID        : u32,
    EmissiveTextureID   : u32,
};



struct Light
{
    Position    : vec3<f32>,
    Direction   : vec3<f32>,
    Color       : vec3<f32>,
    U           : vec3<f32>,
    V           : vec3<f32>,
    LightType   : u32,
    Intensity   : f32,
    Area        : f32,
}



struct Vertex
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    UV          : vec2<f32>,
};



struct BlasNode
{
    Boundary_Min    : vec3<f32>,
    Boundary_Max    : vec3<f32>,
    Count           : u32,
    Offset          : u32,
};



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
};



struct HitResult
{
    IsValidHit      : bool,
    HitDistance     : f32,
    InstanceID      : u32,
    PrimitiveID     : u32,

    HitPoint        : vec3<f32>,
    HitNormal       : vec3<f32>,
    MaterialID      : u32,
};



struct PathSample
{
    Direction   : vec3<f32>,
    PDF         : f32,
};

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
    let Offset      : u32       = STRIDE_INSTANCE * InstanceID;
    var OutInstance : Instance  = Instance();

    OutInstance.ModelMatrix = mat4x4<f32>
    (
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  0u], SceneBuffer[Offset +  1u], SceneBuffer[Offset +  2u], SceneBuffer[Offset +  3u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  4u], SceneBuffer[Offset +  5u], SceneBuffer[Offset +  6u], SceneBuffer[Offset +  7u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  8u], SceneBuffer[Offset +  9u], SceneBuffer[Offset + 10u], SceneBuffer[Offset + 11u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u], SceneBuffer[Offset + 15u]))
    );

    OutInstance.ModelMatrix_Inverse = mat4x4<f32>
    (
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 16u], SceneBuffer[Offset + 17u], SceneBuffer[Offset + 18u], SceneBuffer[Offset + 19u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 20u], SceneBuffer[Offset + 21u], SceneBuffer[Offset + 22u], SceneBuffer[Offset + 23u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 24u], SceneBuffer[Offset + 25u], SceneBuffer[Offset + 26u], SceneBuffer[Offset + 27u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 28u], SceneBuffer[Offset + 29u], SceneBuffer[Offset + 30u], SceneBuffer[Offset + 31u]))
    );

    OutInstance.MeshID = SceneBuffer[Offset + 32u];

    return OutInstance;
}

fn GetLight(LightID : u32) -> Light
{
    let Offset      : u32   = UniformBuffer.Offset_LightBuffer + (STRIDE_LIGHT * LightID);
    var OutLight    : Light = Light();

    OutLight.Position   = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset +  0u], SceneBuffer[Offset +  1u], SceneBuffer[Offset +  2u]));
    OutLight.Direction  = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset +  3u], SceneBuffer[Offset +  4u], SceneBuffer[Offset +  5u]));
    OutLight.Color      = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset +  6u], SceneBuffer[Offset +  7u], SceneBuffer[Offset +  8u]));
    OutLight.U          = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset +  9u], SceneBuffer[Offset + 10u], SceneBuffer[Offset + 11u]));
    OutLight.V          = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u]));

    OutLight.LightType  = SceneBuffer[Offset +  15u];
    OutLight.Intensity  = bitcast<f32>(SceneBuffer[Offset + 16u]);
    OutLight.Area       = bitcast<f32>(SceneBuffer[Offset + 17u]);


    return OutLight;
}

fn GetMeshDescriptor(MeshID : u32) -> MeshDescriptor
{
    let Offset              : u32               = UniformBuffer.Offset_MeshDescriptorBuffer + (STRIDE_DESCRIPTOR * MeshID);
    var OutMeshDescriptor   : MeshDescriptor    = MeshDescriptor();

    OutMeshDescriptor.Offset_Vertex         = SceneBuffer[Offset + 0u];
    OutMeshDescriptor.Offset_Index          = SceneBuffer[Offset + 1u];
    OutMeshDescriptor.Offset_Material       = SceneBuffer[Offset + 2u];
    OutMeshDescriptor.Offset_SubBlasRoot    = SceneBuffer[Offset + 3u];
    OutMeshDescriptor.Offset_Blas           = SceneBuffer[Offset + 4u];
    OutMeshDescriptor.Count_SubMesh         = SceneBuffer[Offset + 5u];

    return OutMeshDescriptor;
}

fn GetMaterial(InMeshDescriptor : MeshDescriptor, MaterialID : u32) -> Material
{
    let Offset      : u32           = UniformBuffer.Offset_MaterialBuffer + InMeshDescriptor.Offset_Material + (STRIDE_MATERIAL * MaterialID);
    var OutMaterial : Material      = Material();

    OutMaterial.Albedo.r            = bitcast<f32>(SceneBuffer[Offset + 0u]);
    OutMaterial.Albedo.g            = bitcast<f32>(SceneBuffer[Offset + 1u]);
    OutMaterial.Albedo.b            = bitcast<f32>(SceneBuffer[Offset + 2u]);
    OutMaterial.Albedo.a            = bitcast<f32>(SceneBuffer[Offset + 3u]);

    OutMaterial.EmissiveColor.r     = bitcast<f32>(SceneBuffer[Offset + 4u]);
    OutMaterial.EmissiveColor.g     = bitcast<f32>(SceneBuffer[Offset + 5u]);
    OutMaterial.EmissiveColor.b     = bitcast<f32>(SceneBuffer[Offset + 6u]);
    OutMaterial.EmissiveIntensity   = bitcast<f32>(SceneBuffer[Offset + 7u]);

    OutMaterial.Metalness           = bitcast<f32>(SceneBuffer[Offset + 8u]);
    OutMaterial.Roughness           = bitcast<f32>(SceneBuffer[Offset + 9u]);
    OutMaterial.Transmission        = bitcast<f32>(SceneBuffer[Offset + 10u]);
    OutMaterial.IOR                 = bitcast<f32>(SceneBuffer[Offset + 11u]);

    // ===================
    let YELLOW : vec4<f32> = vec4<f32>(1.0, 1.0, 0.0, OutMaterial.Albedo.a);

    OutMaterial.Albedo      = select(OutMaterial.Albedo, YELLOW, OutMaterial.Transmission > 0.0 );
    OutMaterial.Roughness   = max(OutMaterial.Roughness, 0.01);

    return OutMaterial;
}

fn GetMaterialFromHit(HitInfo : HitResult) -> Material
{
    let HitInstance         : Instance          = GetInstance(HitInfo.InstanceID);
    let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
    
    return GetMaterial(HitMeshDescriptor, HitInfo.MaterialID);
}

fn GetBlasNode(InMeshDescriptor : MeshDescriptor, SubMeshID : u32, BlasID : u32) -> BlasNode
{
    let SubBlasRootOffset   : u32       = GeometryBuffer[ UniformBuffer.Offset_SubBlasRootArrayBuffer + InMeshDescriptor.Offset_SubBlasRoot + SubMeshID];
    let Offset              : u32       = UniformBuffer.Offset_BlasBuffer + InMeshDescriptor.Offset_Blas + SubBlasRootOffset + (STRIDE_BLAS * BlasID);
    var OutBVHNode          : BlasNode  = BlasNode();

    OutBVHNode.Boundary_Min = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 0u], AccelBuffer[Offset + 1u], AccelBuffer[Offset + 2u]));
    OutBVHNode.Boundary_Max = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 3u], AccelBuffer[Offset + 4u], AccelBuffer[Offset + 5u]));
    OutBVHNode.Offset       = AccelBuffer[Offset + 6u];
    OutBVHNode.Count        = AccelBuffer[Offset + 7u];

    return OutBVHNode;
}

fn GetVertex(InMeshDescriptor : MeshDescriptor, VertexID : u32) -> Vertex
{
    let Offset      : u32       = InMeshDescriptor.Offset_Vertex + (STRIDE_VERTEX * VertexID);
    var OutVertex   : Vertex    = Vertex();

    OutVertex.Position  = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 0u], GeometryBuffer[Offset + 1u], GeometryBuffer[Offset + 2u]));
    OutVertex.Normal    = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 3u], GeometryBuffer[Offset + 4u], GeometryBuffer[Offset + 5u]));
    OutVertex.UV        = bitcast<vec2<f32>>(vec2<u32>(GeometryBuffer[Offset + 6u], GeometryBuffer[Offset + 7u]));

    return OutVertex;
}

fn GetTriangle(InMeshDescriptor : MeshDescriptor, PrimitiveID : u32) -> Triangle
{
    let Offset      : u32       = UniformBuffer.Offset_IndexBuffer + InMeshDescriptor.Offset_Index;
    var OutTriangle : Triangle  = Triangle();

    let VertexID_0 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 0u];
    let VertexID_1 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 1u];
    let VertexID_2 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 2u];

    OutTriangle.Vertex_0 = GetVertex(InMeshDescriptor, VertexID_0);
    OutTriangle.Vertex_1 = GetVertex(InMeshDescriptor, VertexID_1);
    OutTriangle.Vertex_2 = GetVertex(InMeshDescriptor, VertexID_2);

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
    return (Range1.x <= Range2.y) && (Range2.x <= Range1.y);
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

fn GetRayAABBIntersectionRange(InRay: Ray, InBlasNode: BlasNode) -> vec2<f32>
{
    let InvDirection = 1.0 / (InRay.Direction);

    let t1 = (InBlasNode.Boundary_Min - InRay.Start) * InvDirection;
    let t2 = (InBlasNode.Boundary_Max - InRay.Start) * InvDirection;

    let t_min_vec = min(t1, t2);
    let t_max_vec = max(t1, t2);

    let t_min = max(t_min_vec.x, max(t_min_vec.y, t_min_vec.z));
    let t_max = min(t_max_vec.x, min(t_max_vec.y, t_max_vec.z));

    if (t_min > t_max) { return vec2<f32>(1.0, 0.0); }

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

fn BRDF(HitInfo : HitResult, L : vec3<f32>, V : vec3<f32>) -> vec3<f32>
{
    let N : vec3<f32> = HitInfo.HitNormal;
    let H : vec3<f32> = normalize(L + V);

    let NdotV : f32 = max(dot(N, V), 0.0);
    let NdotL : f32 = max(dot(N, L), 0.0);
    let NdotH : f32 = max(dot(N, H), 0.0);
    let VdotH : f32 = max(dot(V, H), 0.0);

    let HitMaterial     : Material  = GetMaterialFromHit(HitInfo);
    let BaseColor       : vec3<f32> = HitMaterial.Albedo.rgb;
    let Metalness       : f32       = HitMaterial.Metalness;
    let Roughness       : f32       = HitMaterial.Roughness;
    let Transmission    : f32       = HitMaterial.Transmission;

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

fn BTDF(HitInfo : HitResult, L : vec3<f32>, V : vec3<f32>) -> vec3<f32>
{
    let HitMaterial : Material  = GetMaterialFromHit(HitInfo);
    let Albedo      : vec3<f32> = HitMaterial.Albedo.rgb;
    let Roughness   : f32       = HitMaterial.Roughness;

    let bViewNormalSameHemisphere : bool = (dot(V, HitInfo.HitNormal) > 0.0);
    let n_in    : f32 = select(1.0, HitMaterial.IOR, bViewNormalSameHemisphere);
    let n_out   : f32 = select(HitMaterial.IOR, 1.0, bViewNormalSameHemisphere);
    let H_norm  : f32 = length(n_in * L + n_out * V);

    let N : vec3<f32> = select(-HitInfo.HitNormal, HitInfo.HitNormal, bViewNormalSameHemisphere);
    let H : vec3<f32> = (n_in * L + n_out * V) / H_norm;

    let NdotL : f32 = abs(dot(N,L));
    let NdotV : f32 = abs(dot(N,V));
    let NdotH : f32 = abs(dot(N,H));
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

fn BSDF(HitInfo : HitResult, L : vec3<f32>, V : vec3<f32>) -> vec3<f32>
{
    let T : f32 = GetMaterialFromHit(HitInfo).Transmission;
    let N : vec3<f32> = HitInfo.HitNormal;

    if (dot(L, N) * dot(V, N) > 0.0) { return (1.0 - T) * BRDF(HitInfo, L, V); }
    return T * BTDF(HitInfo, L, V);
}

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

fn SampleOpaquePath(HitInfo : HitResult, OutDirection : vec3<f32>, pRandomSeed : ptr<function, u32>) -> PathSample
{
    // 1. HitInfo 해석
    let HitMaterial : Material  = GetMaterialFromHit(HitInfo);
    let BaseColor   : vec3<f32> = HitMaterial.Albedo.rgb;
    let Metalness   : f32       = HitMaterial.Metalness;
    let Roughness   : f32       = HitMaterial.Roughness;
 
    // 2. 정반사 확률 P_specular 계산
    let F0                  : vec3<f32> = mix(vec3f(0.04), BaseColor, Metalness);
    let SpecularReflectance : f32       = dot(F0, vec3f(0.299, 0.587, 0.114));
    let P_specular          : f32       = mix(SpecularReflectance, 1.0, Metalness);

    // 3. 새로운 방향 L 결정
    let V   : vec3<f32>     = OutDirection;
    let N   : vec3<f32>     = HitInfo.HitNormal;
    let TBN : mat3x3<f32>   = TBNMatrix(N);
    var L   : vec3<f32>;

    // 4. P_specular에 따라 정반사/난반사 중 하나의 재질로 결정
    if (Random(pRandomSeed) < P_specular) // 정반사 -> GGX Distribution
    {
        let H = TBN * SampleGGX(pRandomSeed, Roughness);
        L = reflect(-V, H);
    }
    else // 난반사 -> Cosine-Weighted Distribution
    {
        L = TBN * SampleCosineHemisphere(pRandomSeed);
    }

    let H       : vec3<f32> = normalize(L + V);
    let LdotN   : f32       = max(dot(L, N), 0.0);
    let NdotH   : f32       = max(dot(N, H), 0.0);
    let VdotH   : f32       = max(dot(V, H), 0.0);

    // 결정된 L에 대한 실제 PDF 계산
    let PDF_Specular    : f32 = GGXDistribution(NdotH, Roughness) / (4.0 * VdotH);
    let PDF_Diffuse     : f32 = LdotN / PI;
    let PDF             : f32 = mix(PDF_Diffuse, PDF_Specular, P_specular);

    return PathSample(L, PDF);
}

fn SampleTransmissivePath(HitInfo : HitResult, V : vec3<f32>, pRandomSeed : ptr<function, u32>) -> PathSample
{
    let HitMaterial : Material  = GetMaterialFromHit(HitInfo);
    let Roughness   : f32       = HitMaterial.Roughness;

    let bViewNormalSameHemisphere : bool = (dot(V, HitInfo.HitNormal) > 0.0);
    let n_in        : f32       = select(HitMaterial.IOR, 1.0, bViewNormalSameHemisphere);
    let n_out       : f32       = select(1.0, HitMaterial.IOR, bViewNormalSameHemisphere);
    let IORRatio    : f32       = n_in / n_out;
    let N           : vec3<f32> = select(-HitInfo.HitNormal, HitInfo.HitNormal, bViewNormalSameHemisphere);

    // 2. Frensel's Equation 으로부터 Reflection 확률 계산 (Schlik's Approximation)
    var P_reflection : f32;
    {
        let r   : f32 = (1.0 - IORRatio) / (1.0 + IORRatio);
        let r2  : f32 = r * r;
        let R2  : f32 = IORRatio * IORRatio;

        let cosTheta : f32 = abs(dot(V, N));
        P_reflection = Frensel(cosTheta, vec3f(r * r)).x;

        // 전반사 고려
        if ( cosTheta * cosTheta < (R2 - 1.0)/R2 ) { P_reflection = 1.0; }
    }

    // 3. 확률에 따라 새로운 방향 L 결정
    let bTreatAsReflection : bool = (Random(pRandomSeed) < P_reflection);

    let TBN : mat3x3<f32>   = TBNMatrix(N);
    let H   : vec3<f32>     = TBN * SampleGGX(pRandomSeed, Roughness);
    let L   : vec3<f32>     = normalize(select(refract(-V, H, IORRatio), reflect(-V, H), bTreatAsReflection));

    let NdotH   : f32 = max(dot(N, H), 0.0);
    let VdotH   : f32 = max(dot(V, H), 0.0);
    let PDF     : f32 = GGXDistribution(NdotH, Roughness) / (4.0 * VdotH);

    return PathSample(L, PDF);
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

        for (var SubMeshID : u32 = 0u; SubMeshID < CurrentMeshDescriptor.Count_SubMesh; SubMeshID++)
        {
            let IntersectionRange : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, GetBlasNode(CurrentMeshDescriptor, SubMeshID, 0u));
            if (!DoesRangesOverlap(RayValidRange, IntersectionRange)) { continue; }

            ////////////////////////////

            // Blas Tree 순회
            var Stack           : array<u32, 96>;
            var StackPointer    : i32 = -1;
            StackPointer++; Stack[StackPointer] = 0;
        
            while (StackPointer > -1)
            {
                let BlasID          : u32       = Stack[StackPointer]; StackPointer--;
                let CurrentBlasNode : BlasNode  = GetBlasNode(CurrentMeshDescriptor, SubMeshID, BlasID);
                let bIsLeafNode     : bool      = bool(CurrentBlasNode.Count & 0xffff0000u);
                    
                //if (BlasID == 3u) { BestHitResult.MaterialID = 1557u; }

                if (!bIsLeafNode)
                {
                    let LChildBlasID : u32 = BlasID + 1u;
                    let RChildBlasID : u32 = CurrentBlasNode.Offset / 8u;

                    let LChildBlas   : BlasNode = GetBlasNode(CurrentMeshDescriptor, SubMeshID, LChildBlasID);
                    let RChildBlas   : BlasNode = GetBlasNode(CurrentMeshDescriptor, SubMeshID, RChildBlasID);

                    let LIntersectionRange  : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, LChildBlas);
                    let RIntersectionRange  : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, RChildBlas);

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

                let PrimitiveStartID : u32 = CurrentBlasNode.Offset;
                let PrimitiveEndID   : u32 = PrimitiveStartID + (CurrentBlasNode.Count & 0x0000ffffu);

                ////////////////////////////
                for (var PrimitiveID : u32 = PrimitiveStartID; PrimitiveID < PrimitiveEndID; PrimitiveID++)
                {
                    let CurrentTriangle : Triangle = GetTriangle(CurrentMeshDescriptor, PrimitiveID);
                    let PrimitiveHitDistance : f32 = GetRayTriangleHitDistance(LocalRay, CurrentTriangle);
                    if (RayValidRange.y < PrimitiveHitDistance) { continue; }
                    
                    // 최종 살아남은 Primitive를 선택
                    RayValidRange.y = PrimitiveHitDistance;

                    BestHitResult.IsValidHit    = true;
                    BestHitResult.InstanceID    = InstanceID;
                    BestHitResult.PrimitiveID   = PrimitiveID;
                    BestHitResult.MaterialID    = SubMeshID;
                }
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
    }
    
    return BestHitResult;
}

fn CalculateDirectLighting(HitInfo : HitResult, OutDirection : vec3<f32>, pRandomSeed : ptr<function, u32>) -> vec3<f32>
{
    let HitMaterial : Material = GetMaterialFromHit(HitInfo);

    var TotalColor : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    for (var LightID : u32 = 0u; LightID < UniformBuffer.LightSourceCount; LightID++)
    {
        let LightSource     : Light     = GetLight(LightID);
        let LightRadiance   : vec3<f32> = LightSource.Intensity * LightSource.Color;

        var BSDFValue           : vec3<f32>;
        var VisibilityFactor    : vec3<f32>;
        var Geometry            : f32;
        var InvPDF              : f32;

        if (LightSource.LightType == 0u) // Directional Light
        {
            let L   : vec3<f32> = -LightSource.Direction;
            let End : vec3<f32> = HitInfo.HitPoint + L * 1e11;

            BSDFValue           = BSDF(HitInfo, L, OutDirection);
            VisibilityFactor    = Visibility(HitInfo.HitPoint, End);
            Geometry            = max(dot(L, HitInfo.HitNormal), 0.0);
            InvPDF              = 1.0; // Sampling을 하지 않는다는 의미의 항등원 1.0
        }

        else if (LightSource.LightType == 1u) // Point Light
        {
            let D : f32         = length(LightSource.Position - HitInfo.HitPoint);
            let L : vec3<f32>   = (LightSource.Position - HitInfo.HitPoint) / D;

            BSDFValue           = BSDF(HitInfo, L, OutDirection);
            VisibilityFactor    = Visibility(HitInfo.HitPoint, LightSource.Position);
            Geometry            = max(dot(L, HitInfo.HitNormal), 0.0) / (D * D);
            InvPDF              = 1.0; // Sampling을 하지 않는다는 의미의 항등원 1.0
        }

        else if (LightSource.LightType == 2u) // Rect Light
        {
            let Random_U : f32 = (Random(pRandomSeed) * 2.0) - 1.0;
            let Random_V : f32 = (Random(pRandomSeed) * 2.0) - 1.0;
            let SamplePoint : vec3<f32> = LightSource.Position + (Random_U * LightSource.U) + (Random_V * LightSource.V);

            let D : f32         = length(SamplePoint - HitInfo.HitPoint);
            let L : vec3<f32>   = (SamplePoint - HitInfo.HitPoint) / D;

            BSDFValue           = BSDF(HitInfo, L, OutDirection);
            VisibilityFactor    = Visibility(HitInfo.HitPoint, SamplePoint);
            Geometry            = max(dot(-L, LightSource.Direction), 0.0) * max(dot(L, HitInfo.HitNormal), 0.0) / (D * D);
            InvPDF              = LightSource.Area;
        }

        TotalColor += BSDFValue * VisibilityFactor * Geometry * InvPDF * LightRadiance;
    }

    return TotalColor;
}

fn SampleNextPath(HitInfo : HitResult, OutDirection : vec3<f32>, pRandomSeed : ptr<function, u32>) -> PathSample
{
    let HitMaterial         : Material  = GetMaterialFromHit(HitInfo);
    let bTreatAsTransparent : bool      = Random(pRandomSeed) < HitMaterial.Transmission;

    if (bTreatAsTransparent) { return SampleTransmissivePath(HitInfo, OutDirection, pRandomSeed); }
    return SampleOpaquePath(HitInfo, OutDirection, pRandomSeed);
}

//==========================================================================
// TEST Functions ==========================================================
//==========================================================================

//==========================================================================
// Shader Main =============================================================
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{

    // 0. 범위 밖 스레드는 계산 X
    {
        let bPixelInBoundary_X: bool = (ThreadID.x < UniformBuffer.Resolution.x);
        let bPixelInBoundary_Y: bool = (ThreadID.y < UniformBuffer.Resolution.y);

        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }


    // 1. 상태 초기화
    var RandomSeed          : u32       = GetHashValue(ThreadID.x * 1973u + ThreadID.y * 9277u + UniformBuffer.FrameIndex * 26699u);
    var CurrentRay          : Ray       = GenerateRayFromThreadID(ThreadID.xy);
    var ResultColor         : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var Throughput          : vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    let EnvironmentColor    : vec3<f32> = vec3<f32>(0.5, 0.5, 0.5);

    let DEBUG : bool = false;
    if (DEBUG)
    {
        for (var BounceDepth : u32 = 0u; BounceDepth < 1u; BounceDepth++)
        {
            let HitInfo : HitResult = TraceRay(CurrentRay);
            let HitMaterial = GetMaterialFromHit(HitInfo);
            
            ResultColor = HitInfo.HitNormal;
            //ResultColor.r = HitMaterial.Transmission;
        }

        textureStore(AccumTexture, ThreadID.xy, vec4<f32>(ResultColor, 1.0)); 
        return;
    }

    // 2. Path Tracing 수행
    for (var BounceDepth : u32 = 0u; BounceDepth < 10u; BounceDepth++)
    {
        // 가장 가까운 충돌점 검색
        let HitInfo     : HitResult = TraceRay(CurrentRay);
        let HitMaterial : Material  = GetMaterialFromHit(HitInfo);

        // 부딪히지 않았다면 -> 환경광 히트 처리 후 바운스 종료
        if (!HitInfo.IsValidHit) { ResultColor += Throughput * EnvironmentColor; break; }

        let OutDirection : vec3<f32> = -CurrentRay.Direction;

        // Surface Emit + All Direct Lights 가 만드는 색 계산
        ResultColor += Throughput * (HitMaterial.EmissiveIntensity * HitMaterial.EmissiveColor);
        ResultColor += Throughput * CalculateDirectLighting(HitInfo, OutDirection, &RandomSeed);

        // 다음 경로를 샘플링하고, 해당 경로에서의 Attenuation 계산 & Ray 발사
        let NextPathSample  : PathSample    = SampleNextPath(HitInfo, OutDirection, &RandomSeed);
        let InDirection     : vec3<f32>     = NextPathSample.Direction;

        let BSDF    : vec3<f32> = BSDF(HitInfo, InDirection, OutDirection);
        let Cosine  : f32       = abs(dot(HitInfo.HitNormal, InDirection));
        let InvPDF  : f32       = 1.0 / NextPathSample.PDF;

        // if ((Cosine * BSDF * InvPDF).r > 1.0)
        // {
        //     ResultColor = vec3f(f32(BounceDepth) / 20.0);
        //     break;
        // }
        
        Throughput *= Cosine * BSDF * InvPDF;
        CurrentRay = Ray(HitInfo.HitPoint, InDirection);
       
        // Russian Roulette 기법으로 수송량 낮은 경로는 조기 탈락
        let P_Survive : f32 = max(Throughput.r, max(Throughput.g, Throughput.b));
        if (Random(&RandomSeed) < P_Survive) { Throughput /= P_Survive; } else { break; }
    }


    // 3. 최종 색을 AccumTexture에 작성
    {
        let ColorUsed       : vec4<f32> = textureLoad(SceneTexture, ThreadID.xy, 0);
        let ColorToWrite    : vec3<f32> = mix(ColorUsed.rgb, ResultColor, 1.0 / f32(UniformBuffer.FrameIndex + 1));
        textureStore(AccumTexture, ThreadID.xy, vec4<f32>(ColorToWrite, 1.0));
    }

    return;
}