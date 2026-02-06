import TelegramBot from 'node-telegram-bot-api';
import { config } from 'dotenv';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

config();

const BOT_TOKEN = process.env.DIRTYXPROXY_KEY || '';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const MAC_HOOK_URL = process.env.MAC_HOOK_URL; // URL for the Mac automation listener
const MAC_HOOK_TOKEN = process.env.MAC_HOOK_TOKEN || 'nexus_secret_trigger_2026';
const IS_VERCEL = !!process.env.VERCEL;



if (!BOT_TOKEN) {
    console.error('❌ Error: DIRTYXPROXY_KEY not found in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: !IS_VERCEL });

if (IS_VERCEL) {
    console.log('📡 Bot initialized for Vercel Webhooks');
} else {
    console.log('🤖 Bot initialized with Polling');
}

// Store for proxy data
let proxyCache: any[] = [];

let validationStats: any = {};

/**
 * Load latest proxy results from storage
 */
async function loadProxies(): Promise<any[]> {
    try {
        // Try multiple paths to find proxies (local vs relative)
        const paths = [
            join(process.cwd(), 'results.json'),           // Vercel root
            join(process.cwd(), 'api/results.json'),       // Local dev
            join(process.cwd(), '../results.json'),       // Local dev (up one)
            join(new URL('.', import.meta.url).pathname, 'results.json'), // Next to script
            join(new URL('.', import.meta.url).pathname, '../results.json'), // Up from script
            '/var/task/results.json'                      // Vercel standard path
        ];



        for (const path of paths) {
            try {
                const data = await readFile(path, 'utf-8');
                proxyCache = JSON.parse(data);
                console.log(`✅ Loaded proxies from: ${path}`);
                return proxyCache;
            } catch (e) {
                // Continue to next path
            }
        }

        console.warn('⚠️ No proxy file found in any known locations.');

        try {
            console.log('🔍 CWD:', process.cwd());
            const files = await readdir(process.cwd());
            console.log('📦 CWD Content:', JSON.stringify(files));
            if (files.includes('src')) {
                const srcFiles = await readdir(join(process.cwd(), 'src'));
                console.log('📦 src Content:', JSON.stringify(srcFiles));
            }
        } catch (e) { }

        return [];

    } catch (error) {
        console.error('Failed to load proxies:', error);
        return [];
    }
}


/**
 * Format proxy list for Telegram message
 */
function formatProxies(proxies: any[], limit = 10): string {
    if (proxies.length === 0) {
        return '❌ No proxies found.';
    }

    const formatted = proxies.slice(0, limit).map((p, i) => {
        const flag = p.countryCode ? getFlagEmoji(p.countryCode) : '🌍';
        return `${i + 1}. \`${p.host}:${p.port}\`\n   ${flag} ${p.country || 'Unknown'} • ${p.protocol || 'http'}`;
    }).join('\n\n');

    const more = proxies.length > limit ? `\n\n_...and ${proxies.length - limit} more_` : '';
    return formatted + more;
}

/**
 * Get flag emoji from country code
 */
function getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

/**
 * Format validation statistics
 */
function formatStats(proxies: any[]): string {
    const total = proxies.length;
    const byProtocol = proxies.reduce((acc, p) => {
        const proto = p.protocol || 'unknown';
        acc[proto] = (acc[proto] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const byCountry = proxies.reduce((acc, p) => {
        const country = p.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topCountries = (Object.entries(byCountry) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, count]) => `  • ${country}: ${count}`)
        .join('\n');

    const protocols = Object.entries(byProtocol)
        .map(([proto, count]) => `  • ${proto.toUpperCase()}: ${count}`)
        .join('\n');

    return `📊 *Proxy Statistics*\n\n` +
        `*Total Proxies:* ${total}\n\n` +
        `*By Protocol:*\n${protocols}\n\n` +
        `*Top Countries:*\n${topCountries}`;
}

/**
 * Send notification to Slack
 */
async function notifySlack(message: string) {
    if (!SLACK_WEBHOOK_URL) return;

    try {
        await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: message,
                username: 'Nexus Scraper Bot',
                icon_emoji: ':robot_face:'
            })
        });
        console.log('✅ Slack notification sent');
    } catch (error) {
        console.error('❌ Failed to send Slack notification:', error);
    }
}


// Command: /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage =
        `🚀 *Welcome to Proxy Scraper Bot!*\n\n` +
        `I can help you access validated proxy servers.\n\n` +
        `*Available Commands:*\n` +
        `/proxies - Get latest validated proxies\n` +
        `/stats - View proxy statistics\n` +
        `/filter <country> - Filter by country\n` +
        `/export - Download full proxy list\n` +
        `/help - Show this message`;

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Command: /ping
bot.onText(/\/ping/, (msg) => {
    bot.sendMessage(msg.chat.id, '🏓 Pong! Bot is alive and connected to Vercel.');
});


// Command: /help
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        `*Available Commands:*\n\n` +
        `/proxies - Get latest validated proxies (top 10)\n` +
        `/stats - View detailed statistics\n` +
        `/filter <country> - Filter proxies by country name\n` +
        `/export - Download complete proxy list as file\n` +
        `/help - Show this help message`,
        { parse_mode: 'Markdown' }
    );
});

// Command: /proxies
bot.onText(/\/proxies/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, '⏳ Loading proxies...');

    const proxies = await loadProxies();
    const message = `🔥 *Latest Validated Proxies*\n\n${formatProxies(proxies, 10)}`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Command: /stats
bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;

    const proxies = await loadProxies();
    const stats = formatStats(proxies);

    bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
});

// Command: /filter <country>
bot.onText(/\/filter (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const country = match?.[1]?.trim();

    if (!country) {
        bot.sendMessage(chatId, '❌ Please specify a country name.\nExample: `/filter United States`',
            { parse_mode: 'Markdown' });
        return;
    }

    const proxies = await loadProxies();
    const filtered = proxies.filter(p =>
        p.country?.toLowerCase().includes(country.toLowerCase())
    );

    if (filtered.length === 0) {
        bot.sendMessage(chatId, `❌ No proxies found for "${country}"`);
        return;
    }

    const message = `🌍 *Proxies from ${country}*\n\n${formatProxies(filtered, 20)}`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Command: /export
bot.onText(/\/export/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, '📦 Preparing export...');

    const proxies = await loadProxies();
    const proxyList = proxies.map(p => `${p.host}:${p.port}`).join('\n');

    // Send as file
    bot.sendDocument(chatId, Buffer.from(proxyList), {
        caption: `📋 ${proxies.length} validated proxies`
    }, {
        filename: `proxies-${new Date().toISOString().split('T')[0]}.txt`,
        contentType: 'text/plain'
    });
});

// Command: /sync
bot.onText(/\/sync/, async (msg) => {
    const chatId = msg.chat.id;

    if (!MAC_HOOK_URL) {
        bot.sendMessage(chatId, '❌ *Sync Error:* `MAC_HOOK_URL` is not configured in Vercel.\n\nTo use this, expose your Mac using `ngrok` and add the URL to your Vercel Environment Variables.', { parse_mode: 'Markdown' });
        return;
    }

    await bot.sendMessage(chatId, '🔄 *Triggering Remote Scrape on Mac...*', { parse_mode: 'Markdown' });

    try {
        const res = await fetch(`${MAC_HOOK_URL}/trigger`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': MAC_HOOK_TOKEN
            }
        });

        if (res.ok) {
            bot.sendMessage(chatId, '✅ *Remote Trigger Accepted!*\nYour Mac is now scraping, validating, and pushing the results to GitHub. The bot will refresh automatically when done.', { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, `❌ *Trigger Failed:* Server returned ${res.status}`);
        }
    } catch (error) {
        bot.sendMessage(chatId, '❌ *Connection Error:* Could not reach your Mac. Is `ngrok` running?');
    }
});

// Error handling

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

// Start bot
console.log('🤖 Telegram bot started!');
console.log('Waiting for messages...');

// Load proxies on startup
loadProxies().then(proxies => {
    console.log(`✅ Loaded ${proxies.length} proxies from cache`);
});

// Refresh proxy cache every 5 minutes (for long-running processes)
if (!IS_VERCEL) {
    setInterval(async () => {
        const proxies = await loadProxies();
        console.log(`🔄 Refreshed proxy cache: ${proxies.length} proxies`);
    }, 5 * 60 * 1000);
}

// Vercel Serverless Function Support
import express from 'express';
const app = express();
app.use(express.json());

// Add CORS headers for the dashboard
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.post('/api/bot', (req, res) => {

    console.log('✉️ Received update from Telegram');
    bot.processUpdate(req.body);
    // Give the bot a moment to start processing before closing the connection
    setTimeout(() => res.sendStatus(200), 500);
});

// Dashboard API: Get all proxies
app.get('/api/proxies', async (req, res) => {
    const proxies = await loadProxies();
    res.json(proxies);
});

// Dashboard API: Get stats
app.get('/api/stats', (req, res) => {
    res.json(validationStats);
});

// Deployment/Automation Hook
app.post('/api/webhook/sync', async (req, res) => {
    console.log('🔄 Sync webhook triggered');
    const proxies = await loadProxies();

    // Notify Slack about the sync
    await notifySlack(`🔄 *System Sync Triggered*\nLoaded ${proxies.length} proxies to the bot.`);

    res.json({
        success: true,
        count: proxies.length,
        timestamp: new Date().toISOString()
    });
});




// For local testing of the express server if needed
const port = process.env.PORT || 3000;
if (!IS_VERCEL) {
    app.listen(port, () => {
        console.log(`🚀 Bot server listening on port ${port}`);
    });
}

export default app;
