import { Client, GatewayIntentBits, ChannelType } from "discord.js";
import { createClient } from "@supabase/supabase-js";

/**
 * ENV VARIABLES (Railway)
 */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DISCORD_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

/**
 * SUPABASE CLIENT
 */
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

/**
 * DISCORD CLIENT (READ-ONLY)
 */
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
 * MESSAGE LISTENER — ANNOUNCEMENTS ONLY
 */
client.on("messageCreate", async (message) => {
  try {
    // Ignore DMs
    if (!message.guild) return;

    // ONLY Announcement Channels (📢)
    if (message.channel.type !== ChannelType.GuildAnnouncement) return;

    // Ignore empty announcements
    if (!message.content || !message.content.trim()) return;

    // Optional: prevent duplicates (basic safety)
    const content = message.content.trim();

    const { error } = await supabase
      .from("discord_announcements")
      .insert({
        project_name: message.guild.name,
        channel_name: message.channel.name,
        content: content,
        tag: "announcement"
      });

    if (error) {
      console.error("❌ Supabase insert failed:", error.message);
      return;
    }

    console.log("📥 Announcement saved:", content.slice(0, 80));
  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
  }
});

/**
 * LOGIN
 */
client.login(DISCORD_TOKEN);
