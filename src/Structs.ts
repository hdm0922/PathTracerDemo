import * as THREE from 'three';
import { vec3, vec4, mat4 } from "gl-matrix";



// export interface Uniform
// {
//     Resolution                          : vec2,
//     MAX_BOUNCE                          : number,
//     SAMPLE_PER_PIXEL                    : number,

//     ViewProjectionMatrix_Inverse        : mat4,

//     CameraWorldPosition                 : vec3,
//     FrameIndex                          : number,

//     Offset_MeshDescriptorBuffer         : number,
//     Offset_MaterialBuffer               : number,
//     Offset_LightBuffer                  : number,
//     Offset_IndexBuffer                  : number,

//     Offset_PrimitiveToMaterialBuffer    : number,
//     Offset_BlasBuffer                   : number,
//     InstanceCount                       : number,
//     LightSourceCount                    : number,
// }



export interface Instance
{
    MeshID      : string;
    ModelMatrix : mat4;
}



export interface Mesh
{
    Blas : Float32Array;
    Data : THREE.Mesh;
}



export interface SerializedMesh
{
    BlasArray                   : Uint32Array,
    VertexArray                 : Uint32Array,
    IndexArray                  : Uint32Array,
    PrimitiveToMaterialArray    : Uint32Array,
    MaterialArray               : Uint32Array,
    TextureArray                : Array<ImageBitmap>,
}



export interface MeshDescriptor
{
    BlasOffset                  : number,
    VertexOffset                : number,
    IndexOffset                 : number,
    PrimitiveToMaterialOffset   : number,
    MaterialOffset              : number,
    TextureOffset               : number,
}



export interface Material
{
    BaseColor               : vec4,
    EmissiveColor           : vec3,
    EmissiveIntensity       : number,

    Metalness               : number,
    Roughness               : number,
    BlendMode               : number,   // OPAQUE: 0, MASK: 1, BLEND: 2
    OpacityMask?            : number,   // AlphaCutOff Value For MASK Mode

    IOR                     : number,
    Transmissive            : number,

    BaseColorTexture        : THREE.Texture | null,
    ORMTexture              : THREE.Texture | null,
    EmissiveTexture         : THREE.Texture | null,
    NormalTexture           : THREE.Texture | null,
}



export interface Light
{
    Position    : vec3,
    LightType   : number,

    Direction   : vec3,
    Intensity   : number,

    Color       : vec3,
    Area        : number,

    U           : vec3,
    V           : vec3,
}