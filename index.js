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
    let projectName = "Unknown Server";
    let channelName = "general";
    let authorName = "Unknown";
    let messageBody = rawContent;
    let tag = "chat"; 

    // 1. PARSE SPY FORMAT: "📱Server #channel: Author Message..."
    let cleanLine = rawContent.replace(/^📱\s*/, '').trim();

    // Regex breakdown:
    // ^(.*?)       -> Group 1: Server Name (lazy match until #)
    // #(.*?):      -> Group 2: Channel Name (between # and :)
    // \s* -> Spaces
    // (\S+)        -> Group 3: Author Name (First word after colon)
    // (.*)$        -> Group 4: The rest of the message
    const match = cleanLine.match(/^(.*?) #(.*?):\s*(\S+)(.*)$/s);

    if (match) {
        projectName = match[1].trim(); // "testperson's server"
        channelName = match[2].trim(); // "general"
        authorName = match[3].trim();  // "Suryakantdalai"
        messageBody = match[4].trim(); // "Alze Airdrop Stage-1..."
        
        // We save content as "Author|Message" to separate them easily in dashboard
        rawContent = `${authorName}|${messageBody}`;
    } else {
        // Fallback if regex fails
        projectName = "Spy Update";
        rawContent = `Bot|${cleanLine}`;
    }

    // 2. SMART TAGGING
    const lowerChan = channelName.toLowerCase();
    const lowerBody = messageBody.toLowerCase();

    if (lowerChan.includes("announc") || lowerChan.includes("news") || lowerBody.includes("📢")) {
      tag = "announcement";
    } else if (lowerChan.includes("general") || lowerChan.includes("chat")) {
      tag = "chat";
    }

    console.log(`📥 Saving: ${projectName} (#${channelName}) - ${authorName}`);

    // 3. SAVE TO DB
    const { error } = await supabase
      .from("discord_announcements")
      .insert({
        project_name: projectName,
        channel_name: channelName,
        content: rawContent, // Saved as "Author|Message"
        tag: tag
      });

    if (error) console.error("❌ DB Error:", error.message);

  } catch (err) {
    console.error("Critical Error:", err);
  }
});

client.login(DISCORD_TOKEN);
