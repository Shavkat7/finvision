// Plays a queue of Float32 PCM chunks at the context sample rate.
// Uses an offset tracker (no slice() allocations on the audio thread).
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.port.onmessage = (e) => {
      if (e.data === "interrupt") {
        this.queue = [];
        this.offset = 0;
      } else if (e.data instanceof Float32Array) {
        this.queue.push(e.data);
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const channel = output[0];
    let outIdx = 0;

    while (outIdx < channel.length && this.queue.length > 0) {
      const buf = this.queue[0];
      if (!buf || buf.length === 0) {
        this.queue.shift();
        this.offset = 0;
        continue;
      }
      const remOut = channel.length - outIdx;
      const remBuf = buf.length - this.offset;
      const n = Math.min(remOut, remBuf);
      for (let i = 0; i < n; i++) channel[outIdx++] = buf[this.offset++];
      if (this.offset >= buf.length) {
        this.queue.shift();
        this.offset = 0;
      }
    }

    while (outIdx < channel.length) channel[outIdx++] = 0;
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
