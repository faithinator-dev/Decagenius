document.addEventListener('DOMContentLoaded', async () => {
    const agentSelector = document.getElementById('agent-selector');
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');

    async function populateAgentSelector() {
        if (!agentSelector) return;
        try {
            const response = await fetch('/api/agents');
            if (!response.ok) throw new Error('Failed to fetch agents');
            const agents = await response.json();

            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = agent.name;
                agentSelector.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating agent selector:', error);
        }
    }

    // --- Event Listeners ---
    sendButton.addEventListener('click', sendMessage);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    populateAgentSelector();

    // --- Functions ---
    async function sendMessage() {
        const prompt = promptInput.value.trim();
        const selectedAgent = agentSelector.value;

        if (!prompt) return;

        displayMessage(prompt, 'user');
        promptInput.value = '';
        promptInput.focus();

        try {
            const formData = new FormData();
            formData.append('prompt', prompt);
            formData.append('agent', selectedAgent);

            const response = await fetch('/api/agent', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            displayMessage(data, 'agent');

        } catch (error) {
            console.error('Error fetching from API:', error);
            displayMessage(`Sorry, something went wrong: ${error.message}`, 'agent');
        }
    }

    function displayMessage(data, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        if (sender === 'user') {
            messageElement.textContent = data;
        } else if (typeof data === 'string') {
            messageElement.textContent = data;
        } else if (data.response) {
            messageElement.textContent = data.response;
        } else if (data.imageUrl) {
            // This page doesn't have the specific image styles from agent-page.css,
            // so we add some basic ones for functionality.
            const promptText = document.createElement('p');
            promptText.textContent = data.prompt;
            promptText.style.fontStyle = 'italic';
            promptText.style.fontSize = '0.9em';
            promptText.style.margin = '0 0 0.5rem 0';

            const imgElement = document.createElement('img');
            imgElement.src = data.imageUrl;
            imgElement.alt = data.prompt;
            imgElement.style.maxWidth = '100%';
            imgElement.style.borderRadius = '8px';
            
            messageElement.appendChild(promptText);
            messageElement.appendChild(imgElement);
        }

        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll to the latest message
    }
});