import { GoogleGenAI, Type } from "@google/genai";
import { AIRequest, AIResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `You are CurioChain AI — the all-in-one intelligent game engine for a brain-training app.
Switch between CurioBrain Mode (Science, Math, History, Nature, Technology) and ThinkChain Mode (Logic).

FUSION RULES:
- Q1-2: CurioBrain
- Q3: ThinkChain
- Q4-5: CurioBrain
- Q6: ThinkChain
Repeat cycle.

If practiceMode is true, you MUST generate a question for the forceCategory provided, ignoring the usual fusion rules. Provide an extra helpful explanation.

DIFFICULTY SCALING:
- Level 1-10: Easy (20s)
- Level 11-25: Medium (18s)
- Level 26-50: Hard (15s)
- Level 51-100: Expert (12s)
- Level 100+: Genius (10s)

AGE ADAPTATION:
- 6-8: Simple words, basic facts.
- 9-11: Common knowledge.
- 12-14: Multi-step thinking.
- 15-18: Advanced, nuanced.

Always output valid JSON only. Exactly 4 options. One correct answer. Positive feedback.`;

export async function generateGameContent(request: AIRequest): Promise<AIResponse> {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = JSON.stringify(request);

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as AIResponse;
}
