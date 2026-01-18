import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";

/**
 * ENV
 */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * CLIENTS
 */
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/**
 * READY
 */
client.once("ready", () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
});

/**
 * MESSAGE LISTENER
 */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Change channel name later if needed
    if (message.channel.name !== "announcements") return;

    await supabase.from("discord_announcements").insert({
      project_name: message.guild.name,
      channel_name: message.channel.name,
      content: message.content,
      tag: "announcement"
    });

    console.log("📥 Announcement saved:", message.content.slice(0, 50));
  } catch (err) {
    console.error("❌ Error saving message:", err.message);
  }
});

/**
 * START
 */
client.login(DISCORD_TOKEN);
