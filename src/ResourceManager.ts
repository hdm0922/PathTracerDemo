import * as THREE from 'three';
import { vec2, vec3, vec4, mat4 } from "gl-matrix";

import type { Mesh, SerializedMesh, Material, Instance, Light, MeshDescriptor } from "./Structs";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildBVH } from './BlasBuilder.ts';

import { NodeIO } from '@gltf-transform/core';
import { KHRMaterialsIOR, KHRMaterialsTransmission, KHRMaterialsVolume } from '@gltf-transform/extensions';

export class ResourceManager
{
    public static MeshPool : Map<string, Mesh> = new Map();



    public static async LoadResources() : Promise<void>
    {
        // Loading Models ...
        const [LampMesh, BenchMesh, StarbucksCupMesh, CeilingLampMesh, SceneMesh] = await Promise.all([
            ResourceManager.loadMesh("Lamp"),
            ResourceManager.loadMesh("Bench"),
            ResourceManager.loadMesh("StarbucksCup"),
            ResourceManager.loadMesh("CeilingLamp"),
            ResourceManager.loadMesh("TestScene"),
        ]);


        // Registering Models ...
        ResourceManager.MeshPool.set("Lamp", LampMesh);
        ResourceManager.MeshPool.set("Bench", BenchMesh);
        ResourceManager.MeshPool.set("StarbucksCup", StarbucksCupMesh);
        ResourceManager.MeshPool.set("CeilingLamp", CeilingLampMesh);
        ResourceManager.MeshPool.set("TestScene", SceneMesh);

        return;
    }

    public static async TestLoad()
    {
        const Name = "Lamp";
        const LoadPath = "../assets/" + Name + ".glb";

        const ModelLoader = new GLTFLoader();
        const Model         = await ModelLoader.loadAsync(LoadPath);      


        return;
    }

    public static SerializeInstanceArray(InstanceArray : Array<Instance>, MeshIDToIndex: Map<string, number>) : Uint32Array
    {
        const STRIDE_INSTANCE = 33;
        const BYTELENGTH_INSTANCE = 4 * STRIDE_INSTANCE;
        const InstanceCount = InstanceArray.length;

        const InstanceData : ArrayBuffer = new ArrayBuffer(BYTELENGTH_INSTANCE * InstanceCount);

        const Float32View : Float32Array = new Float32Array(InstanceData);
        const Uint32View : Uint32Array = new Uint32Array(InstanceData);
        for (let iter = 0; iter < InstanceCount; iter++)
        {
            const Offset = STRIDE_INSTANCE * iter;

            const ModelMatrix           : mat4      = InstanceArray[iter].ModelMatrix;
            const ModelMatrixInverse    : mat4      = mat4.invert(mat4.create(), ModelMatrix)!;
            const MeshID                : number    = MeshIDToIndex.get(InstanceArray[iter].MeshID)!;

            Float32View.set(ModelMatrix, Offset +  0);
            Float32View.set(ModelMatrixInverse, Offset + 16);

            Uint32View[Offset + 32] = MeshID;
        }

        return Uint32View;
    }



    public static SerializeLightArray(LightArray : Array<Light>) : Uint32Array
    {
        const STRIDE_LIGHT = 18;
        const BYTELENGTH_LIGHT = 4 * STRIDE_LIGHT;
        const LightCount = LightArray.length;

        const LightData : ArrayBuffer = new ArrayBuffer(BYTELENGTH_LIGHT * LightCount);

        const Float32View : Float32Array = new Float32Array(LightData);
        const Uint32View : Uint32Array = new Uint32Array(LightData);
        for (let iter = 0; iter < LightCount; iter++)
        {
            const Offset = STRIDE_LIGHT * iter;

            Float32View.set(LightArray[iter].Position, Offset +  0);
            Uint32View[Offset +  3] = LightArray[iter].LightType;

            Float32View.set(LightArray[iter].Direction, Offset +  4);
            Float32View[Offset +  7] = LightArray[iter].Intensity;

            Float32View.set(LightArray[iter].Color, Offset +  8);
            Float32View[Offset +  11] = LightArray[iter].Area;

            Float32View.set(LightArray[iter].U, Offset + 12);

            Float32View.set(LightArray[iter].V, Offset + 15);
        }

        return Uint32View;
    }



    public static SerializeMeshDescriptorArray(MeshDescriptorArray : Array<MeshDescriptor>) : Uint32Array
    {
        const STRIDE_DESCRIPTOR = 6;
        const BYTELENGTH_DESCRIPTOR = 4 * STRIDE_DESCRIPTOR;
        const DescriptorCount = MeshDescriptorArray.length;

        const DescriptorData : ArrayBuffer = new ArrayBuffer(BYTELENGTH_DESCRIPTOR * DescriptorCount);

        const Uint32View : Uint32Array = new Uint32Array(DescriptorData);
        for (let iter = 0; iter < DescriptorCount; iter++)
        {
            const Offset = STRIDE_DESCRIPTOR * iter;

            Uint32View[Offset + 0] = MeshDescriptorArray[iter].BlasOffset;
            Uint32View[Offset + 1] = MeshDescriptorArray[iter].VertexOffset;
            Uint32View[Offset + 2] = MeshDescriptorArray[iter].IndexOffset;
            Uint32View[Offset + 3] = MeshDescriptorArray[iter].PrimitiveToMaterialOffset;
            Uint32View[Offset + 4] = MeshDescriptorArray[iter].MaterialOffset;
            Uint32View[Offset + 5] = MeshDescriptorArray[iter].TextureOffset;
        }

        return Uint32View;
    }



    public static SerializeMesh(InMesh : Mesh) : SerializedMesh
    {
        const BlasArrayBuffer                   : Uint32Array = ResourceManager.serializeBlasArray(InMesh);
        const VertexArrayBuffer                 : Uint32Array = ResourceManager.serializeVertexArray(InMesh);
        const IndexArrayBuffer                  : Uint32Array = ResourceManager.serializeIndexArray(InMesh);
        const PrimitiveToMaterialArrayBuffer    : Uint32Array = ResourceManager.serializePrimitiveToMaterialArray(InMesh);

        const [MaterialArrayBuffer, TextureArray] = ResourceManager.serializeMaterialAndTextureArray(InMesh);

        const OutParsedMesh : SerializedMesh =
        {
            BlasArray : BlasArrayBuffer,
            VertexArray : VertexArrayBuffer,
            IndexArray : IndexArrayBuffer,
            PrimitiveToMaterialArray : PrimitiveToMaterialArrayBuffer,
            MaterialArray : MaterialArrayBuffer,
            TextureArray : TextureArray
        }

        return OutParsedMesh;
    }



    public static MergeArrays(InArrays : Uint32Array[]) : [Uint32Array, Uint32Array]
    {
        if (InArrays.length === 0) return [new Uint32Array(), new Uint32Array()];


        const Offset : Uint32Array = new Uint32Array(InArrays.length); Offset[0] = 0;
        for (let iter = 0; iter < InArrays.length - 1; iter++)
        {
            Offset[iter+1] = Offset[iter] + InArrays[iter].length;
        }


        const ArrayLength = Offset[InArrays.length - 1] + InArrays[InArrays.length - 1].length;
        const MergedArray : Uint32Array = new Uint32Array(ArrayLength);
        for (let iter = 0; iter < InArrays.length; iter++)
        {
            MergedArray.set(InArrays[iter], Offset[iter]);
        }

        return [MergedArray, Offset];
    }




    private static async loadMesh(Name : string) : Promise<Mesh>
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

        // For Each Model Found : Gather Information To Geometries, Materials
        for (const Mesh of Meshes)
        {            
            Mesh.geometry.applyMatrix4(Mesh.matrixWorld);
            Geometries.push(Mesh.geometry);

            if (Array.isArray(Mesh.material)) { Materials.push(...Mesh.material); }
            else { Materials.push(Mesh.material); }
        }
        
        // Merge Meshes
        const MergedMesh = new THREE.Mesh(mergeGeometries(Geometries, true), Materials);
        const BlasBuffer: ArrayBuffer = buildBVH(MergedMesh.geometry, 10);

        const MeshGenerated: Mesh =
        {
            Blas: new Float32Array(BlasBuffer),
            Data: MergedMesh,
        };

        return MeshGenerated;
    }

    private static serializeBlasArray(InMesh : Mesh) : Uint32Array
    {
        return new Uint32Array(InMesh.Blas.buffer, InMesh.Blas.byteOffset, InMesh.Blas.length);
    }

    private static serializeVertexArray(InMesh : Mesh) : Uint32Array
    {
        const VertexPositionData    = InMesh.Data.geometry.attributes["position"];
        const VertexNormalData      = InMesh.Data.geometry.attributes["normal"];
        const VertexUVData          = InMesh.Data.geometry.attributes["uv"];

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

        return new Uint32Array(VertexArray);
    }

    private static serializeIndexArray(InMesh : Mesh) : Uint32Array
    {
        return new Uint32Array(InMesh.Data.geometry.index?.array!);
    }

    private static serializePrimitiveToMaterialArray(InMesh : Mesh) : Uint32Array
    {
        const IndexArray = ResourceManager.serializeIndexArray(InMesh);
        const PrimitiveCount = IndexArray.byteLength / 12;

        const PrimitiveToMaterialArray : ArrayBuffer = new ArrayBuffer(4 * PrimitiveCount);

        const Uint32View : Uint32Array = new Uint32Array(PrimitiveToMaterialArray);
        for (const SubMeshGroup of InMesh.Data.geometry.groups)
        {
            for (let idx = 0; idx < SubMeshGroup.count; idx += 3)
            {
                const PrimitiveID = (SubMeshGroup.start + idx) / 3;
                Uint32View[PrimitiveID] = SubMeshGroup.materialIndex!;
            }
        }
        
        return Uint32View;
    }

    private static serializeMaterialAndTextureArray(InMesh : Mesh) : [Uint32Array, Array<ImageBitmap>]
    {
        function parseMaterial(InMaterial: THREE.MeshStandardMaterial): Material
        {

            const MaterialBaseColor = vec4.create();
            {
                MaterialBaseColor[0] = InMaterial.color.r;
                MaterialBaseColor[1] = InMaterial.color.g;
                MaterialBaseColor[2] = InMaterial.color.b;
                MaterialBaseColor[3] = 1.0;
            }

            const MaterialEmissiveColor = vec3.fromValues(0,0,0);
            if (InMaterial.emissive)
            {
                MaterialEmissiveColor[0] = InMaterial.emissive.r;
                MaterialEmissiveColor[1] = InMaterial.emissive.g;
                MaterialEmissiveColor[2] = InMaterial.emissive.b;
            }

            const MaterialNormalScale = vec2.fromValues(1,1);
            if (InMaterial.normalScale)
            {
                MaterialNormalScale[0] = InMaterial.normalScale.x;
                MaterialNormalScale[1] = InMaterial.normalScale.y;
            }

            const MaterialORMTexture = InMaterial.aoMap || InMaterial.metalnessMap || InMaterial.roughnessMap;

            const OutMaterial: Material =
            {

                BaseColor           : MaterialBaseColor,
                Metalness           : InMaterial.metalness,
                Roughness           : InMaterial.roughness,
                EmissiveIntensity   : InMaterial.emissiveIntensity,
                EmissiveColor       : MaterialEmissiveColor,

                NormalScale : MaterialNormalScale,
                IOR         : 1.5,
                BlendMode   : 0,

                BaseColorTexture        : InMaterial.map,
                ORMTexture              : MaterialORMTexture,
                EmissiveTexture         : InMaterial.emissiveMap,
                NormalTexture           : InMaterial.normalMap,
            };

            return OutMaterial;
        };

        const MeshStandardMaterialsArray = InMesh.Data.material as THREE.MeshStandardMaterial[];
        const MaterialCount = MeshStandardMaterialsArray.length;

        // Parse Every Material
        const ParsedMaterialsArray: Array<Material> = new Array<Material>(MaterialCount);
        for (let MaterialIndex=0; MaterialIndex < MaterialCount; MaterialIndex++)
            ParsedMaterialsArray[MaterialIndex] = parseMaterial(MeshStandardMaterialsArray[MaterialIndex]);


        // Register Every Texture Used
        const TexturesPool: Map<string, THREE.Texture> = new Map();
        for (let MaterialIndex=0; MaterialIndex < MaterialCount; MaterialIndex++)
        {
            const MaterialParsed = ParsedMaterialsArray[MaterialIndex];
            
            if (MaterialParsed.BaseColorTexture)    TexturesPool.set(MaterialParsed.BaseColorTexture.uuid,  MaterialParsed.BaseColorTexture);
            if (MaterialParsed.ORMTexture)          TexturesPool.set(MaterialParsed.ORMTexture.uuid,        MaterialParsed.ORMTexture);
            if (MaterialParsed.EmissiveTexture)     TexturesPool.set(MaterialParsed.EmissiveTexture.uuid,   MaterialParsed.EmissiveTexture);
            if (MaterialParsed.NormalTexture)       TexturesPool.set(MaterialParsed.NormalTexture.uuid,     MaterialParsed.NormalTexture);
        }


        // Make TexturesArray
        const TextureValuesArray = [...TexturesPool.values()];
        const TextureCount = TextureValuesArray.length;

        const TexturesArray: Array<ImageBitmap> = new Array(TextureCount);
        for (let iter=0; iter<TextureCount; iter++) TexturesArray[iter] = (TextureValuesArray[iter].image as ImageBitmap);

        // Generate Map Info : UUID -> TextureIdx
        const MapTextureUUIDToIndex: Map<string, number> = new Map();
        {
            const ArrayFromKeys = [...TexturesPool.keys()];

            for (let iter=0; iter<ArrayFromKeys.length; iter++)
                MapTextureUUIDToIndex.set(ArrayFromKeys[iter], iter);
        }


        // Fill Materials Array
        const STRIDE_MATERIAL = 19;

        const MaterialRawData : ArrayBuffer = new ArrayBuffer(STRIDE_MATERIAL * MaterialCount * 4);

        const Float32View : Float32Array = new Float32Array(MaterialRawData);
        const Int32View : Int32Array = new Int32Array(MaterialRawData);
        for (let MaterialIndex = 0; MaterialIndex < MaterialCount; MaterialIndex++)
        {
            const MaterialParsed = ParsedMaterialsArray[MaterialIndex];
            const offset = STRIDE_MATERIAL * MaterialIndex;

            Float32View[offset +  0] = MaterialParsed.BaseColor[0];
            Float32View[offset +  1] = MaterialParsed.BaseColor[1];
            Float32View[offset +  2] = MaterialParsed.BaseColor[2];
            Float32View[offset +  3] = MaterialParsed.BaseColor[3];

            Float32View[offset +  4] = MaterialParsed.EmissiveColor[0];
            Float32View[offset +  5] = MaterialParsed.EmissiveColor[1];
            Float32View[offset +  6] = MaterialParsed.EmissiveColor[2];
            Float32View[offset +  7] = MaterialParsed.EmissiveIntensity;

            Float32View[offset +  8] = MaterialParsed.Metalness;
            Float32View[offset +  9] = MaterialParsed.Roughness;
            Float32View[offset + 10] = MaterialParsed.BlendMode;
            Float32View[offset + 11] = MaterialParsed.OpacityMask! || 0;

            Float32View[offset + 12] = MaterialParsed.NormalScale[0];
            Float32View[offset + 13] = MaterialParsed.NormalScale[1];
            Float32View[offset + 14] = MaterialParsed.IOR;

            const BaseColorTextureUUID  : string = MaterialParsed.BaseColorTexture?.uuid!;
            const ORMTextureUUID        : string = MaterialParsed.ORMTexture?.uuid!;
            const EmissiveTextureUUID   : string = MaterialParsed.EmissiveTexture?.uuid!;
            const NormalTextureUUID     : string = MaterialParsed.NormalTexture?.uuid!;

            const BaseColorTextureIndex : number = MapTextureUUIDToIndex.has(BaseColorTextureUUID) ? MapTextureUUIDToIndex.get(BaseColorTextureUUID)! : -1;
            const ORMTextureIndex       : number = MapTextureUUIDToIndex.has(ORMTextureUUID) ? MapTextureUUIDToIndex.get(ORMTextureUUID)! : -1;
            const EmissiveTextureIndex  : number = MapTextureUUIDToIndex.has(EmissiveTextureUUID) ? MapTextureUUIDToIndex.get(EmissiveTextureUUID)! : -1;
            const NormalTextureIndex    : number = MapTextureUUIDToIndex.has(NormalTextureUUID) ? MapTextureUUIDToIndex.get(NormalTextureUUID)! : -1;

            Int32View[offset + 15] = BaseColorTextureIndex;
            Int32View[offset + 16] = ORMTextureIndex;
            Int32View[offset + 17] = EmissiveTextureIndex;
            Int32View[offset + 18] = NormalTextureIndex;
        }

        return [new Uint32Array(MaterialRawData), TexturesArray];
    }
};