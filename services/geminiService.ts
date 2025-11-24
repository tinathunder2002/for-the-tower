import { GoogleGenAI, Type } from "@google/genai";
import { VideoClip, VideoFrame, CommentAnalysis, TranscriptSegment } from "../types";

// Initialize Gemini Client
// NOTE: In a production app, handle API keys securely.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-pro-preview";

export const analyzeVideoFrames = async (
  frames: VideoFrame[],
  videoDuration: number
): Promise<VideoClip[]> => {
  // Construct the prompt
  const parts = [];
  
  parts.push({
    text: `You are an expert video editor and social media strategist. 
    Analyze the following sequence of video frames (extracted every few seconds). 
    Your goal is to identify the top 3-5 most "viral" or engaging segments suitable for YouTube Shorts or TikTok.
    
    For each segment:
    1. Identify exact start and end times (approximate based on frame timestamps provided).
    2. Create a catchy Title.
    3. Provide a 'Virality Score' (0-100) based on visual interest, action, or emotion.
    4. Write a brief summary of what happens.
    5. Generate 3-5 hashtags/keywords.
    6. Generate a short 'Transcript Stub' - a hypothetical or observed dialogue/action description for subtitles.
    
    Total Video Duration: ${videoDuration.toFixed(0)} seconds.
    `
  });

  // Add frames to the payload
  frames.forEach(frame => {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.data
      }
    });
    parts.push({
      text: `[Timestamp: ${frame.timestamp.toFixed(1)}s]`
    });
  });

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        startTime: { type: Type.NUMBER, description: "Start time in seconds" },
        endTime: { type: Type.NUMBER, description: "End time in seconds" },
        title: { type: Type.STRING, description: "Catchy title for the clip" },
        summary: { type: Type.STRING, description: "Description of the clip content" },
        viralityScore: { type: Type.NUMBER, description: "Predicted virality score 0-100" },
        reasoning: { type: Type.STRING, description: "Why this clip is viral" },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant tags" },
        transcriptStub: { type: Type.STRING, description: "Estimated spoken text or caption" }
      },
      required: ["startTime", "endTime", "title", "summary", "viralityScore", "tags"],
    }
  };

  try {
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a professional video clipper bot like Opus Clip. You are precise with timestamps."
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from Gemini");

    const rawClips = JSON.parse(text) as Omit<VideoClip, 'id' | 'embedding'>[];
    
    // Add IDs and validate timestamps
    return rawClips.map((clip, index) => ({
      ...clip,
      id: `clip-${Date.now()}-${index}`,
      startTime: Math.max(0, clip.startTime),
      endTime: Math.min(videoDuration, clip.endTime)
    }));

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const generateTranscript = async (audioBase64: string): Promise<TranscriptSegment[]> => {
  const prompt = "Transcribe the following audio. Return a JSON array of segments. Each segment should have a 'startTime' (number, seconds), 'endTime' (number, seconds), and 'text' (string). Break segments by natural pauses or sentences.";
  
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        startTime: { type: Type.NUMBER },
        endTime: { type: Type.NUMBER },
        text: { type: Type.STRING }
      },
      required: ["startTime", "endTime", "text"]
    }
  };

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/mp3",
              data: audioBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const text = result.text;
    if (!text) return [];
    
    return JSON.parse(text) as TranscriptSegment[];

  } catch (error) {
    console.error("Transcription Error:", error);
    // Return empty transcript rather than crashing app if audio fails
    return [];
  }
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const result = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text
    });
    
    // Check if embedding exists on the response object structure
    if (result.embedding && result.embedding.values) {
        return result.embedding.values;
    }
    return [];
  } catch (error) {
    console.error("Embedding Error:", error);
    return [];
  }
};

export const analyzeVideoComments = async (comments: string[]): Promise<CommentAnalysis> => {
  const prompt = `
    Analyze the following YouTube comments for this video.
    Identify the general sentiment, key topics discussed, specific requests from viewers, and provide suggestions for future content based on this feedback.
    
    Comments:
    ${comments.join('\n')}
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      sentiment: { type: Type.STRING, enum: ['Positive', 'Negative', 'Neutral', 'Mixed'], description: "Overall sentiment of the comments" },
      summary: { type: Type.STRING, description: "A brief summary of what the audience is saying" },
      keyTopics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Main topics discussed" },
      viewerRequests: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific things viewers are asking for" },
      contentSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ideas for future videos based on these comments" }
    },
    required: ["sentiment", "summary", "keyTopics", "viewerRequests", "contentSuggestions"]
  };

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as CommentAnalysis;

  } catch (error) {
    console.error("Comment Analysis Error:", error);
    throw error;
  }
};
