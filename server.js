require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const pdf = require('pdf-parse');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Gemini API Initialization ---
if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL: GEMINI_API_KEY is not set in the environment variables. The function cannot start.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Multer setup for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB file size limit

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Agent Data (Single Source of Truth) ---
// Helper to create URL-friendly IDs
const toAgentId = (name) => name.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-').replace(/\+/g, '');

const agents = [
    { name: "CV & Web Builder", fileUpload: true, icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>', description: "Crafts professional resumes and builds simple web pages. Upload your CV as a PDF or TXT file." },
    { name: "File & Link Story Reader", fileUpload: true, icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>', description: "Summarizes content from files and web links. Upload a PDF or TXT file to get started." },
    { name: "Market Price Scanner", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="4"></line><polyline points="6 14 12 8 18 14"></polyline></svg>', description: "Scans and reports market prices for specified items." },
    { name: "CV Roast + LinkedIn", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>', description: "Provides constructive (and humorous) criticism on your CV and LinkedIn profile." },
    { name: "Fake News Buster", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>', description: "Analyzes articles and sources to detect potential fake news." },
    { name: "Mental Health Buddy", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>', description: "A supportive companion for mental wellness conversations." },
    { name: "AI Image Studio", type: 'image', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>', description: "Generates images from textual descriptions." },
    { name: "Code Debugger", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>', description: "Helps identify and fix bugs in your code snippets." },
    { name: "Language Tutor", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"></polyline></svg>', description: "Assists in learning new languages with practice and corrections." },
    { name: "Expense Tracker", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', description: "Tracks and categorizes your daily expenses." },
    { name: "Travel Planner", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>', description: "Organizes your travel itineraries, from flights to hotels." },
    { name: "Recipe Chef", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>', description: "Finds and adjusts recipes based on your ingredients and preferences." },
    { name: "Workout Coach", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>', description: "Creates personalized workout plans and tracks your progress." },
    { name: "Legal Explainer", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>', description: "Simplifies complex legal jargon and concepts." },
    { name: "SQL Optimizer", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>', description: "Analyzes and suggests improvements for your SQL queries." },
    { name: "Email Drafter", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>', description: "Helps you write professional and effective emails for any situation." },
    { name: "Study Quizzer", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>', description: "Generates quizzes on any subject to help you study." },
    { name: "Gift Matcher", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>', description: "Finds the perfect gift based on a person's interests and your budget." },
    { name: "Dream Interpreter", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>', description: "Offers possible interpretations of your dreams." },
    { name: "Plant Doctor", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>', description: "Helps diagnose and treat problems with your house plants." },
    { name: "Negotiation Coach", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>', description: "Provides tips and strategies for your upcoming negotiations." },
    { name: "Horoscope & Mindset", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>', description: "Shares daily horoscopes and positive mindset affirmations." },
    { name: "Movie Matcher", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>', description: "Recommends movies and TV shows based on your taste." },
    { name: "Slang Translator", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>', description: "Translates modern slang into plain English." },
    { name: "Joke Smith", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>', description: "Writes and tells jokes on any topic you choose." },
    { name: "Debate Partner", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>', description: "Engages in a structured debate with you on any topic." },
    { name: "Time Zone Buddy", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>', description: "Helps you coordinate across different time zones." },
    { name: "Habit Tracker", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>', description: "Monitors your daily habits and encourages consistency." },
    { name: "Alias Generator", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg>', description: "Creates unique aliases and usernames for you." },
    { name: "Local Guide", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>', description: "Provides recommendations for restaurants, attractions, and events in your area." }
].map(agent => ({ ...agent, id: toAgentId(agent.name) }));

const agentsById = agents.reduce((acc, agent) => {
    acc[agent.id] = agent;
    return acc;
}, {});

// In-memory store for chat histories.
// NOTE: This is a simple implementation for demonstration. In a production app,
// you would use a database and manage histories on a per-user/per-session basis.
const chatHistories = {};

// --- API Routes ---
app.get('/api/agents', (req, res) => {
    res.json(agents);
});

app.get('/api/agents/:agentId', (req, res) => {
    const agent = agentsById[req.params.agentId];
    if (agent) {
        res.json(agent);
    } else {
        res.status(404).json({ error: 'Agent not found' });
    }
});

// --- Page Routes ---
// Route for the main application chat page
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Route for a specific agent's page
app.get('/agent/:agentId', (req, res) => {
    // Check if agent exists before sending the file
    if (agentsById[req.params.agentId]) {
        res.sendFile(path.join(__dirname, 'public', 'agent-page.html'));
    } else {
        // Optional: redirect to a 404 page or homepage
        res.status(404).redirect('/');
    }
});

// Main Agent Orchestrator Endpoint
app.post('/api/agent', upload.single('file'), async (req, res) => {
    const { agent: agentId, prompt } = req.body;
    const uploadedFile = req.file;

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server is not configured with a Gemini API key.' });
    }

    if (!agentId || (!prompt && !uploadedFile)) {
        return res.status(400).json({ error: 'An agent ID is required, and either a prompt or a file must be provided.' });
    }
    const agent = agentsById[agentId];
    if (!agent) {
        return res.status(404).json({ error: 'Agent not found.' });
    }

    let fullPrompt = prompt;

    // --- Link & File Content Extraction ---
    // Regex to find URLs in the prompt
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = prompt.match(urlRegex);

    // Prioritize reading a URL if the correct agent is used and a URL is found
    if (agent.id === 'file-link-story-reader' && urls && urls.length > 0) {
        try {
            const url = urls[0]; // Process the first URL found
            const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = response.data;
            const $ = cheerio.load(html);
            $('script, style, nav, footer, header').remove(); // Remove common irrelevant tags
            const webContent = $('body').text().replace(/\s\s+/g, ' ').trim();

            if (webContent) {
                fullPrompt = `The user has provided a link: ${url}. Here is the text content from that page:\n\n--- WEB CONTENT START ---\n${webContent}\n--- WEB CONTENT END ---\n\nNow, please respond to the following user prompt based on the web page content:\n\n${prompt.replace(urlRegex, '').trim()}`;
            }
        } catch (webError) {
            console.error("Error fetching URL content:", webError);
            fullPrompt = `[There was an error trying to read content from the link: ${urls[0]}. Please inform the user about the error.]\n\n${prompt}`;
        }
    } else if (uploadedFile) { // Otherwise, check for a file upload
        try {
            let fileContent = '';
            if (uploadedFile.mimetype === 'application/pdf') {
                const data = await pdf(uploadedFile.buffer);
                fileContent = data.text;
            } else if (uploadedFile.mimetype.startsWith('text/')) {
                fileContent = uploadedFile.buffer.toString('utf-8');
            }

            if (fileContent && fileContent.trim()) {
                const filePrompt = `The user has uploaded a file named "${uploadedFile.originalname}". Here is its content:\n\n--- FILE CONTENT START ---\n${fileContent}\n--- FILE CONTENT END ---`;
                fullPrompt = prompt ? `${filePrompt}\n\nNow, please respond to the following user prompt based on the file content:\n\n${prompt}` : filePrompt;
            } else if (!prompt) {
                // This case is hit if the file is empty/unsupported AND there's no text prompt.
                fullPrompt = `[User tried to upload a file: ${uploadedFile.originalname} of type ${uploadedFile.mimetype}, but no text content could be extracted. Inform the user that you can only process text and PDF files, or that the file was empty.]`;
            }
        } catch (fileError) {
            console.error("Error processing file:", fileError);
            fullPrompt = `[There was an error processing the uploaded file named "${uploadedFile.originalname}". Please inform the user about the error.]\n\n${prompt}`;
        }
    }

    try {
        // Initialize history for the agent if it's the first time.
        let responseContent;

        // This "primes" the model with its persona behind the scenes.
        if (!chatHistories[agentId]) {
            chatHistories[agentId] = [
                {
                    role: 'user',
                    parts: [{ text: `Your persona is '${agent.name}'. Your defined role is: "${agent.description}". You must strictly and exclusively act as this persona. Do not reveal you are an AI model.` }],
                },
                {
                    role: 'model',
                    parts: [{ text: `Okay, I understand. I will act as the ${agent.name}.` }],
                }
            ];
        }

        if (agent.type === 'image') {
            // This is a placeholder for a real image generation API call.
            console.log(`Image generation prompt: "${fullPrompt}"`);
            // Using a placeholder service that generates an image based on the prompt text.
            const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/512/512`;

            responseContent = { imageUrl: imageUrl, prompt: prompt };
            // We don't add image prompts to the text-based chat history for now.

        } else {
            const chat = model.startChat({
                history: chatHistories[agentId],
                generationConfig: { maxOutputTokens: 1500 },
            });

            const result = await chat.sendMessage(fullPrompt);
            const responseText = result.response.text();

            // Update the history on the server (localhost in-memory)
            chatHistories[agentId].push({ role: 'user', parts: [{ text: fullPrompt }] });
            chatHistories[agentId].push({ role: 'model', parts: [{ text: responseText }] });

            responseContent = { response: responseText };
        }

        res.json(responseContent);

    } catch (error) {
        console.error('Error with AI API:', error);
        res.status(500).json({ error: 'Failed to get a response from the AI agent.' });
    }
});


// Export the app for serverless environments like Vercel
module.exports = app;
