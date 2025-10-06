import { vec3, mat4 } from "gl-matrix";

import type { Instance, Mesh, Light } from './Structs.ts';
import { ResourceManager } from './ResourceManager.ts';

export class World 
{
    // Resource Pools
    public InstancesPool    : Map<string, Instance>;
    public Lights           : Array<Light>;

    
    constructor()
    {
        this.InstancesPool  = new Map();
        this.Lights         = [];
    }


    public Initialize(): void
    {

        // Add Lamp Instance
        const LampInstance: Instance =
        {
            MeshID      : "Lamp",
            ModelMatrix : mat4.identity(mat4.create()),
        };

        //const LampScaleMatrix = mat4.fromScaling(mat4.create(), vec3.fromValues(2,2, 2));
        const LampTranslationMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, 0.6));
        LampInstance.ModelMatrix = LampTranslationMatrix;

        const AnotherLamp : Instance =
        {
            MeshID      : "Lamp",
            ModelMatrix : mat4.identity(mat4.create()),
        };
        const LampTranslationMatrix2 = mat4.fromTranslation(mat4.create(), vec3.fromValues(-0.8, 0, 0.4));
        AnotherLamp.ModelMatrix = LampTranslationMatrix2;


        // Add Bench Instance
        const BenchInstance : Instance =
        {
            MeshID      : "Bench",
            ModelMatrix : mat4.identity(mat4.create()),
        };
        {
            const BenchScaleMatrix = mat4.fromScaling(mat4.create(), vec3.fromValues(0.005, 0.005, 0.005));
            const BenchRotationMatrix = mat4.fromYRotation(mat4.create(), 3.14);
            const BenchTranslationMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(1, 0, 0));
            BenchInstance.ModelMatrix = mat4.mul(mat4.create(), BenchScaleMatrix, BenchInstance.ModelMatrix);
            BenchInstance.ModelMatrix =  mat4.mul(mat4.create(), BenchRotationMatrix, BenchInstance.ModelMatrix);
            BenchInstance.ModelMatrix =  mat4.mul(mat4.create(), BenchTranslationMatrix, BenchInstance.ModelMatrix);
        }



        // Add SBCup
        const StarbucksCupInstance : Instance =
        {
            MeshID      : "StarbucksCup",
            ModelMatrix : mat4.fromScaling(mat4.create(), vec3.fromValues(1, 2, 2)), 
        }




        const DirectionalLight_0 : Light =
        {
            Position    : vec3.create(),
            LightType   : 0,

            Direction   : vec3.normalize(vec3.create(), vec3.fromValues(1, 0, 0)),
            Intensity   : 10,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0,

            U           : vec3.create(),
            V           : vec3.create(),
        }

        const PointLight_0 : Light =
        {
            Position    : vec3.fromValues(0, 0, 1.0),
            LightType   : 1,

            Direction   : vec3.create(),
            Intensity   : 10,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0,

            U           : vec3.create(),
            V           : vec3.create(),
        }

        const RectLight_0 : Light =
        {
            Position    : vec3.fromValues(0, 5, 0),
            LightType   : 2,

            Direction   : vec3.normalize(vec3.create(), vec3.fromValues(0, -1, 0)),
            Intensity   : 6,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0.4,

            U           : vec3.fromValues(0.2,0,0),
            V           : vec3.fromValues(0,0,0.2),
        }
        RectLight_0.Area = 4 * RectLight_0.U.length * RectLight_0.V.length;

        //this.InstancesPool.set("StarbucksCup_0", StarbucksCupInstance);
        this.InstancesPool.set("Bench_0", BenchInstance);
        this.InstancesPool.set("Lamp_0", LampInstance);
        this.InstancesPool.set("Lamp_1", AnotherLamp);

        //this.Lights.push(DirectionalLight_0);
        //this.Lights.push(PointLight_0);
        this.Lights.push(RectLight_0);

        return;
    }

    public PackWorldData() : [Array<Instance>, Array<Mesh>, Map<string, number>]
    {
        function convertMapToArray<T>(InMap: Map<string, T>): [T[], Map<string, number>]
        {
            const ArrayData: T[] = [...InMap.values()];

            const IDToIndexMap: Map<string, number> = new Map<string, number>();
            {
                const IDData: string[] = [...InMap.keys()];

                for (let iter=0; iter<IDData.length; iter++)
                    IDToIndexMap.set(IDData[iter], iter);
            }

            return [ArrayData, IDToIndexMap];
        }
        
        const InstanceArray = convertMapToArray<Instance>(this.InstancesPool)[0];

        const UsedMeshes: Map<string, Mesh> = new Map<string, Mesh>();
        for (const instance of InstanceArray) UsedMeshes.set(instance.MeshID, ResourceManager.MeshPool.get(instance.MeshID)!);

        const [MeshArray, MeshIDToIndexMap] = convertMapToArray(UsedMeshes);
        
        return [InstanceArray, MeshArray, MeshIDToIndexMap];
    }

}
