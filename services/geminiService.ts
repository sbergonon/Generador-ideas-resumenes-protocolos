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
    console.error("Gemini API Error: API Key not found.");
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

// Interface for text + references result
export interface GeneratedContentWithRefs {
  text: string;
  references: string;
}

// New function for context with search grounding AND separation of references
export const generateContextWithSearchAndRefs = async (title: string, objective: string, lang: Language): Promise<GeneratedContentWithRefs> => {
  if (!apiKey) {
    return { text: "Error: API Key missing.", references: "" };
  }

  try {
    const model = 'gemini-2.5-flash'; 
    const langInstruction = lang === 'es' 
      ? "Escribe en Español. Usa referencias numéricas en el texto [1], [2]. Al final, añade una sección '### REFERENCES ###' con la bibliografía completa en estilo Vancouver." 
      : "Write in English. Use numeric citations in text [1], [2]. At the end, add a section '### REFERENCES ###' with the full bibliography in Vancouver style.";

    const prompt = `
      You are a clinical research expert performing a literature review.
      Write a compelling "Introduction / Context Background" section for a clinical protocol.
      
      Study Title: ${title}
      Primary Objective: ${objective}
      
      Instructions:
      1. Explain the disease/condition background.
      2. Explain the current gap in knowledge or the need for this specific study (Rationale).
      3. Use Google Search to find relevant, real, and recent medical literature (Pubmed/Medline sources preferred).
      4. Cite these sources in the text using numbers [1], [2]...
      5. List the full references at the bottom after the delimiter '### REFERENCES ###'.
      6. ${langInstruction}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Enable Google Search Grounding
      }
    });

    let fullText = response.text?.trim() || '';
    
    // Split text and references
    const parts = fullText.split('### REFERENCES ###');
    
    if (parts.length > 1) {
        return {
            text: parts[0].trim(),
            references: parts[1].trim()
        };
    }

    return { text: fullText, references: "" };

  } catch (error) {
    console.error("Gemini API Error (Search):", error);
    return { text: "Error generating content.", references: "" };
  }
};

// Generic Text Generation with Separated References
export const generateTextWithRefs = async (context: string, instruction: string, lang: Language): Promise<GeneratedContentWithRefs> => {
  if (!apiKey) return { text: "Error: API Key missing.", references: "" };

  try {
    const model = 'gemini-2.5-flash';
    const langInstruction = lang === 'es' 
      ? "Responde en Español. Si usas datos específicos, cita [1] y lista al final bajo '### REFERENCES ###'." 
      : "Respond in English. If using specific facts, cite [1] and list at the end under '### REFERENCES ###'.";

    const prompt = `
      Act as an expert clinical research methodologist.
      ${instruction}
      ${langInstruction}
      
      Study Info:
      ${context}
      
      Output Format:
      [Main Text Body]
      ### REFERENCES ###
      [List of References in Vancouver Style if applicable, otherwise leave empty]
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    let fullText = response.text?.trim() || '';
    const parts = fullText.split('### REFERENCES ###');
    
    if (parts.length > 1) {
        return {
            text: parts[0].trim(),
            references: parts[1].trim()
        };
    }
    return { text: fullText, references: "" };

  } catch (error) {
    return { text: "", references: "" };
  }
};