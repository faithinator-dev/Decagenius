document.addEventListener('DOMContentLoaded', async () => {
    const agentNameEl = document.getElementById('agent-name');
    const agentEmojiEl = document.getElementById('agent-emoji');
    const agentDescriptionEl = document.getElementById('agent-description');
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');

    let agentId = null;
    let attachedFile = null;

    // --- Initialization ---
    async function initializeAgentPage() {
        const pathParts = window.location.pathname.split('/');
        agentId = pathParts[pathParts.length - 1];

        if (!agentId) {
            agentNameEl.textContent = 'Agent Not Found';
            return;
        }

        try {
            const response = await fetch(`/api/agents/${agentId}`);
            if (!response.ok) throw new Error('Agent not found');
            const agent = await response.json();

            // Populate agent details
            document.title = `${agent.name} - Decagenius`;
            agentNameEl.textContent = agent.name;
            agentEmojiEl.innerHTML = agent.icon;
            agentDescriptionEl.textContent = agent.description;

            // Conditionally show the file upload UI
            if (agent.fileUpload) {
                fileUploadArea.style.display = 'flex';
            }

            // Display a welcome message
            displayMessage(`You are now chatting with ${agent.name}. ${agent.description}`, 'agent');

        } catch (error) {
            console.error('Error initializing agent page:', error);
            agentNameEl.textContent = 'Error Loading Agent';
            displayMessage('Could not load agent details. Please try again later.', 'agent');
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

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            attachedFile = fileInput.files[0];
            showFilePreview(attachedFile.name);
        }
    });

    function showFilePreview(fileName) {
        filePreview.innerHTML = `
            <div class="file-preview-name">
                <span>${fileName}</span>
                <button id="remove-file-btn" class="file-preview-remove" title="Remove file">&times;</button>
            </div>
        `;
        filePreview.style.display = 'flex';

        document.getElementById('remove-file-btn').addEventListener('click', () => {
            attachedFile = null;
            fileInput.value = ''; // Clear the input
            filePreview.style.display = 'none';
            filePreview.innerHTML = '';
        });
    }

    // --- Functions ---
    async function sendMessage() {
        const prompt = promptInput.value.trim();
        if ((!prompt && !attachedFile) || !agentId) return;

        if (prompt) {
            displayMessage(prompt, 'user');
        }
        if (attachedFile) {
            // Add a visual indicator in the chat that a file was sent
            const fileMessage = document.createElement('div');
            fileMessage.classList.add('message', 'user-message', 'file-info');
            fileMessage.textContent = `Attached: ${attachedFile.name}`;
            chatHistory.appendChild(fileMessage);
        }

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('agent', agentId);
        if (attachedFile) {
            formData.append('file', attachedFile);
        }

        // Clear inputs after preparing the data
        promptInput.value = '';
        attachedFile = null;
        fileInput.value = '';
        filePreview.style.display = 'none';
        promptInput.focus();
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const response = await fetch('/api/agent', {
                method: 'POST',
                body: formData, // Browser will set Content-Type to multipart/form-data
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
            // For simple string messages like the initial welcome.
            messageElement.textContent = data;
        } else if (data.response) {
            // For standard text responses from the API.
            messageElement.textContent = data.response;
        } else if (data.imageUrl) {
            // For image responses from the AI Image Studio.
            const promptText = document.createElement('p');
            promptText.textContent = data.prompt;
            promptText.classList.add('image-prompt');

            const imgElement = document.createElement('img');
            imgElement.src = data.imageUrl;
            imgElement.alt = data.prompt;
            imgElement.classList.add('generated-image');
            
            messageElement.appendChild(promptText);
            messageElement.appendChild(imgElement);
        }

        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    initializeAgentPage();
});