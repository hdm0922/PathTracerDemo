// ============================================================================
// Path Tracing Compute (WGSL) — Instances / BVH / Triangles / Materials
// Output: writeonly storage texture (rgba16f/rgba32f 권장)
// ============================================================================

const DEBUG_PRIMARY_ALBEDO : bool = true;

// ---------- Uniforms ----------
struct SceneParams 
{
  // 16B 정렬을 맞추기 위해 vec4 배치
  img_size            : vec2<u32>,
  max_bounces         : u32,
  samples_per_launch  : u32,   // 픽셀당 이번 디스패치에서 생성할 샘플 수

  cam_pos             : vec3<f32>, _pad0 : f32,
  cam_dir             : vec3<f32>, _pad1 : f32,  // 정규화된 전방
  cam_right           : vec3<f32>, _pad2 : f32,  // right = tan(fov/2)와 aspect 반영
  cam_up              : vec3<f32>, _pad3 : f32,  // up    = tan(fov/2) 반영

  frame_index         : u32,    // 누적 프레임/샘플 인덱스(난수용)
  _pad4               : vec3<u32>,
};

// ---------- Output ----------
// 필요 시 rgba32float로 바꿔도 됨

// ---------- SSBOs ----------
struct Instance {
  root     : u32,
  flags    : u32,
  _pad0    : u32,
  _pad1    : u32,

  // column-major mat3x4 : 3개의 vec4 컬럼
  world_from_object : mat3x4<f32>,
  object_from_world : mat3x4<f32>,

  aabb_local_min : vec4<f32>,
  aabb_local_max : vec4<f32>,
};


struct BvhNode {
  aabb_min : vec4<f32>,
  aabb_max : vec4<f32>,
  left     : u32,   // 내부: left child, 리프: triFirst
  right    : u32,   // 내부: right child, 리프: triCount
  flags    : u32,   // bit0 = leaf
  _pad0    : u32,
  opt0     : u32,
  opt1     : u32,
};


struct TriPacked {
  p0   : vec4<f32>,
  e1   : vec4<f32>,
  e2   : vec4<f32>,
  metadd : vec4<u32>, // x=materialIdx, y=flags...
};
struct Material {
  base_color : vec3<f32>, _0 : f32,
  emission   : vec3<f32>, _1 : f32,
  roughness  : f32,
  metalness  : f32,
  ior        : f32,
  occ_str    : f32,
  albedoTex  : i32,
  mrTex      : i32,
  normalTex  : i32,
  emissiveTex: i32,
};

@group(0) @binding(0) var<uniform> Params : SceneParams;
@group(0) @binding(1) var<storage, read> Instances : array<Instance>;
@group(0) @binding(2) var<storage, read> BVH : array<BvhNode>;
@group(0) @binding(3) var<storage, read> Triangles : array<TriPacked>;
@group(0) @binding(4) var<storage, read> Materials : array<Material>;

//@group(0) @binding(5) var prevImage : texture_2d<f32>;
@group(0) @binding(5) var outImage : texture_storage_2d<rgba16float, write>;

// ============================================================================
// 수학/유틸
// ============================================================================
fn dot3(a:vec3<f32>, b:vec3<f32>) -> f32 { return a.x*b.x + a.y*b.y + a.z*b.z; }
fn saturate(x:f32) -> f32 { return clamp(x, 0.0, 1.0); }

fn transform_point(m:mat3x4<f32>, p:vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    dot3(m[0].xyz, p) + m[0].w,
    dot3(m[1].xyz, p) + m[1].w,
    dot3(m[2].xyz, p) + m[2].w
  );
}
fn transform_dir(m:mat3x4<f32>, v:vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    dot3(m[0].xyz, v),
    dot3(m[1].xyz, v),
    dot3(m[2].xyz, v)
  );
}

// ---------- RNG (간단 xorshift32) ----------
struct RNG { s:u32 }
fn rng_next(r:ptr<function, RNG>) -> f32 {
  var x = (*r).s;
  x ^= (x << 13u);
  x ^= (x >> 17u);
  x ^= (x << 5u);
  (*r).s = x;
  // 0..1
  let u = f32(x) * (1.0 / 4294967296.0);
  return clamp(u, 1e-7, 1.0 - 1e-7);
}

// 샘플링: 코사인 가중 반구
fn cosine_hemisphere(r:ptr<function, RNG>) -> vec3<f32> {
  let u1 = rng_next(r);
  let u2 = rng_next(r);
  let rxy = sqrt(u1);
  let th  = 2.0 * 3.1415926535 * u2;
  let x = rxy * cos(th);
  let y = rxy * sin(th);
  let z = sqrt(max(0.0, 1.0 - u1));
  return vec3<f32>(x, y, z);
}

// 정규벡터 n에 정렬된 좌표계 구성
fn orthonormal_basis(n:vec3<f32>) -> mat3x3<f32> {
  let s = select(vec3<f32>(1.0,0.0,0.0), vec3<f32>(0.0,1.0,0.0), abs(n.x) > abs(n.y));
  let t = normalize(cross(n, s));
  let b = cross(t, n);
  // 열벡터들(t, b, n)
  return mat3x3<f32>(t, b, n);
}

// ---------- Ray / Hit ----------
struct Ray { o:vec3<f32>, d:vec3<f32> };
struct Hit {
  t      : f32,
  instId : u32,
  triId  : u32,
  matId  : u32,
  u      : f32,
  v      : f32,
  valid  : u32,
};

// ---------- AABB 교차 (slab) ----------
struct BoxHit { hit:bool, t0:f32, t1:f32 };
fn ray_box(o:vec3<f32>, d:vec3<f32>, bmin:vec3<f32>, bmax:vec3<f32>) -> BoxHit {
  let invD = 1.0 / d;
  var t0 = (bmin - o) * invD;
  var t1 = (bmax - o) * invD;
  let tmin = min(t0, t1);
  let tmax = max(t0, t1);
  let enter = max(max(tmin.x, tmin.y), tmin.z);
  let exit  = min(min(tmax.x, tmax.y), tmax.z);
  return BoxHit(enter <= exit && exit >= 0.0, enter, exit);
}

// ---------- 삼각형 교차 (Möller–Trumbore) ----------
struct TriHit { hit:bool, t:f32, u:f32, v:f32 };
fn ray_tri(o:vec3<f32>, d:vec3<f32>, p0:vec3<f32>, e1:vec3<f32>, e2:vec3<f32>) -> TriHit {
  let pvec = cross(d, e2);
  let det  = dot(e1, pvec);
  // 양면 처리: abs(det) 사용
  if (abs(det) < 1e-8) { return TriHit(false, -1.0, 0.0, 0.0); }
  let invDet = 1.0 / det;

  let tvec = o - p0;
  let u = dot(tvec, pvec) * invDet;
  if (u < 0.0 || u > 1.0) { return TriHit(false, -1.0, 0.0, 0.0); }

  let qvec = cross(tvec, e1);
  let v = dot(d, qvec) * invDet;
  if (v < 0.0 || u + v > 1.0) { return TriHit(false, -1.0, 0.0, 0.0); }

  let t = dot(e2, qvec) * invDet;
  if (t <= 0.0) { return TriHit(false, -1.0, 0.0, 0.0); }
  return TriHit(true, t, u, v);
}

// ---------- 단일 인스턴스의 BVH 트래버스 ----------
fn traverse_bvh(rayO:vec3<f32>, rayD:vec3<f32>, root:u32, tBestIn:f32) -> Hit {
  var best = Hit(tBestIn, 0u, 0u, 0u, 0.0, 0.0, 0u);
  if (root == 0xFFFFFFFFu) { return best; }

  // 간단한 스택 기반 DFS
  const MAX_STACK : u32 = 64u;
  var stack : array<u32, MAX_STACK>;
  var sp = 0u;

  // 루트 AABB 프리패스 (이미 인스턴스 레벨에서 검사할 수도 있음)
  {
    let n = BVH[root];
    let hb = ray_box(rayO, rayD, n.aabb_min.xyz, n.aabb_max.xyz);
    if (!hb.hit || hb.t0 > best.t) { return best; }
  }
  stack[sp] = root; sp++;

  loop {
    if (sp == 0u) { break; }
    sp -= 1u;
    let idx = stack[sp];
    let node = BVH[idx];

    // AABB 테스트 + 얼리 프루닝
    let hb = ray_box(rayO, rayD, node.aabb_min.xyz, node.aabb_max.xyz);
    if (!hb.hit || hb.t0 > best.t) { continue; }

    if ((node.flags & 1u) != 0u) {
      // Leaf: Triangles[node.left .. node.left + node.right)
      let first = node.left;
      let count = node.right;
      for (var i=0u; i<count; i++) {
        let tri = Triangles[first + i];
        let th = ray_tri(rayO, rayD, tri.p0.xyz, tri.e1.xyz, tri.e2.xyz);
        if (th.hit && th.t < best.t) {
          best.t = th.t;
          best.triId = first + i;
          best.matId = tri.metadd.x;
          best.u = th.u; best.v = th.v;
          best.valid = 1u;
        }
      }
    } else {
      // 내부: 두 자식 near-first 처리
      let L = node.left;
      let R = node.right;

      let nL = BVH[L];
      let nR = BVH[R];
      let bL = ray_box(rayO, rayD, nL.aabb_min.xyz, nL.aabb_max.xyz);
      let bR = ray_box(rayO, rayD, nR.aabb_min.xyz, nR.aabb_max.xyz);

      // 더 먼 쪽 먼저 push (pop 순서상 가까운 쪽을 먼저 처리)
      if (bL.hit && bR.hit) {
        if (bL.t0 < bR.t0) {
          if (bR.t0 < best.t) { stack[sp] = R; sp++; }
          if (bL.t0 < best.t) { stack[sp] = L; sp++; }
        } else {
          if (bL.t0 < best.t) { stack[sp] = L; sp++; }
          if (bR.t0 < best.t) { stack[sp] = R; sp++; }
        }
      } else if (bL.hit) {
        if (bL.t0 < best.t) { stack[sp] = L; sp++; }
      } else if (bR.hit) {
        if (bR.t0 < best.t) { stack[sp] = R; sp++; }
      }
    }
  }
  return best;
}

// ---------- 셰이딩(아주 단순한 디퓨즈 + 에미시브만) ----------
struct ShadeOut { L:vec3<f32>, newRay:Ray, newThrough:vec3<f32>, cont:bool };

fn shade_and_sample(
  mat:Material,
  posW:vec3<f32>, nW:vec3<f32>,
  wiW:vec3<f32>,  // 입사(카메라→표면) 방향(= -ray.d)
  rng:ptr<function, RNG>,
  throughput:vec3<f32>
) -> ShadeOut {
  // 에미시브 더하기
  var Lo = throughput * mat.emission;

  // Lambert 디퓨즈만(간단): f = base/π, 샘플 pdf = cos/π → throughput *= base * cos / pdf = base
  // 즉, 코사인-가중 샘플이면 pdf가 상쇄되어 throughput 업데이트가 base에만 의존
  let base = mat.base_color;
  let onb = orthonormal_basis(nW);
  let local = cosine_hemisphere(rng);           // z-up
  var woW = normalize(onb * local);             // 월드 방향
  // 쉐도우/넘어가는 방향 방지: 법선 반대로 가면 반전
  if (dot(woW, nW) <= 0.0) { woW = -woW; }

  let newRay = Ray(posW + nW * 1e-4, woW);
  let newThrough = throughput * base;

  return ShadeOut(Lo, newRay, newThrough, true);
}

// ============================================================================
// 커널
// ============================================================================
@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= Params.img_size.x || gid.y >= Params.img_size.y) { return; }

  // 픽셀 좌표
  let px = f32(gid.x);
  let py = f32(gid.y);
  let w  = f32(Params.img_size.x);
  let h  = f32(Params.img_size.y);

  // RNG 시드
  var rng = RNG( (gid.x * 1973u) ^ (gid.y * 9277u) ^ (Params.frame_index * 26699u) ^ 0x9E3779B9u );

  var color = vec3<f32>(0.0, 0.0, 0.0);

  // 이번 디스패치에서 픽셀당 여러 샘플
  for (var s = 0u; s < Params.samples_per_launch; s++) {
    // 서브픽셀 지터
    let jx = rng_next(&rng) - 0.5;
    let jy = rng_next(&rng) - 0.5;

    // NDC → 카메라 레이
    let sx = ((px + jx) / w) * 2.0 - 1.0;
    let sy = ((py + jy) / h) * 2.0 - 1.0;
    var rd = normalize(Params.cam_dir + sx * Params.cam_right + sy * Params.cam_up);
    var ro = Params.cam_pos;

    // 패스 루프
    var throughput = vec3<f32>(1.0, 1.0, 1.0);
    var radiance   = vec3<f32>(0.0, 0.0, 0.0);
    for (var bounce=0u; bounce<Params.max_bounces; bounce++) {
      // 모든 인스턴스 검사(간단 TLAS 대용). 인스턴스 수가 많아지면 TLAS 권장.
      var best = Hit(1e30, 0u, 0u, 0u, 0.0, 0.0, 0u);

      // 인스턴스 루프 (front-to-back 최적화를 하려면 TLAS 사용)
      let instCount = arrayLength(&Instances);
      for (var i=0u; i<instCount; i++) {
        let inst = Instances[i];

        // 오브젝트 공간 레이
        let roL = transform_point(inst.object_from_world, ro);
        let rdL = normalize(transform_dir(inst.object_from_world, rd));

        // 인스턴스 로컬 AABB 프리패스
        let hb = ray_box(roL, rdL, inst.aabb_local_min.xyz, inst.aabb_local_max.xyz);
        if (!hb.hit || hb.t0 > best.t) { continue; }

        // BLAS 트래버스
        let h = traverse_bvh(roL, rdL, inst.root, best.t);
        if (h.valid != 0u && h.t < best.t) {
          best = h;
          best.instId = i;
        }
      }

      if (best.valid == 0u) {
        // 배경(검정). 환경 조명을 넣고 싶으면 여기서 더해라.
        break;
      }

      // 월드 교차점/법선/머티리얼
      let inst = Instances[best.instId];

      // 오브젝트 공간 히트 위치/노멀
      let roL = transform_point(inst.object_from_world, ro);
      let rdL = normalize(transform_dir(inst.object_from_world, rd));
      let tri = Triangles[best.triId];
      let pL  = roL + rdL * best.t;
      let NgL = normalize(cross(tri.e1.xyz, tri.e2.xyz));

      // 월드로
      let pW  = transform_point(inst.world_from_object, pL);
      var nW  = normalize(transform_dir(inst.world_from_object, NgL));
      if (dot(nW, -rd) < 0.0) { // 양면 보정(필요하면 재질 플래그로 제어)
        nW = -nW;
      }

      let mat = Materials[best.matId];

      if (DEBUG_PRIMARY_ALBEDO) {
        color += mat.base_color;     // ★ 첫 히트를 바로 색으로
        break;                       // ★ 경로 종료
      }


      // 직접조명(에미시브만)
      radiance += throughput * mat.emission;

      // 샘플 후속 경로(디퓨즈만)
      let sh = shade_and_sample(mat, pW, nW, -rd, &rng, throughput);
      radiance += sh.L;
      ro = sh.newRay.o;
      rd = sh.newRay.d;
      throughput = sh.newThrough;

      // 러시안 룰렛(3번째 바운스 이후)
      if (bounce >= 2u) {
        let q = clamp(max(throughput.x, max(throughput.y, throughput.z)), 0.05, 0.95);
        let r = rng_next(&rng);
        if (r > q) { break; }
        throughput /= q;
      }
    }

    color += radiance;
  }

  color /= f32(Params.samples_per_launch);

  textureStore(outImage, vec2<i32>(i32(gid.x), i32(gid.y)), vec4<f32>(color, 1.0));
}
