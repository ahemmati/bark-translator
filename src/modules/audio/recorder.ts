let activeStream: MediaStream | null = null;
let activeAudioContext: AudioContext | null = null;

function stopActiveStream(): void {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
  if (activeAudioContext) {
    void activeAudioContext.close();
    activeAudioContext = null;
  }
}

export class BarkRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private analyser: AnalyserNode | null = null;

  async start(): Promise<void> {
    // iOS Safari can silently mute a previous stream's track if a new one is
    // requested while it's still live, so always tear down before requesting fresh.
    stopActiveStream();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    activeStream = stream;
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.mediaRecorder.start();

    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    activeAudioContext = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    this.analyser = analyser;
  }

  /** Live time-domain analyser for visualizing the in-progress recording. Null until start() resolves. */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async stop(): Promise<Blob> {
    const recorder = this.mediaRecorder;
    if (!recorder) throw new Error("Recording was never started");
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        stopActiveStream();
        this.analyser = null;
        const mimeType = recorder.mimeType || "audio/webm";
        resolve(new Blob(this.chunks, { type: mimeType }));
      };
      recorder.onerror = (event) => reject(event);
      recorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    stopActiveStream();
    this.analyser = null;
  }
}

export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextCtor();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    void ctx.close();
  }
}
