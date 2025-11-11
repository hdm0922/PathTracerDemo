import type { Quat, Vec3 }  from 'wgpu-matrix';
import      { quat, vec3 }  from 'wgpu-matrix';

import { ResourceManager } from './ResourceManager.ts';
import { Instance, Mesh, SerializedMesh, Light, DirectionalLight, PointLight, RectLight } from './Structs.ts';
import type { Scene, SceneAsset } from './Structs.ts';

/**
 * Converts Euler angles in degrees to a quaternion
 * Uses ZYX rotation order (Yaw-Pitch-Roll)
 * @param eulerDegrees - Euler angles in degrees [x, y, z]
 * @returns Quaternion [x, y, z, w]
 */
function eulerDegreesToQuat(eulerDegrees: [number, number, number]): Quat
{
    const DEG_TO_RAD = Math.PI / 180.0;

    // Convert degrees to radians
    const x = eulerDegrees[0] * DEG_TO_RAD;
    const y = eulerDegrees[1] * DEG_TO_RAD;
    const z = eulerDegrees[2] * DEG_TO_RAD;

    // Create quaternions for each axis rotation
    const qx = quat.fromAxisAngle(vec3.fromValues(1, 0, 0), x);
    const qy = quat.fromAxisAngle(vec3.fromValues(0, 1, 0), y);
    const qz = quat.fromAxisAngle(vec3.fromValues(0, 0, 1), z);

    // Combine rotations: Z * Y * X (applied in reverse order)
    let result = quat.multiply(qy, qx);
    result = quat.multiply(qz, result);

    return result;
}


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

    /**
     * World의 모든 데이터를 초기화
     * Scene을 전환할 때 사용
     */
    public Clear(): void
    {
        this.InstancesPool.clear();
        this.Lights = [];
    }

    /**
     * Scene 객체로부터 World를 구성
     * TODO: 차후 Backend API에서 받은 Scene 데이터를 이용하여 동적으로 Scene을 로드
     * @param scene - Scene 객체 (Backend CRUD 호환 구조)
     */
    public LoadFromScene(scene: Scene): void
    {
        // 기존 데이터 초기화
        this.Clear();

        // Scene의 모든 Asset을 순회하며 World에 추가
        for (const asset of scene.assets)
        {
            if (asset.type === 'object')
            {
                // Object Asset 처리
                if (!asset.meshName || !asset.transform)
                {
                    console.warn(`Object asset ${asset.id} is missing meshName or transform`);
                    continue;
                }

                const position  : Vec3 = vec3.fromValues(...asset.transform.position);
                const rotation  : Quat = eulerDegreesToQuat(asset.transform.rotation);
                const scale     : Vec3 = vec3.fromValues(...asset.transform.scale);

                this.AddInstance(asset.id, asset.meshName, position, rotation, scale);
            }
            else if (asset.type === 'directional-light')
            {
                // Directional Light 처리
                if (!asset.lightParams) continue;
                const params = asset.lightParams as any;

                const direction : Vec3 = vec3.normalize(vec3.fromValues(...params.direction));
                const color     : Vec3 = vec3.fromValues(...params.color);
                const intensity : number = params.intensity;

                this.AddDirectionalLight(direction, color, intensity);
            }
            else if (asset.type === 'point-light')
            {
                // Point Light 처리
                if (!asset.lightParams) continue;
                const params = asset.lightParams as any;

                const position  : Vec3 = vec3.fromValues(...params.position);
                const color     : Vec3 = vec3.fromValues(...params.color);
                const intensity : number = params.intensity;

                this.AddPointLight(position, color, intensity);
            }
            else if (asset.type === 'rect-light')
            {
                // Rect Light 처리
                if (!asset.lightParams) continue;
                const params = asset.lightParams as any;

                const position  : Vec3 = vec3.fromValues(...params.position);
                const u         : Vec3 = vec3.fromValues(...params.u);
                const v         : Vec3 = vec3.fromValues(...params.v);
                const color     : Vec3 = vec3.fromValues(...params.color);
                const intensity : number = params.intensity;

                this.AddRectLight(position, u, v, color, intensity);
            }
        }

        console.log(`Loaded scene "${scene.name}" with ${scene.assets.length} assets`);
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
        //for (let i = 0; i < this.Lights.length; i++) { LuminanceArray[i] = 1.0; }
        for (let i = 0; i < this.Lights.length; i++) { LuminanceSum += LuminanceArray[i]; }
        for (let i = 0; i < this.Lights.length; i++) { LuminanceArray[i] /= LuminanceSum; }
        for (let i = 1; i < this.Lights.length; i++) { LuminanceArray[i] += LuminanceArray[i-1]; }

        const LightCDFArrayBuffer : ArrayBuffer = new ArrayBuffer(4 * LuminanceArray.length);
        const Float32View : Float32Array = new Float32Array(LightCDFArrayBuffer);
        Float32View.set(LuminanceArray, 0);

        console.log("CDF: ", Float32View);

        return LightCDFArrayBuffer;
    }
}
