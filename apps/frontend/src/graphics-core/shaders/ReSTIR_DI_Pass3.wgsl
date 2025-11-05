fn getMotionVector() -> vec2<u32> {
    let currPix : vec2<u32> = ThreadID.xy;

    let worldPos : vec3<f32> = textureLoad(G_PositionTexture, vec2<i32>(currPix), 0).xyz;

    let prevClip : vec4<f32> = UniformBuffer.prevViewProjectionMatrix * vec4<f32>(worldPos, 1.0);
    let prevNdc : vec3<f32> = prevClip.xyz / prevClip.w;

    let prevScreen01 : vec2<f32> = prevNdc.xy * 0.5 + vec2<f32>(0.5, 0.5);
    let prevScreenPx : vec2<f32> = prevScreen01 * UniformBuffer.screenSize;

    return vec2<u32>(prevScreenPx);
}