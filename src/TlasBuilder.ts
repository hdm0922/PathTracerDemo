import * as THREE from 'three';
import { type Mesh } from "./Structs";
import { type Instance } from "./World";


// ===== 내부 빌드용 타입 =====
type BuildLeaf = {
  id: number;           // Instance index (또는 원하는 인스턴스 ID)
  min: THREE.Vector3;
  max: THREE.Vector3;
  centroid: THREE.Vector3;
};

type BuildNode = {
  bounds: THREE.Box3;
  leaves?: BuildLeaf[];
  left?: BuildNode;
  right?: BuildNode;
};

// ===== 인스턴스별 World AABB =====
function worldAABBFromInstance(inst: Instance, mesh: Mesh): THREE.Box3 {
  const geom = mesh.Data.geometry as THREE.BufferGeometry;
  if (!geom.boundingBox) geom.computeBoundingBox();
  const localBB = geom.boundingBox!;
  const mat = new THREE.Matrix4().fromArray(inst.ModelMatrix);
  return localBB.clone().applyMatrix4(mat);
}

// ===== 트리 빌드 (긴 축 중앙값 분할) =====
function unionBounds(out: THREE.Box3, arr: BuildLeaf[]): THREE.Box3 {
  out.makeEmpty();
  for (const l of arr) {
    out.expandByPoint(l.min);
    out.expandByPoint(l.max);
  }
  return out;
}

function buildTree(src: BuildLeaf[], maxLeafSize: number): BuildNode {
  const bounds = unionBounds(new THREE.Box3(), src);
  if (src.length <= maxLeafSize) return { bounds, leaves: src };

  const size = new THREE.Vector3();
  bounds.getSize(size);
  const axis = size.x > size.y ? (size.x > size.z ? 'x' : 'z') : (size.y > size.z ? 'y' : 'z');

  src.sort((a, b) => a.centroid[axis] - b.centroid[axis]);
  const mid = Math.floor(src.length / 2);

  const left = buildTree(src.slice(0, mid), maxLeafSize);
  const right = buildTree(src.slice(mid), maxLeafSize);
  return { bounds, left, right };
}

// ===== 노드 패커: 32B stride (8 float 슬롯) =====
class NodePacker {
  private cap: number;
  private count = 0;
  private buf: ArrayBuffer;
  private f32: Float32Array;
  private u32: Uint32Array;

  constructor(initialNodes = 1024) {
    this.cap = Math.max(1, initialNodes);
    this.buf = new ArrayBuffer(this.cap * 32); // 32 bytes per node
    this.f32 = new Float32Array(this.buf);
    this.u32 = new Uint32Array(this.buf);
  }
  get nodeCount() { return this.count; }
  get floatArray(): Float32Array { return new Float32Array(this.buf, 0, this.count * 8); }
  private grow() {
    this.cap *= 2;
    const n = new ArrayBuffer(this.cap * 32);
    new Uint8Array(n).set(new Uint8Array(this.buf));
    this.buf = n;
    this.f32 = new Float32Array(this.buf);
    this.u32 = new Uint32Array(this.buf);
  }
  reserve(): number {
    if (this.count >= this.cap) this.grow();
    return this.count++;
  }
  // idx 노드 기록: min.xyz | count | max.xyz | offset   (count/offset은 u32로 비트기록)
  setNode(idx: number,
          min: THREE.Vector3,
          max: THREE.Vector3,
          primitiveCountU32: number,
          primitiveOffsetU32: number) {
    const base = idx * 8;
    this.f32[base + 0] = min.x;
    this.f32[base + 1] = min.y;
    this.f32[base + 2] = min.z;
    this.u32[base + 3] = primitiveCountU32 >>> 0;

    this.f32[base + 4] = max.x;
    this.f32[base + 5] = max.y;
    this.f32[base + 6] = max.z;
    this.u32[base + 7] = primitiveOffsetU32 >>> 0;
  }
}

// ===== 코어: TLAS 노드 + leafIndices 동시 생성 =====
export function buildTLASCore(
  InstanceArray: Instance[],
  MeshArray: Mesh[],
  MeshIDToIndexMap: Map<string, number>,
  maxLeafSize = 4
): { Tlas: Float32Array; LeafIndices: Uint32Array } {

  // 1) 인스턴스 → 리프 리스트
  const leaves: BuildLeaf[] = [];
  for (let i = 0; i < InstanceArray.length; i++) {
    const inst = InstanceArray[i];
    const meshIdx = MeshIDToIndexMap.get(inst.MeshID);
    if (meshIdx === undefined) {
      console.warn(`MeshID '${inst.MeshID}'를 찾을 수 없습니다. 건너뜀.`);
      continue;
    }
    const m = MeshArray[meshIdx];
    const bb = worldAABBFromInstance(inst, m);

    const min = bb.min.clone();
    const max = bb.max.clone();
    leaves.push({
      id: i, // 인스턴스 인덱스를 프리미티브 ID로 사용
      min,
      max,
      centroid: new THREE.Vector3(
        0.5 * (min.x + max.x),
        0.5 * (min.y + max.y),
        0.5 * (min.z + max.z)
      ),
    });
  }

  // 빈 장면 방어
  if (leaves.length === 0) {
    return { Tlas: new Float32Array(0), LeafIndices: new Uint32Array(0) };
  }

  // 2) 트리 구성
  const root = buildTree(leaves, maxLeafSize);

  // 3) 선형화 + 리프 프리미티브 나열
  const packer = new NodePacker(Math.max(1024, leaves.length * 2));
  const leafIds: number[] = [];

  function emit(node: BuildNode): number {
    const idx = packer.reserve();

    // 리프
    if (node.leaves) {
      const start = leafIds.length;
      for (const l of node.leaves) leafIds.push(l.id);
      packer.setNode(idx, node.bounds.min, node.bounds.max, node.leaves.length, start);
      return idx;
    }

    // 내부노드: left 먼저, 그 다음 right
    const rightIdx = emit(node.right!);
    // 내부노드 규약: count=0, offset=rightChildIndex (left는 암묵적으로 idx+1)
    packer.setNode(idx, node.bounds.min, node.bounds.max, 0, rightIdx);
    return idx;
  }

  const rootIdx = emit(root);
  if (rootIdx !== 0) console.warn('TLAS 루트 인덱스가 0이 아닙니다.');

  // 4) 출력
  return {
    Tlas: packer.floatArray,                   // 노드 배열(8 * nodeCount float)
    LeafIndices: Uint32Array.from(leafIds),    // 리프 인스턴스 ID 나열
  };
}

// ===== 최종 API: 요구대로 "Tlas만" 반환 =====
export function buildTLAS(
  InstanceArray: Instance[],
  MeshArray: Mesh[],
  MeshIDToIndexMap: Map<string, number>,
  maxLeafSize = 4
): Float32Array {
  const { Tlas /*, LeafIndices */ } = buildTLASCore(
    InstanceArray, MeshArray, MeshIDToIndexMap, maxLeafSize
  );

  return Tlas;
}
