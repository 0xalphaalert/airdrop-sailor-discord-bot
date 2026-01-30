import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config'; 

// --- CONFIGURATION ---
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
  console.log(`✅ Airdrop Sailor Bot Online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  // 1. SECURITY: Only listen to the specific channel & Webhooks
  if (message.channel.id !== ANNOUNCEMENTS_CHANNEL_ID) return;
  if (!message.webhookId) return; 

  try {
    let rawContent = message.content;
    let projectName = "Unknown Server";
    let channelName = "general";
    let tag = "text"; 

    // 2. PARSE SPY PHONE FORMAT
    // Input format: "📱ServerName #channel: Author Message..."
    // Example: "📱testperson's server #general: Suryakantdalai Hello world"
    
    // Step A: Remove the phone emoji
    let cleanLine = rawContent.replace(/^📱\s*/, '').trim();

    // Step B: Extract Server and Channel (Find the #)
    // We look for the pattern: "ServerName #ChannelName:"
    const metaMatch = cleanLine.match(/^(.*?) #(.*?):/);

    if (metaMatch) {
        projectName = metaMatch[1].trim(); // "testperson's server"
        channelName = metaMatch[2].trim(); // "general"
        
        // Step C: Extract Author and Message
        // Remove the "Server #Channel:" part to get the rest
        let restOfMessage = cleanLine.substring(metaMatch[0].length).trim();
        
        // We assume the first word is the Author, followed by the message
        // OR if there is a newline, the first line is the author.
        // Let's try to split by the first space to make the first word BOLD (Author)
        const firstSpaceIndex = restOfMessage.indexOf(' ');
        if (firstSpaceIndex > 0) {
            const author = restOfMessage.substring(0, firstSpaceIndex);
            const msgText = restOfMessage.substring(firstSpaceIndex + 1);
            // Reformat content to: "**Author** msgText"
            rawContent = `**${author}** ${msgText}`;
        } else {
            // Only one word? It's just the author
            rawContent = `**${restOfMessage}**`;
        }
    } else {
        // Fallback if format is different
        projectName = "Spy Update"; 
    }

    // 3. SMART TAGGING (Blue Badge Logic)
    const lowerProj = projectName.toLowerCase();
    const lowerChan = channelName.toLowerCase();
    const lowerContent = rawContent.toLowerCase();

    if (lowerChan.includes("announcement") || 
        lowerChan.includes("update") || 
        lowerChan.includes("news") ||
        lowerContent.includes("📢") || 
        lowerProj.includes("announcement")) {
      tag = "announcement";
    }

    console.log(`📥 Saving: ${projectName} (#${channelName})`);

    // 4. SAVE TO SUPABASE
    const { error } = await supabase
      .from("discord_announcements")
      .insert({
        project_name: projectName,
        channel_name: channelName,
        content: rawContent,
        tag: tag
      });

    if (error) console.error("❌ DB Error:", error.message);

  } catch (err) {
    console.error("Critical Error:", err);
  }
});

client.login(DISCORD_TOKEN);
