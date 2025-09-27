import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH, SAH } from 'three-mesh-bvh';
import { mat4 } from "gl-matrix";

import { type Mesh } from './Mesh.ts';
import { Wrapper } from './Wrapper.ts';

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

            const BVHData = new MeshBVH(MergedMesh.geometry, { strategy: SAH, maxLeafTris: 10 });
            BlasBuffer = new Float32Array((BVHData as any)._roots[0]);
            MergedMesh.geometry.groups = GroupData;
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
