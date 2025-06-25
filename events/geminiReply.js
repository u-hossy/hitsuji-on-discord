const { GoogleGenAI } = require("@google/genai");
const config = require("../gemini.config.json");

module.exports = async (message) => {
  // Ignore message sent by bot
  if (message.author.bot) return;

  // Check if the channel is a Gemini target
  const channelConfig = config.geminiChannels?.find(
    (c) => c.channelId === message.channel.id
  );

  if (!channelConfig) {
    return;
  }

  // Get message content and check character count
  const textToProcess = message.content;

  if (textToProcess.length === 0) {
    await message.reply("内容が入力されませんでした。");
    return;
  }

  // Check for reasonable message length (Gemini has token limits)
  if (textToProcess.length > 8000) {
    await message.reply(
      "Info: メッセージが長すぎます。8000文字以内でお試しください。"
    );
    return;
  }

  try {
    // Send typing indicator
    await message.channel.sendTyping();

    // Generate response
    const model = channelConfig.model;

    const prompt = channelConfig.systemPrompt
      ? `### Instructions\n${channelConfig.systemPrompt}\n\n###Input\n${textToProcess}`
      : textToProcess;

    const config = channelConfig.config;

    const askGemini = require("../lib/askGemini");
    const responseText = await askGemini(model, prompt, config);

    if (!responseText || responseText.trim().length === 0) {
      await message.reply("Error: Geminiからの応答を生成できませんでした。");
      return;
    }

    // Split response if it's too long for Discord (2000 character limit)
    if (responseText.length > 2000) {
      const chunks = [];
      let currentChunk = "";

      const lines = responseText.split("\n");

      for (const line of lines) {
        if (currentChunk.length + line.length + 1 > 1900) {
          // Leave some buffer
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? "\n" : "") + line;
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      // Send the first chunk as a reply
      if (chunks.length > 0) {
        await message.reply(chunks[0]);

        // Send remaining chunks as follow-up messages
        for (let i = 1; i < chunks.length; i++) {
          await message.channel.send(chunks[i]);
        }
      }
    } else {
      await message.reply(responseText);
    }
  } catch (error) {
    console.error("Gemini APIの実行中にエラーが発生しました:", error);

    if (error.message?.includes("API_KEY")) {
      await message.reply("Error: Gemini APIキーの設定に問題があります。");
    } else if (error.message?.includes("quota")) {
      await message.reply(
        "Error: GeminiのAPI使用量の上限に達しました。しばらく待ってからお試しください。"
      );
    } else if (error.message?.includes("safety")) {
      await message.reply(
        "Error: 安全性の理由により、このメッセージには返信できません。"
      );
    } else if (error.message?.includes("overloaded")) {
      await message.reply(
        "Error: モデルがオーバーロードしました。もう一度お試しください。"
      );
    } else {
      await message.reply("Error: AI応答の生成中にエラーが発生しました。");
    }
  }
};
