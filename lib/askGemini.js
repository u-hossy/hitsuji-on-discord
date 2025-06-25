const { GoogleGenAI } = require("@google/genai");

module.exports = async (prompt) => {
  try {
    const apiKey = process.env.GOOGLE_GENAI_APIKEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error asking Gemini:", error);
    throw error;
  }
};
