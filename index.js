import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config'; 

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  console.log(`✅ Spy Bot Online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.channel.id !== ANNOUNCEMENTS_CHANNEL_ID) return;
  if (!message.webhookId) return; 

  try {
    let rawContent = message.content;
    
    // Default placeholders
    let serverName = "Unknown Server";
    let channelName = "general";
    let authorName = "Unknown Author";
    let msgContent = rawContent;
    let tag = "chat";

    // --- PARSER LOGIC ---
    // Expected Format from MacroDroid: "📱 ServerName #Channel: AuthorName \n\n Message..."
    // We clean the "📱" and split by newlines first.
    
    // 1. Remove Phone Emoji
    const cleanRaw = rawContent.replace(/^📱\s*/, '').trim();
    
    // 2. Split Title (Line 1) from Body (Line 2+)
    // If MacroDroid sends "\n\n", we split by that.
    const firstLineEnd = cleanRaw.indexOf('\n');
    let titleLine = "";
    let bodyText = "";

    if (firstLineEnd > -1) {
        titleLine = cleanRaw.substring(0, firstLineEnd).trim(); // "testperson's server #general: Suryakantdalai"
        bodyText = cleanRaw.substring(firstLineEnd).trim();     // "Alze Airdrop Claim..."
    } else {
        titleLine = cleanRaw; // Fallback if no body
        bodyText = "";
    }

    // 3. Deconstruct the Title Line: "Server #Channel: Author"
    // Regex: Capture text before #, text between # and :, text after :
    const metaMatch = titleLine.match(/^(.*?)#(.*?):\s*(.*)$/);

    if (metaMatch) {
        serverName = metaMatch[1].trim();  // "testperson's server"
        channelName = metaMatch[2].trim(); // "general"
        authorName = metaMatch[3].trim();  // "Suryakantdalai"
    } else {
        // Fallback logic if format breaks
        serverName = "Spy Update";
        bodyText = cleanRaw; 
    }

    // 4. Save formatted content string for Frontend
    // We will save it as: "Server|Channel|Author|Message"
    // This makes it 100% easy for index.html to split and place correctly.
    const dbContent = `${serverName}|${channelName}|${authorName}|${bodyText}`;

    // 5. Smart Tagging
    if (channelName.toLowerCase().includes("announcement") || 
        channelName.toLowerCase().includes("news") || 
        bodyText.includes("📢")) {
      tag = "announcement";
    }

    console.log(`📥 Saving: ${serverName} -> ${authorName}`);

    const { error } = await supabase
      .from("discord_announcements")
      .insert({
        project_name: serverName, // We save Server Name here for search
        channel_name: channelName,
        content: dbContent,       // Saving the packed format
        tag: tag
      });

    if (error) console.error("❌ DB Error:", error.message);

  } catch (err) {
    console.error("Critical Error:", err);
  }
});

client.login(DISCORD_TOKEN);
