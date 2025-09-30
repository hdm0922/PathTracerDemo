import * as THREE from 'three';

const BVH_NODE_SIZE = 32;
const TRAVERSAL_COST = 1;
const INTERSECTION_COST = 1;

interface Primitive {
    index: number;
    bounds: THREE.Box3;
    centroid: THREE.Vector3;
}
interface Bin {
    count: number;
    bounds: THREE.Box3;
}

export function buildBVH(geometry: THREE.BufferGeometry, maxTriLeaf: number): ArrayBuffer {
    const indices = geometry.index!.array as Uint32Array;
    const vertices = geometry.attributes.position.array as Float32Array;
    const primitives: Primitive[] = [];
    const triCount = indices.length / 3;

    for (let i = 0; i < triCount; i++) {
        const i0 = indices[i * 3 + 0];
        const i1 = indices[i * 3 + 1];
        const i2 = indices[i * 3 + 2];
        const v0 = new THREE.Vector3().fromArray(vertices, i0 * 3);
        const v1 = new THREE.Vector3().fromArray(vertices, i1 * 3);
        const v2 = new THREE.Vector3().fromArray(vertices, i2 * 3);
        const bounds = new THREE.Box3().setFromPoints([v0, v1, v2]);
        const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).multiplyScalar(1 / 3);
        primitives.push({ index: i, bounds, centroid });
    }

    const nodes: any[] = [];
    let nodeCounter = 0;
    const orderedPrimitiveIDs: number[] = [];
    
    buildRecursive(primitives);

    function buildRecursive(prims: Primitive[]): number {
        const currentBlasID = nodeCounter++;
        nodes.push({});
        const bounds = new THREE.Box3();
        prims.forEach(p => bounds.union(p.bounds));
        
        if (prims.length <= maxTriLeaf) {
            const offset = orderedPrimitiveIDs.length;
            prims.forEach(p => orderedPrimitiveIDs.push(p.index));
            const count = (1 << 16) | prims.length;
            nodes[currentBlasID] = { min: bounds.min.toArray(), max: bounds.max.toArray(), offset, count };
            return currentBlasID;
        }

        let bestSplit = { cost: Infinity, axis: -1, pos: 0 };
        const parentSurfaceArea = calculateSurfaceArea(bounds);

        for (let axis = 0; axis < 3; axis++) {
            const dimensionSize = bounds.max.getComponent(axis) - bounds.min.getComponent(axis);
            if (dimensionSize < 1e-6) continue;
            
            const BINS = 16;
            const bins: Bin[] = Array.from({ length: BINS }, () => ({ count: 0, bounds: new THREE.Box3() }));
            for (const p of prims) {
                let binIndex = Math.floor(BINS * ((p.centroid.getComponent(axis) - bounds.min.getComponent(axis)) / dimensionSize));
                binIndex = Math.max(0, Math.min(BINS - 1, binIndex));
                bins[binIndex].count++;
                bins[binIndex].bounds.union(p.bounds);
            }

            for (let i = 0; i < BINS - 1; i++) {
                const leftCount = bins.slice(0, i + 1).reduce((acc, bin) => acc + bin.count, 0);
                const rightCount = prims.length - leftCount;
                if (leftCount === 0 || rightCount === 0) continue;
                const leftBounds = new THREE.Box3();
                bins.slice(0, i + 1).forEach(b => leftBounds.union(b.bounds));
                const rightBounds = new THREE.Box3();
                bins.slice(i + 1).forEach(b => rightBounds.union(b.bounds));
                const leftSA = calculateSurfaceArea(leftBounds);
                const rightSA = calculateSurfaceArea(rightBounds);
                const cost = TRAVERSAL_COST + (leftSA / parentSurfaceArea * leftCount * INTERSECTION_COST) + (rightSA / parentSurfaceArea * rightCount * INTERSECTION_COST);
                if (cost < bestSplit.cost) {
                    const splitPos = bounds.min.getComponent(axis) + (i + 1) * (dimensionSize / BINS);
                    bestSplit = { cost, axis, pos: splitPos };
                }
            }
        }
        
        if (bestSplit.axis === -1 || bestSplit.cost >= prims.length * INTERSECTION_COST) {
            const offset = orderedPrimitiveIDs.length;
            prims.forEach(p => orderedPrimitiveIDs.push(p.index));
            const count = (1 << 16) | prims.length;
            nodes[currentBlasID] = { min: bounds.min.toArray(), max: bounds.max.toArray(), offset, count };
            return currentBlasID;
        }

        const leftPrims: Primitive[] = [];
        const rightPrims: Primitive[] = [];
        for(const p of prims) {
            if (p.centroid.getComponent(bestSplit.axis) < bestSplit.pos) {
                leftPrims.push(p);
            } else {
                rightPrims.push(p);
            }
        }

        // [핵심 수정] 분할 유효성 검사
        if (leftPrims.length === 0 || rightPrims.length === 0) {
            const offset = orderedPrimitiveIDs.length;
            prims.forEach(p => orderedPrimitiveIDs.push(p.index));
            const count = (1 << 16) | prims.length;
            nodes[currentBlasID] = { min: bounds.min.toArray(), max: bounds.max.toArray(), offset, count };
            return currentBlasID;
        }

        buildRecursive(leftPrims);
        const rightChildID = buildRecursive(rightPrims);

        const count = (0 << 16) | bestSplit.axis;
        nodes[currentBlasID] = {
            min: bounds.min.toArray(),
            max: bounds.max.toArray(),
            offset: rightChildID,
            count: count,
        };
        return currentBlasID;
    }

    const buffer = new ArrayBuffer(nodes.length * BVH_NODE_SIZE);
    const view = new DataView(buffer);
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const offset = i * BVH_NODE_SIZE;
        view.setFloat32(offset + 0, node.min[0], true);
        view.setFloat32(offset + 4, node.min[1], true);
        view.setFloat32(offset + 8, node.min[2], true);
        view.setFloat32(offset + 12, node.max[0], true);
        view.setFloat32(offset + 16, node.max[1], true);
        view.setFloat32(offset + 20, node.max[2], true);
        view.setUint32(offset + 24, node.offset, true);
        view.setUint32(offset + 28, node.count, true);
    }
    
    geometry.index!.array.set(orderedPrimitiveIDs.flatMap(id => [
        indices[id * 3 + 0],
        indices[id * 3 + 1],
        indices[id * 3 + 2],
    ]));
    geometry.index!.needsUpdate = true;

    return buffer;
}

function calculateSurfaceArea(box: THREE.Box3): number {
    if (box.isEmpty()) return 0;
    const size = new THREE.Vector3();
    box.getSize(size);
    return 2 * (size.x * size.y + size.x * size.z + size.y * size.z);
}