
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



struct HitInfo
{
    Distance    : f32,
    TargetID    : u32,
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

fn GetInstance(InstanceID: u32) -> Instance
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

fn GetMeshDescriptor(MeshID: u32) -> MeshDescriptor
{

    let Offset : u32 = UniformBuffer.Offset_MeshDescriptorBuffer + (8u * MeshID);

    var OutMeshDescriptor: MeshDescriptor = MeshDescriptor();

    OutMeshDescriptor.BlasOffset                    = SceneBuffer[Offset + 0u];
    OutMeshDescriptor.VertexOffset                  = SceneBuffer[Offset + 1u];
    OutMeshDescriptor.IndexOffset                   = SceneBuffer[Offset + 2u];
    OutMeshDescriptor.PrimitiveToMaterialOffset     = SceneBuffer[Offset + 3u];
    OutMeshDescriptor.MaterialOffset                = SceneBuffer[Offset + 4u];
    OutMeshDescriptor.TextureOffset                 = SceneBuffer[Offset + 5u];

    return OutMeshDescriptor;
}

fn GetBVHNode(InMeshDescriptor: MeshDescriptor, BlasID: u32) -> BVHNode
{

    let Offset: u32 = UniformBuffer.Offset_BlasBuffer + InMeshDescriptor.BlasOffset + (8u * BlasID);

    var OutBVHNode: BVHNode = BVHNode();

    OutBVHNode.Boundary_Min = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 0u], AccelBuffer[Offset + 1u], AccelBuffer[Offset + 2u]));
    OutBVHNode.Boundary_Max = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 3u], AccelBuffer[Offset + 4u], AccelBuffer[Offset + 5u]));

    OutBVHNode.PrimitiveOffset  = AccelBuffer[Offset + 6u];
    OutBVHNode.PrimitiveCount   = AccelBuffer[Offset + 7u];

    return OutBVHNode;
}

fn GetVertex(InMeshDescriptor: MeshDescriptor, VertexID: u32) -> Vertex
{

    let Offset : u32 = InMeshDescriptor.VertexOffset + (12u * VertexID);

    var OutVertex: Vertex = Vertex();

    OutVertex.Position  = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 0u], GeometryBuffer[Offset + 1u], GeometryBuffer[Offset + 2u]));
    OutVertex.Normal    = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 4u], GeometryBuffer[Offset + 5u], GeometryBuffer[Offset + 6u]));
    OutVertex.UV        = bitcast<vec2<f32>>(vec2<u32>(GeometryBuffer[Offset + 8u], GeometryBuffer[Offset + 9u]));

    return OutVertex;
}

//==========================================================================
// Functions ===============================================================
//==========================================================================

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

fn GenerateRayFromThreadID(ThreadID: vec2<u32>) -> Ray
{
    let PixelUV             : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution);
    let PixelNDC            : vec3<f32> = vec3<f32>(2.0 * PixelUV - 1.0, 0.0);

    let PixelClip_NearPlane : vec3<f32> = vec3<f32>(PixelNDC.xy, 0.0);
    let PixelClip_Direction : vec3<f32> = vec3<f32>(0.0, 0.0, 1.0);

    let Ray_Clip            : Ray = Ray(PixelClip_NearPlane, PixelClip_Direction);

    return TransformRayWithMat4x4(Ray_Clip, UniformBuffer.ViewProjectionMatrix_Inverse, true);
}

fn GetRayTriangleHitDistance(InRay: Ray, P0: vec3<f32>, P1: vec3<f32>, P2: vec3<f32>) -> f32
{

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

fn GetRayTriangleHitDistanceFromPrimitiveID(InRay: Ray, InMeshDescriptor: MeshDescriptor, PrimitiveID: u32) -> f32
{

    let Offset = UniformBuffer.Offset_IndexBuffer + InMeshDescriptor.IndexOffset;

    let VertexID_0 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 0u];
    let VertexID_1 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 1u];
    let VertexID_2 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 2u];

    let Vertex_0 : Vertex = GetVertex(InMeshDescriptor, VertexID_0);
    let Vertex_1 : Vertex = GetVertex(InMeshDescriptor, VertexID_1);
    let Vertex_2 : Vertex = GetVertex(InMeshDescriptor, VertexID_2);

    return GetRayTriangleHitDistance(InRay, Vertex_0.Position, Vertex_1.Position, Vertex_2.Position);
}

//==========================================================================
// TEST Functions ==========================================================
//==========================================================================

// 채우기
fn TEST_AABB(InRay: Ray, InBVH: BVHNode) -> vec2<f32>
{
    // 광선 방향의 역수를 계산하여 나눗셈을 곱셈으로 최적화합니다.
    let InvDirection = 1.0 / InRay.Direction;

    // 각 축(x, y, z)에 대해 광선이 경계 상자의 '슬랩'에 들어오고 나가는 시간을 계산합니다.
    let t1 = (InBVH.Boundary_Min - InRay.Start) * InvDirection;
    let t2 = (InBVH.Boundary_Max - InRay.Start) * InvDirection;

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
    if (t_min > t_max) {
        return vec2<f32>(-1.0, -1.0);
    }

    // 최소 및 최대 충돌 거리를 반환합니다.
    return vec2<f32>(t_min, t_max);
}

fn TEST_DOES_RANGES_OVERLAP(Range1: vec2<f32>, Range2: vec2<f32>) -> bool
{
    return Range1.x <= Range2.y && Range2.x <= Range1.y;
}

fn TEST_RAY_HIT_TRIANGLE(ThreadID: vec2<u32>) -> bool
{
    var TestRay : Ray = GenerateRayFromThreadID(ThreadID);

    let PlaneZ = -7.5;
    let TriWidth = 3.0;

        // -0.0476427786052227 0.0012953999685123563 -0.040594279766082764
        // -0.03974591940641403 0.002207260113209486 -0.048099979758262634
        // -0.0399719774723053 0.0012953999685123563 -0.04837175831198692
    var p0: vec3<f32> = vec3<f32>(-0.0476427786052227,0.0012953999685123563,-0.040594279766082764);
    var p1: vec3<f32> = vec3<f32>(-0.03974591940641403, 0.002207260113209486, -0.048099979758262634);
    var p2: vec3<f32> = vec3<f32>(-0.0399719774723053, 0.0012953999685123563, -0.04837175831198692);

    p0 = vec3<f32>(-TriWidth, -TriWidth, PlaneZ);
    p1 = vec3<f32>(TriWidth, -TriWidth, PlaneZ);
    p2 = vec3<f32>(0, TriWidth, PlaneZ);

    let dist = GetRayTriangleHitDistance(TestRay, p0, p1, p2);

    return (dist > 0.0);
}

fn TEST_GET_HIT_PRIMITIVE(InRay: Ray) -> vec4<u32>
{

    var DEBUG_VALUE         : u32       = 0;
    var BestHit_InstanceID  : u32       = 0;
    var BestHit_PrimitiveID : u32       = 99999u;
    var RayValidRange       : vec2<f32> = vec2<f32>(1e-4, 1e10);

    for (var InstanceID: u32 = 0u; InstanceID < UniformBuffer.InstanceCount; InstanceID++)
    {
        let CurrentInstance         : Instance          = GetInstance(InstanceID);
        let CurrentMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(CurrentInstance.MeshID);
        let LocalRay                : Ray               = TransformRayWithMat4x4(InRay, CurrentInstance.ModelMatrix_Inverse, false);
        let IntersectionRange       : vec2<f32>         = TEST_AABB(LocalRay, GetBVHNode(CurrentMeshDescriptor, 0u));

        if (!TEST_DOES_RANGES_OVERLAP(RayValidRange, IntersectionRange)) { continue; }

        
        // Blas Tree 순회
        var Stack           : array<u32, 96>;
        var StackPointer    : i32 = -1;
        StackPointer++; Stack[StackPointer] = 0;
       

        while (StackPointer > -1)
        {
            let BlasID          : u32       = Stack[StackPointer]; StackPointer--;
            let CurrentBVHNode  : BVHNode   = GetBVHNode(CurrentMeshDescriptor, BlasID);
            let bIsLeafNode     : bool      = bool(CurrentBVHNode.PrimitiveCount & 0xffff0000u);
         
            DEBUG_VALUE = BlasID + 1;
            
            

            if (!bIsLeafNode)
            {
                let LChildBlasID : u32 = BlasID + 1u;
                let RChildBlasID : u32 = CurrentBVHNode.PrimitiveOffset;

                let LChildBVH   : BVHNode = GetBVHNode(CurrentMeshDescriptor, LChildBlasID);
                let RChildBVH   : BVHNode = GetBVHNode(CurrentMeshDescriptor, RChildBlasID);

                let LIntersectionRange  : vec2<f32> = TEST_AABB(LocalRay, LChildBVH);
                let RIntersectionRange  : vec2<f32> = TEST_AABB(LocalRay, RChildBVH);

                let bLDidHit : bool = TEST_DOES_RANGES_OVERLAP(RayValidRange, LIntersectionRange);
                let bRDidHit : bool = TEST_DOES_RANGES_OVERLAP(RayValidRange, RIntersectionRange);

                // if (bRDidHit) {StackPointer++; Stack[StackPointer] = RChildBlasID;}
                // if (bLDidHit) {StackPointer++; Stack[StackPointer] = LChildBlasID;}
                // if (true) { continue; }

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

            //if (true) { BestHit_InstanceID = PrimitiveEndID - PrimitiveStartID; }

            for (var PrimitiveID : u32 = PrimitiveStartID; PrimitiveID < PrimitiveEndID; PrimitiveID++)
            {
                let PrimitiveHitDistance: f32 = GetRayTriangleHitDistanceFromPrimitiveID(LocalRay, CurrentMeshDescriptor, PrimitiveID);
                if (RayValidRange.y < PrimitiveHitDistance) { continue; }

                // Material의 Alpha Test 여부 읽기...
                // if (bAlphaTestResult_IgnorePrimitive) { continue; }
                
                // 최종 살아남은 Primitive를 선택
                RayValidRange.y         = PrimitiveHitDistance;
                BestHit_InstanceID      = InstanceID;
                BestHit_PrimitiveID     = PrimitiveID;
            }
        }
    }

    return vec4<u32>(BestHit_InstanceID, BestHit_PrimitiveID, bitcast<u32>(RayValidRange.y), DEBUG_VALUE);
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






    var ResultColor = vec3<f32>(0,0,0);

    // 현재 Pixel의 Ray 생성
    let CurrentRay: Ray = GenerateRayFromThreadID(ThreadID.xy);

    let HitPrimitiveData: vec4<u32> = TEST_GET_HIT_PRIMITIVE(CurrentRay);
    if (bitcast<f32>(HitPrimitiveData.z) < 1e10) { ResultColor.b = 1.0; }


    let DEBUG_VALUE = HitPrimitiveData.w;
    //if (DEBUG_VALUE > 0) { ResultColor.g = 1.0; }
    ResultColor.g = f32(DEBUG_VALUE) / 20.0;

    //ResultColor.r = f32(HitPrimitiveData.x);

    // let inst = GetInstance(0);
    // let desc = GetMeshDescriptor(inst.MeshID);
    // let blasTest = GetBVHNode(desc, 11);
    // if (blasTest.PrimitiveCount == 4294901770u) { ResultColor.r = f32(blasTest.PrimitiveCount & 0x0000ffffu) /13; }


    //if (HitPrimitiveData.x == 50192) { ResultColor.b = 1.0; }
    // ResultColor.b = 0.4;
    
    //ResultColor.r = f32(HitPrimitiveData.x) / 50000.0;
    
    // // Bounce 고려 X

    // let INF = 1e20;
    // var BestHitInfo: HitInfo = HitInfo();
    // BestHitInfo.Distance = INF;
    // var PrimitiveID_TEMP : u32 = 0u;
    // // Tlas 트리 순회하며 Hit Instance ID 얻기 (임시로 전수조사)
    // for (var InstanceID: u32 = 0u; InstanceID < UniformBuffer.InstanceCount; InstanceID++)
    // {
    //     // Instance 정보와 사용하는 Mesh 정보 가져오기
    //     let CandidateInstance       : Instance          = GetInstance(InstanceID);
    //     let CandidateMeshDescriptor : MeshDescriptor    = GetMeshDescriptor(CandidateInstance.MeshID);
    //     let Ray_LocalSpace = TransformRayWithMat4x4(CurrentRay, CandidateInstance.ModelMatrix_Inverse);
    //     var BestHitInfo_LocalSpace = HitInfo(); 
    //     BestHitInfo_LocalSpace.Distance = INF;
    //     var Stack           : array<u32, 96>;
    //     var StackPointer    : i32 = -1;
    //     StackPointer++; Stack[StackPointer] = 0;
    //     // Blas 트리 순회하며 실제 Hit Primitive ID 얻기
    //     while (StackPointer > -1)
    //     {
    //         let BlasID : u32 = Stack[StackPointer]; StackPointer--;
    //         let CurrentBVHNode : BVHNode = GetBVHNode(CandidateMeshDescriptor, BlasID);
    //         let bIsLeafNode: bool = (CurrentBVHNode.PrimitiveCount > 0);
    //         if (!bIsLeafNode) {  }
    //     }
    //     if (BestHitInfo.Distance < BestHitInfo_LocalSpace.Distance) { continue; }
    //     BestHitInfo.Distance = BestHitInfo_LocalSpace.Distance;
    //     BestHitInfo.TargetID = InstanceID;
    //     PrimitiveID_TEMP = BestHitInfo_LocalSpace.TargetID;
    // }
    // if (BestHitInfo.Distance < INF) { ResultColor = vec3<f32>(1,1,1); }
    


    // TEMP 
    {
        let x0 = UniformBuffer.Resolution;
        let x1 = SceneBuffer[0];
        let x2 = GeometryBuffer[0];
        let x3 = AccelBuffer[0];
        let x4 = textureLoad(SceneTexture, vec2<u32>(0u,0u), 0);

        //ResultColor = vec3<f32>(f32(ThreadID.x) / f32(UniformBuffer.Resolution.x), f32(ThreadID.y) / f32(UniformBuffer.Resolution.y), 0.0);
        textureStore(AccumTexture, vec2<i32>(i32(ThreadID.x), i32(ThreadID.y)), vec4<f32>(ResultColor, 1.0));
    }

    return;
}