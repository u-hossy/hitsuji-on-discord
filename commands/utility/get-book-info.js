const { MessageFlags, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("get-book-info")
    .setDescription("ISBNコードから書籍の情報を返します")
    .addStringOption((option) =>
      option
        .setName("isbn")
        .setDescription("書籍のISBNコードを入力してください")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const isbnChars = interaction.options.getString("isbn").split("");

    const isbn = isbnChars.filter((c) => /^[0-9Xx]$/.test(c)).join("");

    const fetchBookInfo = require("../../lib/fetchBookInfo");
    const bookInfo = await fetchBookInfo(isbn);

    if (!bookInfo) {
      await interaction.editReply({
        content: "書籍情報の取得に失敗しました",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.editReply(
      `- **タイトル**：${bookInfo.title}\n- **著者**：${bookInfo.author}\n- **出版日**：${bookInfo.publishDate}\n- **説明**：\n ${bookInfo.description}`
    );
    if (bookInfo.isbn10) {
      await interaction.followUp(`- https://calil.jp/book/${bookInfo.isbn10}`);
      await interaction.followUp(
        `- https://www.amazon.co.jp/dp/${bookInfo.isbn10}`
      );
    }
  },
};
