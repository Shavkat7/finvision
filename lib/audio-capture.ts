// Microphone capture → 16kHz mono PCM16 chunks.
// Uses an AudioWorklet (off main thread) for glitch-free capture.

export interface AudioCaptureOptions {
  deviceId?: string;
  /** Per-chunk callback. `rms` is the root-mean-square amplitude of the
   *  raw Float32 samples (0..1). Caller can use this to gate speech
   *  detection (e.g. only commit a turn if rms > 0.02 for ≥ 2 chunks). */
  onChunk: (pcm16: ArrayBuffer, rms: number) => void;
  onAmplitude?: (rms: number) => void;
}

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private isRunning = false;

  async start(opts: AudioCaptureOptions): Promise<void> {
    if (this.isRunning) return;

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 16000,
        ...(opts.deviceId ? { deviceId: { exact: opts.deviceId } } : {}),
      },
    };

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    await this.audioContext.audioWorklet.addModule("/worklets/capture-worklet.js");

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, "audio-capture-processor");

    this.workletNode.port.onmessage = (e: MessageEvent<{ type: string; data: Float32Array }>) => {
      if (!this.isRunning || e.data.type !== "audio") return;
      const f32 = e.data.data;
      // Compute RMS on the raw Float32 chunk — zero overhead, lets the
      // caller decide whether the chunk represents real speech.
      let s = 0;
      for (let i = 0; i < f32.length; i++) s += f32[i] * f32[i];
      const rms = Math.sqrt(s / f32.length);
      opts.onChunk(floatToPCM16(f32), rms);
    };

    // Amplitude tap for the orb visualization.
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    source.connect(this.workletNode);

    this.isRunning = true;

    if (opts.onAmplitude) {
      const buf = new Uint8Array(this.analyser.frequencyBinCount);
      const tick = () => {
        if (!this.isRunning || !this.analyser) return;
        this.analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        opts.onAmplitude!(rms);
        this.rafId = requestAnimationFrame(tick);
      };
      tick();
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }
    this.audioContext = null;
  }
}

function floatToPCM16(input: Float32Array): ArrayBuffer {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}
