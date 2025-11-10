//==========================================================================
// Data Structures (From CPU) ==============================================
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
};



struct BlasNode
{
    Boundary_Min    : vec3<f32>,
    Boundary_Max    : vec3<f32>,
    Count           : u32,
    Offset          : u32,
};



struct Vertex
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    UV          : vec2<f32>,
};

//==========================================================================
// Data Structures =========================================================
//==========================================================================

struct Triangle
{
    Vertex_0 : Vertex,
    Vertex_1 : Vertex,
    Vertex_2 : Vertex,
};



struct Ray
{
    Start       : vec3<f32>,
    Direction   : vec3<f32>,
};



struct CompactSurface
{
    IsValidSurface  : bool,
    InstanceID      : u32,
    MaterialID      : u32,
    PrimitiveID     : u32,
    Barycentric     : vec2<f32>,
};



struct Surface
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    Material    : Material,
};



struct HitResult
{
    IsValidHit  : bool,
    HitDistance : f32,
    SurfaceInfo : CompactSurface,
};



struct BSDFSample
{
    Direction   : vec3<f32>,
    Lobe        : u32,
};



struct LightSample
{
    SamplePoint : vec3<f32>,
    Type        : u32,

    Emittance   : vec3<f32>,
    LightID     : i32,
};



struct CompactPath
{
    rSeed       : array<u32, 4u>,
    XL          : LightSample,    
    RcVertex    : vec4<f32>,

    k           : u32,
    Lobe_k_1    : u32,
    Lobe_k      : u32,
    J           : f32,
};



struct Path
{
    CSurface    : array<CompactSurface, 8u>,
    Lobe        : array<u32, 8u>,
    rSeed       : array<u32, 8u>,

    X0_Position : vec3<f32>,
    length      : u32,
    XL          : LightSample,
};



struct Reservoir
{
    Sample  : CompactPath,
    UCW     : f32,
    C       : u32,
    P_hat   : f32,
};

//==========================================================================
// Constants ===============================================================
//==========================================================================

const WORKGROUP_SIZE    : vec3<u32> = vec3<u32>(8u, 8u, 1u);

const STRIDE_INSTANCE   : u32 = 33u;
const STRIDE_LIGHT      : u32 = 18u;
const STRIDE_DESCRIPTOR : u32 =  6u;
const STRIDE_MATERIAL   : u32 = 15u;
const STRIDE_VERTEX     : u32 =  8u;
const STRIDE_BLAS       : u32 =  8u;

const RECONNECTION_DISTANCE     : f32 = 0.1;
const RECONNECTION_ROUGHNESS    : f32 = 0.5;

const PI        : f32       = 3.141592;
const ENV_COLOR : vec3<f32> = vec3<f32>(0.5, 0.5, 0.5);

//==========================================================================
// Enums ===================================================================
//==========================================================================

const LIGHT_DIRECTION   : u32 = 0u;
const LIGHT_POINT       : u32 = 1u;
const LIGHT_RECT        : u32 = 2u;
const LIGHT_ENV         : u32 = 3u;

const LOBE_LAMBERT  : u32 = 0u;
const LOBE_GGX      : u32 = 1u;
const LOBE_NEE      : u32 = 2u;
const LOBE_LIGHT    : u32 = 3u;

//==========================================================================
// GPU Bindings ============================================================
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer   : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer     : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer  : array<u32>;
@group(0) @binding(3) var<storage, read>    AccelBuffer     : array<u32>;
@group(0) @binding(4) var<storage, read>    ReservoirBuffer : array<Reservoir>;

@group(0) @binding(10) var G_Buffer         : texture_2d<f32>;
@group(0) @binding(11) var SceneTexture     : texture_2d<f32>;

@group(1) @binding(10) var ResultTexture    : texture_storage_2d<rgba32float, write>;

//==========================================================================
// Maths ===================================================================
//==========================================================================

fn DoRangesOverlap(Range1 : vec2<f32>, Range2 : vec2<f32>) -> bool
{
    return (Range1.x <= Range2.y) && (Range2.x <= Range1.y);
}

fn TransformVec3WithMat4x4(InVector3 : vec3<f32>, TransformMatrix : mat4x4<f32>) -> vec3<f32>
{
    let TransformedVector : vec4<f32> = TransformMatrix * vec4<f32>(InVector3, 1.0);
    return TransformedVector.xyz / TransformedVector.w;
}

fn TransformRayWithMat4x4(InRay : Ray, TransformMatrix : mat4x4<f32>, bNormalize : bool) -> Ray
{
    let Start   : vec3<f32> = TransformVec3WithMat4x4(InRay.Start, TransformMatrix);
    let End     : vec3<f32> = TransformVec3WithMat4x4(InRay.Start + InRay.Direction, TransformMatrix);
    
    let Direction_Unnormalized  : vec3<f32> = End - Start;
    let Direction_Normalized    : vec3<f32> = normalize(Direction_Unnormalized);
    let Direction               : vec3<f32> = select(Direction_Unnormalized, Direction_Normalized, bNormalize);

    return Ray(Start, Direction);
}

fn GetRayAABBIntersectionRange(InRay : Ray, InBlasNode : BlasNode) -> vec2<f32>
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

fn GetRayTriangleHitDistance(InRay : Ray, InTriangle : Triangle) -> f32
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

fn GetBaryCentricWeights(Point : vec3<f32>, InTriangle : Triangle) -> vec3<f32>
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

fn TraceRay(InRay : Ray) -> HitResult
{
    var BestHitResult : HitResult = HitResult();
    var RayValidRange : vec2<f32> = vec2<f32>(1e-4, 1e10);
    
    BestHitResult.IsValidHit = false;

    // Trace Ray
    for (var InstanceID : u32 = 0u; InstanceID < UniformBuffer.InstanceCount; InstanceID++)
    {
        // 현재 Instance 기준으로 정보 가져오기
        let CurrentInstance         : Instance          = GetInstance(InstanceID);
        let CurrentMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(CurrentInstance.MeshID);
        let LocalRay                : Ray               = TransformRayWithMat4x4(InRay, CurrentInstance.ModelMatrix_Inverse, false);

        for (var SubMeshID : u32 = 0u; SubMeshID < CurrentMeshDescriptor.Count_SubMesh; SubMeshID++)
        {
            let IntersectionRange : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, GetBlasNode(CurrentMeshDescriptor, SubMeshID, 0u));
            if (!DoRangesOverlap(RayValidRange, IntersectionRange)) { continue; }

            // Blas Tree 순회
            var Stack           : array<u32, 64>;
            var StackPointer    : i32 = -1;
            StackPointer++; Stack[StackPointer] = 0;
        
            while (StackPointer > -1)
            {
                let BlasID          : u32       = Stack[StackPointer]; StackPointer--;
                let CurrentBlasNode : BlasNode  = GetBlasNode(CurrentMeshDescriptor, SubMeshID, BlasID);
                let bIsLeafNode     : bool      = bool(CurrentBlasNode.Count & 0xffff0000u);

                if (!bIsLeafNode)
                {
                    let LChildBlasID : u32 = BlasID + 1u;
                    let RChildBlasID : u32 = CurrentBlasNode.Offset / 8u;

                    let LChildBlas   : BlasNode = GetBlasNode(CurrentMeshDescriptor, SubMeshID, LChildBlasID);
                    let RChildBlas   : BlasNode = GetBlasNode(CurrentMeshDescriptor, SubMeshID, RChildBlasID);

                    let LIntersectionRange  : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, LChildBlas);
                    let RIntersectionRange  : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, RChildBlas);

                    let bLDidHit : bool = DoRangesOverlap(RayValidRange, LIntersectionRange);
                    let bRDidHit : bool = DoRangesOverlap(RayValidRange, RIntersectionRange);

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

                for (var PrimitiveID : u32 = PrimitiveStartID; PrimitiveID < PrimitiveEndID; PrimitiveID++)
                {
                    let CurrentTriangle : Triangle = GetTriangle(CurrentMeshDescriptor, PrimitiveID);
                    let PrimitiveHitDistance : f32 = GetRayTriangleHitDistance(LocalRay, CurrentTriangle);
                    if (RayValidRange.y < PrimitiveHitDistance) { continue; }
                    
                    // 최종 살아남은 Primitive를 선택
                    RayValidRange.y = PrimitiveHitDistance;

                    BestHitResult.IsValidHit                    = true;
                    BestHitResult.SurfaceInfo.IsValidSurface    = true;
                    BestHitResult.SurfaceInfo.InstanceID        = InstanceID;
                    BestHitResult.SurfaceInfo.MaterialID        = SubMeshID;
                    BestHitResult.SurfaceInfo.PrimitiveID       = PrimitiveID;                
                }
            }
        }
    }

    // 충돌했다면 충돌 지점의 정보 채워넣기
    if (BestHitResult.IsValidHit)
    {
        BestHitResult.HitDistance = RayValidRange.y;

        let HitInstance         : Instance          = GetInstance(BestHitResult.SurfaceInfo.InstanceID);
        let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
        let HitPrimitiveLocal   : Triangle          = GetTriangle(HitMeshDescriptor, BestHitResult.SurfaceInfo.PrimitiveID);
        let HitPrimitive        : Triangle          = GetTriangleWorldSpace(HitInstance, HitPrimitiveLocal);
        let HitPoint            : vec3<f32>         = InRay.Start + (BestHitResult.HitDistance * InRay.Direction);

        BestHitResult.SurfaceInfo.Barycentric = GetBaryCentricWeights(HitPoint, HitPrimitive).xy;
    }
    
    return BestHitResult;
}

fn Luminance(X : vec3<f32>) -> f32
{
    return dot(X, vec3<f32>(0.2126, 0.7152, 0.0722));
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

        let RayStart : vec3<f32> = CurrentRay.Start + CurrentRay.Direction * ClosestHit.HitDistance;
        CurrentRay = Ray(RayStart, CurrentRay.Direction);
    }

    return vec3<f32>(0.0, 0.0, 0.0);
}

fn GeometryFactor(A : Surface, B : Surface) -> f32
{
    let r   : vec3<f32> = A.Position - B.Position;
    let dir : vec3<f32> = normalize(r);

    let Cos_A : f32 = abs( dot(A.Normal, dir) );
    let Cos_B : f32 = abs( dot(B.Normal, dir) );

    return Cos_A * Cos_B / dot(r, r);
}

fn GeometryFactor_Light(XL : LightSample, X : Surface) -> f32
{
    switch ( XL.Type )
    {
        case LIGHT_DIRECTION :
        { 
            return abs( dot(X.Normal, XL.SamplePoint) ); 
        }
        case LIGHT_POINT :
        {
            let r   : vec3<f32> = XL.SamplePoint - X.Position;
            let dir : vec3<f32> = normalize(r);
            let Cos : f32 = abs( dot(X.Normal, dir) );

            return Cos / max(dot(r, r), 1e-6);
        }
        case LIGHT_RECT :
        {
            let r   : vec3<f32> = XL.SamplePoint - X.Position;
            let dir : vec3<f32> = normalize(r);
            return abs( dot(X.Normal, dir) );
        }
        case LIGHT_ENV : { return abs( dot(X.Normal, XL.SamplePoint) );  }
        default : { return 0.0; }
    }
}

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
    //OutMaterial.Albedo      = vec4f(1.0);
    OutMaterial.Roughness   = max(OutMaterial.Roughness, 0.01);

    return OutMaterial;
}

fn GetMaterialFromHit(HitInfo : HitResult) -> Material
{
    let HitInstance         : Instance          = GetInstance(HitInfo.SurfaceInfo.InstanceID);
    let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
    
    return GetMaterial(HitMeshDescriptor, HitInfo.SurfaceInfo.MaterialID);
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

fn GetLightsCDF(Idx : u32) -> f32
{
    let Offset : u32 = UniformBuffer.Offset_LightsCDFBuffer;
    return bitcast<f32>(SceneBuffer[Offset + Idx]);
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

fn GetCompactSurface(RcVertex : vec4<f32>) -> CompactSurface
{
    var OutCompactSurface           : CompactSurface    = CompactSurface();
    let Valid_InstanceID_MaterialID : u32               = bitcast<u32>(RcVertex.r);

    OutCompactSurface.IsValidSurface    = bool( Valid_InstanceID_MaterialID & 0x80000000u );
    OutCompactSurface.InstanceID        = ( Valid_InstanceID_MaterialID & 0x7fff0000u ) >> 16u;
    OutCompactSurface.MaterialID        = ( Valid_InstanceID_MaterialID & 0x0000ffffu );
    OutCompactSurface.PrimitiveID       = bitcast<u32>(RcVertex.g);
    OutCompactSurface.Barycentric       = vec2<f32>( RcVertex.b, RcVertex.a );

    return OutCompactSurface;
}

fn GetSurface(X : CompactSurface) -> Surface
{
    var OutSurface : Surface = Surface();

    let SurfaceInstance         : Instance          = GetInstance( X.InstanceID );
    let SurfaceMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor( SurfaceInstance.MeshID );
    let SurfaceMaterial         : Material          = GetMaterial( SurfaceMeshDescriptor, X.MaterialID );
    let SurfaceTriangleLocal    : Triangle          = GetTriangle( SurfaceMeshDescriptor, X.PrimitiveID );
    let SurfaceTriangle         : Triangle          = GetTriangleWorldSpace( SurfaceInstance, SurfaceTriangleLocal );

    let U   : f32 = X.Barycentric.x;
    let V   : f32 = X.Barycentric.y;
    let W   : f32 = 1.0 - U - V;

    let N0  : vec3<f32> = SurfaceTriangle.Vertex_0.Normal * U;
    let N1  : vec3<f32> = SurfaceTriangle.Vertex_1.Normal * V;
    let N2  : vec3<f32> = SurfaceTriangle.Vertex_2.Normal * W;
    let N   : vec3<f32> = normalize( N0 + N1 + N2 );

    let P0  : vec3<f32> = SurfaceTriangle.Vertex_0.Position * U;
    let P1  : vec3<f32> = SurfaceTriangle.Vertex_1.Position * V;
    let P2  : vec3<f32> = SurfaceTriangle.Vertex_2.Position * W;
    let P   : vec3<f32> = P0 + P1 + P2;

    OutSurface.Position = P;
    OutSurface.Normal   = N;
    OutSurface.Material = SurfaceMaterial;

    return OutSurface;
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

fn GetReservoir(ThreadID : vec2<u32>) -> Reservoir
{
    let idx : u32 = ThreadID.y * UniformBuffer.Resolution.x + ThreadID.x;
    return ReservoirBuffer[idx];
}

//==========================================================================
// PBR Evaluations =========================================================
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

fn BRDF(X : Surface, L : vec3<f32>, V : vec3<f32>) -> vec3<f32>
{
    let N : vec3<f32> = X.Normal;
    let H : vec3<f32> = normalize(L + V);

    let NdotV : f32 = max(dot(N, V), 0.0);
    let NdotL : f32 = max(dot(N, L), 0.0);
    let NdotH : f32 = max(dot(N, H), 0.0);
    let VdotH : f32 = max(dot(V, H), 0.0);

    let BaseColor       : vec3<f32> = X.Material.Albedo.rgb;
    let Metalness       : f32       = X.Material.Metalness;
    let Roughness       : f32       = X.Material.Roughness;
    let Transmission    : f32       = X.Material.Transmission;

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

fn BTDF(X : Surface, L : vec3<f32>, V : vec3<f32>) -> vec3<f32>
{
    let Albedo      : vec3<f32> = X.Material.Albedo.rgb;
    let Roughness   : f32       = X.Material.Roughness;

    let bViewNormalSameHemisphere : bool = (dot(V, X.Normal) > 0.0);
    let n_in    : f32 = select(1.0, X.Material.IOR, bViewNormalSameHemisphere);
    let n_out   : f32 = select(X.Material.IOR, 1.0, bViewNormalSameHemisphere);
    let H_norm  : f32 = length(n_in * L + n_out * V);

    let N : vec3<f32> = select(-X.Normal, X.Normal, bViewNormalSameHemisphere);
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

fn BSDF(X : Surface, L : vec3<f32>, V : vec3<f32>) -> vec3<f32>
{
    let T : f32 = X.Material.Transmission;
    let N : vec3<f32> = X.Normal;

    if (dot(L, N) * dot(V, N) > 0.0) { return (1.0 - T) * BRDF(X, L, V); }
    return T * BTDF(X, L, V);
}

//==========================================================================
// Sampling Methods ========================================================
//==========================================================================

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

fn SampleNEE(pRandomSeed : ptr<function, u32>) -> LightSample
{
    // LightsCDFBuffer 에서 하나의 Light 결정
    var OutNEESample : LightSample = LightSample();
    {
        let P : f32 = Random(pRandomSeed);
        var L : u32 = 0u;
        var R : u32 = UniformBuffer.LightSourceCount - 1u;
        var M : u32 = (L + R) >> 1;

        while (L < R)
        {
            if (P < GetLightsCDF(M)) { R = M; }
            else { L = M + 1; }

            M = (L + R) >> 1;
        }

        OutNEESample.LightID = i32(M);
    }

    // Rect Light 의 경우 위치 샘플링이 필요
    let LightSource : Light = GetLight(u32(OutNEESample.LightID));

    OutNEESample.Type       = LightSource.LightType;
    OutNEESample.Emittance  = L_emit(OutNEESample);

    switch ( OutNEESample.Type )
    {
        case LIGHT_POINT : { OutNEESample.SamplePoint = LightSource.Position; }
        case LIGHT_RECT :
        {
            let Random_U    : f32       = (Random(pRandomSeed) * 2.0) - 1.0;
            let Random_V    : f32       = (Random(pRandomSeed) * 2.0) - 1.0;
            let Offset      : vec3<f32> = (Random_U * LightSource.U) + (Random_V * LightSource.V);

            OutNEESample.SamplePoint = LightSource.Position + Offset;
        }

        default : { OutNEESample.SamplePoint = LightSource.Direction; }
    }

    return OutNEESample;
}

fn SampleBRDF(pRandomSeed : ptr<function, u32>, X : Surface, V : vec3<f32>) -> BSDFSample
{
    // 1. HitInfo 해석
    let Albedo          : vec3<f32> = X.Material.Albedo.rgb;
    let Metalness       : f32       = X.Material.Metalness;
    let Roughness       : f32       = X.Material.Roughness;
 
    // 2. 정반사 확률 P_specular 계산
    let F0          : vec3<f32> = mix(vec3f(0.04), Albedo, Metalness);
    let P_specular  : f32       = mix(Luminance(F0), 1.0, Metalness);

    // 3. 새로운 방향 L 결정
    let N   : vec3<f32>     = X.Normal;
    let TBN : mat3x3<f32>   = TBNMatrix(N);
    var L   : vec3<f32>;

    // 4. P_specular에 따라 정반사/난반사 중 하나의 재질로 결정
    let bTreatAsSpecular : bool = Random(pRandomSeed) < P_specular;
    if (bTreatAsSpecular) // 정반사 -> GGX Distribution
    {
        let H = TBN * SampleGGX(pRandomSeed, Roughness);
        L = reflect(-V, H);
    }
    else // 난반사 -> Cosine-Weighted Distribution
    {
        L = TBN * SampleCosineHemisphere(pRandomSeed);
    }

    var OutBSDFSample : BSDFSample = BSDFSample();

    OutBSDFSample.Direction = L;
    OutBSDFSample.Lobe      = select(LOBE_LAMBERT, LOBE_GGX, bTreatAsSpecular);

    return OutBSDFSample;
}

fn SampleBTDF(pRandomSeed : ptr<function, u32>, X : Surface, V : vec3<f32>) -> BSDFSample
{
    let bViewNormalSameHemisphere : bool = (dot(V, X.Normal) > 0.0);
    let n_in        : f32       = select(X.Material.IOR, 1.0, bViewNormalSameHemisphere);
    let n_out       : f32       = select(1.0, X.Material.IOR, bViewNormalSameHemisphere);
    let IORRatio    : f32       = n_in / n_out;
    let N           : vec3<f32> = select(-X.Normal, X.Normal, bViewNormalSameHemisphere);

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
    let H   : vec3<f32>     = TBN * SampleGGX(pRandomSeed, X.Material.Roughness);
    let L   : vec3<f32>     = normalize(select(refract(-V, H, IORRatio), reflect(-V, H), bTreatAsReflection));
    
    var OutBSDFSample : BSDFSample = BSDFSample();

    OutBSDFSample.Direction = L;
    OutBSDFSample.Lobe      = LOBE_GGX;

    return OutBSDFSample;
}

fn SampleBSDF(pRandomSeed : ptr<function, u32>, X : Surface, V : vec3<f32>) -> BSDFSample
{
    let bTreatAsTransparent : bool = Random(pRandomSeed) < X.Material.Transmission;

    if (bTreatAsTransparent) { return SampleBTDF(pRandomSeed, X, V); }
    return SampleBRDF(pRandomSeed, X, V);
}

//==========================================================================
// Probability Density Functions ===========================================
//==========================================================================

fn PDF_NEE(XL : LightSample, X : Surface) -> f32
{
    let LightSource : Light = GetLight(u32(XL.LightID));

    let Pr_Before : f32 = select(GetLightsCDF(u32(XL.LightID)-1), 0.0, XL.LightID == 0);
    let Pr_Choose : f32 = GetLightsCDF(u32(XL.LightID)) - Pr_Before;

    var PDF_Point : f32 = 1.0;
    if (XL.Type == LIGHT_RECT)
    {
        let N   : vec3<f32> = LightSource.Direction;
        let r   : vec3<f32> = XL.SamplePoint - X.Position;
        let cos : f32       = abs(dot(normalize(r), N));

        let Jacobian : f32 = dot(r,r) / max(cos, 1e-6);
        PDF_Point = Jacobian / LightSource.Area;
    }
    
    return Pr_Choose * PDF_Point;
}

fn PDF_BRDF(X_Next : Surface, X : Surface, X_Prev : Surface) -> f32
{
    // 1. HitInfo 해석
    let Albedo      : vec3<f32> = X.Material.Albedo.rgb;
    let Metalness   : f32       = X.Material.Metalness;
    let Roughness   : f32       = X.Material.Roughness;

    // 2. 정반사 확률 P_specular 계산
    let F0          : vec3<f32> = mix(vec3f(0.04), Albedo, Metalness);
    let P_specular  : f32       = mix(Luminance(F0), 1.0, Metalness);

    // 3. PDF_BRDF 계산
    let L       : vec3<f32> = normalize( X_Next.Position - X.Position );
    let V       : vec3<f32> = normalize( X_Prev.Position - X.Position );
    let N       : vec3<f32> = X.Normal;
    let H       : vec3<f32> = normalize(L + V);
    let LdotN   : f32       = max(dot(L, N), 0.0);
    let NdotH   : f32       = max(dot(N, H), 0.0);
    let VdotH   : f32       = max(dot(V, H), 0.0);

    let PDF_Specular    : f32 = GGXDistribution(NdotH, Roughness) / (4.0 * VdotH);
    let PDF_Diffuse     : f32 = LdotN / PI;
    let PDF_BRDF        : f32 = mix(PDF_Diffuse, PDF_Specular, P_specular);

    return PDF_BRDF;
}

fn PDF_BTDF(X_Next : Surface, X : Surface, X_Prev : Surface) -> f32
{
    // --- 1. 기본 정보 및 IOR 설정 ---
    let Roughness   : f32      = X.Material.Roughness;
    let Alpha       : f32      = Roughness * Roughness; // PDF 계산에 필요

    let L : vec3<f32> = normalize( X_Next.Position - X.Position );
    let V : vec3<f32> = normalize( X_Prev.Position - X.Position );

    let bViewNormalSameHemisphere : bool = (dot(V, X.Normal) > 0.0);
    let n_in   : f32 = select(X.Material.IOR, 1.0, bViewNormalSameHemisphere);
    let n_out  : f32 = select(1.0, X.Material.IOR, bViewNormalSameHemisphere);
    let IORRatio : f32 = n_in / n_out;
    let N : vec3<f32> = select(-X.Normal, X.Normal, bViewNormalSameHemisphere);

    // --- 2. 프레넬 반사 확률 계산 ---
    var P_reflection : f32;
    {
        let r0 = (1.0 - IORRatio) / (1.0 + IORRatio);
        let R0 = r0 * r0;
        let cosTheta = abs(dot(V, N));
        P_reflection = Frensel(cosTheta, vec3f(R0)).x;

        let sinThetaSq = 1.0 - cosTheta * cosTheta;
        let R2 = IORRatio * IORRatio;
        if (sinThetaSq * R2 > 1.0) { P_reflection = 1.0; } // TIR
    }
    let P_transmission = 1.0 - P_reflection;


    // --- 3. 두 경로의 PDF를 각각 계산 ---
    
    // 3a. 반사(Reflection) 경로 PDF 계산
    var pdf_reflect : f32 = 0.0;
    if (P_reflection > 0.0) {
        // 반사 중간 벡터 H_reflect 계산
        let H_reflect = normalize(V + L);
        let NdotH_r = max(0.0, dot(N, H_reflect));
        let VdotH_r = max(0.0, dot(V, H_reflect));

        // p(L) = D(h_r) * |J_r| = D(h_r) / (4 * V.h_r)
        if (VdotH_r > 0.0) {
            pdf_reflect = GGXDistribution(NdotH_r, Roughness) / (4.0 * VdotH_r);
        }
    }

    // 3b. 굴절(Transmission) 경로 PDF 계산
    var pdf_transmit : f32 = 0.0;
    if (P_transmission > 0.0) {
        // 굴절 중간 벡터 H_refract 계산
        let H_refract = normalize(V * n_out + L * n_in); // (스넬의 법칙에서 유도됨)
        
        let NdotH_t = max(0.0, dot(N, H_refract));
        let VdotH_t = max(0.0, dot(V, H_refract));
        let LdotH_t = max(0.0, dot(L, H_refract)); // L이 안쪽을 향해야 하지만, 여기선 H와의 각도만 필요

        // 굴절 야코비안 |J_t| 계산
        // |J_t| = (eta_o^2 * |V.H|) / (eta_i * L.H + eta_o * V.H)^2
        // |J_t| = (n_out^2 * VdotH_t) / (n_in * LdotH_t + n_out * VdotH_t)^2
        let denom = (n_in * LdotH_t + n_out * VdotH_t);
        if (denom > 0.0) {
            let J_transmit = (n_out * n_out * VdotH_t) / (denom * denom);
            
            // p(L) = D(h_t) * |J_t|
            pdf_transmit = GGXDistribution(NdotH_t, Roughness) * abs(J_transmit);
        }
    }

    // --- 4. 최종 결합 PDF 반환 ---
    // PDF = (반사 선택 확률 * 반사 PDF) + (굴절 선택 확률 * 굴절 PDF)
    let PDF_BTDF : f32 = P_reflection * pdf_reflect + P_transmission * pdf_transmit;

    return PDF_BTDF;
}

fn PDF_BSDF(X_Next : Surface, X : Surface, X_Prev : Surface) -> f32
{
    let L : vec3<f32> = normalize( X_Next.Position - X.Position );
    let V : vec3<f32> = normalize( X_Prev.Position - X.Position );
    let N : vec3<f32> = X.Normal;

    if (dot(L, N) * dot(V, N) > 0.0) { return PDF_BRDF(X_Next, X, X_Prev); }
    return PDF_BTDF(X_Next, X, X_Prev);
}

//==========================================================================
// Functions ===============================================================
//==========================================================================

fn InitializeRandomSeed(ThreadID : vec2<u32>) -> u32
{
    return GetHashValue(ThreadID.x * 1973u + ThreadID.y * 9277u + UniformBuffer.FrameIndex * 26699u);
}

fn Get_X0(ThreadID : vec2<u32>) -> vec3<f32>
{
    let PixelUV     : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution);
    let PixelNDC    : vec3<f32> = vec3<f32>(2.0 * PixelUV - 1.0, 0.0);

    return TransformVec3WithMat4x4(PixelNDC, UniformBuffer.ViewProjectionMatrix_Inverse);
}

fn Get_X1(ThreadID : vec2<u32>) -> CompactSurface
{
    let GBufferData : vec4<f32> = textureLoad(G_Buffer, ThreadID, 0);
    return GetCompactSurface(GBufferData);
}

fn IsSafeToReconnect(A : Surface, Lobe_A : u32, B : Surface, Lobe_B : u32) -> bool
{
    let Roughness_A     : f32 = select(A.Material.Roughness, 1.0, Lobe_A == LOBE_LAMBERT);
    let Roughness_B     : f32 = select(B.Material.Roughness, 1.0, Lobe_B == LOBE_LAMBERT);
    let bRoughEnough    : bool = ( min(Roughness_A, Roughness_B) >= RECONNECTION_ROUGHNESS );

    let bFarEnough      : bool = ( length(A.Position - B.Position) >= RECONNECTION_DISTANCE );

    return bFarEnough && bRoughEnough;
}

fn IsSafeToReconnect_Light(X : Surface, XL : LightSample) -> bool
{
    let bRoughEnough        : bool  = ( X.Material.Roughness >= RECONNECTION_ROUGHNESS );

    let bIsDirectionalLight : bool  = ( XL.Type == LIGHT_DIRECTION ) || ( XL.Type == LIGHT_ENV );
    let bFarEnough          : bool  = bIsDirectionalLight || ( length(X.Position - XL.SamplePoint) >= RECONNECTION_DISTANCE );

    return bFarEnough && bRoughEnough;
}

fn GetRcVertex(X : CompactSurface) -> vec4<f32>
{
    var OutRcVertex : vec4<f32>;
    let ValidFlag   : u32 = u32(X.IsValidSurface) << 31u;
    let InstanceID  : u32 = X.InstanceID << 16u;
    let MaterialID  : u32 = X.MaterialID;

    OutRcVertex.r = bitcast<f32>(ValidFlag | InstanceID | MaterialID);
    OutRcVertex.g = bitcast<f32>(X.PrimitiveID);
    OutRcVertex.b = X.Barycentric.x;
    OutRcVertex.a = X.Barycentric.y;

    return OutRcVertex;
}

fn GetDirectionToLight(Position : vec3<f32>, XL : LightSample) -> vec3<f32>
{
    switch ( XL.Type )
    {
        case LIGHT_DIRECTION    : { return -XL.SamplePoint; }
        case LIGHT_POINT        : { return normalize( XL.SamplePoint - Position ); }
        case LIGHT_RECT         : { return normalize( XL.SamplePoint - Position ); }
        case LIGHT_ENV          : { return -XL.SamplePoint; }

        default : { return vec3<f32>(0.0, 0.0, 0.0); }
    }
}

fn Attenuation(X_Next : Surface, X : Surface, X_Prev : Surface) -> vec3<f32>
{
    let L           : vec3<f32> = normalize( X_Next.Position - X.Position );
    let V           : vec3<f32> = normalize( X_Prev.Position - X.Position );

    let BSDF        : vec3<f32> = BSDF(X, L, V);
    let cos         : f32       = abs(dot(L, X.Normal));
    let Visibility  : vec3<f32> = Visibility(X_Next.Position, X.Position);

    return BSDF * cos * Visibility;
}

fn Attenuation_Light(XL : LightSample, X : Surface, X_Prev : Surface) -> vec3<f32>
{
    let L : vec3<f32> = GetDirectionToLight(X.Position, XL);
    let V : vec3<f32> = normalize( X_Prev.Position - X.Position );

    let BSDF : vec3<f32> = BSDF(X, L, V);
    let G : f32 = GeometryFactor_Light(XL, X);

    let LightPosition_Directional   : vec3<f32> = X.Position - XL.SamplePoint * 1e10;
    let bTreatAsDirectionalLight    : bool      = (XL.Type == LIGHT_DIRECTION) || (XL.Type == LIGHT_ENV);
    let LightPosition               : vec3<f32> = select( XL.SamplePoint, LightPosition_Directional, bTreatAsDirectionalLight );

    let Visibility : vec3<f32> = Visibility(X.Position, LightPosition);

    return BSDF * G * Visibility;
}

fn L_emit(XL : LightSample) -> vec3<f32>
{
    if ( XL.Type == LIGHT_ENV ) { return ENV_COLOR; }

    let LightSource : Light = GetLight(u32(XL.LightID));
    let LightColor : vec3<f32> = LightSource.Intensity * LightSource.Color;
    return select(vec3<f32>(0.0, 0.0, 0.0), LightColor, XL.LightID >= 0);
}

//==========================================================================
// Shader Main =============================================================
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID : vec3<u32>)
{

    // 0. 범위 밖 스레드는 계산 X
    {
        let bPixelInBoundary_X : bool = (ThreadID.x < UniformBuffer.Resolution.x);
        let bPixelInBoundary_Y : bool = (ThreadID.y < UniformBuffer.Resolution.y);

        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }

    if ( !Get_X1(ThreadID.xy).IsValidSurface )
    {
        textureStore(ResultTexture, ThreadID.xy, vec4<f32>(ENV_COLOR, 1.0));
        return;
    }

    // 1. 초기화
    let Reservoir   : Reservoir     = GetReservoir(ThreadID.xy);
    let CompactPath : CompactPath   = Reservoir.Sample;
    var Throughput  : vec3<f32>     = vec3<f32>(1.0, 1.0, 1.0);
    let k           : u32           = ( CompactPath.k & 0x0000ffffu );

    var X_Prev : Surface;
    var X_Curr : Surface;
    var X_Next : Surface;

    X_Prev.Position = Get_X0(ThreadID.xy);
    X_Curr          = GetSurface( Get_X1(ThreadID.xy) );

    for (var i = 2u; i < k; i++)
    {
        var rSeed : u32 = CompactPath.rSeed[i - 2];

        let V : vec3<f32>   = normalize( X_Prev.Position - X_Curr.Position );
        let W : BSDFSample  = SampleBSDF(&rSeed, X_Curr, V);

        let HitInfo : HitResult = TraceRay( Ray(X_Curr.Position, W.Direction) );
        X_Next = GetSurface( HitInfo.SurfaceInfo );

        Throughput *= Attenuation(X_Next, X_Curr, X_Prev);

        X_Prev = X_Curr;
        X_Curr = X_Next;
    }

    if ( CompactPath.Lobe_k != LOBE_LIGHT )
    {
        X_Next = GetSurface( GetCompactSurface( CompactPath.RcVertex ) );

        Throughput *= Attenuation(X_Next, X_Curr, X_Prev);

        X_Prev = X_Curr;
        X_Curr = X_Next;
    }
    
    Throughput *= Attenuation_Light(CompactPath.XL, X_Curr, X_Prev);

    // 저장
    {
        let FrameColor : vec3<f32> = CompactPath.XL.Emittance * Throughput * Reservoir.UCW/max(1.0, f32(Reservoir.C));
        let SceneColor : vec4<f32> = textureLoad(SceneTexture, ThreadID.xy, 0);
        let WriteColor : vec3<f32> = mix(SceneColor.rgb, FrameColor, 1.0 / f32(UniformBuffer.FrameIndex + 1));

        textureStore(ResultTexture, ThreadID.xy, vec4<f32>(WriteColor, 1.0));
    }

    return;
}