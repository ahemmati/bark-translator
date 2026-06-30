import { useEffect, useRef } from "react";

interface LiveWaveformProps {
  analyser: AnalyserNode | null;
}

export function LiveWaveform({ analyser }: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    let frameId: number;

    function draw() {
      frameId = requestAnimationFrame(draw);
      analyser!.getByteTimeDomainData(data);

      const { width, height } = canvas!;
      ctx!.clearRect(0, 0, width, height);
      ctx!.lineWidth = 3;
      ctx!.strokeStyle = "#ffffff";
      ctx!.beginPath();

      const sliceWidth = width / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
        x += sliceWidth;
      }
      ctx!.stroke();
    }

    draw();
    return () => cancelAnimationFrame(frameId);
  }, [analyser]);

  return <canvas ref={canvasRef} className="live-waveform" width={300} height={48} />;
}
