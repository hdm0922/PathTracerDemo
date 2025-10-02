import * as THREE from 'three';
import { vec2, vec3, vec4, mat4 } from "gl-matrix";



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



export interface Material
{
    BaseColor               : vec4,
    EmissiveColor           : vec3,
    EmissiveIntensity       : number,

    Metalness               : number,
    Roughness               : number,
    BlendMode               : number,   // OPAQUE: 0, MASK: 1, BLEND: 2
    OpacityMask?            : number,   // AlphaCutOff Value For MASK Mode

    NormalScale             : vec2,
    IOR                     : number,
    Padding_0?              : number,

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
    Padding_0?  : number,

    V           : vec3,
    Padding_1?  : number,
}