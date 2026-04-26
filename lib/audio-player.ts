// 24kHz PCM16 playback via AudioWorklet.
// Supports interrupt() for instant flush on barge-in.

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private amplitudeCb: ((rms: number) => void) | null = null;
  private initialized = false;

  async init(opts?: { onAmplitude?: (rms: number) => void }): Promise<void> {
    if (this.initialized) return;
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    await this.audioContext.audioWorklet.addModule("/worklets/playback-worklet.js");

    this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    this.workletNode.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.initialized = true;

    if (opts?.onAmplitude) {
      this.amplitudeCb = opts.onAmplitude;
      const buf = new Uint8Array(this.analyser.frequencyBinCount);
      const tick = () => {
        if (!this.analyser || !this.amplitudeCb) return;
        this.analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        this.amplitudeCb(Math.sqrt(sum / buf.length));
        this.rafId = requestAnimationFrame(tick);
      };
      tick();
    }
  }

  // base64-encoded 24kHz PCM16 LE mono.
  async playBase64(base64: string): Promise<void> {
    if (!this.initialized) await this.init();
    if (!this.audioContext || !this.workletNode) return;
    if (this.audioContext.state === "suspended") await this.audioContext.resume();

    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;

    this.workletNode.port.postMessage(float32);
  }

  interrupt(): void {
    this.workletNode?.port.postMessage("interrupt");
  }

  setVolume(v: number): void {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }

  async destroy(): Promise<void> {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.amplitudeCb = null;
    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.workletNode = null;
    this.gainNode = null;
    this.analyser = null;
    this.initialized = false;
  }
}
