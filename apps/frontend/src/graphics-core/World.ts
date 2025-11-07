import type { Quat, Vec3 }  from 'wgpu-matrix';
import      { quat, vec3 }  from 'wgpu-matrix';

import { ResourceManager } from './ResourceManager.ts';
import { Instance, Mesh, SerializedMesh, Light, DirectionalLight, PointLight, RectLight } from './Structs.ts';



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

        // ========== ADD INSTANCES ==========

        // Add TestScene Instance
        {
            const Translation   : Vec3 = vec3.fromValues(0,0,0);
            const Rotation      : Quat = quat.identity();
            const Scale         : Vec3 = vec3.fromValues(1,1,1);

            this.AddInstance("SceneInstance_0", "TestScene", Translation, Rotation, Scale);
        }

        // Add PureWindow Instance
        {
            const Translation   : Vec3 = vec3.fromValues(0,0,0);
            const Rotation      : Quat = quat.rotateY(quat.identity(), 3.14/2);
            const Scale         : Vec3 = vec3.fromValues(1,1,1);

            //this.AddInstance("WindowInstance_0", "PureWindow", Translation, Rotation, Scale);
        }

        // Add Chair Instance
        {
            const Translation   : Vec3 = vec3.fromValues(0,-90,0);
            const Rotation      : Quat = quat.identity();
            const Scale         : Vec3 = vec3.fromValues(0.02,0.02,0.02);

            //this.AddInstance("ChairInstance_0", "Chair", Translation, Rotation, Scale);
        }

        // Add Another Chair Instance
        {
            const Translation   : Vec3 = vec3.fromValues(200,0,0);
            const Rotation      : Quat = quat.identity();
            const Scale         : Vec3 = vec3.fromValues(0.02,0.02,0.02);

            //this.AddInstance("ChairInstance_1", "Series3300_3303", Translation, Rotation, Scale);
        }
        // =========================================



        // ========== ADD LIGHTS ==========

        // Add Directional Light
        {
            const Direction : Vec3      = vec3.normalize( vec3.fromValues(0, 0, -1) );
            const Color     : Vec3      = vec3.fromValues(1, 1, 1);
            const Intensity : number    = 1.0;

            this.AddDirectionalLight(Direction, Color, Intensity);
        }

        // Add point Light
        {
            const Position  : Vec3      = vec3.fromValues(0, 0, -2);
            const Color     : Vec3      = vec3.fromValues(1, 1, 1);
            const Intensity : number    = 10.0;

            this.AddPointLight(Position, Color, Intensity);
        }

        // Add Rect Light
        {
            const Position  : Vec3      = vec3.fromValues(0, 1, 0);
            const U         : Vec3      = vec3.fromValues(0.4, 0, 0);
            const V         : Vec3      = vec3.fromValues(0, 0, 0.4);
            const Color     : Vec3      = vec3.fromValues(1, 1, 1);
            const Intensity : number    = 20;

            this.AddRectLight(Position, U, V, Color, Intensity);
        }

        // =========================================

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

        const UsedMeshesSerialized : Map<string, SerializedMesh> = new Map<string, SerializedMesh>();
        for (const InstanceUsing of InstanceArray) 
        {
            const MeshToSerialize : Mesh = ResourceManager.MeshPool.get(InstanceUsing.MeshID)!;
            UsedMeshesSerialized.set(InstanceUsing.MeshID, MeshToSerialize.Serialize());
        }
                
        const [SerializedMeshArray, MeshIDToIndexMap] = convertMapToArray(UsedMeshesSerialized);
        return [InstanceArray, SerializedMeshArray, MeshIDToIndexMap];
    }

    public GetLightCDFBuffer() : ArrayBuffer
    {
        const LuminanceArray    : Float32Array  = new Float32Array(this.Lights.length);
        let LuminanceSum        : number        = 0.0;
        for (let i = 0; i < this.Lights.length; i++) { LuminanceArray[i] = this.Lights[i].GetLuminance(); }
        for (let i = 0; i < this.Lights.length; i++) { LuminanceArray[i] = 1.0; }
        for (let i = 0; i < this.Lights.length; i++) { LuminanceSum += LuminanceArray[i]; }
        for (let i = 0; i < this.Lights.length; i++) { LuminanceArray[i] /= LuminanceSum; }
        for (let i = 1; i < this.Lights.length; i++) { LuminanceArray[i] += LuminanceArray[i-1]; }

        const LightCDFArrayBuffer : ArrayBuffer = new ArrayBuffer(4 * LuminanceArray.length);
        const Float32View : Float32Array = new Float32Array(LightCDFArrayBuffer);
        Float32View.set(LuminanceArray, 0);

        return LightCDFArrayBuffer;
    }
}
