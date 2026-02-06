const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const port = 8000;

// Security Token (Change this to something secure!)
const AUTH_TOKEN = "nexus_secret_trigger_2026";

app.use(express.json());

app.post('/trigger', (req, res) => {
    const token = req.headers['x-auth-token'];

    if (token !== AUTH_TOKEN) {
        console.warn('⚠️ Unauthorized trigger attempt');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('⚡ Trigger received! Starting sync process...');

    // Run the sync script in the background
    const scriptPath = path.join(__dirname, 'sync.sh');

    exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Sync Error: ${error.message}`);
            return;
        }
        console.log('✅ Sync process completed successfully');
    });

    res.json({
        message: 'Sync started successfully in background',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`📡 Nexus Automation Hook listening at http://localhost:${port}`);
    console.log(`🔗 Token required: ${AUTH_TOKEN}`);
    console.log(`👉 Use ngrok to expose this to the internet: ngrok http ${port}`);
});
