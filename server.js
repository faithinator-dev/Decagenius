require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Main Agent Orchestrator Endpoint
app.post('/api/agent', (req, res) => {
    const { agent, prompt } = req.body;

    // TODO: Implement the logic to delegate to the correct sub-agent
    // based on the 'agent' parameter and call the Gemini API.

    console.log(`Received request for agent: ${agent}`);
    console.log(`Prompt: ${prompt}`);

    // For now, send back a dummy response
    res.json({
        response: `This is a placeholder response from the '${agent}' agent. The prompt was: '${prompt}'`
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
