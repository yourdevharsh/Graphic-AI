document.addEventListener('DOMContentLoaded', () => {
    const promptForm = document.querySelector('#promptForm');
    const userPromptTextarea = document.querySelector('#userPrompt');
    const submitButton = promptForm.querySelector('button[type="submit"]');
    const outputArea = document.querySelector('#outputArea');

    promptForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const prompt = userPromptTextarea.value.trim();

        if (prompt) {
            outputArea.textContent = 'Generating video, this may take a moment...';
            outputArea.className = 'output-container loading-message';
            submitButton.disabled = true;
            outputArea.innerHTML = '<p>Generating video, this may take a moment...</p>';


            fetch('/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errData => {
                            throw new Error(errData.error || `Server error: ${response.status}`);
                        }).catch(() => {
                            throw new Error(`Server error: ${response.status} ${response.statusText}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.videoUrl) {
                        outputArea.innerHTML = '';
                        outputArea.className = 'output-container';

                        const videoPlayer = document.createElement('video');
                        videoPlayer.src = data.videoUrl + '?t=' + new Date().getTime();
                        videoPlayer.controls = true;
                        videoPlayer.autoplay = true;
                        videoPlayer.muted = true;
                        videoPlayer.setAttribute('playsinline', '');

                        const downloadLink = document.createElement('a');
                        downloadLink.href = data.videoUrl;
                        downloadLink.textContent = 'Download Video (MP4)';
                        downloadLink.className = 'download-button';

                        downloadLink.setAttribute('download', 'generated-by-graphion-ai.mp4');

                        outputArea.appendChild(videoPlayer);
                        outputArea.appendChild(downloadLink);

                    } else {
                        throw new Error('Invalid response from server. Expected a video URL.');
                    }
                })
                .catch(error => {
                    console.error('Fetch Error:', error);
                    outputArea.textContent = `Error: ${error.message}`;
                    outputArea.className = 'output-container error';
                })
                .finally(() => {
                    submitButton.disabled = false;
                });
        } else {
            outputArea.textContent = 'Please enter a prompt to generate a video.';
            outputArea.className = 'output-container error';
        }
    });
});