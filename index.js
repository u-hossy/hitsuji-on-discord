const fs = require("node:fs");
const path = require("node:path");
// Require the necessary discord.js classes
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
} = require("discord.js");
const { createLinter, loadTextlintrc } = require("textlint");
const appMode = process.env.APP_MODE;
const token = process.env.DISCORD_TOKEN;
const config = require("./textlint.config.json");

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Define slash commands
client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// Listen slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (appMode !== "production") {
    console.log(interaction);
  }

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// Listen specific channel message
client.on("messageCreate", async (message) => {
  // Ignore message sent by bot
  if (message.author.bot) return;

  // Check if the channel is a lint target and get the corresponding preset
  const channelConfig = config.lintChannels.find(
    (c) => c.channelId === message.channel.id
  );

  let presetToUse;
  if (channelConfig) {
    presetToUse = channelConfig.preset;
  } else {
    return;
  }

  // Get message content and check character count
  const textToLint = message.content;

  // Discord's maximum message length is 2000 characters, so don't consider more than that
  if (textToLint.length === 0) {
    await message.reply("校正するメッセージがありません。");
    return;
  }
  if (textToLint.length > 2000) {
    await message.reply(
      "メッセージが2000文字を超えています。Discordの仕様上、一度に校正できるのは2000文字までです。"
    );
    return;
  }

  // Execute textlint
  try {
    // Build the path to the config file corresponding to the preset
    const configPath = path.join(
      __dirname,
      "textlint-configs",
      `${presetToUse}.textlintrc.json`
    );

    // Load textlintrc configuration (using the config file for the specified preset)
    const descriptor = await loadTextlintrc({
      configFilePath: configPath,
    });

    // Create linter instance
    const linter = createLinter({
      descriptor,
    });

    // Lint the text
    const result = await linter.lintText(textToLint, "dummy.md");

    // Format lint results and reply
    if (result.messages.length === 0) {
      // No errors found
      await message.reply(
        "このメッセージには指摘事項がありませんでした。素晴らしいです！"
      );
    } else {
      // Issues found
      let replyContent = `# ${
        message.member?.nickname || message.author.username
      }さんのメッセージの校正結果\n`;

      result.messages.forEach((msg) => {
        // Format and add issue details
        replyContent += `## 行${msg.loc.start.line}, 列${msg.loc.start.column} ~ 行${msg.loc.end.line}, 列${msg.loc.end.column} \n`;
        const startIndex = Math.max(0, msg.range[0] - 5);
        const endIndex = Math.min(textToLint.length, msg.range[1] + 5);
        const contextText = textToLint.substring(startIndex, endIndex);
        replyContent += `- **該当箇所**: \`${contextText}\` \n`;
        replyContent += `- **指摘**: ${msg.message}\n`;
        replyContent += `- **ルール**: \`${msg.ruleId}\`\n`;

        if (msg.fix) {
          // If there's a fix suggestion
          const originalPart = textToLint.substring(
            msg.fix.range[0],
            msg.fix.range[1]
          );
          const fixedPart = msg.fix.text;
          replyContent += `- **修正案**: \`${originalPart}\` → \`${fixedPart}\`\n`;
        }
        replyContent += `\n`;
      });

      // Be careful of Discord's message limit (2000 characters) and split if necessary
      if (replyContent.length > 2000) {
        replyContent =
          replyContent.substring(0, 1980) + "\n...（文字数制限のため一部省略）";
      }
      await message.reply(replyContent);
    }
  } catch (error) {
    console.error("textlintの実行中にエラーが発生しました:", error);
    console.error(`使用しようとした設定: \`${presetToUse}\``);
    await message.reply(
      `メッセージの校正中にエラーが発生しました。\n使用しようとした設定: \`${presetToUse}\``
    );
  }
});

// Log in to Discord with your client's token
client.login(token);
