import { Type } from "@google/genai";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  credits_used: number;
  is_pro: boolean;
  created_at: string;
}

export enum ResearchStage {
  IDLE = "IDLE",
  PLANNING = "PLANNING",
  RESEARCHING = "RESEARCHING",
  ANALYZING = "ANALYZING",
  COMPLETED = "COMPLETED",
  ERROR = "ERROR"
}

export interface ResearchPlan {
  subreddits: { name: string; queries: string[] }[];
  softwareCategories: string[];
  competitorApps: string[];
  searchStrings: string[];
  nicheForums: string[];
}

export interface ProblemPattern {
  id: string;
  title: string;
  description: string;
  scores: {
    frequency: number;
    desperation: number;
    willingnessToPay: number;
    trend: number;
  };
  classification: "Strong Signal" | "Weak Signal" | "Noise";
  quotes: {
    text: string;
    source: string;
    date: string;
    url: string;
  }[];
}

export interface SignalReport {
  executiveSummary: string;
  patterns: ProblemPattern[];
  nextSteps: string[];
}

export const RESEARCH_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subreddits: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          queries: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "queries"]
      }
    },
    softwareCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
    competitorApps: { type: Type.ARRAY, items: { type: Type.STRING } },
    searchStrings: { type: Type.ARRAY, items: { type: Type.STRING } },
    nicheForums: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["subreddits", "softwareCategories", "competitorApps", "searchStrings", "nicheForums"]
};

export const SIGNAL_REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: { type: Type.STRING },
    patterns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          scores: {
            type: Type.OBJECT,
            properties: {
              frequency: { type: Type.NUMBER },
              desperation: { type: Type.NUMBER },
              willingnessToPay: { type: Type.NUMBER },
              trend: { type: Type.NUMBER }
            },
            required: ["frequency", "desperation", "willingnessToPay", "trend"]
          },
          classification: { type: Type.STRING },
          quotes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                source: { type: Type.STRING },
                date: { type: Type.STRING },
                url: { type: Type.STRING }
              },
              required: ["text", "source", "date", "url"]
            }
          }
        },
        required: ["id", "title", "description", "scores", "classification", "quotes"]
      }
    },
    nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["executiveSummary", "patterns", "nextSteps"]
};
