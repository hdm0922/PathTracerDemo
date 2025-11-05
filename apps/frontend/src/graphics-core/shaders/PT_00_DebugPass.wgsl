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
    Offset_LightsCDFBuffer          : u32,

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



struct Vertex
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    UV          : vec2<f32>,
};



struct Triangle
{
    Vertex_0    : Vertex,
    Vertex_1    : Vertex,
    Vertex_2    : Vertex,
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

@group(0) @binding(0) var<uniform>          UniformBuffer   : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer     : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer  : array<u32>;

@group(0) @binding(10) var G_Buffer : texture_2d<f32>;

@group(1) @binding(10) var ResultTexture : texture_storage_2d<rgba32float, write>;

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
    OutMaterial.Roughness   = max(OutMaterial.Roughness, 0.01);

    return OutMaterial;
}

fn GetCompactSurface(CompactSurfaceRawData : vec4<f32>) -> CompactSurface
{
    var OutCompactSurface           : CompactSurface    = CompactSurface();
    let Valid_InstanceID_MaterialID : u32               = bitcast<u32>(CompactSurfaceRawData.r);

    OutCompactSurface.IsValidSurface    = bool( Valid_InstanceID_MaterialID & 0x80000000u );
    OutCompactSurface.InstanceID        = ( Valid_InstanceID_MaterialID & 0x7fff0000u ) >> 16u;
    OutCompactSurface.MaterialID        = ( Valid_InstanceID_MaterialID & 0x0000ffffu );
    OutCompactSurface.PrimitiveID       = bitcast<u32>(CompactSurfaceRawData.g);
    OutCompactSurface.Barycentric       = vec2<f32>( CompactSurfaceRawData.b, CompactSurfaceRawData.a );

    return OutCompactSurface;
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

fn GetSurface(InCompactSurface : CompactSurface) -> Surface
{
    var OutSurface : Surface = Surface();

    let SurfaceInstance         : Instance          = GetInstance( InCompactSurface.InstanceID );
    let SurfaceMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor( SurfaceInstance.MeshID );
    let SurfaceMaterial         : Material          = GetMaterial( SurfaceMeshDescriptor, InCompactSurface.MaterialID );
    let SurfaceTriangleLocal    : Triangle          = GetTriangle( SurfaceMeshDescriptor, InCompactSurface.PrimitiveID );
    let SurfaceTriangle         : Triangle          = GetTriangleWorldSpace( SurfaceInstance, SurfaceTriangleLocal );

    let U   : f32 = InCompactSurface.Barycentric.x;
    let V   : f32 = InCompactSurface.Barycentric.y;
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

//==========================================================================
// Maths ===================================================================
//==========================================================================

fn TransformVec3WithMat4x4(InVector3: vec3<f32>, TransformMatrix: mat4x4<f32>) -> vec3<f32>
{
    let TransformedVector : vec4<f32> = TransformMatrix * vec4<f32>(InVector3, 1.0);
    return TransformedVector.xyz / TransformedVector.w;
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

    var ResultColor : vec3<f32>;

    // 1. G_Buffer 값 읽어오기
    let G_Buffer_Raw    : vec4<f32>         = textureLoad(G_Buffer, ThreadID.xy, 0);
    let CSurface        : CompactSurface    = GetCompactSurface(G_Buffer_Raw);

    if ( CSurface.IsValidSurface )
    {
        let SurfaceData : Surface = GetSurface(CSurface);
        ResultColor = SurfaceData.Material.Albedo.rgb;
        //ResultColor = vec3f( f32(CSurface.InstanceID) );
    }
    else
    {
        ResultColor = vec3<f32>(0.0, 0.0, 0.0);
    }

    textureStore(ResultTexture, ThreadID.xy, vec4<f32>(ResultColor, 1.0));

    return;
}