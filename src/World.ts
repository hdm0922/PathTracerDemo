import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { vec3, mat4 } from "gl-matrix";

import type { Instance, Mesh, Light } from './Structs.ts';
import { buildBVH } from './BlasBuilder.ts';


// World ===================================

export class World 
{
    // Resource Pools
    public InstancesPool    : Map<string, Instance>;
    public MeshesPool       : Map<string, Mesh>;
    public LightsPool       : Map<string, Light>;

    
    constructor()
    {
        this.InstancesPool  = new Map();
        this.MeshesPool     = new Map();
        this.LightsPool     = new Map();
    }


    async Load(): Promise<void>
    {

        // Loading Models ...
        const LampMesh = await this.LoadModel("../assets/Lamp.glb");
        //const SofaMesh = await this.LoadModel("../assets/Sofa.glb");

        // Registering Models ...
        this.MeshesPool.set("Lamp", LampMesh);
        //this.MeshesPool.set("Sofa", SofaMesh);

        return;
    }

    async LoadModel(Path: string) : Promise<Mesh>
    {
        const ModelLoader   = new GLTFLoader();
        const Model         = await ModelLoader.loadAsync(Path);      

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


    public Initialize(): void
    {

        // Add Lamp Instance
        const Instance_0: Instance =
        {
            MeshID      : "Lamp",
            ModelMatrix : mat4.identity(mat4.create()),
        };

        const Instance_1: Instance =
        {
            MeshID      : "Lamp",
            ModelMatrix :  mat4.fromTranslation(mat4.create(), vec3.fromValues(0,0,0.5)),
        };
       

        this.InstancesPool.set("Lamp_0", Instance_0);
        this.InstancesPool.set("Lamp_1", Instance_1);

        return;
    }


}
