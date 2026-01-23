import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";

/**
 * ENV VARIABLES
 */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ⚠️ VERIFY THIS ID IS CORRECT!
const ANNOUNCEMENTS_CHANNEL_ID = "1463920012908695671"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ DEBUG MODE: Bot logged in as ${client.user.tag}`);
  console.log(`👀 Watching Channel ID: ${ANNOUNCEMENTS_CHANNEL_ID}`);
});

client.on("messageCreate", async (message) => {
  // LOG EVERYTHING TO SEE WHAT IS HAPPENING
  console.log(`\n📨 NEW MESSAGE RECEIVED!`);
  console.log(`   From Channel ID: ${message.channel.id} (Expected: ${ANNOUNCEMENTS_CHANNEL_ID})`);
  console.log(`   Is Webhook?: ${!!message.webhookId}`);
  console.log(`   Author: ${message.author.username}`);

  try {
    // CHECK 1: Channel ID
    if (message.channel.id !== ANNOUNCEMENTS_CHANNEL_ID) {
      console.log("⛔ IGNORED: Message is in the wrong channel.");
      return; 
    }
    
    // CHECK 2: Webhook ID
    // ✅ ENABLE THIS FOR PRODUCTION (So it ignores your chat messages)
    if (!message.webhookId) {
       // console.log("⛔ IGNORED: Not a webhook (User message)."); // Optional log
       return; 
    } 

    // BUILD CONTENT
    let finalContent = message.content || "";
    if (message.embeds.length > 0) {
      console.log(`   Message has ${message.embeds.length} embeds.`);
      message.embeds.forEach((e) => {
        if (e.title) finalContent += `\n**${e.title}**`;
        if (e.description) finalContent += `\n${e.description}`;
        if (e.url) finalContent += `\n🔗 ${e.url}`;
      });
    }

    const sourceName = message.author.username;
    console.log(`   Attempting to save for project: ${sourceName}...`);

    // INSERT TO SUPABASE
    const { error } = await supabase
      .from("discord_announcements")
      .insert({
        project_name: sourceName,
        channel_name: message.channel.name,
        content: finalContent.trim(),
        tag: "announcement"
      });

    if (error) {
      console.error("❌ SUPABASE ERROR:", error.message);
      console.error("   Details:", error);
    } else {
      console.log(`✅ SUCCESS: Saved update from ${sourceName}`);
    }

  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err.message);
  }
});

client.login(DISCORD_TOKEN);
