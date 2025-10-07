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

        const LampInstance: Instance =
        {
            MeshID      : "Lamp",
            ModelMatrix : mat4.identity(mat4.create()),
        };
        {
            const LampTranslationMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, 0.0));
            LampInstance.ModelMatrix = LampTranslationMatrix;
        }

        const AnotherLamp : Instance =
        {
            MeshID      : "Lamp",
            ModelMatrix : mat4.identity(mat4.create()),
        };
        {
            const LampTranslationMatrix2 = mat4.fromTranslation(mat4.create(), vec3.fromValues(-0.8, 0, 0.4));
            AnotherLamp.ModelMatrix = LampTranslationMatrix2;
        }

        const BenchInstance : Instance =
        {
            MeshID      : "Bench",
            ModelMatrix : mat4.identity(mat4.create()),
        };
        {
            const InstanceUsing = BenchInstance;

            const ScaleMatrix = mat4.fromScaling(mat4.create(), vec3.fromValues(0.005, 0.005, 0.005));
            const RotationMatrix = mat4.fromYRotation(mat4.create(), 3.14);
            const TranslationMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(1, 0, 0));
            InstanceUsing.ModelMatrix = mat4.mul(mat4.create(), ScaleMatrix, InstanceUsing.ModelMatrix);
            InstanceUsing.ModelMatrix =  mat4.mul(mat4.create(), RotationMatrix, InstanceUsing.ModelMatrix);
            InstanceUsing.ModelMatrix =  mat4.mul(mat4.create(), TranslationMatrix, InstanceUsing.ModelMatrix);
        }

        const StarbucksCupInstance : Instance =
        {
            MeshID      : "StarbucksCup",
            ModelMatrix : mat4.fromScaling(mat4.create(), vec3.fromValues(1, 2, 2)), 
        }

        const CeilingLampInstance : Instance =
        {
            MeshID      : "CeilingLamp",
            ModelMatrix : mat4.create(),
        }
        {
            const InstanceUsing = CeilingLampInstance;

            const TranslationMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, -1.9, 0));
            InstanceUsing.ModelMatrix =  mat4.mul(mat4.create(), TranslationMatrix, InstanceUsing.ModelMatrix);
        }

        const SceneInstance : Instance =
        {
            MeshID      : "TestScene",
            ModelMatrix : mat4.create(),
        }

        const DirectionalLight_0 : Light =
        {
            Position    : vec3.create(),
            LightType   : 0,

            Direction   : vec3.normalize(vec3.create(), vec3.fromValues(0, 0, -1)),
            Intensity   : 5,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0,

            U           : vec3.create(),
            V           : vec3.create(),
        }

        const PointLight_0 : Light =
        {
            Position    : vec3.fromValues(0, 1, 0),
            LightType   : 1,

            Direction   : vec3.create(),
            Intensity   : 40,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0,

            U           : vec3.create(),
            V           : vec3.create(),
        }

        const RectLight_0 : Light =
        {
            Position    : vec3.fromValues(0, 3.0, 0),
            LightType   : 2,

            Direction   : vec3.normalize(vec3.create(), vec3.fromValues(0, -1, 0)),
            Intensity   : 5,

            Color       : vec3.fromValues(1,1,1),
            Area        : 0.4,

            U           : vec3.fromValues(0.2,0,0),
            V           : vec3.fromValues(0,0,0.2),
        }
        RectLight_0.Area = 4 * RectLight_0.U.length * RectLight_0.V.length;

        //this.InstancesPool.set("StarbucksCup_0", StarbucksCupInstance);
        //this.InstancesPool.set("Bench_0", BenchInstance);
        //this.InstancesPool.set("Lamp_0", LampInstance);
        this.InstancesPool.set("Scene_0", SceneInstance);
        //this.InstancesPool.set("Lamp_1", AnotherLamp);
        //this.InstancesPool.set("CeilingLamp_0", CeilingLampInstance);

        this.Lights.push(DirectionalLight_0);
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
