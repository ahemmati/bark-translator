import type { AudioFeatures } from "../../types";

const FRAME_SIZE = 2048;
const HOP_SIZE = 1024;

function toMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const mono = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
  }
  return mono;
}

function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

function zeroCrossingRate(frame: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < frame.length; i++) {
    if ((frame[i] >= 0) !== (frame[i - 1] >= 0)) crossings++;
  }
  return crossings / frame.length;
}

function spectralCentroidFromFrame(frame: Float32Array, sampleRate: number): number {
  // Simple magnitude-based DFT centroid; frame sizes here are small enough
  // that a naive DFT is fine and avoids pulling in an FFT dependency.
  const n = frame.length;
  const numBins = n / 2;
  let weightedSum = 0;
  let magnitudeSum = 0;
  for (let k = 1; k < numBins; k++) {
    let re = 0;
    let im = 0;
    const angleStep = (-2 * Math.PI * k) / n;
    for (let t = 0; t < n; t += 4) {
      // Stride by 4 samples to keep this tractable in-browser; sufficient for
      // a coarse centroid estimate used only as one of several features.
      const angle = angleStep * t;
      re += frame[t] * Math.cos(angle);
      im += frame[t] * Math.sin(angle);
    }
    const magnitude = Math.sqrt(re * re + im * im);
    const freq = (k * sampleRate) / n;
    weightedSum += freq * magnitude;
    magnitudeSum += magnitude;
  }
  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
}

function autocorrelationPitch(frame: Float32Array, sampleRate: number): number {
  const minFreq = 80;
  const maxFreq = 1200;
  const maxLag = Math.floor(sampleRate / minFreq);
  const minLag = Math.floor(sampleRate / maxFreq);

  let bestLag = -1;
  let bestCorrelation = 0;
  for (let lag = minLag; lag <= maxLag && lag < frame.length; lag++) {
    let correlation = 0;
    for (let i = 0; i < frame.length - lag; i++) {
      correlation += frame[i] * frame[i + lag];
    }
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return 0;
  return sampleRate / bestLag;
}

function detectBarkOnsets(monoData: Float32Array, sampleRate: number): number {
  const frameEnergies: number[] = [];
  for (let start = 0; start + FRAME_SIZE <= monoData.length; start += HOP_SIZE) {
    frameEnergies.push(rms(monoData.subarray(start, start + FRAME_SIZE)));
  }
  if (frameEnergies.length === 0) return monoData.length > 0 ? 1 : 0;

  const peakEnergy = Math.max(...frameEnergies);
  const threshold = peakEnergy * 0.3;
  const minGapFrames = Math.max(1, Math.round((sampleRate * 0.1) / HOP_SIZE));

  let onsets = 0;
  let aboveThreshold = false;
  let framesSinceLastOnset = minGapFrames;
  for (const energy of frameEnergies) {
    if (energy >= threshold && !aboveThreshold && framesSinceLastOnset >= minGapFrames) {
      onsets++;
      framesSinceLastOnset = 0;
    }
    aboveThreshold = energy >= threshold;
    framesSinceLastOnset++;
  }
  return Math.max(onsets, 1);
}

function estimateAttackTime(monoData: Float32Array, sampleRate: number): number {
  const frameEnergies: number[] = [];
  for (let start = 0; start + FRAME_SIZE <= monoData.length; start += HOP_SIZE) {
    frameEnergies.push(rms(monoData.subarray(start, start + FRAME_SIZE)));
  }
  if (frameEnergies.length === 0) return 0;
  const peakEnergy = Math.max(...frameEnergies);
  const peakIndex = frameEnergies.findIndex((e) => e >= peakEnergy * 0.9);
  if (peakIndex < 0) return 0;
  return (peakIndex * HOP_SIZE) / sampleRate;
}

export function extractAudioFeatures(buffer: AudioBuffer): AudioFeatures {
  const monoData = toMono(buffer);
  const sampleRate = buffer.sampleRate;

  const pitches: number[] = [];
  const centroids: number[] = [];
  let energySum = 0;
  let zcrSum = 0;
  let frameCount = 0;

  for (let start = 0; start + FRAME_SIZE <= monoData.length; start += HOP_SIZE) {
    const frame = monoData.subarray(start, start + FRAME_SIZE);
    const frameRms = rms(frame);
    if (frameRms < 0.01) continue; // skip near-silence frames for pitch/centroid stats

    const pitch = autocorrelationPitch(frame, sampleRate);
    if (pitch > 0) pitches.push(pitch);
    centroids.push(spectralCentroidFromFrame(frame, sampleRate));
    energySum += frameRms;
    zcrSum += zeroCrossingRate(frame);
    frameCount++;
  }

  const meanPitchHz = pitches.length > 0 ? pitches.reduce((a, b) => a + b, 0) / pitches.length : 0;
  const pitchVarianceHz =
    pitches.length > 1
      ? Math.sqrt(pitches.reduce((acc, p) => acc + (p - meanPitchHz) ** 2, 0) / pitches.length)
      : 0;
  const spectralCentroid = centroids.length > 0 ? centroids.reduce((a, b) => a + b, 0) / centroids.length : 0;

  return {
    durationSec: buffer.duration,
    meanPitchHz,
    pitchVarianceHz,
    rmsEnergy: frameCount > 0 ? energySum / frameCount : 0,
    zeroCrossingRate: frameCount > 0 ? zcrSum / frameCount : 0,
    spectralCentroid,
    barkCount: detectBarkOnsets(monoData, sampleRate),
    attackSec: estimateAttackTime(monoData, sampleRate),
  };
}
