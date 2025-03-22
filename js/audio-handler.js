class AudioHandler {
    constructor(chatService) {
        this.chatService = chatService;
        this.audioHistory = [];
        this.currentHistoryItem = null; // Track the most recent history item
        this.whatsAppFormats = [
            '.opus', '.ogg', 'audio/ogg', 'audio/opus', 'audio/ogg; codecs=opus',
            // Add iOS WhatsApp formats - they use m4a on iOS
            'whatsapp_audio.m4a', '.m4a'
        ];
        this.setupComplete = false;
        // Get current language
        this.language = localStorage.getItem('echolife_language') || 'en-US';
        
        // Wait for DOM to be fully loaded before setting up
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
        
        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            this.language = e.detail.language;
            if (this.setupComplete) {
                this.updateDropAreaText();
            }
        });
    }

    setupEventListeners() {
        console.log('Setting up audio handler event listeners...');
        
        // Create file input for background handling
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.id = 'audio-file-input';
        this.fileInput.accept = 'audio/*,.opus,.ogg,.m4a,.mp3,.wav,.aac';
        this.fileInput.style.display = 'none';
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        document.body.appendChild(this.fileInput);
        
        // Create drop area container
        this.dropArea = this.createDropArea();
        
        // Add drop area to the DOM
        const placeholder = document.getElementById('audio-upload-placeholder');
        if (placeholder) {
            placeholder.appendChild(this.dropArea);
        } else {
            console.error('Upload placeholder not found!');
        }
        
        // Load audio history
        this.loadAudioHistory();
        
        this.setupComplete = true;
        console.log('Audio handler setup complete');
    }

    createDropArea() {
        console.log('Creating drop area');
        // Create drop area container
        const dropArea = document.createElement('div');
        dropArea.id = 'audio-drop-area';
        dropArea.className = 'audio-drop-area';
        
        // Create content for drop area with improved messaging
        dropArea.innerHTML = this.getDropAreaHTML();
        
        // Processing indicator (initially hidden)
        const processingIndicator = document.createElement('div');
        processingIndicator.id = 'audio-processing-indicator';
        processingIndicator.className = 'processing-indicator';
        processingIndicator.innerHTML = `
            <div class="processing-animation">
                <div class="processing-spinner"></div>
            </div>
            <div class="processing-text">${getTranslation('processing', this.language)}</div>
        `;
        processingIndicator.style.display = 'none';
        
        dropArea.appendChild(processingIndicator);
        this.processingIndicator = processingIndicator;
        
        // Setup click event to trigger file selection
        dropArea.addEventListener('click', () => {
            if (!this.isProcessing) {
                this.fileInput.click();
            }
        });
        
        // Setup drag and drop events
        this.setupDragAndDropEvents(dropArea);
        
        return dropArea;
    }
    
    getDropAreaHTML() {
        return `
            <div class="drop-icon">
                <i class="fas fa-microphone"></i>
            </div>
            <div class="drop-text">
                <p>${getTranslation('drop_audio', this.language)}</p>
                <p>${getTranslation('or', this.language)}</p>
                <p>${getTranslation('click_to_select', this.language)}</p>
                <p class="supported-formats">${getTranslation('supported_formats', this.language)}</p>
            </div>
        `;
    }
    
    updateDropAreaText() {
        if (this.dropArea) {
            const dropText = this.dropArea.querySelector('.drop-text');
            if (dropText) {
                dropText.innerHTML = `
                    <p>${getTranslation('drop_audio', this.language)}</p>
                    <p>${getTranslation('or', this.language)}</p>
                    <p>${getTranslation('click_to_select', this.language)}</p>
                    <p class="supported-formats">${getTranslation('supported_formats', this.language)}</p>
                `;
            }
            
            // Update processing text
            if (this.processingIndicator) {
                const processingText = this.processingIndicator.querySelector('.processing-text');
                if (processingText) {
                    processingText.textContent = getTranslation('processing', this.language);
                }
            }
        }
        
        // Update any error or status messages
        // Fix: Change updateHistoryUI to updateAudioHistoryUI
        this.updateAudioHistoryUI();
    }
    
    setupDragAndDropEvents(dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                if (!this.isProcessing) {
                    dropArea.classList.add('highlight');
                }
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('highlight');
            }, false);
        });
        
        dropArea.addEventListener('drop', (e) => {
            if (this.isProcessing) return;
            
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0 && files[0].type.startsWith('audio/')) {
                this.processAudioFile(files[0], false);
            } else {
                this.showError('Please select an audio file.');
            }
        }, false);
    }

    async processAudioFile(file, isWhatsApp = null) {
        try {
            console.log(`Processing audio file: ${file.name}, size: ${file.size}, type: ${file.type}`);
            
            // Auto-detect WhatsApp format if not specified
            if (isWhatsApp === null) {
                // Check file extension and MIME type to detect WhatsApp formats
                const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                isWhatsApp = this.whatsAppFormats.includes(fileExt) || 
                            this.whatsAppFormats.includes(file.type) ||
                            file.name.includes('PTT-') || // WhatsApp uses PTT- prefix for voice messages
                            file.name.includes('WhatsApp Audio') ||
                            // iOS WhatsApp uses AUD followed by timestamp
                            file.name.match(/AUD-\d+/i) !== null;
                
                if (isWhatsApp) {
                    console.log('Detected WhatsApp voice message format');
                }
            }
            
            // Show processing state
            this.showProcessingState(true);
            
            // Get the transcription - now with auto-detection of WhatsApp format
            const transcription = await this.chatService.importAudio(file, isWhatsApp);
            console.log("Transcription received:", transcription);
            
            // Extract tags from user input using tag extractor directly
            try {
                const tags = await tagExtractor.extractTags(transcription, 8, true);
                
                // Update word cloud with tags instead of using traditional tag display
                if (window.wordCloud) {
                    window.wordCloud.updateWordCloud(tags);
                }
            } catch (e) {
                console.error('Error extracting tags:', e);
            }
            
            // Add transcription to chat as user message
            this.addTranscriptionToChat(transcription);
            
            // Add to history without AI response yet
            this.addRecordingToHistory(file, transcription);
            
            // Enable the feedback button for this upload
            const feedbackButton = document.getElementById('feedbackButton');
            if (feedbackButton) {
                feedbackButton.disabled = false;
            }
            
            console.log('Audio processing complete');
        } catch (error) {
            console.error('Error processing audio:', error);
            this.showError(error.message);
        } finally {
            this.showProcessingState(false);
            // Reset the file input to allow selecting the same file again
            this.fileInput.value = '';
        }
    }
    
    showProcessingState(isProcessing) {
        this.isProcessing = isProcessing;
        
        if (isProcessing) {
            // Hide drop area content and show processing indicator
            const dropIcon = this.dropArea.querySelector('.drop-icon');
            const dropText = this.dropArea.querySelector('.drop-text');
            
            if (dropIcon) dropIcon.style.display = 'none';
            if (dropText) dropText.style.display = 'none';
            
            this.processingIndicator.style.display = 'flex';
            this.dropArea.classList.add('processing');
        } else {
            // Show drop area content and hide processing indicator
            const dropIcon = this.dropArea.querySelector('.drop-icon');
            const dropText = this.dropArea.querySelector('.drop-text');
            
            if (dropIcon) dropIcon.style.display = 'block';
            if (dropText) dropText.style.display = 'block';
            
            this.processingIndicator.style.display = 'none';
            this.dropArea.classList.remove('processing');
        }
    }
    
    addTranscriptionToChat(text) {
        // Clean up the transcribed text (remove "Transcribed audio: " prefix if present)
        const cleanText = text.replace(/^Transcribed audio:\s*/i, '');
        
        // Add transcription to chat as user message - use the global function if available
        if (window.addMessageToChat) {
            window.addMessageToChat('user', cleanText);
        } else {
            // Fallback to direct DOM manipulation
            const chatContainer = document.querySelector('#chatContainer');
            if (chatContainer) {
                const messageElement = document.createElement('div');
                messageElement.className = 'message user-message';
                messageElement.textContent = cleanText;
                chatContainer.appendChild(messageElement);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                console.error("Chat container not found in the DOM");
            }
        }
    }

    handleFileSelection(event) {
        console.log('File selected via input');
        if (!event.target.files || event.target.files.length === 0) {
            console.log('No file selected');
            return;
        }
        
        const file = event.target.files[0];
        console.log(`Processing file: ${file.name}, type: ${file.type}`);
        
        // Process the audio file with auto-detection
        this.processAudioFile(file);
    }
    
    showError(message) {
        // Show error message in UI with proper translation
        const errorPrefix = this.language === 'pt-BR' ? 'Erro: ' : 'Error: ';
        alert(errorPrefix + message);
    }

    updateChatUI(response) {
        // This method updates the chat UI with the AI response
        console.log('AI response:', response);
        
        // Use the global function if available
        if (window.addMessageToChat) {
            window.addMessageToChat('assistant', response);
        } else {
            // Fallback to direct DOM manipulation
            const chatContainer = document.querySelector('#chatContainer');
            if (chatContainer) {
                const messageElement = document.createElement('div');
                messageElement.className = 'message ai-message';
                messageElement.textContent = response;
                chatContainer.appendChild(messageElement);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
    }

    // Add method to handle audio history
    addToAudioHistory(audioFile, response) {
        // Create a history entry with file info and timestamp
        const historyEntry = {
            file: audioFile,
            filename: audioFile.name,
            type: audioFile.type,
            size: audioFile.size,
            timestamp: new Date(),
            response: response
        };
        
        // Add to history array (keep most recent 10 entries)
        this.audioHistory.unshift(historyEntry);
        if (this.audioHistory.length > 10) {
            this.audioHistory.pop();
        }
        
        // Update history UI
        this.updateAudioHistoryUI();
        
        // Save history to local storage
        this.saveAudioHistory();
    }
    
    // New method to add recording to history without AI response yet
    addRecordingToHistory(audioFile, transcript) {
        // Create a history entry with file info and timestamp
        const historyEntry = {
            file: audioFile,
            filename: audioFile.name,
            type: audioFile.type,
            size: audioFile.size,
            timestamp: new Date(),
            transcript: transcript,
            response: null // No response yet
        };
        
        // Keep track of current history item
        this.currentHistoryItem = historyEntry;
        
        // Add to history array (keep most recent 10 entries)
        this.audioHistory.unshift(historyEntry);
        if (this.audioHistory.length > 10) {
            this.audioHistory.pop();
        }
        
        // Update history UI
        this.updateAudioHistoryUI();
        
        // Save history to local storage
        this.saveAudioHistory();
    }
    
    // Update the current history item with AI response
    updateCurrentHistoryWithResponse(response) {
        if (this.currentHistoryItem) {
            this.currentHistoryItem.response = response;
            
            // Update the history list
            this.updateAudioHistoryUI();
            
            // Save updated history to local storage
            this.saveAudioHistory();
        }
    }
    
    saveAudioHistory() {
        // Save minimal info to local storage (filenames, timestamps, transcripts, responses)
        const minimalHistory = this.audioHistory.map(entry => ({
            filename: entry.filename,
            timestamp: entry.timestamp,
            transcript: entry.transcript ? entry.transcript.substring(0, 100) + '...' : null,
            response: entry.response ? entry.response.substring(0, 50) + '...' : null
        }));
        
        try {
            localStorage.setItem('audioHistory', JSON.stringify(minimalHistory));
        } catch (e) {
            console.error('Error saving audio history to local storage:', e);
        }
    }
    
    loadAudioHistory() {
        try {
            const savedHistory = localStorage.getItem('audioHistory');
            if (savedHistory) {
                const parsedHistory = JSON.parse(savedHistory);
                // Convert saved data to displayed history
                this.audioHistory = parsedHistory.map(item => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
                this.updateAudioHistoryUI();
            }
        } catch (e) {
            console.error('Error loading audio history from local storage:', e);
        }
    }
    
    updateAudioHistoryUI() {
        const historyContainer = document.getElementById('audioHistoryContainer');
        if (!historyContainer) return;
        
        // Clear current content
        historyContainer.innerHTML = '';
        
        if (this.audioHistory.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-history-message';
            emptyMessage.textContent = getTranslation('history_appear', this.language);
            historyContainer.appendChild(emptyMessage);
            return;
        }
        
        // Add each history item
        this.audioHistory.forEach((entry, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'audio-history-item';
            
            // Format timestamp
            const timestamp = entry.timestamp.toLocaleString(
                this.language === 'pt-BR' ? 'pt-BR' : 'en-US'
            );
            
            // Show different icon if no response yet
            const iconClass = entry.response ? 'fa-file-audio' : 'fa-microphone';
            const responseStatus = entry.response ? '' : 
                `<span class="no-response-badge">${getTranslation('no_response_yet', this.language)}</span>`;
            
            historyItem.innerHTML = `
                <div class="history-item-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="history-item-details">
                    <div class="history-item-filename">${entry.filename}${responseStatus}</div>
                    <div class="history-item-timestamp">${timestamp}</div>
                </div>
            `;
            
            // Add click listener to show the transcript and response (if available)
            historyItem.addEventListener('click', () => {
                this.showHistoryItemDetails(entry, index);
            });
            
            historyContainer.appendChild(historyItem);
        });
    }
    
    showHistoryItemDetails(entry, index) {
        const chatContainer = document.getElementById('chatContainer');
        const feedbackButton = document.getElementById('feedbackButton');
        
        if (chatContainer) {
            // Clear existing messages
            chatContainer.innerHTML = '';
            
            // Add the transcript as user message and update word cloud with extracted tags
            if (entry.transcript && window.addMessageToChat) {
                window.addMessageToChat('user', entry.transcript);
                // Extract tags from the transcript and update the word cloud
                try {
                    tagExtractor.extractTags(entry.transcript, 8, true)
                        .then(tags => {
                            if (window.wordCloud) {
                                window.wordCloud.updateWordCloud(tags);
                            }
                        })
                        .catch(e => console.error('Error displaying tags for history item:', e));
                } catch (e) {
                    console.error('Error displaying tags for history item:', e);
                }
                
                // Store transcript for potential AI feedback
                if (!entry.response) {
                    this.currentHistoryItem = entry;
                    if (feedbackButton) {
                        feedbackButton.disabled = false;
                    }
                }
            }
            
            // Add AI response if available and update word cloud with AI tags
            if (entry.response && window.addMessageToChat) {
                window.addMessageToChat('assistant', entry.response);
                try {
                    tagExtractor.extractTags(entry.response, 8, false)
                        .then(tags => {
                            if (window.wordCloud) {
                                window.wordCloud.updateWordCloud(tags);
                            }
                        })
                        .catch(e => console.error('Error displaying AI tags for history item:', e));
                } catch (e) {
                    console.error('Error displaying AI tags for history item:', e);
                }
                if (feedbackButton) {
                    feedbackButton.disabled = true;
                }
            }
            
            // Scroll to the bottom of the chat
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
}

// Initialize the audio handler when the page loads
let audioHandler;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing AudioHandler');
    audioHandler = new AudioHandler(chatService);
    
    // Listen for language changes
    document.getElementById('languageSelector')?.addEventListener('change', (e) => {
        audioHandler.language = e.target.value;
        audioHandler.updateDropAreaText();
    });
});
