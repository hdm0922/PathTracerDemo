import { SerializedMesh } from './SerializedMesh.ts';

export class ResourceManager
{
    public static MeshPool : Map<string, SerializedMesh> = new Map();
    
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