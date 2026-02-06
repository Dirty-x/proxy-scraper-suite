# Telegram Bot - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Create Your Bot

1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Choose a name and username
5. **Copy the token** you receive

### 2. Configure

```bash
cd telegram-bot
cp .env.example .env
```

Edit `.env` and paste your token:

```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. Run

```bash
npm install
npm run dev
```

✅ **Done!** Open Telegram and send `/start` to your bot.

## 📱 Commands

- `/proxies` - Get latest proxies
- `/stats` - View statistics  
- `/filter USA` - Filter by country
- `/export` - Download all proxies

## 🌐 Deploy to Vercel (Free)

```bash
npm i -g vercel
vercel
```

Add your bot token in Vercel dashboard → Settings → Environment Variables

## 💡 Tips

- Bot auto-refreshes proxies every 5 minutes
- Export sends a `.txt` file with all proxies
- Filter works with partial country names
- Supports all countries with flag emojis 🌍

Enjoy your proxy bot! 🎉
