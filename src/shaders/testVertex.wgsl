struct VSOut 
{
  @builtin(position) position : vec4<f32>,
  @location(0) PixelUV : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) VertexID: u32) -> VSOut {

  let TOP_LEFT      : vec2<f32> = vec2<f32>(-1.0,  1.0);
  let TOP_RIGHT     : vec2<f32> = vec2<f32>( 1.0,  1.0);
  let BOTTOM_LEFT   : vec2<f32> = vec2<f32>(-1.0, -1.0);
  let BOTTOM_RIGHT  : vec2<f32> = vec2<f32>( 1.0, -1.0);

  let VerticesBuffer  = array<vec2<f32>, 4>(TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT);
  let IndicesBuffer   = array<u32, 6>(0, 2, 1, 1, 2, 3);

  let SelectedVertex  = VerticesBuffer[IndicesBuffer[VertexID]];

  var Output: VSOut;

  Output.position   = vec4<f32>(SelectedVertex.xy, 0.0, 1.0);
  Output.PixelUV    = vec2<f32>((SelectedVertex + 1.0) * 0.5);

  return Output;
}