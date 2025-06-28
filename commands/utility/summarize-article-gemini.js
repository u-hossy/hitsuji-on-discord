const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("summarize-article-gemini")
    .setDescription("Geminiが与えられたリンク先の内容を要約します")
    .addStringOption((option) =>
      option
        .setName("URL")
        .setDescription("要約対象のサイトを指定します。")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("カスタムプロンプトを指定できます")
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      // Send typing indicator
      await interaction.deferReply();

      const targetUrl = interaction.options.getString("URL");

      const userPrompt = interaction.options.getString("prompt");

      const prompt = userPrompt
        ? `# 指示\n入力に従って、以下のURLの内容を日本語で出力してください\n\n# 入力\n${userPrompt}\n\n# URL\n${targetUrl}`
        : `# 指示\n以下のURLの内容を日本語で要約してください\n\n# URL\n${targetUrl}`;

      // Check message length limit
      if (userMessages.length > 7900) {
        await interaction.editReply(
          "メッセージが長すぎます。要約するメッセージ件数を減らしてお試しください。"
        );
        return;
      }

      // Generate summary using askGemini function
      const askGemini = require("../../lib/askGemini");
      const geminiAnswer = await askGemini("gemini-2.5-flash", prompt, {
        urlContext: {},
      });

      if (!geminiAnswer || geminiAnswer.trim().length === 0) {
        await interaction.editReply(
          "申し訳ありませんが、回答を生成できませんでした。"
        );
        return;
      }

      // Send summary result (considering Discord's character limit)
      if (geminiAnswer.length > 2000) {
        const chunks = [];
        let currentChunk = "";

        const lines = geminiAnswer.split("\n");

        for (const line of lines) {
          if (currentChunk.length + line.length + 1 > 1900) {
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

        // Send first chunk as reply
        if (chunks.length > 0) {
          await interaction.editReply(chunks[0]);

          // Send remaining chunks as follow-ups
          for (let i = 1; i < chunks.length; i++) {
            await interaction.followUp(chunks[i]);
          }
        }
      } else {
        await interaction.editReply(geminiAnswer);
      }
    } catch (error) {
      console.error(
        "リンク先要約コマンドの実行中にエラーが発生しました:",
        error
      );

      if (error.message?.includes("API_KEY")) {
        await interaction.editReply(
          "Error: Gemini APIキーの設定に問題があります。"
        );
      } else if (error.message?.includes("quota")) {
        await interaction.editReply(
          "Error: GeminiのAPI使用量の上限に達しました。しばらく待ってからお試しください。"
        );
      } else if (error.message?.includes("safety")) {
        await interaction.editReply(
          "Error: 安全性の理由により、このメッセージには返信できません。"
        );
      } else if (error.message?.includes("overloaded")) {
        await interaction.editReply(
          "Error: モデルがオーバーロードしました。もう一度お試しください。"
        );
      } else {
        await interaction.editReply(
          "Error: 要約の生成中にエラーが発生しました。"
        );
      }
    }
  },
};
