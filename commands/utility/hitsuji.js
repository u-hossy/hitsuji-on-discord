const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hitsuji")
    .setDescription("ひつじが自己紹介します"),
  async execute(interaction) {
    await interaction.reply("やっほー！あなただけの**ひつじ**だよ！");
  },
};
