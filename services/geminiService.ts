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

// Helper to separate text from references
const extractReferences = (fullText: string): GeneratedContentWithRefs => {
    // Delimiters
    const splitters = [
        '### REFERENCES ###',
        '### References ###',
        '### REFERENCIAS ###',
        '### Bibliografía ###',
        '**References**',
        '**Referencias**'
    ];

    for (const splitter of splitters) {
        if (fullText.includes(splitter)) {
            const parts = fullText.split(splitter);
            // The last part is likely the references
            if (parts.length > 1) {
                // Join everything EXCEPT the last part as text
                const references = parts.pop()?.trim() || "";
                const text = parts.join("").trim(); 
                return { text, references };
            }
        }
    }

    // Fallback: Try to find typical Vancouver patterns at the end
    // Matches "1. Author..." or "[1] Author..." at the start of lines near the end
    const lines = fullText.split('\n');
    let splitIndex = -1;
    
    // Look backwards for a cluster of references
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line === '') continue;
        // Check if line looks like a reference start
        if (/^(\d+\.|\[\d+\])\s+[A-Z]/.test(line)) {
            splitIndex = i;
        } else if (splitIndex !== -1 && i < splitIndex - 1) {
            // If we found references but now encounter a non-reference line (and not just one previous line which might be continuation), stop
            break;
        }
    }

    if (splitIndex > 0) {
        const text = lines.slice(0, splitIndex).join('\n').trim();
        const references = lines.slice(splitIndex).join('\n').trim();
        // Only return if references look substantial
        if (references.length > 20) {
             return { text, references };
        }
    }

    return { text: fullText, references: "" };
}

// New function for context with search grounding AND separation of references
export const generateContextWithSearchAndRefs = async (title: string, objective: string, lang: Language): Promise<GeneratedContentWithRefs> => {
  if (!apiKey) {
    return { text: "Error: API Key missing.", references: "" };
  }

  try {
    const model = 'gemini-2.5-flash'; 
    const langInstruction = lang === 'es' 
      ? "Escribe en Español. Usa referencias numéricas en el texto [1], [2]. IMPORTANTE: Coloca TODAS las referencias completas ÚNICAMENTE al final del todo, separadas por '### REFERENCES ###'." 
      : "Write in English. Use numeric citations in text [1], [2]. IMPORTANT: Place ALL full references ONLY at the very end, separated by '### REFERENCES ###'.";

    const prompt = `
      You are a clinical research expert performing a literature review.
      Write a compelling "Introduction / Context Background" section for a clinical protocol.
      
      Study Title: ${title}
      Primary Objective: ${objective}
      
      Instructions:
      1. Explain the disease/condition background.
      2. Explain the current gap in knowledge (Rationale).
      3. Use Google Search to find relevant, real medical literature.
      4. Cite sources in text [1].
      5. ${langInstruction}
      6. DO NOT include the list of references inside the main text. Only put them after the delimiter.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Enable Google Search Grounding
      }
    });

    let fullText = response.text?.trim() || '';
    return extractReferences(fullText);

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
      ? "Responde en Español. Cita con [1]. Pon la lista de bibliografía AL FINAL separada por '### REFERENCES ###'." 
      : "Respond in English. Cite with [1]. Put the bibliography list AT THE END separated by '### REFERENCES ###'.";

    const prompt = `
      Act as an expert clinical research methodologist.
      ${instruction}
      ${langInstruction}
      
      Study Info:
      ${context}
      
      Output Format:
      [Main Text Body]
      
      ### REFERENCES ###
      [List of References in Vancouver Style]
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    let fullText = response.text?.trim() || '';
    return extractReferences(fullText);

  } catch (error) {
    return { text: "", references: "" };
  }
};