struct VSOut {
  @builtin(position) position : vec4<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  // 풀스크린 삼각형
  var p = array<vec2<f32>,3>(vec2<f32>(-1.0,-5.0), vec2<f32>(-1.0,1.0), vec2<f32>(5.0,1.0));
  var o: VSOut;
  o.position = vec4<f32>(p[vid], 0.0, 1.0);
  return o;
}