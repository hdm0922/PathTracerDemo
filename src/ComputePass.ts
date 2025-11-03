


export class ComputePass
{
    public readonly Pipeline        : GPUComputePipeline;
    public readonly InputBindGroup  : GPUBindGroup;
    public readonly OutputBindGroup : GPUBindGroup;

    private constructor
    (
        InPipeline      : GPUComputePipeline,
        InputBindGroup  : GPUBindGroup, 
        OutputBindGroup : GPUBindGroup,
    ) 
    { 
        this.Pipeline           = InPipeline;
        this.InputBindGroup     = InputBindGroup;
        this.OutputBindGroup    = OutputBindGroup;
    }

    public static async Create
    (
        InDevice                : GPUDevice, 
        ShaderCode              : string,
        InputGPUBuffers         : GPUBuffer[],
        InputGPUTextureViews    : GPUTextureView[],
        OutputGPUBuffers        : GPUBuffer[],
        OutputGPUTextureViews   : GPUTextureView[],
    )                           : Promise<ComputePass>
    {

        let Pipeline : GPUComputePipeline;
        {
            const ShaderModule          : GPUShaderModule = InDevice.createShaderModule({ code: ShaderCode });
            const PipelineDescriptor    : GPUComputePipelineDescriptor =
            {
                layout  : "auto",
                compute : { module: ShaderModule, entryPoint: "cs_main" },
            };

            Pipeline = await InDevice.createComputePipelineAsync(PipelineDescriptor);
        }

        let InputBindGroup : GPUBindGroup;
        {
            const InputBufferEntries        : GPUBindGroupEntry[] = InputGPUBuffers.map( ( buffer, index ) => ( {binding : index, resource : { buffer: buffer } } ) );
            const InputTextureViewEntries   : GPUBindGroupEntry[] = InputGPUTextureViews.map( ( textureView, index ) => ( { binding: 10 + index, resource : textureView } ));
            const InputBindGroupEntries     : GPUBindGroupEntry[] = [ ...InputBufferEntries, ...InputTextureViewEntries ];

            InputBindGroup = InDevice.createBindGroup( {layout : Pipeline.getBindGroupLayout(0), entries : InputBindGroupEntries } );
        }

        let OutputBindGroup : GPUBindGroup;
        {
            const OutputBufferEntries        : GPUBindGroupEntry[] = OutputGPUBuffers.map( ( buffer, index ) => ( {binding : index, resource : { buffer: buffer } } ) );
            const OutputTextureViewEntries   : GPUBindGroupEntry[] = OutputGPUTextureViews.map( ( textureView, index ) => ( { binding: 10 + index, resource : textureView } ));
            const OutputBindGroupEntries     : GPUBindGroupEntry[] = [ ...OutputBufferEntries, ...OutputTextureViewEntries ];

            OutputBindGroup = InDevice.createBindGroup( {layout : Pipeline.getBindGroupLayout(1), entries : OutputBindGroupEntries } );
        }

        return new ComputePass(Pipeline, InputBindGroup, OutputBindGroup);
    }

    public Dispatch
    (
        ComputePassEncoder  : GPUComputePassEncoder, 
        WorkgroupCount      : number[],
    )                       : void
    {
        ComputePassEncoder.setPipeline(this.Pipeline);
        ComputePassEncoder.setBindGroup(0, this.InputBindGroup);
        ComputePassEncoder.setBindGroup(1, this.OutputBindGroup);
        ComputePassEncoder.dispatchWorkgroups(WorkgroupCount[0], WorkgroupCount[1], WorkgroupCount[2]);

        return;
    }
}