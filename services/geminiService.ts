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
    // Delimiters to try
    const explicitSplitters = [
        '### REFERENCES ###', '### References ###', '### REFERENCIAS ###', '### Bibliografía ###',
        '**References**', '**Referencias**', '### BIBLIOGRAPHY ###', 'References:', 'Referencias:', 'Bibliografía:'
    ];

    for (const splitter of explicitSplitters) {
        // We use lastIndexOf in case the word references appears in the text naturally
        const splitIndex = fullText.lastIndexOf(splitter);
        if (splitIndex !== -1) {
             const textPart = fullText.substring(0, splitIndex).trim();
             const refsPart = fullText.substring(splitIndex + splitter.length).trim();
             
             // Sanity check: refsPart should look like a list
             if (refsPart.length > 10 && /\d/.test(refsPart)) {
                 return { text: textPart, references: refsPart };
             }
        }
    }

    // Fallback: Aggressive pattern matching for the end of the text
    // Looks for a block at the end starting with "1. " or "[1]"
    const lines = fullText.split('\n');
    let refStartIndex = -1;

    // Scan backwards
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check for reference pattern: "1. Author" or "[1] Author"
        if (/^(\d+\.|\[\d+\])\s+/.test(line)) {
            refStartIndex = i;
        } else {
            // If we hit a line that is NOT a reference and we found some refs, stop
            if (refStartIndex !== -1) {
                // Allow for multi-line refs: if this line is part of the previous ref?
                // For simplicity, if we hit a clearly non-ref paragraph after finding refs, we assume refs started at refStartIndex
                break;
            }
        }
    }

    if (refStartIndex !== -1) {
        // Ensure we captured at least 2 lines or it looks very much like a bibliography
        const potentialRefs = lines.slice(refStartIndex).join('\n').trim();
        const textBody = lines.slice(0, refStartIndex).join('\n').trim();
        return { text: textBody, references: potentialRefs };
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
      ? "Escribe en Español. DEBES incluir citas numéricas [1], [2] en el texto y listar las referencias completas al final." 
      : "Write in English. You MUST include numeric citations [1], [2] in the text and list full references at the end.";

    const prompt = `
      You are a clinical research expert performing a literature review.
      Write a compelling "Introduction / Context Background" section for a clinical protocol.
      
      Study Title: ${title}
      Primary Objective: ${objective}
      
      Instructions:
      1. Explain the disease/condition background.
      2. Explain the current gap in knowledge (Rationale).
      3. Use Google Search to find relevant, real medical literature.
      4. Cite sources in text using numbers [1], [2].
      5. ${langInstruction}
      6. CRITICAL: Put the list of references at the very bottom, separated by '### REFERENCES ###'.
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
      ? "Responde en Español. INCLUYE citas bibliográficas ficticias o reales [1], [2] para dar rigor científico. Pon la lista de bibliografía AL FINAL separada por '### REFERENCES ###'." 
      : "Respond in English. INCLUDE fictional or real citations [1], [2] to add scientific rigor. Put the bibliography list AT THE END separated by '### REFERENCES ###'.";

    const prompt = `
      Act as an expert clinical research methodologist.
      ${instruction}
      ${langInstruction}
      
      Study Info:
      ${context}
      
      Output Format:
      [Main Text Body with citations like [1]]
      
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