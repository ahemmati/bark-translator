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

const AudioContextCtor = () =>
  window.AudioContext ??
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

/** Decode any audio/video file to an AudioBuffer, regardless of container format. */
export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  // Video containers (MOV, MP4, AVI, MKV, …) can't be decoded by
  // decodeAudioData -- it only handles pure audio streams. For those we
  // extract the audio track via a video element in real-time instead.
  if (blob.type.startsWith("video/") || isVideoExtension(blob)) {
    return extractAudioFromVideo(blob);
  }

  const ctx = new (AudioContextCtor())();
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    // Unknown container or wrong MIME type reported by the OS -- try the
    // video-element path as a last resort before giving up.
    void ctx.close();
    return extractAudioFromVideo(blob);
  }
}

function isVideoExtension(blob: Blob): boolean {
  if (!(blob instanceof File)) return false;
  const ext = blob.name.split(".").pop()?.toLowerCase() ?? "";
  return ["mov", "mp4", "m4v", "avi", "mkv", "wmv", "flv", "3gp", "webm", "mts", "m2ts"].includes(ext);
}

/**
 * Extract the audio track from a video container by playing it through a
 * hidden video element and capturing the raw PCM via ScriptProcessorNode.
 * Works for MOV, MP4, AVI, and any other format the browser's video decoder
 * can handle. The video plays silently in the background.
 */
async function extractAudioFromVideo(blob: Blob): Promise<AudioBuffer> {
  const url = URL.createObjectURL(blob);
  const Ctor = AudioContextCtor();

  try {
    const ctx = new Ctor();

    return await new Promise<AudioBuffer>((resolve, reject) => {
      const video = document.createElement("video");
      video.playsInline = true; // required on iOS to avoid full-screen takeover
      // muted=true is required on iOS: Safari blocks unmuted autoplay even
      // from a file-picker callback. muted only silences the speakers;
      // createMediaElementSource() still receives the full audio data from
      // the Web Audio graph, which runs before the mute stage.
      video.muted = true;
      video.preload = "auto";

      const collected: Float32Array[][] = [];
      const BUFFER_SIZE = 4096;

      let safetyTimer: number | null = null;

      function finish(err?: Error) {
        if (safetyTimer !== null) window.clearTimeout(safetyTimer);
        ctx.close();
        if (err) { reject(err); return; }

        if (collected.length === 0) { reject(new Error("No audio found in this file.")); return; }

        const numChannels = collected[0].length;
        const totalFrames = collected.length * BUFFER_SIZE;
        const audioBuffer = ctx.createBuffer(numChannels, totalFrames, ctx.sampleRate);
        for (let ch = 0; ch < numChannels; ch++) {
          const channelData = audioBuffer.getChannelData(ch);
          let offset = 0;
          for (const frame of collected) {
            channelData.set(frame[ch] ?? frame[0], offset);
            offset += BUFFER_SIZE;
          }
        }
        resolve(audioBuffer);
      }

      video.onloadedmetadata = () => {
        const source = ctx.createMediaElementSource(video);
        // ScriptProcessorNode is deprecated but universally supported, including
        // iOS Safari. AudioWorklet is the modern replacement but adds complexity.
        const processor = ctx.createScriptProcessor(BUFFER_SIZE, 2, 2);
        processor.onaudioprocess = (e) => {
          const frame: Float32Array[] = [];
          for (let ch = 0; ch < e.inputBuffer.numberOfChannels; ch++) {
            frame.push(new Float32Array(e.inputBuffer.getChannelData(ch)));
          }
          collected.push(frame);
        };
        source.connect(processor);
        processor.connect(ctx.destination); // must be connected to fire

        video.onended = () => { processor.disconnect(); source.disconnect(); finish(); };
        video.onerror = () => finish(new Error("Couldn't decode this video file."));

        // Safety timeout: give up after 60 s (covers very long or corrupt files).
        safetyTimer = window.setTimeout(() => {
          video.pause();
          finish(new Error("Timed out reading audio from this file."));
        }, 60_000);

        video.play().catch((err: Error) =>
          finish(new Error(`Couldn't play video for audio extraction: ${err.message}`)),
        );
      };

      video.onerror = () => finish(new Error("Couldn't load this file — format may not be supported."));

      video.src = url;
      video.load();
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
