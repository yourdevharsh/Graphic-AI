document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        form: document.querySelector('#promptForm'),
        input: document.querySelector('#userPrompt'),
        btn: document.querySelector('#submitBtn'),
        output: document.querySelector('#outputArea'),
        placeholder: document.querySelector('#placeholderText'),
        loading: document.querySelector('#loadingState'),
        videoContainer: document.querySelector('#videoContainer'),
        video: document.querySelector('#mainVideo'),
        download: document.querySelector('#downloadBtn')
    };

    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = elements.input.value.trim();

        if (!prompt) return alert("Please enter a prompt.");

        // UI State: Loading
        elements.btn.disabled = true;
        elements.placeholder.classList.add('hidden');
        elements.videoContainer.classList.add('hidden');
        elements.loading.classList.remove('hidden');

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Server error");

            // Success: Show Video
            elements.video.src = data.videoUrl;
            elements.download.onclick = () => {
                const a = document.createElement('a');
                a.href = data.videoUrl;
                a.download = 'graphion-animation.mp4';
                a.click();
            };

            elements.loading.classList.add('hidden');
            elements.videoContainer.classList.remove('hidden');

        } catch (err) {
            console.error(err);
            elements.placeholder.innerHTML = `<span class="error">Error: ${err.message}</span>`;
            elements.placeholder.classList.remove('hidden');
            elements.loading.classList.add('hidden');
        } finally {
            elements.btn.disabled = false;
        }
    });
});
