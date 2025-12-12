import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';

// Safely retrieve the API key checking multiple environment patterns
const getApiKey = (): string => {
  // 1. Check for Vite specific env vars (modern frontend standard)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
    // @ts-ignore
    if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
  }

  // 2. Check for process.env (Node.js / Webpack standard)
  try {
    if (typeof process !== 'undefined' && process.env) {
       if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
       if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore reference errors if process is not defined
  }
  
  return '';
};

const apiKey = getApiKey();
// Initialize the API client
const ai = new GoogleGenAI({ apiKey });

export const refineText = async (text: string, context: string, lang: Language): Promise<string> => {
  if (!apiKey) {
    console.error("Gemini API Error: API Key not found. Please configure VITE_GEMINI_API_KEY in your environment.");
    return "Error: API Key configuration missing.";
  }

  if (!text || text.length < 5) return text;

  try {
    const model = 'gemini-2.5-flash';
    const langInstruction = lang === 'es' 
      ? "Responde exclusivamente en Español." 
      : "Respond exclusively in English.";

    const prompt = `
      Act as an expert medical writer for clinical research protocols.
      Rewrite the following text to be formal, precise, and academic.
      ${langInstruction}
      
      Section Context: ${context}
      Original Text: "${text}"
      
      Return only the rewritten text, no explanations.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return text;
  }
};

export const generateList = async (type: string, context: string, lang: Language): Promise<string[]> => {
  if (!apiKey) {
      console.error("Gemini API Error: API Key not found. Please configure VITE_GEMINI_API_KEY in your environment.");
      return ["Error: API Key configuration missing."];
  }

  try {
    const model = 'gemini-2.5-flash';
    const langInstruction = lang === 'es' 
      ? "Genera la lista en Español." 
      : "Generate the list in English.";
      
    const prompt = `
      Act as an expert clinical research methodologist.
      Generate a list of 5 to 7 ${type} suitable for the study.
      ${langInstruction}
      
      Study Context:
      ${context}
      
      Response Format: One criterion per line. No numbers, no bullets at start.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const text = response.text || '';
    return text
      .split('\n')
      .map(line => line.replace(/^[-*•\d\.]+\s*/, '').trim())
      .filter(line => line.length > 3);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};

export const generateText = async (context: string, instruction: string, lang: Language): Promise<string> => {
  if (!apiKey) {
      console.error("Gemini API Error: API Key not found. Please configure VITE_GEMINI_API_KEY in your environment.");
      return "Error: API Key configuration missing.";
  }

  try {
    const model = 'gemini-2.5-flash';
    const langInstruction = lang === 'es' 
      ? "Escribe la respuesta en Español." 
      : "Write the response in English.";

    const prompt = `
      Act as an expert clinical research methodologist.
      ${instruction}
      ${langInstruction}
      
      Study Info:
      ${context}
      
      Response (Formal, academic text only):
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    return '';
  }
};

// New function for context with search grounding
export const generateContextWithSearch = async (title: string, objective: string, lang: Language): Promise<string> => {
  if (!apiKey) {
    return "Error: API Key configuration missing.";
  }

  try {
    // Use gemini-2.5-flash for search grounding
    const model = 'gemini-2.5-flash'; 
    const langInstruction = lang === 'es' 
      ? "Escribe en Español. Incluye referencias bibliográficas reales (Estilo Vancouver o similar) al final del texto." 
      : "Write in English. Include real bibliographic references (Vancouver style or similar) at the end.";

    const prompt = `
      You are a clinical research expert performing a literature review.
      Write a compelling "Introduction / Context Background" section for a clinical protocol.
      
      Study Title: ${title}
      Primary Objective: ${objective}
      
      Instructions:
      1. Explain the disease/condition background.
      2. Explain the current gap in knowledge or the need for this specific study (Rationale).
      3. Use Google Search to find relevant, real, and recent medical literature (Pubmed/Medline sources preferred).
      4. Cite these sources in the text and list them at the bottom.
      5. ${langInstruction}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Enable Google Search Grounding
      }
    });

    // We return the text directly. If grounding chunks are present, the model usually incorporates citation markers [1] in the text.
    // The user can edit the result.
    let text = response.text?.trim() || '';
    
    // Optional: Append grounding metadata links if not explicitly in text (though model usually handles it with the prompt above)
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      const links = chunks
        .map(c => c.web?.uri ? `[${c.web.title || 'Source'}]: ${c.web.uri}` : '')
        .filter(s => s !== '')
        .join('\n');
        
      if (links) {
         // text += `\n\nSources consulted:\n${links}`; 
         // We rely on the model's formatted output primarily, but this is a fallback if needed.
      }
    }

    return text;

  } catch (error) {
    console.error("Gemini API Error (Search):", error);
    // Fallback to standard generation if search fails (e.g. tier limits)
    return generateText(`Title: ${title}. Objective: ${objective}`, "Write a clinical context summary with placeholder references.", lang);
  }
};