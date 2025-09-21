import { vec3 } from "gl-matrix";

// === Types / Helpers =========================================================

type Vec3 = vec3;
type Mat3x4 = [
  number, number, number, number,  // col0 (x axis, w=0)
  number, number, number, number,  // col1 (y axis, w=0)
  number, number, number, number   // col2 (z axis, w=0)
];

const IDENTITY_3x4: Mat3x4 = [
  1,0,0,0,
  0,1,0,0,
  0,0,1,0
];

const BVH_FLAG_LEAF = 1;

interface CPUInstance {
  root: number;                // BVHBuffer 내 루트 노드 인덱스
  flags: number;
  world_from_object: Mat3x4;   // column-major 3x4
  object_from_world: Mat3x4;   // column-major 3x4
  aabb_min: Vec3;              // 로컬 AABB
  aabb_max: Vec3;
}

interface CPUBvhNode {
  // 내부/리프 공용
  aabb_min: Vec3;
  aabb_max: Vec3;
  left: number;                // 내부: 왼쪽 자식 인덱스, 리프: triFirst
  right: number;               // 내부: 오른쪽 자식 인덱스, 리프: triCount
  flags: number;               // bit0 = leaf
  opt0?: number;               // (옵션) escape index 등
  opt1?: number;
}

interface CPUTriPacked {
  p0: Vec3;
  e1: Vec3;
  e2: Vec3;
  material: number;            // meta.x
  flags?: number;              // meta.y (optional)
}

interface CPUMaterial {
  base: Vec3; emission: Vec3;
  roughness: number; metalness: number; ior: number; occlusionStrength: number;
  albedoTex: number; mrTex: number; normalTex: number; emissiveTex: number;
}

function align(n: number, a: number) { return (n + (a - 1)) & ~(a - 1); }

// === World (더미 파싱 결과 + BVH 결과를 보관) ================================

export class World {
  instances: CPUInstance[] = [];
  bvhNodes: CPUBvhNode[] = [];
  triangles: CPUTriPacked[] = [];
  materials: CPUMaterial[] = [];

  static makeDummy(): World {
    const w = new World();

    // ── Materials(64B) : wood(0), table(1), light(2=emissive)
    w.materials = [
      { base:[0.70,0.52,0.32], emission:[0,0,0], roughness:0.8, metalness:0.0, ior:1.5, occlusionStrength:1.0, albedoTex:-1, mrTex:-1, normalTex:-1, emissiveTex:-1 }, // wood
      { base:[0.60,0.60,0.65], emission:[0,0,0], roughness:0.4, metalness:0.0, ior:1.5, occlusionStrength:1.0, albedoTex:-1, mrTex:-1, normalTex:-1, emissiveTex:-1 }, // table diffuse
      { base:[1,1,1], emission:[12,12,12], roughness:0.0, metalness:0.0, ior:1.0, occlusionStrength:1.0, albedoTex:-1, mrTex:-1, normalTex:-1, emissiveTex:-1 },      // emissive
    ];

    // ── Triangles (각 모델을 아주 단순한 2~1 tri로 가정)
    const trisChair: CPUTriPacked[] = makeQuadTris([-0.8,-0.3,0], [0.4,0.6,0], 0); // 원점 근처 왼쪽 사각
    const trisTable: CPUTriPacked[] = makeQuadTris([ 0.2,-0.3,0], [0.6,0.6,0], 1); // 오른쪽 사각
    const trisLight: CPUTriPacked[] = [
      makeTri([0,0.7,-0.5],[0.2,0.9,-0.5],[-0.2,0.9,-0.5], 2)                     // 위쪽 작은 삼각형(광원)
    ];

    // 전역 TrianglesBuffer로 이어붙임(절대 인덱스 계산)
    const triStartChair = 0;
    const triStartTable = triStartChair + trisChair.length;
    const triStartLight = triStartTable + trisTable.length;
    w.triangles = [...trisChair, ...trisTable, ...trisLight];

    // ── BVH: 각 모델을 "리프 하나짜리" BLAS로 (루트=리프)
    // AABB는 각 모델의 삼각형들로 계산
    const aabbChair = aabbOfPacked(trisChair);
    const aabbTable = aabbOfPacked(trisTable);
    const aabbLight = aabbOfPacked(trisLight);

    const nodeChair: CPUBvhNode = { aabb_min:aabbChair.min, aabb_max:aabbChair.max, left:triStartChair, right:trisChair.length, flags:BVH_FLAG_LEAF };
    const nodeTable: CPUBvhNode = { aabb_min:aabbTable.min, aabb_max:aabbTable.max, left:triStartTable, right:trisTable.length, flags:BVH_FLAG_LEAF };
    const nodeLight: CPUBvhNode = { aabb_min:aabbLight.min, aabb_max:aabbLight.max, left:triStartLight, right:trisLight.length, flags:BVH_FLAG_LEAF };

    const rootChair = 0;
    const rootTable = 1;
    const rootLight = 2;
    w.bvhNodes = [nodeChair, nodeTable, nodeLight];

    // ── Instances: Chair, Table, Light (모두 단위 변환, 로컬 AABB는 BVH 리프와 동일)
    w.instances = [
      { root: rootChair, flags:0, world_from_object:IDENTITY_3x4, object_from_world:IDENTITY_3x4, aabb_min:aabbChair.min, aabb_max:aabbChair.max },
      { root: rootTable, flags:0, world_from_object:IDENTITY_3x4, object_from_world:IDENTITY_3x4, aabb_min:aabbTable.min, aabb_max:aabbTable.max },
      { root: rootLight, flags:0, world_from_object:IDENTITY_3x4, object_from_world:IDENTITY_3x4, aabb_min:aabbLight.min, aabb_max:aabbLight.max },
    ];

    return w;

    // ── helpers(local) ─────────────────────────────────────────
    function makeTri(p0:Vec3, p1:Vec3, p2:Vec3, mat:number): CPUTriPacked {
      const e1:Vec3 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
      const e2:Vec3 = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
      return { p0, e1, e2, material: mat, flags: 0 };
    }
    function makeQuadTris(min:Vec3, size:Vec3, mat:number): CPUTriPacked[] {
      const p0 = min;
      const p1:Vec3 = [min[0]+size[0], min[1],         min[2]];
      const p2:Vec3 = [min[0]+size[0], min[1]+size[1], min[2]];
      const p3:Vec3 = [min[0],         min[1]+size[1], min[2]];
      return [
        makeTri(p0,p1,p2, mat),
        makeTri(p0,p2,p3, mat),
      ];
    }
    function aabbOfPacked(list: CPUTriPacked[]) {
      const min:Vec3 = [ +1e30, +1e30, +1e30 ];
      const max:Vec3 = [ -1e30, -1e30, -1e30 ];
      for (const t of list) {
        const p0 = t.p0;
        const p1:Vec3 = [ t.p0[0] + t.e1[0], t.p0[1] + t.e1[1], t.p0[2] + t.e1[2] ];
        const p2:Vec3 = [ t.p0[0] + t.e2[0], t.p0[1] + t.e2[1], t.p0[2] + t.e2[2] ];
        for (const p of [p0,p1,p2]) {
          min[0]=Math.min(min[0],p[0]); min[1]=Math.min(min[1],p[1]); min[2]=Math.min(min[2],p[2]);
          max[0]=Math.max(max[0],p[0]); max[1]=Math.max(max[1],p[1]); max[2]=Math.max(max[2],p[2]);
        }
      }
      return { min, max };
    }
  }

  packInstances(): ArrayBuffer
  {
    const insts = this.instances;


    const STRIDE = 16 + 48 + 48 + 16 + 16; // = 144 bytes
    const buf = new ArrayBuffer(STRIDE * insts.length);
    const dv = new DataView(buf);
    let o = 0;
    for (const s of insts) {
        // u32(4) × 4
        dv.setUint32(o + 0,  s.root,  true);
        dv.setUint32(o + 4,  s.flags, true);
        dv.setUint32(o + 8,  0,       true);
        dv.setUint32(o + 12, 0,       true);
        o += 16;

        // world_from_object (12 floats)
        for (let i=0;i<12;i++) dv.setFloat32(o + i*4, s.world_from_object[i], true);
        o += 48;

        // object_from_world (12 floats)
        for (let i=0;i<12;i++) dv.setFloat32(o + i*4, s.object_from_world[i], true);
        o += 48;

        // aabb_min vec4 (xyz + pad)
        dv.setFloat32(o + 0, s.aabb_min[0], true);
        dv.setFloat32(o + 4, s.aabb_min[1], true);
        dv.setFloat32(o + 8, s.aabb_min[2], true);
        dv.setFloat32(o +12, 0,            true);
        o += 16;

        // aabb_max vec4
        dv.setFloat32(o + 0, s.aabb_max[0], true);
        dv.setFloat32(o + 4, s.aabb_max[1], true);
        dv.setFloat32(o + 8, s.aabb_max[2], true);
        dv.setFloat32(o +12, 0,            true);
        o += 16;
    }
    return buf;
  }

  packBVH(): ArrayBuffer
  {
    const nodes = this.bvhNodes;

    const STRIDE = 64;
    const buf = new ArrayBuffer(STRIDE * nodes.length);
    const dv = new DataView(buf);
    let o = 0;
    for (const n of nodes) {
        // aabb_min vec4
        dv.setFloat32(o + 0, n.aabb_min[0], true);
        dv.setFloat32(o + 4, n.aabb_min[1], true);
        dv.setFloat32(o + 8, n.aabb_min[2], true);
        dv.setFloat32(o +12, 0,            true);
        o += 16;
        // aabb_max vec4
        dv.setFloat32(o + 0, n.aabb_max[0], true);
        dv.setFloat32(o + 4, n.aabb_max[1], true);
        dv.setFloat32(o + 8, n.aabb_max[2], true);
        dv.setFloat32(o +12, 0,            true);
        o += 16;
        // u32 4개
        dv.setUint32(o + 0,  n.left >>> 0,  true);
        dv.setUint32(o + 4,  n.right >>> 0, true);
        dv.setUint32(o + 8,  n.flags >>> 0, true);
        dv.setUint32(o + 12, 0,             true);
        o += 16;
        // opt0/opt1
        dv.setUint32(o + 0,  (n.opt0 ?? 0) >>> 0, true);
        dv.setUint32(o + 4,  (n.opt1 ?? 0) >>> 0, true);
        dv.setUint32(o + 8,  0, true);
        dv.setUint32(o + 12, 0, true);
        o += 16;
    }
    return buf;

  }

  packTriangles(): ArrayBuffer
  {
    const tris = this.triangles;
    const STRIDE = 64;
    const buf = new ArrayBuffer(STRIDE * tris.length);
    const dv = new DataView(buf);
    let o = 0;
    for (const t of tris) {
        // p0 vec4
        dv.setFloat32(o + 0, t.p0[0], true);
        dv.setFloat32(o + 4, t.p0[1], true);
        dv.setFloat32(o + 8, t.p0[2], true);
        dv.setFloat32(o +12, 0,       true);
        o += 16;
        // e1 vec4
        dv.setFloat32(o + 0, t.e1[0], true);
        dv.setFloat32(o + 4, t.e1[1], true);
        dv.setFloat32(o + 8, t.e1[2], true);
        dv.setFloat32(o +12, 0,       true);
        o += 16;
        // e2 vec4
        dv.setFloat32(o + 0, t.e2[0], true);
        dv.setFloat32(o + 4, t.e2[1], true);
        dv.setFloat32(o + 8, t.e2[2], true);
        dv.setFloat32(o +12, 0,       true);
        o += 16;
        // meta vec4<u32>
        dv.setUint32(o + 0,  (t.material>>>0), true);        // meta.x
        dv.setUint32(o + 4,  ((t.flags??0)>>>0), true);      // meta.y
        dv.setUint32(o + 8,  0, true);                       // meta.z
        dv.setUint32(o + 12, 0, true);                       // meta.w
        o += 16;
    }
    return buf;

  }

  packMaterials(): ArrayBuffer
  {
    const mats = this.materials;

    const STRIDE = 64;
    const buf = new ArrayBuffer(STRIDE * mats.length);
    const dv = new DataView(buf);
    let o = 0;
    for (const m of mats) {
        // base vec3 + pad
        dv.setFloat32(o+0, m.base[0], true);
        dv.setFloat32(o+4, m.base[1], true);
        dv.setFloat32(o+8, m.base[2], true);
        dv.setFloat32(o+12, 0, true);
        o += 16;
        // emission vec3 + pad
        dv.setFloat32(o+0, m.emission[0], true);
        dv.setFloat32(o+4, m.emission[1], true);
        dv.setFloat32(o+8, m.emission[2], true);
        dv.setFloat32(o+12, 0, true);
        o += 16;
        // rough/metal/ior/occ
        dv.setFloat32(o+0, m.roughness, true);
        dv.setFloat32(o+4, m.metalness, true);
        dv.setFloat32(o+8, m.ior, true);
        dv.setFloat32(o+12, m.occlusionStrength, true);
        o += 16;
        // tex indices (i32 4개)
        dv.setInt32(o+0, m.albedoTex|0, true);
        dv.setInt32(o+4, m.mrTex|0, true);
        dv.setInt32(o+8, m.normalTex|0, true);
        dv.setInt32(o+12, m.emissiveTex|0, true);
        o += 16;
    }
    return buf;

  }
}

// === Packers : CPU 구조 → ArrayBuffer(SSBO 레이아웃) =========================

function packInstances(insts: CPUInstance[]): ArrayBuffer {
  const STRIDE = 16 + 48 + 48 + 16 + 16; // = 144 bytes
  const buf = new ArrayBuffer(STRIDE * insts.length);
  const dv = new DataView(buf);
  let o = 0;
  for (const s of insts) {
    // u32(4) × 4
    dv.setUint32(o + 0,  s.root,  true);
    dv.setUint32(o + 4,  s.flags, true);
    dv.setUint32(o + 8,  0,       true);
    dv.setUint32(o + 12, 0,       true);
    o += 16;

    // world_from_object (12 floats)
    for (let i=0;i<12;i++) dv.setFloat32(o + i*4, s.world_from_object[i], true);
    o += 48;

    // object_from_world (12 floats)
    for (let i=0;i<12;i++) dv.setFloat32(o + i*4, s.object_from_world[i], true);
    o += 48;

    // aabb_min vec4 (xyz + pad)
    dv.setFloat32(o + 0, s.aabb_min[0], true);
    dv.setFloat32(o + 4, s.aabb_min[1], true);
    dv.setFloat32(o + 8, s.aabb_min[2], true);
    dv.setFloat32(o +12, 0,            true);
    o += 16;

    // aabb_max vec4
    dv.setFloat32(o + 0, s.aabb_max[0], true);
    dv.setFloat32(o + 4, s.aabb_max[1], true);
    dv.setFloat32(o + 8, s.aabb_max[2], true);
    dv.setFloat32(o +12, 0,            true);
    o += 16;
  }
  return buf;
}

function packBVH(nodes: CPUBvhNode[]): ArrayBuffer {
  const STRIDE = 64;
  const buf = new ArrayBuffer(STRIDE * nodes.length);
  const dv = new DataView(buf);
  let o = 0;
  for (const n of nodes) {
    // aabb_min vec4
    dv.setFloat32(o + 0, n.aabb_min[0], true);
    dv.setFloat32(o + 4, n.aabb_min[1], true);
    dv.setFloat32(o + 8, n.aabb_min[2], true);
    dv.setFloat32(o +12, 0,            true);
    o += 16;
    // aabb_max vec4
    dv.setFloat32(o + 0, n.aabb_max[0], true);
    dv.setFloat32(o + 4, n.aabb_max[1], true);
    dv.setFloat32(o + 8, n.aabb_max[2], true);
    dv.setFloat32(o +12, 0,            true);
    o += 16;
    // u32 4개
    dv.setUint32(o + 0,  n.left >>> 0,  true);
    dv.setUint32(o + 4,  n.right >>> 0, true);
    dv.setUint32(o + 8,  n.flags >>> 0, true);
    dv.setUint32(o + 12, 0,             true);
    o += 16;
    // opt0/opt1
    dv.setUint32(o + 0,  (n.opt0 ?? 0) >>> 0, true);
    dv.setUint32(o + 4,  (n.opt1 ?? 0) >>> 0, true);
    dv.setUint32(o + 8,  0, true);
    dv.setUint32(o + 12, 0, true);
    o += 16;
  }
  return buf;
}

function packTriangles(tris: CPUTriPacked[]): ArrayBuffer {
  const STRIDE = 64;
  const buf = new ArrayBuffer(STRIDE * tris.length);
  const dv = new DataView(buf);
  let o = 0;
  for (const t of tris) {
    // p0 vec4
    dv.setFloat32(o + 0, t.p0[0], true);
    dv.setFloat32(o + 4, t.p0[1], true);
    dv.setFloat32(o + 8, t.p0[2], true);
    dv.setFloat32(o +12, 0,       true);
    o += 16;
    // e1 vec4
    dv.setFloat32(o + 0, t.e1[0], true);
    dv.setFloat32(o + 4, t.e1[1], true);
    dv.setFloat32(o + 8, t.e1[2], true);
    dv.setFloat32(o +12, 0,       true);
    o += 16;
    // e2 vec4
    dv.setFloat32(o + 0, t.e2[0], true);
    dv.setFloat32(o + 4, t.e2[1], true);
    dv.setFloat32(o + 8, t.e2[2], true);
    dv.setFloat32(o +12, 0,       true);
    o += 16;
    // meta vec4<u32>
    dv.setUint32(o + 0,  (t.material>>>0), true);        // meta.x
    dv.setUint32(o + 4,  ((t.flags??0)>>>0), true);      // meta.y
    dv.setUint32(o + 8,  0, true);                       // meta.z
    dv.setUint32(o + 12, 0, true);                       // meta.w
    o += 16;
  }
  return buf;
}

function packMaterials(mats: CPUMaterial[]): ArrayBuffer {
  const STRIDE = 64;
  const buf = new ArrayBuffer(STRIDE * mats.length);
  const dv = new DataView(buf);
  let o = 0;
  for (const m of mats) {
    // base vec3 + pad
    dv.setFloat32(o+0, m.base[0], true);
    dv.setFloat32(o+4, m.base[1], true);
    dv.setFloat32(o+8, m.base[2], true);
    dv.setFloat32(o+12, 0, true);
    o += 16;
    // emission vec3 + pad
    dv.setFloat32(o+0, m.emission[0], true);
    dv.setFloat32(o+4, m.emission[1], true);
    dv.setFloat32(o+8, m.emission[2], true);
    dv.setFloat32(o+12, 0, true);
    o += 16;
    // rough/metal/ior/occ
    dv.setFloat32(o+0, m.roughness, true);
    dv.setFloat32(o+4, m.metalness, true);
    dv.setFloat32(o+8, m.ior, true);
    dv.setFloat32(o+12, m.occlusionStrength, true);
    o += 16;
    // tex indices (i32 4개)
    dv.setInt32(o+0, m.albedoTex|0, true);
    dv.setInt32(o+4, m.mrTex|0, true);
    dv.setInt32(o+8, m.normalTex|0, true);
    dv.setInt32(o+12, m.emissiveTex|0, true);
    o += 16;
  }
  return buf;
}

// === Renderer.Initialize : 4개 GPUBuffer 생성/업로드 =========================

export class Renderer {
  public readonly Adapter!: GPUAdapter;
  public readonly Device!: GPUDevice;
  public readonly Canvas!: HTMLCanvasElement;
  public readonly Context!: GPUCanvasContext;
  public readonly PreferredFormat!: GPUTextureFormat;

  public SceneTexture!: GPUTexture;
  public AccumTexture!: GPUTexture;

  public UniformBuffer!: GPUBuffer;
  public InstancesBuffer!: GPUBuffer;
  public BVHBuffer!: GPUBuffer;
  public TrianglesBuffer!: GPUBuffer;
  public MaterialsBuffer!: GPUBuffer;

  public readonly ComputePipeline!: GPUComputePipeline;
  public readonly RenderPipeline!: GPURenderPipeline;

  public readonly ComputeBindGroup!: GPUBindGroup;
  public readonly RenderBindGroup!: GPUBindGroup;

  public World!: World;

  public Initialize(): void {
    // 1) 더미 씬 생성(Chair / Table / Light) + 리프만 있는 간단 BVH
    this.World = World.makeDummy();

    // 2) CPU → ArrayBuffer 패킹
    const instAB = packInstances(this.World.instances);
    const bvhAB  = packBVH(this.World.bvhNodes);
    const triAB  = packTriangles(this.World.triangles);
    const matAB  = packMaterials(this.World.materials);

    // 3) GPUBuffer 생성 + 업로드 (STORAGE | COPY_DST)
    this.InstancesBuffer = this.createAndUploadBuffer(instAB, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    this.BVHBuffer       = this.createAndUploadBuffer(bvhAB,  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    this.TrianglesBuffer = this.createAndUploadBuffer(triAB,  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    this.MaterialsBuffer = this.createAndUploadBuffer(matAB,  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);

    // (추가 파이프라인/바인드 구성은 요구사항상 생략)
  }

  private createAndUploadBuffer(data: ArrayBuffer, usage: GPUBufferUsageFlags): GPUBuffer {
    const size = align(data.byteLength, 4); // STORAGE엔 4바이트 정렬이면 충분
    const buf = this.Device.createBuffer({ size, usage, mappedAtCreation: false });
    this.Device.queue.writeBuffer(buf, 0, data);
    return buf;
  }
}
