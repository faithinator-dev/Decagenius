document.addEventListener('DOMContentLoaded', () => {
    const agentSelector = document.getElementById('agent-selector');
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');

    // Full list of 30 agents
    const agents = [
        // Top 10
        "CV & Web Builder", "File & Link Story Reader", "Market Price Scanner",
        "CV Roast + LinkedIn", "Fake News Buster", "Mental Health Buddy",
        "AI Image Studio", "Code Debugger", "Language Tutor", "Expense Tracker",
        // Additional 20
        "Travel Planner", "Recipe Chef", "Workout Coach", "Legal Explainer",
        "SQL Optimizer", "Email Drafter", "Study Quizzer", "Gift Matcher",
        "Dream Interpreter", "Plant Doctor", "Negotiation Coach", "Horoscope & Mindset",
        "Movie Matcher", "Slang Translator", "Joke Smith", "Debate Partner",
        "Time Zone Buddy", "Habit Tracker", "Alias Generator", "Local Guide"
    ];

    // Populate the agent selector dropdown
    agents.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
        option.textContent = agent;
        agentSelector.appendChild(option);
    });

    // --- Event Listeners ---
    sendButton.addEventListener('click', sendMessage);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- Functions ---
    async function sendMessage() {
        const prompt = promptInput.value.trim();
        const selectedAgent = agentSelector.value;

        if (!prompt) return;

        displayMessage(prompt, 'user');
        promptInput.value = '';
        promptInput.focus();

        try {
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agent: selectedAgent,
                    prompt: prompt,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            displayMessage(data.response, 'agent');

        } catch (error) {
            console.error('Error fetching from API:', error);
            displayMessage('Sorry, something went wrong. Please check the console for details.', 'agent');
        }
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = message;
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll to the latest message
    }
});
