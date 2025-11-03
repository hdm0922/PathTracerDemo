import { Mesh } from './Structs.ts';

export class ResourceManager
{
    public static MeshPool : Map<string, Mesh> = new Map();
    
    public static async LoadAssets(AssetNames : string[]) : Promise<void>
    {

        const LoadAsset = AssetNames.map
        (
            async (Name) => 
            { 
                const MeshLoaded = await Mesh.Load(Name); 
                ResourceManager.MeshPool.set(Name, MeshLoaded);
            }
        );

        await Promise.all(LoadAsset);

        const ChairMesh : Mesh = ResourceManager.MeshPool.get("Chair")!;
        console.log(ChairMesh);

        return;
    }

    public static MergeArrays(InArrays : Uint32Array[]) : [Uint32Array, Uint32Array]
    {
        if (InArrays.length === 0) return [new Uint32Array(), new Uint32Array()];


        const Offset : Uint32Array = new Uint32Array(InArrays.length); Offset[0] = 0;
        for (let iter = 0; iter < InArrays.length - 1; iter++)
        {
            Offset[iter+1] = Offset[iter] + InArrays[iter].length;
        }


        const ArrayLength = Offset[InArrays.length - 1] + InArrays[InArrays.length - 1].length;
        const MergedArray : Uint32Array = new Uint32Array(ArrayLength);
        for (let iter = 0; iter < InArrays.length; iter++)
        {
            MergedArray.set(InArrays[iter], Offset[iter]);
        }

        return [MergedArray, Offset];
    }
};