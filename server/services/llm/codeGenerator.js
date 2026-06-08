const ai = require("../../config/llmClient");

const SYSTEM_INSTRUCTION = require("./prompt");

async function getCode(userPrompt) {
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    if (!response.text) {
      throw new Error("The model returned an empty response.");
    }

    return response.text;
  } catch (error) {
    console.error(`LLM Client failed to generate code: ${error.message}`);
    throw error;
  } finally {
    console.log("LLM Client Completed Task.");
  }
}

module.exports = getCode;
