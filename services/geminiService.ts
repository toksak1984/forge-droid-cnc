
import { GoogleGenAI } from "@google/genai";
import { ANALYSIS_PROMPT } from '../constants.ts';
import { AnalysisResult } from '../types.ts';

export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
      return {
          text: "API Key missing. Unable to contact AI agent.",
          status: 'warning'
      }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Strip data url prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    // Use gemini-3-flash-preview for quick analysis tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: ANALYSIS_PROMPT }
        ]
      }
    });

    const text = response.text || "No analysis generated.";
    
    let status: 'good' | 'warning' | 'critical' = 'warning';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('good') || lowerText.includes('excellent') || lowerText.includes('100')) status = 'good';
    if (lowerText.includes('critical') || lowerText.includes('poor') || lowerText.includes('fail')) status = 'critical';

    return { text, status };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      text: "Failed to analyze image. Please check connection or API limits.",
      status: 'critical'
    };
  }
};
