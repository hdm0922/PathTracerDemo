import { World } from "./World";
import { vec3, mat4 } from "gl-matrix";

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshBVH } from 'three-mesh-bvh';

import computeShaderCode from './shaders/PathTracer.wgsl?raw';
import vertexShaderCode from './shaders/testVertex.wgsl?raw';
import fragmentShaderCode from './shaders/testFragment.wgsl?raw';

function createHumanEyeViewProjection(camWorldPosition: vec3): mat4 {
    // 1. 최종 결과를 저장할 행렬과 중간 계산용 행렬들을 생성합니다.
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const viewProjectionMatrix = mat4.create();

    // 2. View Matrix 계산 (카메라의 위치와 방향)
    const cameraTarget = vec3.fromValues(0, 0, 0); // 바라볼 목표 지점
    const worldUp = vec3.fromValues(0, 1, 0);       // 월드의 '위' 방향

    mat4.lookAt(viewMatrix, camWorldPosition, cameraTarget, worldUp);
    
    // 3. Projection Matrix 계산 (카메라의 렌즈 특성)
    const fieldOfView = (55 * Math.PI) / 180; // 55도를 라디안으로 변환
    const aspectRatio = 16.0 / 9.0;
    const zNear = 0.1;
    const zFar = 1000.0;

    mat4.perspective(projectionMatrix, fieldOfView, aspectRatio, zNear, zFar);

    // 4. 두 행렬을 곱하여 최종 View-Projection 행렬을 만듭니다.
    // 순서가 매우 중요합니다: Projection * View
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
    
    return viewProjectionMatrix;
}

export class Renderer
{

    // GPU Device Stuff
    public readonly Adapter         : GPUAdapter;
    public readonly Device          : GPUDevice;
    public readonly Canvas          : HTMLCanvasElement;
    public readonly Context         : GPUCanvasContext;
    public readonly PreferredFormat : GPUTextureFormat;


    // WebGPU Resources
    public SceneTexture         : GPUTexture;   // Texture To Render
    public AccumTexture         : GPUTexture;   // Texture To Write Path-Traced Result

    public UniformsBuffer       : GPUBuffer;
    public InstancesBuffer      : GPUBuffer;
    public BVHBuffer            : GPUBuffer;
    public SubMeshesBuffer      : GPUBuffer;
    public MaterialsBuffer      : GPUBuffer;
    public PrimitiveToSubMesh   : GPUBuffer;
    
    public VerticesBuffer       : GPUBuffer;
    public IndicesBuffer        : GPUBuffer;

    // WebGPU Pipelines
    public ComputePipeline : GPUComputePipeline;
    public RenderPipeline  : GPURenderPipeline;


    // WebGPU BindGroups
    public ComputeBindGroup: GPUBindGroup;
    public RenderBindGroup: GPUBindGroup;


    // World Data
    public World    : World;
    public FrameCount : number;


    // 텍스처 관련 (Gemini)
    public TextureViews: GPUTextureView[] = [];
    public MaterialSampler: GPUSampler;

    constructor
    (
        Adapter : GPUAdapter,
        Device  : GPUDevice,
        Canvas  : HTMLCanvasElement,
    )
    {

        // Get GPU Device Stuffs
        this.Adapter            = Adapter;
        this.Device             = Device;
        this.Canvas             = Canvas;
        this.Context            = Canvas.getContext('webgpu')!;
        this.PreferredFormat    = navigator.gpu.getPreferredCanvasFormat();

        // Configure Context
        {
            const CanvasConfiguration: GPUCanvasConfiguration =
            {
                device: this.Device,
                format: this.PreferredFormat,
                alphaMode: "opaque",
            };

            this.Context.configure(CanvasConfiguration);
        }
        


        // Create WebGPU Resources
        this.SceneTexture       = GPUTexture.prototype;
        this.AccumTexture       = GPUTexture.prototype;

        this.UniformsBuffer     = GPUBuffer.prototype;
        this.InstancesBuffer    = GPUBuffer.prototype;
        this.BVHBuffer          = GPUBuffer.prototype;
        this.SubMeshesBuffer    = GPUBuffer.prototype;
        this.MaterialsBuffer    = GPUBuffer.prototype;
        this.PrimitiveToSubMesh = GPUBuffer.prototype;

        this.VerticesBuffer     = GPUBuffer.prototype;
        this.IndicesBuffer      = GPUBuffer.prototype;


        // Create WebGPU Pipelines
        this.ComputePipeline    = GPUComputePipeline.prototype;
        this.RenderPipeline     = GPURenderPipeline.prototype;


        // Create WebGPU BindGroups
        this.ComputeBindGroup   = GPUBindGroup.prototype;
        this.RenderBindGroup    = GPUBindGroup.prototype;


        // World Data
        this.World              = World.prototype;
        this.FrameCount         = 0;



        this.MaterialSampler = this.Device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        });
    }



    Initialize(World: World): void
    {

        // Initialize Scene Stuffs
        this.World = World;
        this.FrameCount = 0;


        // Initialize WebGPU Resources : Uniform Buffer
        {
            const UniformBufferUsageFlags: GPUBufferUsageFlags = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
            
            this.UniformsBuffer = this.Device.createBuffer({ size: 256, usage: UniformBufferUsageFlags });
        }

        // Initialize WebGPU Resources : Storage Buffers
        {
            const StorageBufferUsageFlags: GPUBufferUsageFlags = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
            
            this.InstancesBuffer        = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.BVHBuffer              = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.SubMeshesBuffer        = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.MaterialsBuffer        = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.PrimitiveToSubMesh     = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.VerticesBuffer         = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
            this.IndicesBuffer          = this.Device.createBuffer({ size: 256, usage: StorageBufferUsageFlags });
        }

        // TEST: Modify InstancesBuffer
        {
            const data = new Float32Array(33);
            let offset = 0;
            data[offset + 0] = 1.0; data[offset + 5] = 1.0; data[offset + 10] = 1.0; data[offset + 15] = 1.0;

            offset = 16;
            data[offset + 0] = 1.0; data[offset + 5] = 1.0; data[offset + 10] = 1.0; data[offset + 15] = 1.0;

            data[33] = 0;

            this.Device.queue.writeBuffer(this.InstancesBuffer, 0, data);
        }

        // Initialize WebGPU Resources : Texture
        {
            const SceneTextureUsageFlags  : GPUTextureUsageFlags  = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
            const AccumTextureUsageFlags  : GPUTextureUsageFlags  = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;

            this.SceneTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba32float", SceneTextureUsageFlags);
            this.AccumTexture = this.createTexture(this.Canvas.width, this.Canvas.height, "rgba32float", AccumTextureUsageFlags);
        }

        // Generate WebGPU Pipelines
        {
            const ComputeShaderModuleDescriptor     : GPUShaderModuleDescriptor = { code: computeShaderCode };
            const VertexShaderModuleDescriptor      : GPUShaderModuleDescriptor = { code: vertexShaderCode };
            const FragmentShaderModuleDescriptor    : GPUShaderModuleDescriptor = { code: fragmentShaderCode };

            const ComputeShaderEntryPoint           : string = "cs_main";
            const VertexShaderEntryPoint            : string = "vs_main";
            const FragmentShaderEntryPoint          : string = "fs_main";

            const ComputeShaderModule   : GPUShaderModule = this.Device.createShaderModule(ComputeShaderModuleDescriptor);
            const VertexShaderModule    : GPUShaderModule = this.Device.createShaderModule(VertexShaderModuleDescriptor);
            const FragmentShaderModule  : GPUShaderModule = this.Device.createShaderModule(FragmentShaderModuleDescriptor);

            const ComputePipelineDescriptor: GPUComputePipelineDescriptor =
            {
                layout  : "auto",
                compute : { module: ComputeShaderModule, entryPoint: ComputeShaderEntryPoint },
            };

            const RenderPipelineDescriptor: GPURenderPipelineDescriptor =
            {
                layout      : "auto",
                vertex      : { module: VertexShaderModule,     entryPoint: VertexShaderEntryPoint },
                fragment    : { module: FragmentShaderModule,   entryPoint: FragmentShaderEntryPoint, targets : [{ format: this.PreferredFormat }] },
                primitive   : { topology: "triangle-list" },
            };

            this.ComputePipeline = this.Device.createComputePipeline(ComputePipelineDescriptor);
            this.RenderPipeline = this.Device.createRenderPipeline(RenderPipelineDescriptor);
        }

        // Generate WebGPU BindGroups
        {
            const SceneTextureView: GPUTextureView = this.SceneTexture.createView();
            const AccumTextureView: GPUTextureView = this.AccumTexture.createView();

            const ComputeBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout: this.ComputePipeline.getBindGroupLayout(0),
                entries:
                [
                    { binding: 0, resource: { buffer: this.UniformsBuffer } },
                    { binding: 1, resource: { buffer: this.InstancesBuffer }  },
                    { binding: 2, resource: { buffer: this.BVHBuffer } },
                    { binding: 3, resource: { buffer: this.SubMeshesBuffer } },
                    { binding: 4, resource: { buffer: this.MaterialsBuffer } },
                    { binding: 5, resource: { buffer: this.PrimitiveToSubMesh } },
                    { binding: 6, resource: { buffer: this.VerticesBuffer } },
                    { binding: 7, resource: { buffer: this.IndicesBuffer } },

                    // { binding: 11, resource: materialSampler },
                                // { binding: 9, resource: baseColorArrayTexture.createView() },
                                // { binding: 10, resource: emissiveColorArrayTexture.createView() },
                                // { binding: 11, resource: normalArrayTexture.createView() },
                                // { binding: 12, resource: ORMArrayTexture.createView() },
                    //{ binding: 12, resource: SceneTextureView },

                    { binding: 13, resource: AccumTextureView },
                ],
            };

            const RenderBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout: this.RenderPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: SceneTextureView }
                ],
            }

            this.ComputeBindGroup = this.Device.createBindGroup(ComputeBindGroupDescriptor);
            this.RenderBindGroup = this.Device.createBindGroup(RenderBindGroupDescriptor);
        }


        return;
    }

    Update(): void
    {

        const data = new Uint32Array(2);
        data[0] = this.Canvas.width;
        data[1] = this.Canvas.height;

        this.Device.queue.writeBuffer(this.UniformsBuffer, 0, data);

        const camData = new Float32Array(19);
        
        const camPos = vec3.fromValues(0.6,1,1);
        const VP = createHumanEyeViewProjection(camPos);
        const VPINV = mat4.invert(mat4.create(), VP);

        for(let iter=0; iter<16; iter++) camData[iter] = VPINV?.[iter]!;

        camData[16] = camPos[0];
        camData[17] = camPos[1];
        camData[18] = camPos[2];

        //console.log(VPINV);

        this.Device.queue.writeBuffer(this.UniformsBuffer, 16, camData);

        return;
    }



    async Render(): Promise<void>
    {

        const CommandEncoder: GPUCommandEncoder = this.Device.createCommandEncoder();

        // ComputePass (Path Tracing)
        {
            const ComputePass: GPUComputePassEncoder = CommandEncoder.beginComputePass();
            
            ComputePass.setPipeline(this.ComputePipeline);
            ComputePass.setBindGroup(0, this.ComputeBindGroup);
            ComputePass.dispatchWorkgroups(Math.ceil(this.Canvas.width/8), Math.ceil(this.Canvas.height/8), 1);

            ComputePass.end();
        }

        // Copy Texture : AccumTexture -> SceneTexture
        {
            const SourceTextureInfo     : GPUTexelCopyTextureInfo   = { texture: this.AccumTexture };
            const DestTextureInfo       : GPUTexelCopyTextureInfo   = { texture: this.SceneTexture };
            const TextureSize           : GPUExtent3DStrict         = { width: this.SceneTexture.width, height: this.SceneTexture.height };

            CommandEncoder.copyTextureToTexture(SourceTextureInfo, DestTextureInfo, TextureSize);
        }
        


        // RenderPass (Draw SceneTexture)
        {
            const RenderPassDescriptor: GPURenderPassDescriptor =
            {
                colorAttachments:
                [
                    {
                        view: this.Context.getCurrentTexture().createView(),
                        loadOp: "clear",
                        storeOp: "store",
                        clearValue: { r:0, g:0, b:0, a:1 }
                    }
                ]
            };


            

            const RenderPass: GPURenderPassEncoder = CommandEncoder.beginRenderPass(RenderPassDescriptor);

            RenderPass.setPipeline(this.RenderPipeline);
            RenderPass.setBindGroup(0, this.RenderBindGroup);
            RenderPass.draw(6);

            RenderPass.end();
        }

        // Submit Encoder
        this.Device.queue.submit([CommandEncoder.finish()]);
        this.FrameCount++;

        return;
    }

    /**
     * GLB 파일을 로드하여 파싱하고 GPU 버퍼에 데이터를 업로드합니다.
     * @param path GLB 파일 경로
     */
    public async LoadObjectToGPU(path: string): Promise<void> {
        console.log("🚀 GLB 파일 로드를 시작합니다...");

        // 1. GLB 파일 로드 및 파싱
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(path);

        // 2. 데이터 수집을 위한 변수 초기화
        const allVertices: number[] = [];
        const allNormals: number[] = [];
        const allUVs: number[] = [];
        const allIndices: number[] = [];
        const allTangents: number[] = [];
        
        const subMeshes: { materialIndex: number }[] = [];
        const materials: any[] = []; // 직렬화된 재질 데이터
        const primitiveToSubMesh: number[] = [];

        const materialMap = new Map<THREE.Material, number>();
        const textureMap = new Map<THREE.Texture, number>();

        let vertexOffset = 0;
        let subMeshIndexCounter = 0;

        const meshes: THREE.Mesh[] = [];
        gltf.scene.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) {
                meshes.push(obj as THREE.Mesh);
            }
        });

        // 3. 모든 메쉬를 순회하며 데이터 추출 및 병합
        for (const mesh of meshes) {
            const geometry = mesh.geometry;
            // Tangent 데이터가 없으면 생성 (Normal Map에 필수)
            if (!geometry.attributes.tangent) {
                geometry.computeTangents();
            }

            const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

            // SubMesh (geometry group) 처리
            geometry.groups.forEach(group => {
                const material = meshMaterials[group.materialIndex!];
                let materialIndex = materialMap.get(material);
                
                // 새로운 재질인 경우
                if (materialIndex === undefined) {
                    materialIndex = materials.length;
                    materialMap.set(material, materialIndex);
                    
                    const stdMat = material as THREE.MeshStandardMaterial;
                    const ormTexture = stdMat.roughnessMap || stdMat.metalnessMap; // 보통 동일한 텍스처를 사용 (Occlusion, Roughness, Metalness)

                    // 텍스처 인덱스 처리
                    const baseColorTexIndex = this.processTexture(stdMat.map, textureMap);
                    const emissiveTexIndex = this.processTexture(stdMat.emissiveMap, textureMap);
                    const normalTexIndex = this.processTexture(stdMat.normalMap, textureMap);
                    const ormTexIndex = this.processTexture(ormTexture, textureMap);

                    // WGSL Material 구조체에 맞게 데이터 푸시
                    materials.push(
                        ...stdMat.color.toArray(), 1.0, // BaseColor (vec4)
                        ...stdMat.emissive.toArray(),    // EmissiveColor (vec3)
                        stdMat.metalness,               // Metalic (f32)
                        stdMat.roughness,               // Roughness (f32)
                        1.5,              // IOR (f32) - glTF에 없으면 기본값
                        stdMat.normalScale?.x || 1.0,   // NormalScale (f32)
                        0.0, // Padding
                        baseColorTexIndex,              // TextureIndex_BaseColor (i32)
                        emissiveTexIndex,             // TextureIndex_EmissiveColor (i32)
                        normalTexIndex,                 // TextureIndex_Normal (i32)
                        ormTexIndex,                    // TextureIndex_ORM (i32)
                    );
                }

                subMeshes.push({ materialIndex });
                
                // Primitive(triangle)가 어떤 SubMesh에 속하는지 매핑
                const primitiveCount = group.count / 3;
                for (let i = 0; i < primitiveCount; i++) {
                    primitiveToSubMesh.push(subMeshIndexCounter);
                }
                subMeshIndexCounter++;
            });

            // 지오메트리 데이터 병합
            allVertices.push(...geometry.attributes.position.array);
            allNormals.push(...geometry.attributes.normal.array);
            allUVs.push(...geometry.attributes.uv.array);
            allTangents.push(...geometry.attributes.tangent.array);
            
            // 인덱스는 vertexOffset을 더해서 추가
            const indices = geometry.index!.array;
            for (let i = 0; i < indices.length; i++) {
                allIndices.push(indices[i] + vertexOffset);
            }
            vertexOffset += geometry.attributes.position.count;
        }

        // 4. BVH 생성
        console.log("BVH 생성을 시작합니다...");
        const mergedGeometry = new THREE.BufferGeometry();
        mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
        mergedGeometry.setIndex(allIndices);

        // a SAH strategy is costlier to build but results in faster raycasting.
        const bvh = new MeshBVH(mergedGeometry);
        // `serialize()`는 BVH를 플랫 버퍼로 만듭니다. `roots` 속성이 바로 그 데이터입니다.
        const bvhNodes = (bvh as any)._roots[0] as Float32Array; // 보통 첫번째 루트에 모든 노드 데이터가 들어있음

        // three-mesh-bvh 노드 데이터를 WGSL 구조체 레이아웃으로 변환
        const bvhData = new Float32Array(bvhNodes.length);
        console.log(bvhNodes);

        for(let i = 0; i < bvhNodes.length / 8; i++) {
            const offset = i * 8;
            const node = bvhNodes.slice(offset, offset + 8);
            
            const isLeaf = node[7] !== 0; // count가 0이 아니면 리프 노드
            
            // Boundary Min: x, y, z
            bvhData[offset + 0] = node[0];
            bvhData[offset + 1] = node[1];
            bvhData[offset + 2] = node[2];
            // PrimitiveCount or 0 for internal
            (bvhData as any as Uint32Array)[offset + 3] = isLeaf ? node[7] : 0;
            
            // Boundary Max: x, y, z
            bvhData[offset + 4] = node[3];
            bvhData[offset + 5] = node[4];
            bvhData[offset + 6] = node[5];
            // PrimitiveOffset or splitAxis
            (bvhData as any as Uint32Array)[offset + 7] = node[6]; // offset or splitAxis
        }
        console.log(`BVH 생성 완료! 노드 수: ${bvhData.length / 8}`);

        // 5. 최종 TypedArray 생성
        const verticesArray = new Float32Array(allVertices);
        const normalsArray = new Float32Array(allNormals);
        const uvsArray = new Float32Array(allUVs);
        const tangentsArray = new Float32Array(allTangents);
        const indicesArray = new Uint32Array(allIndices);
        
        const subMeshesArray = new Uint32Array(subMeshes.map(sm => sm.materialIndex));
        const materialsArray = new Float32Array(materials);
        const primitiveToSubMeshArray = new Uint32Array(primitiveToSubMesh);


        // 6. GPU 버퍼 생성 및 데이터 쓰기
        console.log("GPU 버퍼 생성 및 데이터 업로드를 시작합니다...");

        this.BVHBuffer = this.createAndWriteBuffer(bvhData, GPUBufferUsage.STORAGE);
        this.SubMeshesBuffer = this.createAndWriteBuffer(subMeshesArray, GPUBufferUsage.STORAGE);
        this.MaterialsBuffer = this.createAndWriteBuffer(materialsArray, GPUBufferUsage.STORAGE);
        this.PrimitiveToSubMesh = this.createAndWriteBuffer(primitiveToSubMeshArray, GPUBufferUsage.STORAGE);
        
        // GeometriesBuffer는 하나의 큰 버퍼로 만들고 슬라이싱해서 바인딩
        const geomBufferOffsets = {
            vertices: 0,
            normals: verticesArray.byteLength,
            uvs: verticesArray.byteLength + normalsArray.byteLength,
            tangents: verticesArray.byteLength + normalsArray.byteLength + uvsArray.byteLength,
            indices: verticesArray.byteLength + normalsArray.byteLength + uvsArray.byteLength + tangentsArray.byteLength,
        };
        const totalGeomBufferSize = verticesArray.byteLength + normalsArray.byteLength + uvsArray.byteLength + tangentsArray.byteLength + indicesArray.byteLength;

        // this.GeometriesBuffer = this.Device.createBuffer({
        //     size: totalGeomBufferSize,
        //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        // });
        // this.Device.queue.writeBuffer(this.GeometriesBuffer, geomBufferOffsets.vertices, verticesArray);
        // this.Device.queue.writeBuffer(this.GeometriesBuffer, geomBufferOffsets.normals, normalsArray);
        // this.Device.queue.writeBuffer(this.GeometriesBuffer, geomBufferOffsets.uvs, uvsArray);
        // this.Device.queue.writeBuffer(this.GeometriesBuffer, geomBufferOffsets.tangents, tangentsArray);
        // this.Device.queue.writeBuffer(this.GeometriesBuffer, geomBufferOffsets.indices, indicesArray);
        
        console.log("✅ 모든 데이터가 성공적으로 GPU에 업로드되었습니다.");
    }

    /**
     * 텍스처를 처리하고 GPUTextureView를 생성한 뒤 인덱스를 반환합니다.
     */
    private async processTexture(texture: THREE.Texture | null, textureMap: Map<THREE.Texture, number>): Promise<number> {
        if (!texture) return -1; // 텍스처가 없으면 -1 반환
        if (textureMap.has(texture)) return textureMap.get(texture)!;

        const image = texture.image as ImageBitmap; // gltf 로더는 보통 ImageBitmap을 사용
        const gpuTexture = this.Device.createTexture({
            size: [image.width, image.height, 1],
            format: 'rgba8unorm', // glTF 텍스처에 일반적인 포맷
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.Device.queue.copyExternalImageToTexture(
            { source: image },
            { texture: gpuTexture },
            [image.width, image.height]
        );

        const textureIndex = this.TextureViews.length;
        this.TextureViews.push(gpuTexture.createView());
        textureMap.set(texture, textureIndex);
        
        return textureIndex;
    }

    private createAndWriteBuffer(data: BufferSource, usage: GPUBufferUsageFlags): GPUBuffer 
    {
        const buffer = this.Device.createBuffer({
            size: data.byteLength,
            usage: usage | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        
        // 데이터 타입에 따라 복사
        if (data instanceof Uint32Array) {
            new Uint32Array(buffer.getMappedRange()).set(data);
        } else if (data instanceof Float32Array) {
            new Float32Array(buffer.getMappedRange()).set(data);
        }
        buffer.unmap();
        return buffer;
    }

    private createTexture(
        TextureWidth    : number,
        TextureHeight   : number,
        TextureFormat   : GPUTextureFormat,
        TextureUsage    : GPUTextureUsageFlags
    ): GPUTexture
    {
        const TextureDescriptor: GPUTextureDescriptor =
        {
            size: { width: TextureWidth, height: TextureHeight },
            format: TextureFormat,
            usage: TextureUsage,
        }

        return this.Device.createTexture(TextureDescriptor);
    }

};