# Telegram Bot for Proxy Scraper

A Telegram bot that provides access to validated proxy servers from the proxy scraper system.

## Features

- 🔥 Get latest validated proxies
- 📊 View proxy statistics
- 🌍 Filter proxies by country
- 📦 Export full proxy list
- ⚡ Real-time updates every 5 minutes

## Commands

- `/start` - Welcome message and command list
- `/proxies` - Get top 10 latest validated proxies
- `/stats` - View detailed proxy statistics
- `/filter <country>` - Filter proxies by country name
- `/export` - Download complete proxy list as text file
- `/help` - Show help message

## Setup

### 1. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the instructions
3. Copy the bot token you receive

### 2. Configure Environment

```bash
cd telegram-bot
cp .env.example .env
# Edit .env and add your bot token
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Bot

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:

```bash
npm i -g vercel
```

1. Deploy:

```bash
vercel
```

1. Add environment variable in Vercel dashboard:
   - `TELEGRAM_BOT_TOKEN` = your bot token

### Railway

1. Create account at [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variable: `TELEGRAM_BOT_TOKEN`
4. Deploy automatically

## Usage Example

```
User: /proxies
Bot: 🔥 Latest Validated Proxies

1. `192.168.1.1:8080`
   🇺🇸 United States • http

2. `10.0.0.1:3128`
   🇬🇧 United Kingdom • https

...and 98 more
```

## Architecture

```
Telegram Bot
     ↓
Load proxies from storage/proxy-results/results.json
     ↓
Format and send to user
```

## Auto-Refresh

The bot automatically refreshes its proxy cache every 5 minutes to ensure users always get the latest validated proxies.

## Error Handling

- Graceful handling of missing proxy files
- Automatic retry on polling errors
- User-friendly error messages

## License

MIT
