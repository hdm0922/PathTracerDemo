import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshBVH } from 'three-mesh-bvh';

interface SubMesh
{
    StartIndex: number;
    Count: number;
    MaterialIndex: number;
}

interface Material
{

}

class Mesh
{

    // Bounding Volume Hierachy
    public BVH: MeshBVH;

    // Geometry
    public VerticesArray: Float32Array;
    public NormalsArray: Float32Array;
    public TangentsArray: Float32Array;
    public UVsArray: Float32Array;
    public IndicesArray: Uint32Array;

    // SubMeshes
    public SubMeshesArray: SubMesh[];

    // Materials


    constructor()
    {
        this.BVH = MeshBVH.prototype;

        this.VerticesArray = Float32Array.prototype;
        this.NormalsArray = Float32Array.prototype;
        this.TangentsArray = Float32Array.prototype;
        this.UVsArray = Float32Array.prototype;
        this.IndicesArray = Uint32Array.prototype;

        this.SubMeshesArray = [];

        //let x: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial();
        
    }
}

// 최종적으로 Compute Shader에 넘겨줄 데이터 구조 (예시)
interface SceneData {
    bvh: any; // 생성된 BVH 데이터
    geometry: {
        vertices: Float32Array;
        normals: Float32Array;
        tangents: Float32Array;
        uvs: Float32Array;
        indices: Uint32Array;
    };
    subMeshes: {
        startIndex: number;
        count: number;
        materialIndex: number;
    }[];
    materials: {
        color: THREE.Color;
        roughness: number;
        metalness: number;
        emission: THREE.Color;
        albedoTextureIndex: number; // 텍스처 인덱스
        // ... 기타 재질 속성
    }[];
    textures: ImageData[]; // 실제 텍스처의 픽셀 데이터
}

const loader = new GLTFLoader();
loader.load("../assets/Lamp.glb", (gltf) => {
    
    const sceneData: SceneData = {
        bvh: null,
        geometry: {
            vertices: new Float32Array(),
            normals: new Float32Array(),
            tangents: new Float32Array(),
            uvs: new Float32Array(),
            indices: new Uint32Array(),
        },
        subMeshes: [],
        materials: [],
        textures: [],
    };
    
    const textureMap = new Map<THREE.Texture, number>();
    const materialMap = new Map<THREE.Material, number>();

    // 1. gltf 씬을 순회하며 메쉬 정보 추출
    gltf.scene.traverse((object) => {

        //if (!(object as THREE.Mesh).isMesh) return;

        if ((object as THREE.Mesh).isMesh) {
            const mesh = object as THREE.Mesh;
            const geometry = mesh.geometry;

            // 재질 및 텍스처 정보 추출
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            
            materials.forEach(material => {
                if (!materialMap.has(material)) {
                    const matIndex = sceneData.materials.length;
                    materialMap.set(material, matIndex);
                    
                    const stdMaterial = material as THREE.MeshStandardMaterial;
                    let albedoTextureIndex = -1; // 텍스처가 없으면 -1

                    // 텍스처 추출
                    if (stdMaterial.map) {
                        if (!textureMap.has(stdMaterial.map)) {
                            const textureIndex = sceneData.textures.length;
                            textureMap.set(stdMaterial.map, textureIndex);
                            
                            // Texture에서 ImageData 추출 (아래 '텍스처 데이터 추출' 섹션 참조)
                            const imageData = extractImageData(stdMaterial.map);
                            sceneData.textures.push(imageData);
                            albedoTextureIndex = textureIndex;
                        } else {
                            albedoTextureIndex = textureMap.get(stdMaterial.map)!;
                        }
                    }

                    // 재질 정보 저장
                    sceneData.materials.push({
                        color: stdMaterial.color || new THREE.Color(0xffffff),
                        roughness: stdMaterial.roughness || 1.0,
                        metalness: stdMaterial.metalness || 0.0,
                        emission: stdMaterial.emissive || new THREE.Color(0x000000),
                        albedoTextureIndex: albedoTextureIndex,
                    });
                }
            });

            // 지오메트리 정보 추출 및 병합 (모든 메쉬를 하나로 합침)
            // (이 예제는 모든 메쉬를 하나로 합친다고 가정합니다. 개별 메쉬로 관리해도 무방합니다.)
            //
            // 정점(Vertex) 데이터
            const vertices = geometry.attributes.position.array as Float32Array;
            const normals = geometry.attributes.normal.array as Float32Array;
            const tangents = geometry.attributes.tangent?.array as Float32Array; // 없을 수도 있음
            const uvs = geometry.attributes.uv.array as Float32Array;
            const indices = geometry.index!.array as Uint16Array | Uint32Array;

            geometry.groups.forEach(group => {
                const materialIndex = materialMap.get(materials[group.materialIndex!])!;
                sceneData.subMeshes.push({
                    startIndex: group.start,
                    count: group.count,
                    materialIndex: materialIndex,
                });
            });

            // TODO: 정점, 법선 등의 데이터를 sceneData.geometry에 병합하는 로직 추가
            // 이 부분은 모든 메쉬를 하나의 거대한 버퍼로 만들 때 필요합니다.
            // 여기서는 개념 설명을 위해 생략합니다. 
            // 우선 단일 메쉬를 기준으로 아래 정보를 참고하세요.
            sceneData.geometry = { vertices, normals, tangents, uvs, indices: new Uint32Array(indices) };

            // 2. BVH 생성
            // `three-mesh-bvh`는 BufferGeometry를 직접 받아서 BVH를 생성합니다.
            console.log("BVH 생성 중...");
            const bvh = new MeshBVH(geometry);
            sceneData.bvh = bvh; // 생성된 BVH 저장
            console.log("BVH 생성 완료!");
        }
    });

    console.log("최종 씬 데이터:", sceneData);
    // 이제 sceneData를 Compute Shader에서 사용할 수 있도록 버퍼로 변환하여 넘겨주면 됩니다.
});

// 헬퍼 함수: Three.js 텍스처에서 ImageData를 추출
function extractImageData(texture: THREE.Texture): ImageData {
    const image = texture.image;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    
    return context.getImageData(0, 0, image.width, image.height);
}