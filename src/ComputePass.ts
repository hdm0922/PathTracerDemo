


export class ComputePass
{
    public readonly Pipeline : GPUComputePipeline;

    private constructor(InPipeline : GPUComputePipeline) { this.Pipeline = InPipeline; }

    public static async Create(InDevice : GPUDevice, ShaderCode : string) : Promise<ComputePass>
    {

        const ShaderModule          : GPUShaderModule = InDevice.createShaderModule({ code: ShaderCode });
        const PipelineDescriptor    : GPUComputePipelineDescriptor =
        {
            layout  : "auto",
            compute : { module: ShaderModule, entryPoint: "cs_main" },
        };
        
        const Pipeline : GPUComputePipeline = await InDevice.createComputePipelineAsync(PipelineDescriptor);
        return new ComputePass(Pipeline);
    }

    public Dispatch
    (
        InCommandEncoder    : GPUCommandEncoder, 
        InBindGroup         : GPUBindGroup,
        WorkgroupCount      : number[],
    )                       : void
    {
        const ComputePassEncoder : GPUComputePassEncoder = InCommandEncoder.beginComputePass();

        ComputePassEncoder.setPipeline(this.Pipeline);
        ComputePassEncoder.setBindGroup(0, InBindGroup);
        ComputePassEncoder.dispatchWorkgroups(WorkgroupCount[0], WorkgroupCount[1], WorkgroupCount[2]);

        ComputePassEncoder.end();

        return;
    }
}