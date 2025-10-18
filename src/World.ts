import type { Vec3 }  from 'wgpu-matrix';
import      { vec3 }  from 'wgpu-matrix';

import { ResourceManager } from './ResourceManager.ts';
import { SerializedMesh } from "./SerializedMesh.ts";
import { Instance, Light, DirectionalLight } from './Structs.ts';



export class World 
{
    public InstancesPool    : Map<string, Instance>;
    public Lights           : Array<Light>;
    
    constructor()
    {
        this.InstancesPool  = new Map();
        this.Lights         = [];
    }

    public Initialize(): void
    {

        // Add Instance (TestScene)
        {
            const InstanceName : string = "TestScene";
            this.InstancesPool.set(InstanceName, new Instance(InstanceName));
        }

        {
            const InstanceName : string = "Lamp";
            this.InstancesPool.set(InstanceName, new Instance(InstanceName));
        }

        // Add Light (DirectionalLight)
        {
            const LightDirection    : Vec3      = vec3.normalize( vec3.fromValues(0, 0, -1) );
            const LightColor        : Vec3      = vec3.fromValues(1, 1, 1);
            const LightIntensity    : number    = 2;

            const DirectionalLight_0 : DirectionalLight = new DirectionalLight(LightDirection, LightColor, LightIntensity);
            this.Lights.push(DirectionalLight_0);
        }

        return;
    }

    public PackWorldData() : [Array<Instance>, Array<SerializedMesh>, Map<string, number>]
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

        const UsedMeshes: Map<string, SerializedMesh> = new Map<string, SerializedMesh>();
        for (const instance of InstanceArray) UsedMeshes.set(instance.MeshID, ResourceManager.MeshPool.get(instance.MeshID)!);

        const [MeshArray, MeshIDToIndexMap] = convertMapToArray(UsedMeshes);
        
        return [InstanceArray, MeshArray, MeshIDToIndexMap];
    }

}
