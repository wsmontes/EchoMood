/**
 * VisualizationController
 * 
 * Handles communication with LLM to generate dynamic visualization parameters
 * based on speech content and emotional context.
 */
class VisualizationController {
    constructor(visualizationInstance) {
        this.visualization = visualizationInstance;
        this.apiKey = null;
        this.contextHistory = [];
        this.maxHistoryLength = 3;
        this.lastUpdateTimestamp = 0;
        this.updateCooldown = 2000; // Minimum ms between LLM calls
        this.pendingUpdate = null;
        this.isProcessing = false;
        
        // Initialize with default parameters
        this.currentParameters = {
            colorPalette: 'neutral',
            energyLevel: 0.5,
            complexity: 0.5,
            emotionalTone: 'neutral',
            flowSpeed: 0.5,
            particleSize: 2.5,
            particleDensity: 0.5,
            turbulence: 0.1,
            layerBlending: 0.5,
            visualMetaphors: []
        };
        
        // LLM prompt templates
        this.promptTemplates = {
            initialAnalysis: `Analyze the emotional content, themes, and mood of this text. 
                             Respond with a JSON object that contains visualization parameters including:
                             - colorPalette: a descriptive name for the appropriate color palette
                             - dominantColors: array of 3-5 hex color codes that represent the emotional tone
                             - energyLevel: number from 0-1 representing energy/intensity
                             - complexity: number from 0-1 representing visual complexity
                             - emotionalTone: primary emotional quality (e.g., "serene", "anxious", "joyful")
                             - secondaryEmotions: array of 0-3 secondary emotional qualities
                             - flowSpeed: number from 0-1 representing how fast elements should move
                             - particleSize: number from 1-5 representing relative size of elements
                             - particleDensity: number from 0-1 representing how densely packed elements should be
                             - turbulence: number from 0-1 representing how chaotic the movement should be
                             - visualMetaphors: array of 1-3 nature-inspired visual metaphors that match the content
                             - transitionGuidance: brief description of how to transition from previous state
                             
                             TEXT: `,
            
            updateGuidance: `Based on this new text and the current visualization state, how should the visualization evolve?
                            Current state:
                            - Color palette: {{currentPalette}}
                            - Energy level: {{currentEnergy}}
                            - Emotional tone: {{currentTone}}
                            - Visual metaphors: {{currentMetaphors}}
                            
                            Respond with a JSON object containing updated visualization parameters and specific guidance
                            on how to transition smoothly from the current state. Include:
                            - colorShift: how colors should change (subtle or dramatic shift, which colors to emphasize)
                            - energyShift: how energy level should change (+0.2, -0.1, etc.)
                            - tonalProgression: how the emotional quality should evolve
                            - retainedElements: elements from current state that should persist
                            - newElements: new visual elements to introduce
                            - transitionStyle: description of transition style (e.g., "gentle crossfade", "rippling transformation")
                            - dominantColors: array of 3-5 hex color codes that represent the new emotional tone
                            
                            NEW TEXT: `
        };
        
        console.log('VisualizationController initialized');
    }
    
    /**
     * Set the API key for LLM communication
     */
    setApiKey(key) {
        this.apiKey = key;
    }
    
    /**
     * Process new speech text and update visualization
     */
    async processSpeechText(text, sentiment = 0) {
        // Skip if text is too short
        if (!text || text.length < 10) {
            console.log('Text too short for LLM analysis');
            return;
        }
        
        // Implement cooldown to prevent too frequent API calls
        const now = Date.now();
        if (now - this.lastUpdateTimestamp < this.updateCooldown) {
            // Schedule an update after cooldown instead of immediate call
            console.log(`Update cooldown in effect (${(this.updateCooldown - (now - this.lastUpdateTimestamp))/1000}s remaining)`);
            this.scheduleDeferredUpdate(text, sentiment);
            return;
        }
        
        // Skip if already processing (avoid multiple simultaneous API calls)
        if (this.isProcessing) {
            console.log('Already processing an update, deferring');
            this.scheduleDeferredUpdate(text, sentiment);
            return;
        }
        
        try {
            this.isProcessing = true;
            this.lastUpdateTimestamp = now;
            
            // Determine whether to do initial analysis or incremental update
            let prompt, parameters;
            
            if (this.contextHistory.length === 0) {
                // First analysis
                prompt = this.promptTemplates.initialAnalysis + text;
                console.log('Performing initial LLM visualization analysis');
            } else {
                // Incremental update based on previous context
                const currentState = this.contextHistory[0];
                prompt = this.promptTemplates.updateGuidance
                    .replace('{{currentPalette}}', currentState.colorPalette || 'neutral')
                    .replace('{{currentEnergy}}', currentState.energyLevel || 0.5)
                    .replace('{{currentTone}}', currentState.emotionalTone || 'neutral')
                    .replace('{{currentMetaphors}}', (currentState.visualMetaphors || []).join(', '));
                    
                prompt += text;
                console.log('Performing incremental LLM visualization update');
            }
            
            // Call LLM API
            parameters = await this.callLLM(prompt);
            
            if (parameters) {
                console.log('LLM visualization parameters:', parameters);
                
                // Add sentiment from text analysis as additional input
                parameters.sentiment = sentiment;
                
                // Apply parameters to visualization
                await this.applyParameters(parameters);
                
                // Update history
                this.contextHistory.unshift(parameters);
                if (this.contextHistory.length > this.maxHistoryLength) {
                    this.contextHistory = this.contextHistory.slice(0, this.maxHistoryLength);
                }
            }
        } catch (error) {
            console.error('Error processing speech for visualization:', error);
        } finally {
            this.isProcessing = false;
            
            // Process any pending update
            if (this.pendingUpdate) {
                const {text, sentiment} = this.pendingUpdate;
                this.pendingUpdate = null;
                
                // Wait for cooldown before processing pending update
                const timeSinceLastUpdate = Date.now() - this.lastUpdateTimestamp;
                const waitTime = Math.max(0, this.updateCooldown - timeSinceLastUpdate);
                
                if (waitTime > 0) {
                    console.log(`Waiting ${waitTime}ms before processing pending update`);
                    setTimeout(() => {
                        this.processSpeechText(text, sentiment);
                    }, waitTime);
                } else {
                    // Process immediately if cooldown has already elapsed
                    this.processSpeechText(text, sentiment);
                }
            }
        }
    }
    
    /**
     * Schedule a deferred update
     */
    scheduleDeferredUpdate(text, sentiment) {
        // Replace any existing pending update
        this.pendingUpdate = {text, sentiment};
        console.log('Scheduled deferred visualization update');
    }
    
    /**
     * Call the LLM API to get visualization parameters
     */
    async callLLM(prompt) {
        if (!this.apiKey) {
            console.error('API key not set for LLM visualization');
            return null;
        }
        
        try {
            console.log('Sending visualization prompt to LLM');
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a visualization parameter generator for an abstract, artistic visualization system.
                                     Your task is to analyze text and generate appropriate visualization parameters.
                                     You should respond only with a JSON object containing the parameters.
                                     Be creative and thoughtful about color choices, movements, and metaphors.
                                     Choose colors that truly match emotional tones - use color psychology principles.
                                     For visual metaphors, prefer nature-inspired concepts that are abstract, not literal.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 800,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                console.error('LLM API error:', error);
                return null;
            }
            
            const result = await response.json();
            const content = result.choices[0]?.message?.content;
            
            if (!content) {
                console.error('Empty response from LLM');
                return null;
            }
            
            // Extract JSON from the response (handle cases where there might be text before/after JSON)
            let jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('Could not extract JSON from LLM response:', content);
                return null;
            }
            
            try {
                // Parse the JSON object
                const parameters = JSON.parse(jsonMatch[0]);
                return parameters;
            } catch (jsonError) {
                console.error('Error parsing JSON from LLM:', jsonError, content);
                return null;
            }
        } catch (error) {
            console.error('Error calling LLM API:', error);
            return null;
        }
    }
    
    /**
     * Apply LLM-generated parameters to the visualization
     */
    async applyParameters(parameters) {
        if (!this.visualization) {
            console.error('No visualization instance to update');
            return;
        }
        
        // Convert LLM parameters to visualization parameters
        const visualParams = this.convertLLMtoVisualParams(parameters);
        
        // Apply the parameters to the visualization
        await this.visualization.applyLLMParameters(visualParams);
        
        console.log('Applied LLM parameters to visualization');
    }
    
    /**
     * Convert LLM parameters to the format expected by the visualization
     */
    convertLLMtoVisualParams(llmParams) {
        // Create a parameter object in the format expected by the visualization
        const visualParams = {
            // Core parameters
            emotionalTone: llmParams.emotionalTone || 'neutral',
            secondaryEmotions: llmParams.secondaryEmotions || [],
            energyLevel: this.normalizeValue(llmParams.energyLevel, 0, 1, 0.5),
            
            // Color parameters
            colorPalette: llmParams.colorPalette || 'neutral',
            dominantColors: llmParams.dominantColors || [],
            colorShift: llmParams.colorShift || null,
            
            // Movement parameters
            flowSpeed: this.normalizeValue(llmParams.flowSpeed, 0, 1, 0.5),
            turbulence: this.normalizeValue(llmParams.turbulence, 0, 1, 0.1),
            particleSize: this.normalizeValue(llmParams.particleSize, 1, 5, 2.5),
            particleDensity: this.normalizeValue(llmParams.particleDensity, 0, 1, 0.5),
            
            // Transition guidance
            transitionGuidance: llmParams.transitionGuidance || '',
            transitionStyle: llmParams.transitionStyle || 'smooth',
            retainedElements: llmParams.retainedElements || [],
            newElements: llmParams.newElements || [],
            
            // Additional metadata
            visualMetaphors: llmParams.visualMetaphors || [],
            sentiment: llmParams.sentiment || 0,
            
            // Raw parameters for reference
            rawLLMParams: llmParams
        };
        
        return visualParams;
    }
    
    /**
     * Normalize a value to ensure it's within the expected range
     */
    normalizeValue(value, min, max, defaultValue) {
        if (value === undefined || value === null || isNaN(parseFloat(value))) {
            return defaultValue;
        }
        
        const num = parseFloat(value);
        return Math.max(min, Math.min(max, num));
    }
    
    /**
     * Get hex color from a string description
     */
    getColorFromDescription(description) {
        // Simple color mapping
        const colorMap = {
            red: '#ff5555',
            orange: '#ff9955',
            yellow: '#ffff55',
            green: '#55ff55',
            teal: '#55ffff',
            blue: '#5555ff',
            purple: '#9955ff',
            pink: '#ff55ff',
            brown: '#a52a2a',
            black: '#333333',
            white: '#ffffff',
            gray: '#999999'
        };
        
        // Check for exact matches
        const lowerDesc = description.toLowerCase();
        for (const [name, hex] of Object.entries(colorMap)) {
            if (lowerDesc.includes(name)) {
                return hex;
            }
        }
        
        // Default to a neutral blue
        return '#5599cc';
    }
}

// Make the class available globally
window.VisualizationController = VisualizationController;
