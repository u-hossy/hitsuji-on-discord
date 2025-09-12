const fs = require("node:fs");
const path = require("node:path");
// Require the necessary discord.js classes
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When the client is ready, run this code (only once).
const readyHandler = require("./events/ready");
client.once(Events.ClientReady, readyHandler);

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
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }
}

// Listen slash commands
const slashCommandHandler = require("./events/slashCommand");
client.on(Events.InteractionCreate, slashCommandHandler);

// Listen specific channel message to lint
const textlintReplyHandler = require("./events/textlintReply");
client.on(Events.MessageCreate, textlintReplyHandler);

// Listen specific channel message to ask gemini
const geminiReplyHandler = require("./events/geminiReply");
client.on(Events.MessageCreate, geminiReplyHandler);

// Log in to Discord with your client's token
client.login(token);
