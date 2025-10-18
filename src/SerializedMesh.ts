import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { computeBoundsTree, MeshBVH, SAH } from 'three-mesh-bvh';

import { ResourceManager } from './ResourceManager';
import { Material } from './Structs';

export class SerializedMesh
{
    public readonly BlasArray!          : Uint32Array;
    public readonly SubBlasRootArray!   : Uint32Array;
    public readonly VertexArray!        : Uint32Array;
    public readonly IndexArray!         : Uint32Array;
    public readonly MaterialArray!      : Uint32Array;
    public readonly TextureArray!       : Array<ImageBitmap>;

    private constructor
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

    public static async Load(Name : string) : Promise<SerializedMesh>
    {
        const MergedMesh : THREE.Mesh = await SerializedMesh.mergeSubmeshes(Name);

        // Serialize Blas Array
        let SerializedBlasArray         : Uint32Array;
        let SerializedSubBlasRootArray  : Uint32Array;
        {
            THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
            const BVH : MeshBVH = MergedMesh.geometry.computeBoundsTree({strategy: SAH, maxLeafTris: 10})!;

            const SubMeshCount : number = (BVH as any)._roots.length;
            const SubBlasArrays : Uint32Array[] = [];
            for (let iter=0; iter<SubMeshCount; iter++)
            {
                const SubBlasArray : Uint32Array = new Uint32Array((BVH as any)._roots[iter]);
                SubBlasArrays.push(SubBlasArray);
            }

            [SerializedBlasArray, SerializedSubBlasRootArray] = ResourceManager.MergeArrays(SubBlasArrays);
        }

        // Serialize Vertex Array
        let SerializedVertexArray : Uint32Array;
        {
            const VertexPositionData    = MergedMesh.geometry.attributes["position"];
            const VertexNormalData      = MergedMesh.geometry.attributes["normal"];
            const VertexUVData          = MergedMesh.geometry.attributes["uv"];

            const STRIDE_VERTEX = 8;
            const BYTELENGTH_VERTEX = 4 * STRIDE_VERTEX;
            const VertexCount = VertexPositionData.count;

            const VertexArray : ArrayBuffer = new ArrayBuffer(BYTELENGTH_VERTEX * VertexCount);
            const Float32View : Float32Array = new Float32Array(VertexArray);

            for (let VertexID : number = 0; VertexID < VertexCount; VertexID++)
            {
                const Offset = STRIDE_VERTEX * VertexID;

                Float32View[Offset + 0] = VertexPositionData.array[3 * VertexID + 0];
                Float32View[Offset + 1] = VertexPositionData.array[3 * VertexID + 1];
                Float32View[Offset + 2] = VertexPositionData.array[3 * VertexID + 2];

                Float32View[Offset + 3] = VertexNormalData.array[3 * VertexID + 0];
                Float32View[Offset + 4] = VertexNormalData.array[3 * VertexID + 1];
                Float32View[Offset + 5] = VertexNormalData.array[3 * VertexID + 2];

                if (VertexUVData)
                {
                    Float32View[Offset + 6] = VertexUVData.array[2 * VertexID + 0];
                    Float32View[Offset + 7] = VertexUVData.array[2 * VertexID + 1];
                }
            }

            SerializedVertexArray = new Uint32Array(VertexArray);
        }

        // Serialize Index Array
        let SerializedIndexArray : Uint32Array;
        {
            SerializedIndexArray = new Uint32Array(MergedMesh.geometry.index?.array!);
        }
        
        // Serialize Material & Texture
        let SerializedMaterialArray : Uint32Array;
        let TextureArray            : Array<ImageBitmap>;
        {
            const MeshStandardMaterials : THREE.MeshStandardMaterial[] = MergedMesh.material as THREE.MeshStandardMaterial[];
            const SerializedMaterials   : Uint32Array[] = [];
            for (const MeshStandardMaterial of MeshStandardMaterials) { SerializedMaterials.push((new Material(MeshStandardMaterial)).Serialize()); }


            SerializedMaterialArray = ResourceManager.MergeArrays(SerializedMaterials)[0];
            TextureArray            = new Array<ImageBitmap>(); // TODO
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

    private static async mergeSubmeshes(Name : string) : Promise<THREE.Mesh>
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

        return new THREE.Mesh(mergeGeometries(Geometries, true), Materials);
    }
}