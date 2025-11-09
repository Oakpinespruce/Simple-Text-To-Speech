import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Basic SSML escaping
const escapeSSML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};


export const generateSpeech = async (
  text: string, 
  voiceName: string,
  rate?: number, 
  pitch?: number
): Promise<string | null> => {
  try {
    const sanitizedText = escapeSSML(text);
    
    const rateIsCustom = rate !== undefined && rate !== 100;
    const pitchIsCustom = pitch !== undefined && pitch !== 0;
    
    let prompt = sanitizedText;

    // FIX: Refactor SSML construction to be more robust and correct.
    // It now only includes attributes if they are non-default and correctly formats the pitch value.
    if (rateIsCustom || pitchIsCustom) {
      let prosodyAttrs = '';
      if (rateIsCustom) {
        prosodyAttrs += ` rate="${rate}%"`;
      }
      if (pitchIsCustom) {
        // Add a '+' for positive pitch values to conform to SSML spec for relative changes.
        const formattedPitch = pitch! > 0 ? `+${pitch}%` : `${pitch}%`;
        prosodyAttrs += ` pitch="${formattedPitch}"`;
      }
      prompt = `<speak><prosody${prosodyAttrs}>${sanitizedText}</prosody></speak>`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      console.error("No audio data in API response:", response);
      return null;
    }
    
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to communicate with the speech service. Please check your connection or API key.");
  }
};