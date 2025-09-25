@group(0) @binding(0) var screenTexture: texture_2d<f32>;

@fragment
fn fs_main(@location(0) PixelUV: vec2<f32>) -> @location(0) vec4<f32> 
{

  let TexelUV = vec2<i32>(i32(floor(PixelUV.x * 600.0)), i32(floor(PixelUV.y * 450.0)));
  
  let color = textureLoad(screenTexture, vec2<i32>(TexelUV), 0);
  return vec4<f32>(color.rgb, 1.0);
}
