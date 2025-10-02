import * as THREE from 'three';
import { mat4, vec2, vec3, vec4 } from "gl-matrix";

import type { Instance, Mesh, Material, Light } from './Structs.ts';




export class Wrapper
{

    static WrapInstances(InstanceArray: Instance[], MeshIDToIndex: Map<string, number>): Float32Array
    {
        const ELEMENT_PER_INSTANCE = 36;
        const InstanceRawData: Float32Array = new Float32Array(ELEMENT_PER_INSTANCE * InstanceArray.length);

        for (let iter=0; iter<InstanceArray.length; iter++)
        {
            const InstanceOffset = ELEMENT_PER_INSTANCE * iter;

            const ModelMatrix           : mat4      = InstanceArray[iter].ModelMatrix;
            const ModelMatrixInverse    : mat4      = mat4.invert(mat4.create(), ModelMatrix)!;
            const MeshID                : number    = MeshIDToIndex.get(InstanceArray[iter].MeshID)!;

            InstanceRawData.set(ModelMatrix,        InstanceOffset +  0);
            InstanceRawData.set(ModelMatrixInverse, InstanceOffset + 16);
            InstanceRawData[InstanceOffset + 35] = MeshID;
        }

        return InstanceRawData;
    }

    static WrapLights(LightsArray: Light[]) : Float32Array
    {
        const ELEMENT_PER_LIGHT = 20;

        const LightRawData : ArrayBuffer = new ArrayBuffer(ELEMENT_PER_LIGHT * LightsArray.length * 4);

        const Float32View : Float32Array = new Float32Array(LightRawData);
        const Uint32View : Uint32Array = new Uint32Array(LightRawData);

        for (let iter=0; iter<LightsArray.length; iter++)
        {
            const LightOffset = ELEMENT_PER_LIGHT * iter;

            Float32View.set(LightsArray[iter].Position, LightOffset +  0);
            Uint32View[LightOffset +  3] = LightsArray[iter].LightType;

            Float32View.set(LightsArray[iter].Direction, LightOffset +  4);
            Float32View[LightOffset +  7] = LightsArray[iter].Intensity;
            
            Float32View.set(LightsArray[iter].Color, LightOffset +  8);
            Float32View[LightOffset +  11] = LightsArray[iter].Area;

            Float32View.set(LightsArray[iter].U, LightOffset + 12);
            Float32View.set(LightsArray[iter].V, LightOffset + 16);
        }

        return Float32View;
    }

    static WrapBlasArray(InMesh: Mesh): Float32Array
    {
        return InMesh.Blas;
    }

    static WrapVertexArray(InMesh: Mesh): Float32Array
    {
        const VertexPositionData    = InMesh.Data.geometry.attributes["position"];
        const VertexNormalData      = InMesh.Data.geometry.attributes["normal"];
        const VertexUVData          = InMesh.Data.geometry.attributes["uv"];

        const ELEMENTS_PER_VERTEX = 12;
        const PADDING = 0;
        const VertexCount = VertexPositionData.count;

        const VerticesArray = new Float32Array(ELEMENTS_PER_VERTEX * VertexCount);

        for (let VertexID: number = 0; VertexID < VertexCount; VertexID++)
        {
            const Position_X = VertexPositionData.array[3 * VertexID + 0];
            const Position_Y = VertexPositionData.array[3 * VertexID + 1];
            const Position_Z = VertexPositionData.array[3 * VertexID + 2];

            const Normal_X = VertexNormalData.array[3 * VertexID + 0];
            const Normal_Y = VertexNormalData.array[3 * VertexID + 1];
            const Normal_Z = VertexNormalData.array[3 * VertexID + 2];

            const U = VertexUVData.array[2 * VertexID + 0];
            const V = VertexUVData.array[2 * VertexID + 1];

            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  0] = Position_X;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  1] = Position_Y;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  2] = Position_Z;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  3] = PADDING;

            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  4] = Normal_X;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  5] = Normal_Y;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  6] = Normal_Z;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  7] = PADDING;

            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  8] = U;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID +  9] = V;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID + 10] = PADDING;
            VerticesArray[ELEMENTS_PER_VERTEX * VertexID + 11] = PADDING;
        }

        return VerticesArray;
    }

    static WrapIndexArray(InMesh: Mesh): Uint32Array
    {
        return new Uint32Array(InMesh.Data.geometry.index?.array!);
    }

    static WrapPrimitiveToMaterialArray(InMesh: Mesh): Uint32Array
    {
        const VERTICES_PER_PRIMITIVE = 3; // Triangle
        const PrimitiveCount = InMesh.Data.geometry.index?.array!.length! / VERTICES_PER_PRIMITIVE;

        const PrimitiveToMaterialArray: Uint32Array = new Uint32Array(PrimitiveCount);

        // Mapping PrimitiveID -> Material
        for (const SubMeshGroup of InMesh.Data.geometry.groups)
        {
            for (let idx=0; idx<SubMeshGroup.count; idx += VERTICES_PER_PRIMITIVE)
            {
                const PrimitiveID = (SubMeshGroup.start + idx) / VERTICES_PER_PRIMITIVE;
                PrimitiveToMaterialArray[PrimitiveID] = SubMeshGroup.materialIndex!;
            }
        }

        return PrimitiveToMaterialArray;
    }

    static WrapPrimitiveArray(InMesh: Mesh): Uint32Array
    {
        const VERTICES_PER_PRIMITIVE = 3; // Triangle

        const IndexArray: Uint32Array = new Uint32Array(InMesh.Data.geometry.index?.array!);
        const PrimitiveToMaterialArray: Uint32Array = new Uint32Array(IndexArray.length / VERTICES_PER_PRIMITIVE);

        const PrimitiveCount = PrimitiveToMaterialArray.length;

        // Mapping PrimitiveID -> Material
        for (const SubMeshGroup of InMesh.Data.geometry.groups)
        {
            for (let idx=0; idx<SubMeshGroup.count; idx += VERTICES_PER_PRIMITIVE)
            {
                const PrimitiveID = (SubMeshGroup.start + idx) / VERTICES_PER_PRIMITIVE;
                PrimitiveToMaterialArray[PrimitiveID] = SubMeshGroup.materialIndex!;
            }
        }

        const IndicesWithMaterialArray = new Uint32Array((VERTICES_PER_PRIMITIVE + 1) * PrimitiveCount);
        for (let iter=0; iter<PrimitiveCount; iter++)
        {
            const IndexID = (VERTICES_PER_PRIMITIVE + 1) * iter;
            let offset = 0;

            IndicesWithMaterialArray[IndexID + offset] = IndexArray[iter + offset]; offset++;
            IndicesWithMaterialArray[IndexID + offset] = IndexArray[iter + offset]; offset++;
            IndicesWithMaterialArray[IndexID + offset] = IndexArray[iter + offset]; offset++;
            IndicesWithMaterialArray[IndexID + offset] = PrimitiveToMaterialArray[iter];
        }

        return IndicesWithMaterialArray;
    }

    static WrapMaterialsAndTexturesArray(InMesh: Mesh): [Float32Array, Array<ImageBitmap>]
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

            const MaterialEmissiveColor = vec3.create();
            {
                MaterialEmissiveColor[0] = InMaterial.emissive.r;
                MaterialEmissiveColor[1] = InMaterial.emissive.g;
                MaterialEmissiveColor[2] = InMaterial.emissive.b;
            }

            const MaterialNormalScale = vec2.create();
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
        const ELEMENTS_IN_MATERIAL = 20;
        const PADDING = 0;
        const MaterialsArray: Float32Array = new Float32Array(ELEMENTS_IN_MATERIAL * MaterialCount);
        for (let MaterialIndex=0; MaterialIndex < MaterialCount; MaterialIndex++)
        {
            const MaterialParsed = ParsedMaterialsArray[MaterialIndex];

            let offset = 0;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.BaseColor[0];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.BaseColor[1];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.BaseColor[2];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.BaseColor[3];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.EmissiveColor[0];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.EmissiveColor[1];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.EmissiveColor[2];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.EmissiveIntensity;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.Metalness;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.Roughness;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.BlendMode;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.OpacityMask! || 0;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.NormalScale[0];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.NormalScale[1];
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = MaterialParsed.IOR;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = PADDING;


            const BaseColorTextureUUID  : string = MaterialParsed.BaseColorTexture?.uuid!;
            const ORMTextureUUID        : string = MaterialParsed.ORMTexture?.uuid!;
            const EmissiveTextureUUID   : string = MaterialParsed.EmissiveTexture?.uuid!;
            const NormalTextureUUID     : string = MaterialParsed.NormalTexture?.uuid!;

            const BaseColorTextureIndex : number = MapTextureUUIDToIndex.has(BaseColorTextureUUID) ? MapTextureUUIDToIndex.get(BaseColorTextureUUID)! : -1;
            const ORMTextureIndex       : number = MapTextureUUIDToIndex.has(ORMTextureUUID) ? MapTextureUUIDToIndex.get(ORMTextureUUID)! : -1;
            const EmissiveTextureIndex  : number = MapTextureUUIDToIndex.has(EmissiveTextureUUID) ? MapTextureUUIDToIndex.get(EmissiveTextureUUID)! : -1;
            const NormalTextureIndex    : number = MapTextureUUIDToIndex.has(NormalTextureUUID) ? MapTextureUUIDToIndex.get(NormalTextureUUID)! : -1;


            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = BaseColorTextureIndex;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = ORMTextureIndex;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = EmissiveTextureIndex;
            MaterialsArray[ELEMENTS_IN_MATERIAL * MaterialIndex + offset++] = NormalTextureIndex;
        }

        return [MaterialsArray, TexturesArray];
    }

}