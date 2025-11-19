/**
 * Decodes base64 string to a Uint8Array (raw bytes).
 * Replaces manual usage of atob for cleaner TS implementation and handling.
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data (Int16) into an AudioBuffer usable by the Web Audio API.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Main function to play PCM audio from a base64 string.
 */
export const playPCMAudio = async (base64Audio: string, audioContext: AudioContext): Promise<void> => {
  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const bytes = decodeBase64(base64Audio);
    // Gemini TTS standard sample rate is usually 24000Hz
    const audioBuffer = await decodeAudioData(bytes, audioContext, 24000, 1);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.error("Error playing PCM audio:", error);
  }
};