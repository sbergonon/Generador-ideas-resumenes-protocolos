import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';

// Safely retrieve the API key checking multiple environment patterns
const getApiKey = (): string => {
  // 1. Check for process.env (Node.js / Webpack standard)
  try {
    if (typeof process !== 'undefined' && process.env) {
       if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {}
  return '';
};

const apiKey = getApiKey();
// Initialize the API client
const ai = new GoogleGenAI({ apiKey });

export const refineText = async (text: string, context: string, lang: Language): Promise<string> => {
  if (!apiKey) return text;
  if (!text || text.length < 5) return text;

  try {
    const model = 'gemini-3-flash-preview';
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
  if (!apiKey) return [];

  try {
    const model = 'gemini-3-flash-preview';
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
  if (!apiKey) return "";

  try {
    const model = 'gemini-3-flash-preview';
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

export interface GeneratedContentWithRefs {
  text: string;
  references: string;
}

/**
 * Normalizes and deduplicates a list of references.
 */
const deduplicateRefs = (refsText: string): string => {
    if (!refsText) return "";
    const lines = refsText.split('\n').filter(l => l.trim().length > 0);
    const seen = new Set<string>();
    const uniqueLines: string[] = [];

    lines.forEach(line => {
        // Strip leading numbers like "1." or "[1]" to compare the actual bibliographic content
        const content = line.replace(/^(\[\d+\]|\d+\.)\s*/, '').trim().toLowerCase();
        // Simple normalization: remove non-alphanumeric chars for comparison
        const normalized = content.replace(/[^a-z0-9]/g, '');
        
        if (normalized.length > 10 && !seen.has(normalized)) {
            seen.add(normalized);
            uniqueLines.push(line.trim());
        }
    });

    return uniqueLines.join('\n');
};

const extractReferences = (fullText: string): GeneratedContentWithRefs => {
    const explicitSplitters = [
        '### REFERENCES ###', '### References ###', '### REFERENCIAS ###', '### Bibliografía ###',
        '**References**', '**Referencias**', '### BIBLIOGRAPHY ###', 'References:', 'Referencias:', 'Bibliografía:',
        'REFERENCIAS BIBLIOGRÁFICAS', 'BIBLIOGRAPHY'
    ];

    let lastIndex = -1;
    let foundSplitterLength = 0;

    for (const splitter of explicitSplitters) {
        const index = fullText.lastIndexOf(splitter);
        if (index > lastIndex) {
            lastIndex = index;
            foundSplitterLength = splitter.length;
        }
    }

    if (lastIndex !== -1) {
        const textPart = fullText.substring(0, lastIndex).trim();
        const rawRefs = fullText.substring(lastIndex + foundSplitterLength).trim();
        if (rawRefs.length > 5) {
             return { text: textPart, references: deduplicateRefs(rawRefs) };
        }
    }

    // Fallback: search for a sequence of numbered lines at the end of the response
    const lines = fullText.split('\n');
    let refStartIndex = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;
        // Detects "1. ", "[1] ", etc.
        if (/^(\d+\.|\[\d+\])\s+/.test(line)) {
            refStartIndex = i;
        } else if (refStartIndex !== -1) {
            // Stop if we find a line that isn't a reference once we've found some
            break;
        }
    }

    if (refStartIndex !== -1 && refStartIndex > lines.length * 0.3) {
        const textPart = lines.slice(0, refStartIndex).join('\n').trim();
        const rawRefs = lines.slice(refStartIndex).join('\n').trim();
        return { text: textPart, references: deduplicateRefs(rawRefs) };
    }

    return { text: fullText, references: "" };
}

export const generateContextWithSearchAndRefs = async (title: string, objective: string, lang: Language): Promise<GeneratedContentWithRefs> => {
  if (!apiKey) return { text: "API Key missing.", references: "" };

  try {
    const model = 'gemini-3-flash-preview'; 
    const langInstruction = lang === 'es' 
      ? "Escribe en Español. DEBES incluir citas numéricas [1], [2] en el texto y listar las referencias completas al final en formato Vancouver." 
      : "Write in English. You MUST include numeric citations [1], [2] in the text and list full references at the end in Vancouver style.";

    const prompt = `
      You are a clinical research expert performing a literature review.
      Write a compelling "Introduction / Context Background" section for a clinical protocol.
      Study Title: ${title}
      Primary Objective: ${objective}
      Instructions:
      1. Explain the disease/condition background and rationale.
      2. Use real medical literature found via search.
      3. Cite sources in text using numbers [1], [2].
      4. Reuse the same number if you cite the same source again. DO NOT create duplicate reference entries.
      5. ${langInstruction}
      6. CRITICAL: Put the references at the very bottom, separated by '### REFERENCES ###'.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    return extractReferences(response.text?.trim() || '');
  } catch (error) {
    return { text: "Error generating content.", references: "" };
  }
};

export const generateTextWithRefs = async (context: string, instruction: string, lang: Language): Promise<GeneratedContentWithRefs> => {
  if (!apiKey) return { text: "", references: "" };

  try {
    const model = 'gemini-3-flash-preview';
    const langInstruction = lang === 'es' 
      ? "Responde en Español. INCLUYE citas bibliográficas reales [1], [2] para dar rigor científico. Pon la bibliografía AL FINAL separada por '### REFERENCES ###'." 
      : "Respond in English. INCLUDE real citations [1], [2] to add scientific rigor. Put the bibliography AT THE END separated by '### REFERENCES ###'.";

    const prompt = `
      Act as an expert clinical research methodologist.
      ${instruction}
      ${langInstruction}
      Study Info: ${context}
      
      CRITICAL RULES:
      1. Reuse the same citation number for repeated sources.
      2. Do not list the same bibliographic entry twice in the reference list.
      
      Format:
      [Main text with [1]]
      
      ### REFERENCES ###
      [List of unique references in Vancouver style]
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return extractReferences(response.text?.trim() || '');
  } catch (error) {
    return { text: "", references: "" };
  }
};