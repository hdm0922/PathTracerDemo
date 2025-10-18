import * as THREE from 'three';
import type { Vec3, Vec4, Mat4, Quat }  from 'wgpu-matrix';
import      { vec3, quat, mat4, vec4 }  from 'wgpu-matrix';



export class Instance
{
    public static readonly Stride           : number = 33;

    public readonly ModelMatrix!            : Mat4;
    public readonly ModelMatrix_Inverse!    : Mat4;
    public readonly MeshID!                 : string;

    constructor
    (
        MeshID      : string,
        Translation : Vec3 = vec3.create(0, 0, 0),
        Rotation    : Quat = quat.identity(),
        Scale       : Vec3 = vec3.create(1, 1, 1)
    )
    {
        this.MeshID = MeshID;

        const TranslationMatrix : Mat4 = mat4.translation(Translation);
        const RotationMatrix    : Mat4 = mat4.fromQuat(Rotation);
        const ScaleMatrix       : Mat4 = mat4.scaling(Scale);

        let ModelMatrix : Mat4 = mat4.identity();

        ModelMatrix = mat4.mul(ModelMatrix, ScaleMatrix);
        ModelMatrix = mat4.mul(ModelMatrix, RotationMatrix);
        ModelMatrix = mat4.mul(ModelMatrix, TranslationMatrix);

        this.ModelMatrix            = ModelMatrix;
        this.ModelMatrix_Inverse    = mat4.invert(ModelMatrix);
    }

    public Serialize(MeshIDToIndex : Map<string, number>) : Uint32Array
    {
        const InstanceRawData   : ArrayBuffer   = new ArrayBuffer(4 * Instance.Stride);

        const Uint32View        : Uint32Array   = new Uint32Array(InstanceRawData);
        const Float32View       : Float32Array  = new Float32Array(InstanceRawData);
        {
            Float32View.set(this.ModelMatrix, 0);
            Float32View.set(this.ModelMatrix_Inverse, 16);

            Uint32View[32] = MeshIDToIndex.get(this.MeshID)!;
        }

        return Uint32View;
    }
};

export class MeshDescriptor
{
    public static readonly Stride : number = 6;

    public readonly Offset_Vertex       : number;
    public readonly Offset_Index        : number;
    public readonly Offset_Material     : number;
    public readonly Offset_SubBlasRoot  : number;
    public readonly Offset_Blas         : number;

    public readonly Count_SubMesh       : number;

    constructor
    (
        Offset_Vertex       : number,
        Offset_Index        : number,
        Offset_Material     : number,
        Offset_SubBlasRoot  : number,
        Offset_Blas         : number,
        Count_SubMesh       : number,
    )
    {
        this.Offset_Vertex      = Offset_Vertex;
        this.Offset_Index       = Offset_Index;
        this.Offset_Material    = Offset_Material;
        this.Offset_SubBlasRoot = Offset_SubBlasRoot;
        this.Offset_Blas        = Offset_Blas;
        this.Count_SubMesh      = Count_SubMesh;
    }

    public Serialize() : Uint32Array
    {
        const MeshDescriptorRawData : ArrayBuffer = new ArrayBuffer(4 * MeshDescriptor.Stride);

        const Uint32View : Uint32Array = new Uint32Array(MeshDescriptorRawData);
        {
            Uint32View[0] = this.Offset_Vertex;
            Uint32View[1] = this.Offset_Index;
            Uint32View[2] = this.Offset_Material;
            Uint32View[3] = this.Offset_SubBlasRoot;
            Uint32View[4] = this.Offset_Blas;
            Uint32View[5] = this.Count_SubMesh;
        }

        return Uint32View;
    }
};

export class Material
{
    public static readonly Stride : number = 15;

    private readonly Albedo            : Vec4;
    private readonly EmissiveColor     : Vec3;
    private readonly EmissiveIntensity : number;

    private readonly Metalness         : number;
    private readonly Roughness         : number;
    private readonly Transmission      : number;
    private readonly IOR               : number;

    private readonly AlbedoTexture!    : ImageBitmap | null;
    private readonly ORMTexture!       : ImageBitmap | null;
    private readonly EmissiveTexture!  : ImageBitmap | null;

    constructor(InMaterial : THREE.MeshStandardMaterial)
    {
        this.Albedo             = vec4.create(InMaterial.color.r, InMaterial.color.g, InMaterial.color.b, 1.0);
        this.EmissiveColor      = vec3.create(InMaterial.emissive.r, InMaterial.emissive.g, InMaterial.emissive.b);
        this.EmissiveIntensity  = InMaterial.emissiveIntensity;

        this.Metalness          = InMaterial.metalness;
        this.Roughness          = InMaterial.roughness;
        this.Transmission       = InMaterial.transparent ? 1.0 : 0.0;
        this.IOR                = 1.5;

        this.AlbedoTexture      = InMaterial.map?.image as ImageBitmap;
        this.ORMTexture         = (InMaterial.aoMap || InMaterial.metalnessMap || InMaterial.roughnessMap)?.image as ImageBitmap;
        this.EmissiveTexture    = InMaterial.emissiveMap?.image as ImageBitmap;
    }

    public Serialize() : Uint32Array
    {
        const MaterialRawData : ArrayBuffer = new ArrayBuffer(4 * Material.Stride);

        const Float32View : Float32Array = new Float32Array(MaterialRawData);
        {
            Float32View.set(this.Albedo, 0);
            Float32View.set(this.EmissiveColor, 4);
            Float32View[7]  = this.EmissiveIntensity;
            Float32View[8]  = this.Metalness;
            Float32View[9]  = this.Roughness;
            Float32View[10] = this.Transmission;
            Float32View[11] = this.IOR;

            // TODO : Texture Index 추가
        }

        return new Uint32Array(MaterialRawData);
    }
}

export class Light
{
    public static readonly Stride : number = 18;

    private readonly Position   : Vec3;
    private readonly Direction  : Vec3;
    private readonly Color      : Vec3;
    private readonly U          : Vec3;
    private readonly V          : Vec3;

    private readonly LightType  : number;
    private readonly Intensity  : number;
    private readonly Area       : number;

    protected constructor
    (
        Position    : Vec3,
        Direction   : Vec3,
        Color       : Vec3,
        U           : Vec3,
        V           : Vec3,
        LightType   : number,
        Intensity   : number,
        Area        : number,
    )
    {
        this.Position   = Position;
        this.Direction  = Direction;
        this.Color      = Color;
        this.U          = U;
        this.V          = V;
        this.LightType  = LightType;
        this.Intensity  = Intensity;
        this.Area       = Area;
    }

    public Serialize() : Uint32Array
    {
        const LightRawData  : ArrayBuffer   = new ArrayBuffer(4 * Light.Stride);

        const Float32View   : Float32Array  = new Float32Array(LightRawData);
        const Uint32View    : Uint32Array   = new Uint32Array(LightRawData);
        {
            Float32View.set(this.Position, 0);
            Float32View.set(this.Direction, 3);
            Float32View.set(this.Color, 6);
            Float32View.set(this.U, 9);
            Float32View.set(this.V, 12);

            Uint32View[15]  = this.LightType;
            Float32View[16] = this.Intensity;
            Float32View[17] = this.Area;
        }

        return Uint32View;
    }
}

export class DirectionalLight extends Light
{
    constructor
    (
        Direction   : Vec3,
        Color       : Vec3,
        Intensity   : number
    )
    {
        super
        (
            vec3.create(),
            Direction,
            Color,
            vec3.create(),
            vec3.create(),
            0,
            Intensity,
            0.0
        );
    }
}

export class PointLight extends Light
{
    constructor
    (
        Position    : Vec3,
        Color       : Vec3,
        Intensity   : number
    )
    {
        super
        (
            Position,
            vec3.create(),
            Color,
            vec3.create(),
            vec3.create(),
            1,
            Intensity,
            0.0
        );
    }
}

export class RectLight extends Light
{
    constructor
    (
        Position    : Vec3,
        Color       : Vec3,
        U           : Vec3,
        V           : Vec3,
        Intensity   : number
    )
    {

        const Direction : Vec3      = vec3.normalize( vec3.cross(U, V) );
        const Area      : number    = 4.0 * vec3.len(U) * vec3.len(V);

        super
        (
            Position,
            Direction,
            Color,
            U,
            V,
            2,
            Intensity,
            Area
        );
    }
}