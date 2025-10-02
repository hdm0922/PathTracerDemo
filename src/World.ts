import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { vec3, mat4 } from "gl-matrix";

import type { Instance, Mesh, Light } from './Structs.ts';
import { buildBVH } from './BlasBuilder.ts';

export class World 
{
    // Resource Pools
    public InstancesPool    : Map<string, Instance>;
    public MeshesPool       : Map<string, Mesh>;
    public Lights           : Array<Light>;

    
    constructor()
    {
        this.InstancesPool  = new Map();
        this.MeshesPool     = new Map();
        this.Lights         = [];
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


        const DirectionalLight_0 : Light =
        {
            Position    : vec3.create(),
            LightType   : 0,

            Direction   : vec3.normalize(vec3.create(), vec3.fromValues(1, 0, 0)),
            Intensity   : 1,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0,

            U           : vec3.create(),
            V           : vec3.create(),
        }

        const PointLight_0 : Light =
        {
            Position    : vec3.fromValues(0, 0.3, 0.6),
            LightType   : 1,

            Direction   : vec3.create(),
            Intensity   : 1,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0,

            U           : vec3.create(),
            V           : vec3.create(),
        }

        const RectLight_0 : Light =
        {
            Position    : vec3.fromValues(0, 1, 0),
            LightType   : 2,

            Direction   : vec3.normalize(vec3.create(), vec3.fromValues(0, -1, 0)),
            Intensity   : 20,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0.4,

            U           : vec3.fromValues(0.5,0,0),
            V           : vec3.fromValues(0,0,0.2),
        }

        this.InstancesPool.set("Lamp_0", Instance_0);

        this.Lights.push(DirectionalLight_0);
        this.Lights.push(PointLight_0);
        this.Lights.push(RectLight_0);

        return;
    }


}
