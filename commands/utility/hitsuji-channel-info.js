const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hitsuji-channel-info")
    .setDescription("チャンネル名とチャンネルIDを返します"),
  async execute(interaction) {
    const channel = interaction.channel;
    await interaction.reply(
      `- チャンネル名: \`${channel.name}\`\n- チャンネルID: \`${channel.id}\``
    );
  },
};
