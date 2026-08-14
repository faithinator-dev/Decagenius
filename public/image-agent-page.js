document.addEventListener('DOMContentLoaded', () => {
    const agentContainer = document.querySelector('.agent-container');
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');

    const agentId = agentContainer.dataset.agentId;

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
        if (!prompt || !agentId) return;

        // Don't display the user's prompt as a message bubble
        promptInput.value = '';
        promptInput.focus();

        try {
            const formData = new FormData();
            formData.append('prompt', prompt);
            formData.append('agent', agentId);

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
            // Optionally display an error to the user in a more elegant way
        }
    }
    
    function displayMessage(data, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        if (data.imageUrl) {
            const promptText = document.createElement('p');
            promptText.textContent = data.prompt;
            promptText.classList.add('image-prompt');

            const imgElement = document.createElement('img');
            imgElement.src = data.imageUrl;
            imgElement.alt = data.prompt;
            imgElement.classList.add('generated-image');
            
            messageElement.appendChild(imgElement); // Image is the main content
            messageElement.appendChild(promptText); // Prompt is overlay text
        }

        // Prepend to show newest images first
        chatHistory.prepend(messageElement);
    }
});