import { GoogleGenAI } from "@google/genai";
import { 
  ResearchPlan, 
  RESEARCH_PLAN_SCHEMA, 
  SignalReport, 
  SIGNAL_REPORT_SCHEMA 
} from "../types";

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "" || apiKey === "undefined") {
    const details = {
      hasKey: !!apiKey,
      isPlaceholder: apiKey === "MY_GEMINI_API_KEY",
      isEmpty: apiKey === "",
      isUndefinedString: apiKey === "undefined"
    };
    console.error("Gemini Auth Check Failed:", details);
    throw new Error("Gemini API Key is missing or empty. Please ensure you have added 'GEMINI_API_KEY' to the Secrets panel and restarted the app.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateResearchPlan(market: string): Promise<ResearchPlan> {
  try {
    const ai = getAI();
    // Using gemini-3-flash-preview as per guidelines, but adding more robust error handling
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a world-class market research planner. 
      Create a structured research plan for the following market: "${market}".
      Focus on finding real, validated problems and complaints.
      The plan should include subreddits, software categories (G2/Capterra), competitor apps (App Store), search strings, and niche forums.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESEARCH_PLAN_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error("The model returned an empty response. This can happen if the prompt was blocked or the model is unavailable.");
    }

    return JSON.parse(response.text) as ResearchPlan;
  } catch (error: any) {
    console.error("Detailed Planning Error:", error);
    
    // Check for specific API errors
    if (error.message?.includes("403") || error.message?.includes("401")) {
      throw new Error("Invalid API Key. Please check your GEMINI_API_KEY in the Secrets panel.");
    }
    if (error.message?.includes("429")) {
      throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
    }
    
    throw new Error(`Research Planning failed: ${error.message}`);
  }
}

export async function executeResearch(market: string, plan: ResearchPlan): Promise<string> {
  try {
    const ai = getAI();
    const prompt = `Perform deep market research for "${market}" based on this plan:
    ${JSON.stringify(plan, null, 2)}
    
    Search for:
    1. Reddit threads with complaints and frustrations.
    2. Negative reviews on G2, Capterra, and App Store.
    3. Discussions in niche forums.
    
    Extract specific quotes, dates, and URLs. Look for "desperation language" (e.g., "nothing works", "losing money", "I hate that").
    Focus on recurring patterns of frustration.
    
    Return a detailed summary of your findings, including raw text snippets and their sources.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text || "No research data found.";
  } catch (error: any) {
    console.error("Error in executeResearch:", error);
    throw new Error(`Research Execution failed: ${error.message}`);
  }
}

export async function analyzeSignals(market: string, rawResearch: string): Promise<SignalReport> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following market research data for "${market}" and extract Problem Patterns.
      
      Research Data:
      ${rawResearch}
      
      For each pattern:
      - Score Frequency (1-5): How widespread is this?
      - Score Desperation (1-5): How intense is the language?
      - Score Willingness to Pay (1-5): Are they losing money or paying for workarounds?
      - Score Trend (1-5): Is this a recent and growing problem?
      
      Classify as "Strong Signal", "Weak Signal", or "Noise".
      A complaint only qualifies as signal if there is an implied or explicit desired alternative.
      
      Provide 3-5 direct quotes per pattern with source links.
      Include an executive summary and next steps.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: SIGNAL_REPORT_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error("No analysis received from Gemini.");
    }

    return JSON.parse(response.text) as SignalReport;
  } catch (error: any) {
    console.error("Error in analyzeSignals:", error);
    throw new Error(`Signal Analysis failed: ${error.message}`);
  }
}
