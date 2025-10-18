import * as THREE from 'three';
import type { Vec3, Vec4, Mat4, Quat }          from 'wgpu-matrix';
import      { vec3, quat, mat4, vec4 }          from 'wgpu-matrix';
import      { GLTFLoader }                      from 'three/examples/jsm/loaders/GLTFLoader.js';
import      { mergeGeometries }                 from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import      { computeBoundsTree, MeshBVH, SAH } from 'three-mesh-bvh';
import      { ResourceManager }                 from './ResourceManager';


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

export class Mesh
{
    private readonly BlasTree           : ArrayBuffer[];
    private readonly VertexPositions    : Float32Array;
    private readonly VertexNormals      : Float32Array;
    private readonly VertexUVs          : Float32Array;
    private readonly IndexArray         : Uint32Array;
    private readonly Materials          : Material[];

    public readonly VertexCount         : number;
    public readonly IndexCount          : number;
    public readonly SubMeshCount        : number;

    private constructor(InMesh : THREE.Mesh)
    {
        // Build Blas Tree
        {
            THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
            const BVH : MeshBVH = InMesh.geometry.computeBoundsTree({strategy: SAH, maxLeafTris: 10})!;

            this.BlasTree = [];
            for (const BlasData of (BVH as any)._roots) this.BlasTree.push(BlasData);
        }

        // Vertex Data
        {
            this.VertexCount        = InMesh.geometry.attributes["position"].count;
            this.VertexPositions    = new Float32Array(InMesh.geometry.attributes["position"].array);
            this.VertexNormals      = new Float32Array(InMesh.geometry.attributes["normal"].array);
            this.VertexUVs          = InMesh.geometry.attributes["uv"] ? new Float32Array(InMesh.geometry.attributes["uv"].array) : new Float32Array();
        }

        // Index Data
        {
            this.IndexArray = new Uint32Array(InMesh.geometry.index?.array!);
            this.IndexCount = this.IndexArray.length;
        }

        // Material Data
        {
            this.Materials = [];

            const MeshStandardMaterials : THREE.MeshStandardMaterial[] = InMesh.material as THREE.MeshStandardMaterial[];
            for (const MeshStandardMaterial of MeshStandardMaterials) { this.Materials.push(new Material(MeshStandardMaterial)); }
        
            this.SubMeshCount = this.Materials.length;
        }

    }

    public static async Load(Name : string) : Promise<Mesh>
    {
        const LoadPath = "../assets/" + Name + ".glb";

        const ModelLoader = new GLTFLoader();
        const Model         = await ModelLoader.loadAsync(LoadPath);      
        const Meshes        : THREE.Mesh[]              = [];
        const Geometries    : THREE.BufferGeometry[]    = [];
        const Materials     : THREE.Material[]          = [];

        function traverseGLTF(object : THREE.Object3D) : void
        {
            if ((object as THREE.Mesh).isMesh) Meshes.push(object as THREE.Mesh);
            if (!object.children || !(object.children.length > 0)) return;
            for (const child of object.children) traverseGLTF(child);
            return;
        }

        traverseGLTF(Model.scene);

        for (let iter = 0; iter < Meshes.length; iter++)
        {
            const Mesh = Meshes[iter];

            Mesh.geometry.applyMatrix4(Mesh.matrixWorld);
            Geometries.push(Mesh.geometry);

            if (Array.isArray(Mesh.material)) { Materials.push(...Mesh.material); }
            else { Materials.push(Mesh.material); }
        }

        const MergedMesh : THREE.Mesh = new THREE.Mesh(mergeGeometries(Geometries, true), Materials);
        return new Mesh(MergedMesh);
    }

    public Serialize() : SerializedMesh
    {
        // Serialize Blas Array
        let SerializedBlasArray         : Uint32Array;
        let SerializedSubBlasRootArray  : Uint32Array;
        {
            const SubBlasArrays : Uint32Array[] = [];
            for (const BlasData of this.BlasTree) { SubBlasArrays.push(new Uint32Array(BlasData)); }

            [SerializedBlasArray, SerializedSubBlasRootArray] = ResourceManager.MergeArrays(SubBlasArrays);
        }

        // Serialize Vertex Array
        let SerializedVertexArray : Uint32Array;
        {
            const STRIDE_VERTEX = 8;
            const BYTELENGTH_VERTEX = 4 * STRIDE_VERTEX;

            const VertexArray : ArrayBuffer = new ArrayBuffer(BYTELENGTH_VERTEX * this.VertexCount);
            const Float32View : Float32Array = new Float32Array(VertexArray);

            for (let VertexID : number = 0; VertexID < this.VertexCount; VertexID++)
            {
                const Offset = STRIDE_VERTEX * VertexID;

                Float32View[Offset + 0] = this.VertexPositions[3 * VertexID + 0];
                Float32View[Offset + 1] = this.VertexPositions[3 * VertexID + 1];
                Float32View[Offset + 2] = this.VertexPositions[3 * VertexID + 2];

                Float32View[Offset + 3] = this.VertexNormals[3 * VertexID + 0];
                Float32View[Offset + 4] = this.VertexNormals[3 * VertexID + 1];
                Float32View[Offset + 5] = this.VertexNormals[3 * VertexID + 2];

                if (this.VertexUVs.length)
                {
                    Float32View[Offset + 6] = this.VertexUVs[2 * VertexID + 0];
                    Float32View[Offset + 7] = this.VertexUVs[2 * VertexID + 1];
                }
            }

            SerializedVertexArray = new Uint32Array(VertexArray);
        }

        // Serialize Index Array
        let SerializedIndexArray : Uint32Array;
        {
            SerializedIndexArray = new Uint32Array(this.IndexArray);
        }

        // Serialize Material & Texture
        let SerializedMaterialArray : Uint32Array;
        let TextureArray            : Array<ImageBitmap>;
        {
            const SerializedMaterials : Uint32Array[] = [];
            for (const MaterialToSerialize of this.Materials) { SerializedMaterials.push(MaterialToSerialize.Serialize()); }

            SerializedMaterialArray = ResourceManager.MergeArrays(SerializedMaterials)[0];
            TextureArray = new Array<ImageBitmap>();
        }

        // Create SerializedMesh Object
        const MeshSerialized : SerializedMesh = new SerializedMesh
        (
            SerializedBlasArray, 
            SerializedSubBlasRootArray,
            SerializedVertexArray, 
            SerializedIndexArray,
            SerializedMaterialArray, 
            TextureArray
        );

        return MeshSerialized;
    }
}

export class SerializedMesh
{
    public readonly BlasArray!          : Uint32Array;
    public readonly SubBlasRootArray!   : Uint32Array;
    public readonly VertexArray!        : Uint32Array;
    public readonly IndexArray!         : Uint32Array;
    public readonly MaterialArray!      : Uint32Array;
    public readonly TextureArray!       : Array<ImageBitmap>;

    constructor
    (
        BlasArray           : Uint32Array,
        SubBlasRootArray    : Uint32Array,
        VertexArray         : Uint32Array,
        IndexArray          : Uint32Array,
        MaterialArray       : Uint32Array,
        TextureArray        : Array<ImageBitmap>
    ) 
    {
        this.BlasArray          = BlasArray;
        this.SubBlasRootArray   = SubBlasRootArray;
        this.VertexArray        = VertexArray;
        this.IndexArray         = IndexArray;
        this.MaterialArray      = MaterialArray;
        this.TextureArray       = TextureArray;
    }
}

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