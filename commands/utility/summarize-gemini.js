const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("summarize-gemini")
    .setDescription("Geminiが送信されたメッセージを要約します")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription(
          "要約するメッセージ件数を指定します。1~100で指定してください。"
        )
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      // Send typing indicator
      await interaction.deferReply();

      // Fetch messages in the thread (excluding bots)
      const messageCount =
        parseInt(interaction.options.getInteger("limit")) || 100;

      if (!messageCount || messageCount < 1 || messageCount > 100) {
        await interaction.editReply("メッセージ件数を正しく指定してください。");
        throw new Error(`Message count is invaild: ${messageCount}`);
      }

      const fetchMessageLimit = messageCount;
      const messages = await interaction.channel.messages.fetch({
        limit: fetchMessageLimit,
      });
      const userMessages = messages
        .filter((msg) => !msg.author.bot && msg.content.trim().length > 0)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map((msg) => `${msg.content}`)
        .join("\n");

      if (!userMessages || userMessages.trim().length === 0) {
        await interaction.editReply(
          "要約するメッセージが見つかりませんでした。"
        );
        return;
      }

      // Check message length limit
      if (userMessages.length > 7900) {
        await interaction.editReply(
          "メッセージが長すぎます。要約するメッセージ件数を減らしてお試しください。"
        );
        return;
      }

      // Generate summary using askGemini function
      const askGemini = require("../../lib/askGemini");
      const prompt = `# Instructions\n以下の内容を日本語で箇条書きに要約してください\n\n# Input\n${userMessages}`;

      const summary = await askGemini("gemini-2.5-flash", prompt, {});

      if (!summary || summary.trim().length === 0) {
        await interaction.editReply(
          "申し訳ありませんが、要約を生成できませんでした。"
        );
        return;
      }

      // Send summary result (considering Discord's character limit)
      if (summary.length > 2000) {
        const chunks = [];
        let currentChunk = "";

        const lines = summary.split("\n");

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
          await interaction.editReply(
            `## ${fetchMessageLimit}件のメッセージの要約\n${chunks[0]}`
          );

          // Send remaining chunks as follow-ups
          for (let i = 1; i < chunks.length; i++) {
            await interaction.followUp(chunks[i]);
          }
        }
      } else {
        await interaction.editReply(
          `## ${fetchMessageLimit}件のメッセージの要約\n${summary}`
        );
      }
    } catch (error) {
      console.error("要約コマンドの実行中にエラーが発生しました:", error);

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
