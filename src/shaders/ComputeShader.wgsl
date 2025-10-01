//==========================================================================
//Data Structures ==========================================================
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
    Offset_IndexBuffer                  : u32,
    Offset_PrimitiveToMaterialBuffer    : u32,

    Offset_BlasBuffer                   : u32,
    InstanceCount                       : u32,
    MeshCount                           : u32,
    MaterialCount                       : u32,
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

//==========================================================================
// TEST Functions ==========================================================
//==========================================================================

fn TEST_GET_BARYCENTRIC_COORD(Point: vec3<f32>, InTriangle: Triangle) -> vec3<f32>
{

    let A = InTriangle.Vertex_0.Position;
    let B = InTriangle.Vertex_1.Position;
    let C = InTriangle.Vertex_2.Position;

    // 삼각형의 두 변 벡터를 계산합니다 (A를 원점으로).
    let v0 = B - A;
    let v1 = C - A;
    // 점에서 A를 뺀 벡터를 계산합니다.
    let v2 = Point - A;

    // u와 v를 구하기 위한 연립방정식을 풀기 위해 dot product를 계산합니다.
    let d00 = dot(v0, v0);
    let d01 = dot(v0, v1);
    let d11 = dot(v1, v1);
    let d20 = dot(v2, v0);
    let d21 = dot(v2, v1);

    // Cramer의 법칙을 사용하여 u와 v를 계산합니다.
    let denom = d00 * d11 - d01 * d01;
    // 분모가 0에 가까우면 퇴화된(degenerate) 삼각형이므로 계산이 불안정할 수 있습니다.
    if (abs(denom) < 0.000001) {
        // 기본값으로 A에 모든 가중치를 할당하여 오류를 방지합니다.
        return vec3f(1.0, 0.0, 0.0);
    }

    let invDenom = 1.0 / denom;
    let u = (d11 * d20 - d01 * d21) * invDenom;
    let v = (d00 * d21 - d01 * d20) * invDenom;
    let w = 1.0 - u - v;

    return vec3f(w, u, v);
}

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

    // 현재 Pixel의 Ray 생성
    let CurrentRay: Ray = GenerateRayFromThreadID(ThreadID.xy);

    // Current Ray가 씬에서 처음 만나는 Primitive의 정보 계산
    let HitPrimitiveData: HitResult = TraceRay(CurrentRay);







    // WORKING : Lighting
    var ResultColor = vec3<f32>(0.1,0,0.4);
    if (HitPrimitiveData.IsValidHit)
    {
        let HitInstanceID       : u32               = HitPrimitiveData.InstanceID;
        let HitPrimitiveID      : u32               = HitPrimitiveData.PrimitiveID;
        let HitDistance         : f32               = HitPrimitiveData.HitDistance;

        let HitInstance         : Instance          = GetInstance(HitInstanceID);
        let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
        let HitPrimitive        : Triangle          = GetTriangle(HitMeshDescriptor, HitPrimitiveID);

        let HitPoint            : vec3<f32>         = CurrentRay.Start + (HitDistance * CurrentRay.Direction);
        let BaryCentricCoord    : vec3<f32>         = TEST_GET_BARYCENTRIC_COORD(HitPoint, HitPrimitive);
        let HitNormal           : vec3<f32>         = normalize((HitPrimitive.Vertex_0.Normal * BaryCentricCoord.x) + (HitPrimitive.Vertex_1.Normal * BaryCentricCoord.y) + (HitPrimitive.Vertex_2.Normal * BaryCentricCoord.z));
 
        let PrimitiveMaterial   : Material          = GetMaterial(HitPrimitive.MaterialID);


        // Test SunLight (나중에 Storage Buffer에 넣고 관리하기)
        let LightIntensity      : f32               = 1.0;
        let LightColor          : vec3<f32>         = vec3<f32>(1.0, 1.0, 1.0);
        let LightDirection      : vec3<f32>         = normalize(vec3<f32>(0.9, 1.0, 0.6));

        let ShadowRay           : Ray               = Ray(HitPoint + 1e-6 * HitNormal, -LightDirection);
        let ShadowRayHitResult  : HitResult         = TraceRay(ShadowRay);

        let Albedo              : vec3<f32>         = vec3<f32>(1.0, 1.0, 1.0);

        // Did Not Hit Any Instances -> Light Hit
        if (ShadowRayHitResult.IsValidHit)
        {
            ResultColor = Albedo * LightColor * LightIntensity * dot(LightDirection,HitNormal);
        }
        else
        {
            ResultColor = vec3<f32>(0,0,0);
        }
    }




    // TEMP 
    {
        let x0 = UniformBuffer.Resolution;
        let x1 = SceneBuffer[0];
        let x2 = GeometryBuffer[0];
        let x3 = AccelBuffer[0];
        let x4 = textureLoad(SceneTexture, vec2<i32>(i32(ThreadID.x), i32(ThreadID.y)), 0);
    }


    // Write Pixel Color To AccumTexture
    let ColorUsed = textureLoad(SceneTexture, ThreadID.xy, 0);
    ResultColor = (ColorUsed.rgb * f32(UniformBuffer.FrameIndex) + ResultColor)/f32(UniformBuffer.FrameIndex+1);
    textureStore(AccumTexture, ThreadID.xy, vec4<f32>(ResultColor, 1.0));

    return;
}