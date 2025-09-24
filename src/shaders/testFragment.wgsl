// 그룹/바인딩은 네 RenderBindGroup에 맞춰 숫자 조정
@group(0) @binding(0) var tex  : texture_2d<f32>;

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {

  let hdr = textureLoad(tex, vec2<i32>(pos.xy), 0).rgb;

  // ACES 톤매핑
  let x = hdr * 1.0;
  let aces = (x*(2.51*x + vec3<f32>(0.03))) / (x*(2.43*x + vec3<f32>(0.59)) + vec3<f32>(0.14));

  // 감마 2.2
  let sdr = pow(clamp(aces, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0/2.2));

  return vec4<f32>(sdr, 1.0);

}
