import outputWGSL from './output.wgsl?raw';

// Initialize WebGPU context
const canvas = document.querySelector("canvas");
if (!navigator.gpu) {
  throw new Error("WebGPU not supported on this browser.");
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
  throw new Error("No appropriate GPUAdapter found.");
}

const device = await adapter.requestDevice();

const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device: device,
  format: canvasFormat,
});

// Setup the output render pipeline
const outputShaderModule = device.createShaderModule({
  label: "Output shader",
  code: outputWGSL
});

const renderOutputPipeline = device.createRenderPipeline({
  label: "Output render pipeline",
  layout: 'auto',
  vertex: {
    module: outputShaderModule,
    entryPoint: "vert_main",
  },
  fragment: {
    module: outputShaderModule,
    entryPoint: "frag_main",
    targets: [{
      format: canvasFormat
    }]
},
});

const sampler = device.createSampler({
  magFilter: 'linear',
  minFilter: 'linear',
});

const texture = device.createTexture({
  size: {
    width: 512,
    height: 512,
  },
  format: 'rgba8unorm',
  usage:
    GPUTextureUsage.COPY_DST |
    GPUTextureUsage.STORAGE_BINDING |
    GPUTextureUsage.TEXTURE_BINDING,
})

const renderOutputBindGroup = device.createBindGroup({
  layout: renderOutputPipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: sampler,
    },
    {
      binding: 1,
      resource: texture.createView(),
    },
  ],
});

const renderLoop = () => {
  const encoder = device.createCommandEncoder();

  // Output render
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      storeOp: "store",
    }]
  });
  pass.setPipeline(renderOutputPipeline);
  pass.setBindGroup(0, renderOutputBindGroup);
  pass.draw(6, 1);
  pass.end();

  // Submit the command buffer
  device.queue.submit([encoder.finish()]);
}

renderLoop();
