import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";

/**
 * ENV
 */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * CONSTANTS
 */
const ANNOUNCEMENTS_CHANNEL_ID = "1463920012908695671";

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
 * MESSAGE LISTENER — FOLLOWED ANNOUNCEMENTS ONLY
 */
client.on("messageCreate", async (message) => {
  try {
    // Ignore DMs
    if (!message.guild) return;

    // Only your announcements inbox (TEXT channel)
    if (message.channel.id !== ANNOUNCEMENTS_CHANNEL_ID) return;

    // Followed announcements always come via webhook
    if (!message.webhookId) return;

    // Build unified content (TEXT + LINKS + EMBEDS + ATTACHMENTS)
    let finalContent = message.content || "";

    // Add embed content
    if (message.embeds.length > 0) {
      message.embeds.forEach((e) => {
        if (e.title) finalContent += `\n\n🔹 ${e.title}`;
        if (e.description) finalContent += `\n${e.description}`;
        if (e.url) finalContent += `\n🔗 ${e.url}`;
      });
    }

    // Add attachments
    if (message.attachments.size > 0) {
      message.attachments.forEach((a) => {
        finalContent += `\n📎 ${a.url}`;
      });
    }

    // Deduplication (basic, safe)
    const signature = `DISCORD_ID:${message.id}`;
    if (finalContent.includes(signature)) return;

    finalContent += `\n\n${signature}`;

    // Save to Supabase (MATCHES YOUR TABLE)
    const { error } = await supabase
      .from("discord_announcements")
      .insert({
        project_name: message.guild.name,
        channel_name: message.channel.name,
        content: finalContent.trim(),
        tag: "announcement"
      });

    if (error) {
      console.error("❌ Supabase insert failed:", error.message);
      return;
    }

    console.log("📥 Announcement saved:", finalContent.slice(0, 80));
  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
  }
});

/**
 * START
 */
client.login(DISCORD_TOKEN);
