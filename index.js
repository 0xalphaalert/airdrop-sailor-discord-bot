import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";
// On Railway, variables are loaded automatically, but this line is fine to keep
import 'dotenv/config'; 

/**
 * ENV VARIABLES
 * Make sure these are set in Railway "Variables" tab!
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
    GatewayIntentBits.MessageContent // <--- REQUIRED: Make sure this is enabled in Discord Dev Portal
  ]
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    // 1. CHECKS
    if (!message.guild) return; 
    if (message.channel.id !== ANNOUNCEMENTS_CHANNEL_ID) return;
    
    // 2. CHECK IF IT IS A WEBHOOK (Followed channels are always webhooks)
    // If it's a normal user message, we might ignore it or handle differently
    if (!message.webhookId) return; 

    // 3. BUILD CONTENT
    let finalContent = message.content || "";
    if (message.embeds.length > 0) {
      message.embeds.forEach((e) => {
        if (e.title) finalContent += `\n**${e.title}**`;
        if (e.description) finalContent += `\n${e.description}`;
        if (e.url) finalContent += `\n🔗 ${e.url}`;
      });
    }

    // 4. GET THE REAL SOURCE NAME
    // message.guild.name = YOUR server (Airdrop Sailor HQ)
    // message.author.username = THE PROJECT NAME (e.g., "Sui Network")
    const sourceName = message.author.username;

    // 5. INSERT TO SUPABASE
    const { error } = await supabase
      .from("discord_announcements")
      .insert({
        project_name: sourceName,          // ✅ Saves "Sui Network"
        channel_name: message.channel.name, // Saves "announcements"
        content: finalContent.trim(),
        tag: "announcement"
      });

    if (error) {
      console.error("❌ Supabase Error:", error.message);
    } else {
      console.log(`📥 Saved update from: ${sourceName}`);
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
});

client.login(DISCORD_TOKEN);
