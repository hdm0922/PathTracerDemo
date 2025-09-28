
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

fn GetBlasRootNode(InMeshDescriptor: MeshDescriptor) -> BVHNode
{

    let Offset: u32 = UniformBuffer.Offset_BlasBuffer + InMeshDescriptor.BlasOffset;

    var OutBVHNode: BVHNode = BVHNode();

    OutBVHNode.Boundary_Min = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 0u], AccelBuffer[Offset + 1u], AccelBuffer[Offset + 2u]));
    OutBVHNode.PrimitiveCount = AccelBuffer[Offset + 3u];

    OutBVHNode.Boundary_Max = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 4u], AccelBuffer[Offset + 5u], AccelBuffer[Offset + 6u]));
    OutBVHNode.PrimitiveOffset = AccelBuffer[Offset + 7u];

    return BVHNode();
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

fn TransformRayWithMat4x4(InRay: Ray, TransformMatrix: mat4x4<f32>) -> Ray
{
    let TransformedRay_Start        : vec3<f32> = TransformVec3WithMat4x4(InRay.Start, TransformMatrix);
    let TransformedRay_End          : vec3<f32> = TransformVec3WithMat4x4(InRay.Start + InRay.Direction, TransformMatrix);
    let TransformedRay_Direction    : vec3<f32> = normalize(TransformedRay_End - TransformedRay_Start);

    return Ray(TransformedRay_Start, TransformedRay_Direction);
}

fn GenerateRayFromThreadID(ThreadID: vec2<u32>) -> Ray
{
    let PixelUV             : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution);
    let PixelNDC            : vec3<f32> = vec3<f32>(2.0 * PixelUV - 1.0, 0.0);

    let PixelClip_NearPlane : vec3<f32> = vec3<f32>(PixelNDC.xy, 0.0);
    let PixelClip_Direction : vec3<f32> = vec3<f32>(0.0, 0.0, 1.0);

    let Ray_Clip            : Ray = Ray(PixelClip_NearPlane, PixelClip_Direction);

    return TransformRayWithMat4x4(Ray_Clip, UniformBuffer.ViewProjectionMatrix_Inverse);
}

fn GetRayTriangleHitDistance(InRay: Ray, P0: vec3<f32>, P1: vec3<f32>, P2: vec3<f32>) -> f32
{

    let Edge_1 = P1 - P0;
    let Edge_2 = P2 - P0;

    let pvec = cross(InRay.Direction, Edge_2);
    let det = dot(Edge_1, pvec);
    let EPS  : f32 = 1e-8;

    if (abs(det) < EPS) { return -1.0; }

    let invDet = 1.0 / det;
    let tvec   = InRay.Start - P0;

    let u = dot(tvec, pvec) * invDet;
    if (u < 0.0 || u > 1.0) { return -1.0; }

    let qvec = cross(tvec, Edge_1);
    let v = dot(InRay.Direction, qvec) * invDet;
    if (v < 0.0 || (u + v) > 1.0) { return -1.0; }

    let t = dot(Edge_2, qvec) * invDet;

    // ★ 추가: 앞쪽 히트만 유효(자기교차 방지용 최소값 포함)
    // let tMin: f32 = 1e-4;          // 필요에 따라 조정/파라미터화
    // if (t <= tMin) { return -1.0; }

    return t;
}



//==========================================================================
// TEST Functions ==========================================================
//==========================================================================

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



    // Bounce 고려 X
    let INF = 1e20;

    var BestHitInfo: HitInfo = HitInfo();
    BestHitInfo.Distance = INF;

    var PrimitiveID_TEMP : u32 = 0u;

    // Tlas 트리 순회하며 Hit Instance ID 얻기 (임시로 전수조사)
    for (var InstanceID: u32 = 0u; InstanceID < UniformBuffer.InstanceCount; InstanceID = InstanceID + 1u)
    {
        // Instance 정보와 사용하는 Mesh 정보 가져오기
        let CandidateInstance = GetInstance(InstanceID);
        let CandidateMeshDescriptor = GetMeshDescriptor(CandidateInstance.MeshID);

        let Ray_LocalSpace = TransformRayWithMat4x4(CurrentRay, CandidateInstance.ModelMatrix_Inverse);

        var BestHitInfo_LocalSpace = HitInfo();
        BestHitInfo_LocalSpace.Distance = INF;

        // Blas 트리 순회하며 실제 Hit Primitive ID 얻기 (임시로 전수조사) 18866u
        for (var PrimitiveID: u32 = 0u; PrimitiveID < 1u; PrimitiveID = PrimitiveID + 1u)
        {
            let Offset : u32 = UniformBuffer.Offset_IndexBuffer + CandidateMeshDescriptor.IndexOffset;

            let VertexID_0 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 0u];
            let VertexID_1 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 1u];
            let VertexID_2 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 2u];

            let Vertex_0 : Vertex = GetVertex(CandidateMeshDescriptor, VertexID_0);
            let Vertex_1 : Vertex = GetVertex(CandidateMeshDescriptor, VertexID_1);
            let Vertex_2 : Vertex = GetVertex(CandidateMeshDescriptor, VertexID_2);

            let HitDistance = GetRayTriangleHitDistance(Ray_LocalSpace, Vertex_0.Position, Vertex_1.Position, Vertex_2.Position);
            if ((HitDistance < 0.0) || (BestHitInfo.Distance < HitDistance)) { continue; }

            BestHitInfo_LocalSpace.Distance = HitDistance;
            BestHitInfo_LocalSpace.TargetID = PrimitiveID;
        }
    
        if (BestHitInfo.Distance < BestHitInfo_LocalSpace.Distance) { continue; }

        BestHitInfo.Distance = BestHitInfo_LocalSpace.Distance;
        BestHitInfo.TargetID = InstanceID;
        PrimitiveID_TEMP = BestHitInfo_LocalSpace.TargetID;
    }

    if (BestHitInfo.Distance < INF) { ResultColor = vec3<f32>(1,1,1); }
    


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