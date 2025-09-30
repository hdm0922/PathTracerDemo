import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH, SAH } from 'three-mesh-bvh';
import { mat4 } from "gl-matrix";

import { type Mesh } from './Mesh.ts';

// Resources ===================================

export interface Instance
{
    MeshID      : string;
    ModelMatrix : mat4;
}

// World ===================================

export class World 
{
    // Resource Pools
    public InstancesPool    : Map<string, Instance>;
    public MeshesPool       : Map<string, Mesh>;


    
    constructor()
    {
        this.InstancesPool  = new Map();
        this.MeshesPool     = new Map();
    }


    async Load(): Promise<void>
    {

        // Loading Models ...
        const LampMesh = await this.LoadModel("../assets/Lamp.glb");

        // Registering Models ...
        this.MeshesPool.set("Lamp", LampMesh);

        return;
    }


    async LoadModel(Path: string): Promise<Mesh>
    {
        const ModelLoader   = new GLTFLoader();
        const Model         = await ModelLoader.loadAsync(Path);

        const Geometries    : THREE.BufferGeometry[]    = [];
        const Materials     : THREE.Material[]          = [];

        // For Each Model Found : Gather Information To Geometries, Materials
        for (const MeshIdx in Model.scene.children)
        {
            const Mesh = Model.scene.children[MeshIdx] as THREE.Mesh;
            if (!Mesh.isMesh) continue;
            
            Mesh.geometry.applyMatrix4(Mesh.matrixWorld);
            Geometries.push(Mesh.geometry);

            if (Array.isArray(Mesh.material)) { Materials.push(...Mesh.material); }
            else { Materials.push(Mesh.material); }
        }
        
        // Merge Meshes
        const MergedMesh = new THREE.Mesh(mergeGeometries(Geometries, true), Materials);

        // Build BVH Buffer
        let BlasBuffer: Float32Array;
        {
            const GroupData = MergedMesh.geometry.groups;
            MergedMesh.geometry.groups = [];

            

            // const originalIndicesBefore = MergedMesh.geometry.index!.array.slice();
            // console.log('BVH 생성 전 원본 인덱스 (첫 12개):', originalIndicesBefore);


            const BVHData = new MeshBVH(MergedMesh.geometry, { strategy: SAH, maxLeafTris: 10, indirect: false });
            BlasBuffer = new Float32Array((BVHData as any)._roots[0]);
            MergedMesh.geometry.groups = GroupData;

            const floatView = new Float32Array((BVHData as any)._roots[0]);
            const intView = new Int32Array((BVHData as any)._roots[0]);
            const uintView = new Uint32Array((BVHData as any)._roots[0]);

            // console.log(uintView);
            // console.log(floatView);
            console.log(BVHData.geometry.index);
            console.log(BVHData.geometry.attributes["position"]);
            for (let iter=0; iter<29; iter++)
            {
                let vertexID = BVHData.geometry.index?.array[iter]!;

                let PosX = BVHData.geometry.attributes["position"].array[3*vertexID];
                let PosY = BVHData.geometry.attributes["position"].array[3*vertexID+1];
                let PosZ = BVHData.geometry.attributes["position"].array[3*vertexID+2];
                console.log("Vertex Position: [", PosX, PosY, PosZ, "]");
            }

            //console.log(intView);
            for (let iter=0; iter<intView.length / 8; iter++)
            {
                const offset = intView[8*iter + 6];
                const count = intView[8*iter + 7];
                
                if (count & 0xffff0000)
                {
                    //console.log(iter); break;
                    const primStartID = offset;
                    const primEndID = offset + (count & 0x0000ffff);

                    //if (offset % 3) console.log(offset);
                    //if (primEndID * 3 >= BVHData.geometry.index?.count!) console.log(iter * 8);
                    //console.log(primEndID - primStartID);
                    // const triCount = count & 0x0000ffff;
                    // if (3*(offset + triCount) >= BVHData.geometry.index?.count!) console.log(offset, triCount);
                    // //if (offset >= intView.length / 8) { console.log(offset); }
                    continue;
                }

                
                
            }
            const serializedData = MeshBVH.serialize(BVHData);
            //console.log(serializedData);
            //console.log(BlasBuffer);
            //console.log(BlasBuffer);
            //console.log(MeshBVH.serialize(BVHData).roots[0]);
            //console.log(BVHData.geometry.index);
            //console.log(intView);
            // console.log(floatView.subarray(600, 624));
            // console.log(uintView.subarray(600, 624));
            // console.log(intView.subarray(600, 624));
            // min3, max3, offset, count

            //console.log(BVHData.geometry.index);
        }

        const MeshGenerated: Mesh =
        {
            Blas: BlasBuffer,
            Data: MergedMesh,
        }; 

        return MeshGenerated;
    }


    public Initialize(): void
    {

        // Add Lamp
        const Instance_0: Instance =
        {
            MeshID      : "Lamp",
            ModelMatrix : mat4.identity(mat4.create()),
        };

        this.InstancesPool.set("Lamp_0", Instance_0);

        return;
    }


}
