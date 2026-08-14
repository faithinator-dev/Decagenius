document.addEventListener('DOMContentLoaded', async () => {
    const carouselTrack = document.querySelector('.carousel-track');
    const featuredContainer = document.querySelector('.featured-agents-container');

    function createAgentCard(agent) {
        const cardLink = document.createElement('a');
        cardLink.href = `/agent/${agent.id}`;
        cardLink.classList.add('agent-card');

        cardLink.innerHTML = `
            <div class="agent-emoji">${agent.icon}</div>
            <div class="agent-name">${agent.name}</div>
        `;
        return cardLink;
    }

    function populateFeaturedAgents(agents) {
        if (!featuredContainer) return;

        // Feature the first 3 agents
        const featuredAgents = agents.slice(0, 3);

        featuredContainer.innerHTML = '';
        featuredAgents.forEach(agent => {
            const card = createAgentCard(agent);
            featuredContainer.appendChild(card);
        });
    }

    function populateCarousel(agents) {
        if (!carouselTrack) return;

        // Duplicate agents for seamless scrolling
        const allAgents = [...agents, ...agents];

        carouselTrack.innerHTML = ''; // Clear existing
        allAgents.forEach(agent => {
            const card = createAgentCard(agent);
            carouselTrack.appendChild(card);
        });
    }

    async function loadAgents() {
        try {
            const response = await fetch('/api/agents');
            if (!response.ok) throw new Error('Failed to fetch agents');
            const agents = await response.json();

            populateFeaturedAgents(agents);
            populateCarousel(agents);
        } catch (error) {
            console.error('Error loading agents:', error);
            if (featuredContainer) featuredContainer.innerHTML = '<p>Could not load featured agents.</p>';
            if (carouselTrack) carouselTrack.innerHTML = '<p>Could not load AI agents.</p>';
        }
    }

    loadAgents();
});
