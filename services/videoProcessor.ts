import { VideoFrame } from '../types';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export const extractFramesFromVideo = async (
  file: File,
  intervalSeconds: number = 3,
  maxFrames: number = 60,
  onProgress: (progress: number) => void
): Promise<VideoFrame[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: VideoFrame[] = [];
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    video.onloadedmetadata = () => {
      canvas.width = 480; // Resize for API efficiency
      canvas.height = Math.round((480 * video.videoHeight) / video.videoWidth);
      
      const duration = video.duration;
      let currentTime = 0;
      let frameCount = 0;

      // Determine actual interval to fit maxFrames if video is long
      const neededInterval = duration / maxFrames;
      const finalInterval = Math.max(intervalSeconds, neededInterval);

      const captureFrame = async () => {
        if (currentTime >= duration || frames.length >= maxFrames) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Compress slightly
        const base64Data = dataUrl.split(',')[1];

        frames.push({
          timestamp: currentTime,
          data: base64Data
        });

        frameCount++;
        onProgress(Math.min(99, Math.round((currentTime / duration) * 100)));

        currentTime += finalInterval;
        captureFrame();
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Error processing video'));
      };

      // Start capturing
      captureFrame();
    };

    video.onerror = () => {
      reject(new Error('Could not load video'));
    };
  });
};

let ffmpeg: FFmpeg | null = null;

const loadFFmpeg = async () => {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }
  return ffmpeg;
};

export const trimVideo = async (
  file: File,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  const ffmpegInstance = await loadFFmpeg();

  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  // Write file to memory
  await ffmpegInstance.writeFile(inputName, await fetchFile(file));

  const duration = endTime - startTime;
  
  await ffmpegInstance.exec([
    '-ss', startTime.toString(),
    '-i', inputName,
    '-t', duration.toString(),
    '-c', 'copy',
    outputName
  ]);

  const data = await ffmpegInstance.readFile(outputName);
  
  await ffmpegInstance.deleteFile(inputName);
  await ffmpegInstance.deleteFile(outputName);

  return new Blob([data], { type: 'video/mp4' });
};

export const extractAudio = async (file: File): Promise<string> => {
  const ffmpegInstance = await loadFFmpeg();
  
  const inputName = 'audio_input.mp4';
  const outputName = 'audio_output.mp3';

  await ffmpegInstance.writeFile(inputName, await fetchFile(file));

  // Extract audio as mp3, low bitrate to save space/bandwidth for API
  await ffmpegInstance.exec([
    '-i', inputName,
    '-vn', // No video
    '-acodec', 'libmp3lame',
    '-q:a', '5', // Quality (0-9, 5 is average)
    outputName
  ]);

  const data = await ffmpegInstance.readFile(outputName);
  
  // Convert Uint8Array to Binary String for btoa
  const bytes = new Uint8Array(data as ArrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  await ffmpegInstance.deleteFile(inputName);
  await ffmpegInstance.deleteFile(outputName);

  return base64;
};

export const downloadVideo = async (url: string): Promise<File> => {
  // Check for YouTube URLs
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  if (isYouTube) {
    console.log("YouTube URL detected. Switching to demo mode with sample video.");
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Use a high-quality sample video suitable for demoing "clips"
    const sampleUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
    
    try {
      const response = await fetch(sampleUrl);
      const blob = await response.blob();
      return new File([blob], "demo_sample_video.mp4", { type: "video/mp4" });
    } catch (e) {
      throw new Error("Failed to load demo video.");
    }
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    return new File([blob], "downloaded_video.mp4", { type: response.headers.get('content-type') || "video/mp4" });
  } catch (error) {
    console.warn("Direct fetch failed. CORS likely blocked it.");
    throw new Error("Could not download video. If this is a YouTube URL, please note that real YouTube downloading requires a backend server.");
  }
};
