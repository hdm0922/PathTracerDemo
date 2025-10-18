import type { Quat, Vec3 }  from 'wgpu-matrix';
import      { quat, vec3 }  from 'wgpu-matrix';

import { ResourceManager } from './ResourceManager.ts';
import { SerializedMesh } from "./SerializedMesh.ts";
import { Instance, Light, DirectionalLight, PointLight, RectLight } from './Structs.ts';



export class World 
{
    public InstancesPool    : Map<string, Instance>;
    public Lights           : Array<Light>;
    
    constructor()
    {
        this.InstancesPool  = new Map();
        this.Lights         = [];
    }

    public AddInstance
    (
        InstanceName    : string, 
        MeshName        : string,
        Translation     : Vec3 = vec3.fromValues(0,0,0),
        Rotation        : Quat = quat.identity(),
        Scale           : Vec3 = vec3.fromValues(1,1,1)
    )                   : void
    {
        const InstanceToAdd : Instance = new Instance(MeshName, Translation, Rotation, Scale);
        this.InstancesPool.set(InstanceName, InstanceToAdd);

        return;
    };

    public AddDirectionalLight
    (
        Direction   : Vec3,
        Color       : Vec3,
        Intensity   : number,
    )
    {
        const DirectionalLightToAdd : DirectionalLight = new DirectionalLight(Direction, Color, Intensity);
        this.Lights.push(DirectionalLightToAdd);

        return;
    }

    public AddPointLight
    (
        Position    : Vec3,
        Color       : Vec3,
        Intensity   : number,
    )
    {
        const PointLightToAdd : PointLight = new PointLight(Position, Color, Intensity);
        this.Lights.push(PointLightToAdd);

        return;
    }

    public AddRectLight
    (
        Position    : Vec3,
        U           : Vec3,
        V           : Vec3,
        Color       : Vec3,
        Intensity   : number
    )
    {
        const RectLightToAdd : RectLight = new RectLight(Position, Color, U, V, Intensity);
        this.Lights.push(RectLightToAdd);

        return;
    }

    public Initialize(): void
    {

        this.AddInstance("SceneInstance", "TestScene");
        //this.AddInstance("LampInstance", "Lamp");

        this.AddDirectionalLight(
            vec3.fromValues(0, 0, -1), 
            vec3.fromValues(1, 1, 1),
            2
        );

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
