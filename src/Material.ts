import * as THREE from 'three';
import { vec2, vec3, vec4 } from "gl-matrix";



export interface Material
{

    BaseColor           : vec4,
    EmissiveColor       : vec3,
    EmissiveIntensity   : number,

    Metalness           : number,
    Roughness           : number,
    BlendMode           : number,   // OPAQUE: 0, MASK: 1, BLEND: 2
    OpacityMask?        : number,   // AlphaCutOff Value For MASK Mode

    NormalScale         : vec2,
    IOR                 : number,
    Padding_0?          : number,

    BaseColorTexture        : THREE.Texture | null,
    ORMTexture              : THREE.Texture | null,
    EmissiveTexture         : THREE.Texture | null,
    NormalTexture           : THREE.Texture | null,

}
