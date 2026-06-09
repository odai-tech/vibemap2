import { GoogleGenAI, Type } from "@google/genai";
import { Pin, AIRadarResponse, User } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSocialRadarAnalysis = async (
  userLat: number,
  userLng: number,
  visiblePins: Pin[]
): Promise<AIRadarResponse> => {
  try {
    if (!process.env.API_KEY) {
      // Return mock response if no API key is present for demo stability
      return {
        vibeSummary: "Demo Mode: API Key missing. The area feels energetic with a mix of study sessions and rooftop parties.",
        recommendation: "Check out the Rooftop Sunset Jam if you're feeling social!",
        hotspot: "Union Square"
      };
    }

    const pinContext = visiblePins.map(p => 
      `- [${p.type}] ${p.title || 'Story'} (${p.category}): ${p.description} (${p.attendees || 0} ppl) `
    ).join('\n');

    const prompt = `
      You are the "Vibe AI" for a social map app. 
      Analyze these pins near the user to determine the "vibe".
      
      Pins:
      ${pinContext}

      Return JSON with:
      - vibeSummary (max 10 words, catchy)
      - recommendation (specific action)
      - hotspot (name of the busiest area or "None")
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vibeSummary: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            hotspot: { type: Type.STRING },
          },
          required: ["vibeSummary", "recommendation", "hotspot"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIRadarResponse;
    }
    
    throw new Error("No response text");

  } catch (error) {
    console.error("Gemini Radar Error:", error);
    return {
      vibeSummary: "Can't analyze vibe right now.",
      recommendation: "Explore the map yourself!",
      hotspot: "Unknown"
    };
  }
};

export const getExploreRecommendations = async (
  user: User,
  pins: Pin[]
): Promise<string[]> => {
  try {
    if (!process.env.API_KEY) {
      // Mock fallback: return first 3 pins
      console.warn("No API Key: Returning mock recommendations");
      return pins.slice(0, 3).map(p => p.id);
    }

    const pinContext = pins.map(p => 
      `ID: ${p.id} | Type: ${p.type} | Cat: ${p.category} | Title: ${p.title || 'Story'} | Desc: ${p.description} | Tags: ${p.tags?.join(', ')}`
    ).join('\n');

    const prompt = `
      You are a "Social Matchmaker AI". 
      User Persona: "${user.persona}"
      User Interests: ${user.interests?.join(', ')}

      Task: 
      Analyze the list of map pins below. 
      Select the top 3 Pin IDs that match this user's specific persona, interests, and behavior.
      Think about what this type of person would genuinely like (e.g., engineers might like quiet cafes or tech meetups, students might like parties or study groups).
      
      Available Pins:
      ${pinContext}

      Return JSON: { "recommendedIds": ["id1", "id2"] }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             recommendedIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.recommendedIds || [];
    }
    return [];

  } catch (error) {
    console.error("Gemini Explore Error:", error);
    return [];
  }
};