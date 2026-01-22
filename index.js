import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config'; // Make sure you install dotenv if running locally

/**
 * ENV VARIABLES
 */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANNOUNCEMENTS_CHANNEL_ID = "1463920012908695671"; // Your specific inbox channel

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Airdrop Sailor Bot logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    // 1. Ignore Checks
    if (!message.guild) return; 
    if (message.channel.id !== ANNOUNCEMENTS_CHANNEL_ID) return;
    if (!message.webhookId) return; // Followed announcements are webhooks

    // 2. Build Content (Text + Embeds)
    let finalContent = message.content || "";
    
    if (message.embeds.length > 0) {
      message.embeds.forEach((e) => {
        if (e.title) finalContent += `\n**${e.title}**`;
        if (e.description) finalContent += `\n${e.description}`;
        if (e.url) finalContent += `\n🔗 ${e.url}`;
      });
    }

    // 3. Deduplication
    const signature = `DISCORD_ID:${message.id}`;
    if (finalContent.includes(signature)) return;

    // 4. ✅ THE FIX: Get the Source Name (Project Name)
    // When a channel is "Followed", message.author.username is the project's name.
    const sourceProjectName = message.author.username; 

    // 5. Save to Supabase
    const { error } = await supabase
      .from("discord_announcements")
      .insert({
        project_name: sourceProjectName,     // <--- Saves "Sui Network", etc.
        channel_name: message.channel.name,  // Saves your inbox channel name
        content: finalContent.trim(),
        tag: "announcement"
      });

    if (error) {
      console.error("❌ Supabase insert failed:", error.message);
    } else {
      console.log(`📥 Saved update from: ${sourceProjectName}`);
    }

  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
  }
});
client.login(DISCORD_TOKEN);
