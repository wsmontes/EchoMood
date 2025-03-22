class AbstractVisualization {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container element with ID ${containerId} not found.`);
            return;
        }

        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'visualization-canvas';
        this.container.appendChild(this.canvas);
        
        // Get canvas context
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize properties
        this.particles = [];
        this.flowField = [];
        this.maxParticles = 150;
        this.baseHue = 200; // Default blue hue
        this.targetHue = this.baseHue;
        this.sentiment = 0; // -1 to 1 (negative to positive)
        this.keywords = [];
        this.animationId = null;
        this.contextMood = 'neutral';
        this.lastUpdateTime = Date.now();
        this.transitionSpeed = 0.01; // Slower transitions for more subtlety
        this.noiseScale = 0.005; // For Perlin noise-based flow fields
        this.noiseTime = 0;
        
        // History to prevent jarring transitions
        this.moodHistory = ['neutral', 'neutral', 'neutral']; // Track last few moods
        this.sentimentHistory = [0, 0, 0]; // Track last few sentiment values
        this.hueHistory = [this.baseHue, this.baseHue, this.baseHue]; // Track hue changes
        
        // Create new artistic layer properties
        this.layers = [
            {
                type: 'background',
                opacity: 1.0,
                blend: 'normal',
                visible: true
            },
            {
                type: 'flowLayer',
                opacity: 0.7,
                blend: 'screen',
                visible: true,
                particleCount: Math.floor(this.maxParticles * 0.6)
            },
            {
                type: 'organicLayer',
                opacity: 0.5,
                blend: 'overlay',
                visible: true,
                particleCount: Math.floor(this.maxParticles * 0.4)
            }
        ];
        
        // Visual effects settings
        this.effectSettings = {
            particleSize: 3,
            particleSizeRange: 4,
            lineThickness: 0.5,
            speed: 1,
            organicMovement: 0.5, // How organic/natural the movement feels (0-1)
            fluidity: 0.6, // How fluid the transitions are (0-1)
            expressiveness: 0.4, // How expressive the visuals are (0-1)
            connectivity: 100, // Distance for particle connections
            colorVariation: 30,
            opacityBase: 0.7,
            opacityRange: 0.3,
            backgroundOpacity: 0.2,
            bloomEffect: 0.3,  // Subtle bloom for more artistic feel
            aberration: 0.2    // Subtle chromatic aberration for artistic effect
        };
        
        // Rich color palettes for different emotional contexts
        this.colorPalettes = {
            // Warm, comforting colors for personal/intimate topics
            intimate: {
                primary: 15, // Warm orange-red
                secondary: 35, // Gold
                accent: 55, // Yellow
                backgroundGradient: [10, 30],
                saturation: 75,
                luminance: [15, 55],
                depth: 0.7  // Visual depth/richness
            },
            // Calm, thoughtful blues and teals
            reflective: {
                primary: 200, // Sky blue
                secondary: 220, // Pale blue
                accent: 180, // Teal
                backgroundGradient: [190, 210],
                saturation: 60,
                luminance: [20, 50],
                depth: 0.5
            },
            // Rich purples and blues for mysterious/philosophical content
            philosophical: {
                primary: 260, // Purple
                secondary: 240, // Blue-purple
                accent: 280, // Violet
                backgroundGradient: [250, 270],
                saturation: 65,
                luminance: [15, 45],
                depth: 0.8
            },
            // Bright, varied colors for exciting/adventure topics
            adventurous: {
                primary: 120, // Green
                secondary: 160, // Blue-green
                accent: 40, // Yellow-orange
                backgroundGradient: [100, 140],
                saturation: 80,
                luminance: [25, 65],
                depth: 0.6
            },
            // Blues and whites, cleaner look for technical content
            technical: {
                primary: 210, // Blue
                secondary: 195, // Cyan-blue
                accent: 225, // Violet-blue
                backgroundGradient: [200, 220],
                saturation: 45,
                luminance: [30, 60],
                depth: 0.4
            },
            // Deep reds and oranges for passionate/intense topics
            passionate: {
                primary: 0, // Red
                secondary: 15, // Red-orange
                accent: 345, // Crimson
                backgroundGradient: [0, 20],
                saturation: 85,
                luminance: [20, 55],
                depth: 0.7
            },
            // Soft, dreamlike purples and pinks
            dreamy: {
                primary: 290, // Pink-purple
                secondary: 320, // Pink
                accent: 270, // Purple
                backgroundGradient: [280, 310],
                saturation: 50,
                luminance: [25, 60],
                depth: 0.6
            },
            // Neutral blues and grays for neutral content
            neutral: {
                primary: 210, // Blue
                secondary: 200, // Light blue
                accent: 220, // Blue-purple
                backgroundGradient: [200, 220],
                saturation: 40,
                luminance: [30, 50],
                depth: 0.5
            },
            // Muted tones for listening state
            listening: {
                primary: 210, // Blue
                secondary: 220, // Lighter blue
                accent: 200, // Slightly aqua blue
                backgroundGradient: [200, 220],
                saturation: 30,
                luminance: [20, 40],
                depth: 0.3
            }
        };
        
        // Current active palette (starts with neutral)
        this.currentPalette = this.deepCopy(this.colorPalettes.neutral);
        this.targetPalette = null;
        
        // Effects for different moods - more subtle and artistic now
        this.moodEffects = {
            'neutral': {
                organicMovement: 0.4,
                fluidity: 0.5,
                expressiveness: 0.3,
                flowFieldScale: 0.01,
                flowFieldSpeed: 0.001,
                turbulence: 0.1,
                particleSize: 2.5,
                palette: 'neutral'
            },
            'intimate': {
                organicMovement: 0.7,
                fluidity: 0.8,
                expressiveness: 0.5,
                flowFieldScale: 0.008,
                flowFieldSpeed: 0.0005,
                turbulence: 0.05,
                particleSize: 3,
                palette: 'intimate'
            },
            'reflective': {
                organicMovement: 0.6,
                fluidity: 0.7,
                expressiveness: 0.4,
                flowFieldScale: 0.01,
                flowFieldSpeed: 0.0007,
                turbulence: 0.07,
                particleSize: 2.5,
                palette: 'reflective'
            },
            'philosophical': {
                organicMovement: 0.6,
                fluidity: 0.6,
                expressiveness: 0.7,
                flowFieldScale: 0.012,
                flowFieldSpeed: 0.001,
                turbulence: 0.15,
                particleSize: 2.5,
                palette: 'philosophical'
            },
            'adventurous': {
                organicMovement: 0.8,
                fluidity: 0.6,
                expressiveness: 0.8,
                flowFieldScale: 0.015,
                flowFieldSpeed: 0.002,
                turbulence: 0.2,
                particleSize: 3,
                palette: 'adventurous'
            },
            'technical': {
                organicMovement: 0.3,
                fluidity: 0.4,
                expressiveness: 0.3,
                flowFieldScale: 0.02,
                flowFieldSpeed: 0.0015,
                turbulence: 0.05,
                particleSize: 2,
                palette: 'technical'
            },
            'passionate': {
                organicMovement: 0.7,
                fluidity: 0.5,
                expressiveness: 0.9,
                flowFieldScale: 0.015,
                flowFieldSpeed: 0.0025,
                turbulence: 0.25,
                particleSize: 3,
                palette: 'passionate'
            },
            'dreamy': {
                organicMovement: 0.9,
                fluidity: 0.9,
                expressiveness: 0.5,
                flowFieldScale: 0.005,
                flowFieldSpeed: 0.0008,
                turbulence: 0.1,
                particleSize: 3.5,
                palette: 'dreamy'
            },
            'listening': {
                organicMovement: 0.3,
                fluidity: 0.5,
                expressiveness: 0.2,
                flowFieldScale: 0.01,
                flowFieldSpeed: 0.0005,
                turbulence: 0.05,
                particleSize: 2,
                palette: 'listening'
            }
        };
        
        // Map emotional keywords to mood effects
        this.emotionToMoodMap = {
            // Personal/emotional topics
            'love': 'intimate',
            'feeling': 'intimate',
            'emotion': 'intimate',
            'heart': 'intimate',
            'personal': 'intimate',
            'family': 'intimate',
            'relationship': 'intimate',
            'friendship': 'intimate',
            'memory': 'intimate',
            'childhood': 'intimate',
            'home': 'intimate',
            'sentiment': 'intimate',
            
            // Reflective/thoughtful topics
            'think': 'reflective',
            'thought': 'reflective',
            'consider': 'reflective',
            'reflect': 'reflective',
            'ponder': 'reflective',
            'contemplate': 'reflective',
            'wonder': 'reflective',
            'question': 'reflective',
            'perspective': 'reflective',
            'idea': 'reflective',
            'opinion': 'reflective',
            
            // Philosophical topics
            'philosophy': 'philosophical',
            'meaning': 'philosophical',
            'existence': 'philosophical',
            'purpose': 'philosophical',
            'consciousness': 'philosophical',
            'reality': 'philosophical',
            'essence': 'philosophical',
            'universe': 'philosophical',
            'metaphysical': 'philosophical',
            'spiritual': 'philosophical',
            'profound': 'philosophical',
            
            // Adventure/exciting topics
            'adventure': 'adventurous',
            'discover': 'adventurous',
            'explore': 'adventurous',
            'journey': 'adventurous',
            'travel': 'adventurous',
            'quest': 'adventurous',
            'exciting': 'adventurous',
            'thrill': 'adventurous',
            'challenge': 'adventurous',
            'opportunity': 'adventurous',
            'new': 'adventurous',
            
            // Technical topics
            'technology': 'technical',
            'technical': 'technical',
            'science': 'technical',
            'engineering': 'technical',
            'computer': 'technical',
            'program': 'technical',
            'algorithm': 'technical',
            'data': 'technical',
            'research': 'technical',
            'analysis': 'technical',
            'development': 'technical',
            
            // Passionate topics
            'passion': 'passionate',
            'desire': 'passionate',
            'intense': 'passionate',
            'powerful': 'passionate',
            'strong': 'passionate',
            'determined': 'passionate',
            'motivated': 'passionate',
            'driven': 'passionate',
            'ardent': 'passionate',
            'fervent': 'passionate',
            'zeal': 'passionate',
            
            // Dreamy topics
            'dream': 'dreamy',
            'fantasy': 'dreamy',
            'imagination': 'dreamy',
            'vision': 'dreamy',
            'magical': 'dreamy',
            'enchanted': 'dreamy',
            'surreal': 'dreamy',
            'whimsical': 'dreamy',
            'fairy': 'dreamy',
            'mystical': 'dreamy',
            'ethereal': 'dreamy'
        };
        
        // Current active effect settings
        this.currentEffect = this.deepCopy(this.moodEffects['neutral']);
        this.targetEffect = null;
        
        // Initialize noise function for organic movement
        this.noise = this.initializeSimplexNoise();
        
        // Set up resize handler
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Set up fullscreen toggle
        this.setupFullscreenToggle();
        
        // Setup health indicator (hidden by default, only for debugging)
        this.setupHealthIndicator();
        
        // Generate flow field and particles
        this.generateFlowField();
        this.generateParticles();
        
        // Start the animation
        this.animate();
        
        console.log('Artistic visualization initialized');
    }
    
    // Initialize a simple Perlin noise implementation
    initializeSimplexNoise() {
        const noise = {
            // Simple 2D noise function - not as good as proper Perlin but works
            noise2D: (x, y) => {
                const X = Math.floor(x) & 255;
                const Y = Math.floor(y) & 255;
                
                const fx = x - Math.floor(x);
                const fy = y - Math.floor(y);
                
                const u = this.fade(fx);
                const v = this.fade(fy);
                
                // Use trigonometric functions to create smooth noise
                return Math.sin(u * Math.PI) * Math.cos(v * Math.PI * 0.7) * 
                       Math.sin((X/255) * Math.PI) * Math.cos((Y/255) * Math.PI * 0.7);
            }
        };
        
        return noise;
    }
    
    // Fade function for smoother noise
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    // Deep copy helper for effect settings
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    setupHealthIndicator() {
        // Add a small indicator to show when updates happen (hidden by default)
        this.healthIndicator = document.createElement('div');
        this.healthIndicator.style.position = 'absolute';
        this.healthIndicator.style.bottom = '5px';
        this.healthIndicator.style.right = '5px';
        this.healthIndicator.style.width = '8px';
        this.healthIndicator.style.height = '8px';
        this.healthIndicator.style.borderRadius = '50%';
        this.healthIndicator.style.backgroundColor = 'gray';
        this.healthIndicator.style.transition = 'background-color 0.5s';
        this.healthIndicator.style.opacity = '0';  // Hidden by default
        this.container.appendChild(this.healthIndicator);
    }
    
    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Regenerate flow field and particles when resizing
        this.generateFlowField();
        this.generateParticles();
    }
    
    setupFullscreenToggle() {
        const fullscreenBtn = this.container.querySelector('.fullscreen-toggle');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    // Enter real fullscreen mode
                    if (this.container.requestFullscreen) {
                        this.container.requestFullscreen();
                    } else if (this.container.webkitRequestFullscreen) { // Safari
                        this.container.webkitRequestFullscreen();
                    } else if (this.container.msRequestFullscreen) { // IE11
                        this.container.msRequestFullscreen();
                    }
                    
                    // Add fullscreen class for styling
                    this.container.classList.add('fullscreen');
                    
                    // Update icon
                    const icon = fullscreenBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-expand');
                        icon.classList.add('fa-compress');
                    }
                } else {
                    // Exit fullscreen mode
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) { // Safari
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) { // IE11
                        document.msExitFullscreen();
                    }
                    
                    // Remove fullscreen class
                    this.container.classList.remove('fullscreen');
                    
                    // Update icon
                    const icon = fullscreenBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-compress');
                        icon.classList.add('fa-expand');
                    }
                }
                
                // Resize canvas after fullscreen toggle
                setTimeout(() => this.resizeCanvas(), 100);
            });
            
            // Handle fullscreen change events from browser
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement) {
                    // Exited fullscreen mode
                    this.container.classList.remove('fullscreen');
                    const icon = fullscreenBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-compress');
                        icon.classList.add('fa-expand');
                    }
                    this.resizeCanvas();
                }
            });
            
            // Handle webkit fullscreen change (for Safari)
            document.addEventListener('webkitfullscreenchange', () => {
                if (!document.webkitFullscreenElement) {
                    // Exited fullscreen mode
                    this.container.classList.remove('fullscreen');
                    const icon = fullscreenBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-compress');
                        icon.classList.add('fa-expand');
                    }
                    this.resizeCanvas();
                }
            });
        }
    }
    
    // Generate a fluid-like flow field based on Perlin noise
    generateFlowField() {
        const cols = Math.ceil(this.canvas.width / 20);  // Adjust cell size for performance
        const rows = Math.ceil(this.canvas.height / 20);
        this.flowField = new Array(cols * rows);
        
        const scale = this.currentEffect.flowFieldScale || 0.01;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const index = x + y * cols;
                const angle = this.noise.noise2D(x * scale, y * scale) * Math.PI * 2;
                this.flowField[index] = {
                    x: Math.cos(angle),
                    y: Math.sin(angle)
                };
            }
        }
    }
    
    generateParticles() {
        this.particles = [];
        
        // Create particles for each layer
        this.layers.forEach(layer => {
            if (layer.particleCount) {
                for (let i = 0; i < layer.particleCount; i++) {
                    this.particles.push(this.createParticle(layer.type));
                }
            }
        });
    }
    
    createParticle(layerType = 'flowLayer') {
        const baseSize = this.currentEffect.particleSize || this.effectSettings.particleSize;
        const sizeRange = this.effectSettings.particleSizeRange;
        
        // Get color from current palette based on layer type
        let hue = this.currentPalette.primary;
        if (layerType === 'organicLayer') {
            // More variation for organic layer
            hue = Math.random() < 0.5 ? this.currentPalette.secondary : this.currentPalette.accent;
        }
        
        // Base particle properties
        const particle = {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: baseSize + Math.random() * sizeRange,
            speedFactor: 0.2 + Math.random() * 0.8, // Varied speed for more natural look
            hue: hue + (Math.random() * 20 - 10), // Slight hue variation
            saturation: this.currentPalette.saturation + (Math.random() * 10 - 5),
            luminance: this.currentPalette.luminance[0] + 
                      Math.random() * (this.currentPalette.luminance[1] - this.currentPalette.luminance[0]),
            alpha: this.effectSettings.opacityBase + Math.random() * this.effectSettings.opacityRange,
            layerType: layerType,
            life: 0.7 + Math.random() * 0.3, // Life factor (0-1)
            angle: Math.random() * Math.PI * 2,
            pulsePhase: Math.random() * Math.PI * 2, // For pulsing effects
            individualOffset: Math.random() * 1000 // Individual offset for varied movement
        };
        
        // Layer-specific properties
        if (layerType === 'flowLayer') {
            // Flow layer follows the flow field
            particle.followsFlow = true;
            particle.flowStrength = 0.3 + Math.random() * 0.7;
            particle.history = Array(3).fill({x: particle.x, y: particle.y}); // Particle history for trails
        } else if (layerType === 'organicLayer') {
            // Organic layer has more varied, natural movement
            particle.followsFlow = false;
            particle.organicMovement = 0.5 + Math.random() * 0.5;
            particle.waveFactor = 0.1 + Math.random() * 0.4;
            particle.waveSpeed = 0.001 + Math.random() * 0.002;
        }
        
        return particle;
    }
    
    updateVisualization(sentiment, keywords, contextMood = 'neutral') {
        // Show update in health indicator
        if (this.healthIndicator) {
            this.healthIndicator.style.backgroundColor = '#4CAF50';
            this.healthIndicator.style.opacity = '0.5';
            setTimeout(() => {
                this.healthIndicator.style.opacity = '0';
            }, 500);
        }
        
        console.log(`Updating visualization - sentiment: ${sentiment.toFixed(2)}, mood: ${contextMood}, keywords: ${keywords.length}`);
        
        // Update properties
        this.sentiment = sentiment;
        this.keywords = keywords;
        this.lastUpdateTime = Date.now();
        
        // Add to mood history for smoother transitions
        this.sentimentHistory.unshift(sentiment);
        this.sentimentHistory = this.sentimentHistory.slice(0, 3);
        
        // Determine the most appropriate mood based on keywords
        const detectedMood = this.detectMoodFromKeywords(keywords);
        
        // Apply contextual mood if provided and valid, otherwise use detected mood
        const newMood = (this.moodEffects[contextMood]) ? contextMood : detectedMood;
        
        // Update mood history
        this.moodHistory.unshift(newMood);
        this.moodHistory = this.moodHistory.slice(0, 3);
        
        // Get the dominant mood (most frequent in recent history)
        const moodCounts = {};
        this.moodHistory.forEach(mood => {
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
        
        let dominantMood = newMood;
        let maxCount = 0;
        for (const [mood, count] of Object.entries(moodCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantMood = mood;
            }
        }
        
        // Only change context mood if it's consistently different
        if (dominantMood !== this.contextMood) {
            console.log(`Changing visualization mood from ${this.contextMood} to ${dominantMood}`);
            this.contextMood = dominantMood;
            
            // Set target effect based on mood
            if (this.moodEffects[dominantMood]) {
                this.targetEffect = this.deepCopy(this.moodEffects[dominantMood]);
                
                // Set target color palette
                const paletteName = this.targetEffect.palette || 'neutral';
                if (this.colorPalettes[paletteName]) {
                    this.targetPalette = this.deepCopy(this.colorPalettes[paletteName]);
                }
            }
        }
        
        // Update some particles with new properties to reflect the change - very subtle
        const updateCount = Math.min(Math.ceil(this.particles.length * 0.1), 15);
        for (let i = 0; i < updateCount; i++) {
            const index = Math.floor(Math.random() * this.particles.length);
            this.particles[index] = this.createParticle(this.particles[index].layerType);
        }
    }
    
    // Detect mood from keywords by looking for emotional words
    detectMoodFromKeywords(keywords) {
        if (!keywords || keywords.length === 0) return 'neutral';
        
        const moodMatches = {};
        
        // Check each keyword against our emotion map
        keywords.forEach(keyword => {
            const word = (typeof keyword === 'string') ? keyword : (keyword.text || '');
            const lowerWord = word.toLowerCase();
            
            for (const [emotion, mood] of Object.entries(this.emotionToMoodMap)) {
                if (lowerWord.includes(emotion)) {
                    moodMatches[mood] = (moodMatches[mood] || 0) + 1;
                }
            }
        });
        
        // Find the mood with the most matches
        let detectedMood = 'neutral';
        let maxMatches = 0;
        
        for (const [mood, count] of Object.entries(moodMatches)) {
            if (count > maxMatches) {
                maxMatches = count;
                detectedMood = mood;
            }
        }
        
        return detectedMood;
    }
    
    animate() {
        // Clear canvas with a more sophisticated method for visual depth
        this.clearCanvasWithBloom();
        
        // Smoothly transition between colors and effects
        this.updateTransitions();
        
        // Update flow field over time for dynamic movement
        if (this.currentEffect.flowFieldSpeed) {
            this.noiseTime += this.currentEffect.flowFieldSpeed;
            if (this.noiseTime % 0.1 < this.currentEffect.flowFieldSpeed) {
                this.generateFlowField(); // Periodically update flow field
            }
        }
        
        // Update and draw particles
        this.updateParticles();
        this.drawParticles();
        
        // Continue animation loop
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    // Clear canvas with bloom effect for more artistic look
    clearCanvasWithBloom() {
        // Create gradient background
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width * 0.5, this.canvas.height * 0.5, 0,
            this.canvas.width * 0.5, this.canvas.height * 0.5, 
            Math.max(this.canvas.width, this.canvas.height) * 0.8
        );
        
        // Use palette's background gradient
        const bgStart = this.currentPalette.backgroundGradient[0];
        const bgEnd = this.currentPalette.backgroundGradient[1];
        
        gradient.addColorStop(0, `hsla(${bgStart}, ${this.currentPalette.saturation}%, 
                               ${this.currentPalette.luminance[0]}%, 1)`);
        gradient.addColorStop(1, `hsla(${bgEnd}, ${this.currentPalette.saturation * 0.8}%, 
                               ${this.currentPalette.luminance[0] * 0.7}%, 1)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add subtle background bloom if appropriate for the mood
        const bloomIntensity = this.effectSettings.bloomEffect * this.currentPalette.depth;
        if (bloomIntensity > 0.1) {
            this.ctx.globalAlpha = bloomIntensity * 0.3;
            this.ctx.filter = 'blur(50px)'; // Soft bloom
            
            // Draw bloom light source
            const bloomGradient = this.ctx.createRadialGradient(
                this.canvas.width * 0.5, this.canvas.height * 0.5, 0,
                this.canvas.width * 0.5, this.canvas.height * 0.5, 
                Math.max(this.canvas.width, this.canvas.height) * 0.5
            );
            
            bloomGradient.addColorStop(0, `hsla(${this.currentPalette.primary}, 70%, 60%, 0.3)`);
            bloomGradient.addColorStop(1, `hsla(${this.currentPalette.primary}, 60%, 40%, 0)`);
            
            this.ctx.fillStyle = bloomGradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Reset filters
            this.ctx.globalAlpha = 1;
            this.ctx.filter = 'none';
        }
    }
    
    updateTransitions() {
        // Use weighted average for smoother historical transitions
        const weightedSentiment = (this.sentimentHistory[0] * 0.6 + 
                                 (this.sentimentHistory[1] || 0) * 0.3 + 
                                 (this.sentimentHistory[2] || 0) * 0.1);
        
        // Transition effect properties if target effect exists
        if (this.targetEffect) {
            // For each property in the effect, transition toward target
            for (const [key, targetValue] of Object.entries(this.targetEffect)) {
                // Skip non-numeric properties for smooth transitions
                if (typeof targetValue === 'number' && typeof this.currentEffect[key] === 'number') {
                    const diff = targetValue - this.currentEffect[key];
                    if (Math.abs(diff) > 0.001) {
                        // Very smooth, gradual transitions
                        this.currentEffect[key] += diff * this.transitionSpeed;
                    }
                } else if (key !== 'palette') {
                    // For non-numeric properties, use probability-based transition
                    // More likely to change as time passes
                    const transitionChance = Math.random() < this.transitionSpeed * 10;
                    if (transitionChance) {
                        this.currentEffect[key] = targetValue;
                    }
                }
            }
        }
        
        // Transition color palette if target palette exists
        if (this.targetPalette) {
            for (const [key, targetValue] of Object.entries(this.targetPalette)) {
                if (Array.isArray(targetValue)) {
                    // For array values (like luminance range or gradient)
                    if (!Array.isArray(this.currentPalette[key])) {
                        // Initialize array if it doesn't exist
                        this.currentPalette[key] = [...targetValue];
                    } else {
                        // Transition each element in the array
                        for (let i = 0; i < targetValue.length; i++) {
                            if (typeof targetValue[i] === 'number' && typeof this.currentPalette[key][i] === 'number') {
                                const diff = targetValue[i] - this.currentPalette[key][i];
                                if (Math.abs(diff) > 0.1) {
                                    this.currentPalette[key][i] += diff * this.transitionSpeed;
                                }
                            }
                        }
                    }
                } else if (typeof targetValue === 'number') {
                    // For numeric values
                    const diff = targetValue - this.currentPalette[key];
                    if (Math.abs(diff) > 0.1) {
                        this.currentPalette[key] += diff * this.transitionSpeed;
                    }
                }
            }
        }
    }
    
    updateParticles() {
        const time = Date.now() * 0.001;
        
        this.particles.forEach(particle => {
            // Get the flow field influence at this position
            const flowField = this.getFlowFieldAtPosition(particle.x, particle.y);
            
            // Calculate movement based on particle type and flow field
            if (particle.layerType === 'flowLayer') {
                // Flow layer follows the flow field with individual variation
                if (particle.followsFlow && flowField) {
                    // Apply flow field influence
                    const speed = this.currentEffect.speed || 1;
                    particle.x += flowField.x * speed * particle.speedFactor * particle.flowStrength;
                    particle.y += flowField.y * speed * particle.speedFactor * particle.flowStrength;
                    
                    // Add subtle turbulence
                    const turbulence = this.currentEffect.turbulence || 0.1;
                    particle.x += (Math.random() - 0.5) * turbulence;
                    particle.y += (Math.random() - 0.5) * turbulence;
                    
                    // Update particle history for trail effect
                    if (particle.history) {
                        particle.history.unshift({x: particle.x, y: particle.y});
                        particle.history = particle.history.slice(0, 3);
                    }
                }
            } else if (particle.layerType === 'organicLayer') {
                // Organic layer has more natural, sinusoidal movement
                const organicFactor = this.currentEffect.organicMovement || 0.5;
                
                // Create a more natural, flowing movement pattern
                const xOffset = Math.sin(time * particle.waveSpeed + particle.individualOffset) * 
                               particle.waveFactor * organicFactor * 5;
                const yOffset = Math.cos(time * particle.waveSpeed * 0.7 + particle.individualOffset) * 
                               particle.waveFactor * organicFactor * 5;
                
                particle.x += xOffset;
                particle.y += yOffset;
                
                // Add subtle influence from flow field for cohesion
                if (flowField) {
                    particle.x += flowField.x * 0.1;
                    particle.y += flowField.y * 0.1;
                }
                
                // Subtle size pulsing for organic feel
                particle.currentSize = particle.size * (0.8 + 0.2 * 
                                     Math.sin(time * 1.5 + particle.pulsePhase));
            }
            
            // Handle edge wrapping with a buffer zone for smoother transitions
            const buffer = 50;
            if (particle.x < -buffer) particle.x = this.canvas.width + buffer;
            if (particle.x > this.canvas.width + buffer) particle.x = -buffer;
            if (particle.y < -buffer) particle.y = this.canvas.height + buffer;
            if (particle.y > this.canvas.height + buffer) particle.y = -buffer;
            
            // Slowly evolve particle properties for organic feel
            particle.hue += (Math.random() - 0.5) * 0.2;
            particle.alpha = Math.max(0.1, Math.min(1, particle.alpha + (Math.random() - 0.5) * 0.01));
        });
    }
    
    getFlowFieldAtPosition(x, y) {
        const cols = Math.ceil(this.canvas.width / 20);
        
        // Get flow field grid coordinates
        const column = Math.floor(x / 20);
        const row = Math.floor(y / 20);
        
        // Check if coordinates are within bounds
        if (column >= 0 && column < cols && 
            row >= 0 && row < Math.ceil(this.canvas.height / 20)) {
            const index = column + row * cols;
            return this.flowField[index];
        }
        
        // Return default if out of bounds
        return { x: 0, y: 0 };
    }
    
    drawParticles() {
        // For each layer, draw particles according to their style
        this.layers.forEach(layer => {
            if (!layer.visible) return;
            
            // Set global composite operation (blend mode) for the layer
            this.ctx.globalCompositeOperation = layer.blend || 'normal';
            
            // Get particles belonging to this layer
            const layerParticles = this.particles.filter(p => p.layerType === layer.type);
            
            // Draw layer-specific particles
            if (layer.type === 'flowLayer') {
                this.drawFlowParticles(layerParticles, layer.opacity);
            } else if (layer.type === 'organicLayer') {
                this.drawOrganicParticles(layerParticles, layer.opacity);
            }
            
            // Reset blend mode to normal
            this.ctx.globalCompositeOperation = 'normal';
        });
    }
    
    // Draw particles that follow the flow field - with trails for fluid effect
    drawFlowParticles(particles, opacity = 1) {
        // Draw connections between flow particles for a fluid feel
        const maxConnectionDist = 100;
        this.ctx.lineWidth = 1;
        
        particles.forEach(p1 => {
            // Draw particle
            this.ctx.fillStyle = `hsla(${p1.hue}, ${p1.saturation}%, ${p1.luminance}%, ${p1.alpha * opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(p1.x, p1.y, p1.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw trail if particle has history
            if (p1.history && p1.history.length > 1) {
                this.ctx.strokeStyle = `hsla(${p1.hue}, ${p1.saturation}%, ${p1.luminance}%, ${p1.alpha * opacity * 0.5})`;
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                
                for (let i = 0; i < p1.history.length; i++) {
                    const point = p1.history[i];
                    this.ctx.lineTo(point.x, point.y);
                    
                    // Fade out the trail
                    this.ctx.globalAlpha = p1.alpha * opacity * (1 - i/p1.history.length);
                }
                
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
            
            // Draw connections to nearby particles for a cohesive effect
            particles.forEach(p2 => {
                if (p1 === p2) return;
                
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxConnectionDist) {
                    const opacity = 0.1 * (1 - distance / maxConnectionDist);
                    this.ctx.strokeStyle = `hsla(${(p1.hue + p2.hue) / 2}, 
                                           ${(p1.saturation + p2.saturation) / 2}%, 
                                           ${(p1.luminance + p2.luminance) / 2}%, ${opacity})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            });
        });
    }
    
    // Draw organic particles with more varied, natural shapes
    drawOrganicParticles(particles, opacity = 1) {
        const time = Date.now() * 0.001;
        
        particles.forEach(particle => {
            // Save context for transformations
            this.ctx.save();
            
            // Position at particle center
            this.ctx.translate(particle.x, particle.y);
            
            // Gradual rotation for organic feel
            const rotationSpeed = 0.2;
            this.ctx.rotate(particle.individualOffset + time * rotationSpeed);
            
            // Get current size (with pulsing effect)
            const size = particle.currentSize || particle.size;
            
            // Draw a more organic shape based on context mood
            this.ctx.fillStyle = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.luminance}%, ${particle.alpha * opacity})`;
            
            // Different organic shapes based on mood
            if (this.contextMood === 'dreamy' || this.contextMood === 'philosophical') {
                // Soft, cloudlike shapes
                this.drawCloudShape(size);
            } else if (this.contextMood === 'intimate' || this.contextMood === 'passionate') {
                // Warm, flowing shapes
                this.drawFlowingShape(size);
            } else if (this.contextMood === 'technical') {
                // More geometric but still soft
                this.drawTechShape(size);
            } else if (this.contextMood === 'adventurous') {
                // Dynamic, energetic shapes
                this.drawEnergeticShape(size);
            } else {
                // Default: soft organic blobs
                this.drawOrganicBlob(size);
            }
            
            // Add subtle glow for depth if appropriate
            if (this.currentPalette.depth > 0.4) {
                const glowSize = size * 2.5;
                const glowGradient = this.ctx.createRadialGradient(0, 0, size/2, 0, 0, glowSize);
                glowGradient.addColorStop(0, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.luminance}%, ${0.2 * opacity})`);
                glowGradient.addColorStop(1, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.luminance}%, 0)`);
                
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    // Organic blob shape with Bezier curves
    drawOrganicBlob(size) {
        const time = Date.now() * 0.001;
        this.ctx.beginPath();
        
        // Create an organic blob with 6-8 points
        const points = Math.floor(6 + Math.random() * 3);
        const angleStep = (Math.PI * 2) / points;
        
        // First point
        const offsetFactor = 0.3; // How much variance in the radius
        let radius = size * (1 - offsetFactor + Math.sin(time) * offsetFactor);
        let angle = 0;
        let x = Math.cos(angle) * radius;
        let y = Math.sin(angle) * radius;
        this.ctx.moveTo(x, y);
        
        // Connect points with bezier curves for smooth, organic shape
        for (let i = 0; i < points; i++) {
            const nextAngle = angle + angleStep;
            const nextRadius = size * (1 - offsetFactor + Math.sin(time + nextAngle) * offsetFactor);
            const nextX = Math.cos(nextAngle) * nextRadius;
            const nextY = Math.sin(nextAngle) * nextRadius;
            
            // Control points for bezier
            const cp1x = x + Math.cos(angle + Math.PI/4) * radius * 0.5;
            const cp1y = y + Math.sin(angle + Math.PI/4) * radius * 0.5;
            const cp2x = nextX - Math.cos(nextAngle - Math.PI/4) * nextRadius * 0.5;
            const cp2y = nextY - Math.sin(nextAngle - Math.PI/4) * nextRadius * 0.5;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, nextX, nextY);
            
            angle = nextAngle;
            radius = nextRadius;
            x = nextX;
            y = nextY;
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    // Dreamy, cloud-like shape
    drawCloudShape(size) {
        this.ctx.beginPath();
        // Create a soft cloud shape with multiple overlapping circles
        const circleCount = 5;
        const baseRadius = size * 0.5;
        
        // Draw center circle
        this.ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
        
        // Draw surrounding circles
        for (let i = 0; i < circleCount; i++) {
            const angle = (Math.PI * 2 * i) / circleCount;
            const x = Math.cos(angle) * baseRadius * 0.8;
            const y = Math.sin(angle) * baseRadius * 0.8;
            const radius = baseRadius * (0.4 + Math.random() * 0.4);
            
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
        
        this.ctx.fill();
    }
    
    // Warm, flowing shape for intimate/passionate moods
    drawFlowingShape(size) {
        const time = Date.now() * 0.0005;
        this.ctx.beginPath();
        
        // Start at center
        this.ctx.moveTo(0, 0);
        
        // Draw organic, flowing shape with bezier curves
        const petalCount = 5;
        const angleStep = (Math.PI * 2) / petalCount;
        
        for (let i = 0; i < petalCount; i++) {
            const angle = i * angleStep;
            const petalLength = size * (0.8 + Math.sin(time + i) * 0.2);
            
            // Petal tip
            const tipX = Math.cos(angle) * petalLength;
            const tipY = Math.sin(angle) * petalLength;
            
            // Control points for bezier curve
            const cp1x = Math.cos(angle - 0.2) * petalLength * 0.5;
            const cp1y = Math.sin(angle - 0.2) * petalLength * 0.5;
            const cp2x = Math.cos(angle + 0.2) * petalLength * 0.5;
            const cp2y = Math.sin(angle + 0.2) * petalLength * 0.5;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, tipX, tipY, cp2x, cp2y);
        }
        
        this.ctx.fill();
    }
    
    // Technical but still organic shape
    drawTechShape(size) {
        this.ctx.beginPath();
        
        // Create a soft polygon shape with a technical feel
        const sides = 6; // Hexagon base
        const angleStep = (Math.PI * 2) / sides;
        
        // First point
        let angle = 0;
        let x = Math.cos(angle) * size;
        let y = Math.sin(angle) * size;
        this.ctx.moveTo(x, y);
        
        // Connect points to form polygon, with subtle curves
        for (let i = 1; i <= sides; i++) {
            angle = i * angleStep;
            x = Math.cos(angle) * size;
            y = Math.sin(angle) * size;
            
            // Add subtle curve to the line for organic feel
            const prevAngle = (i - 1) * angleStep;
            const midX = (Math.cos(prevAngle) * size + x) / 2;
            const midY = (Math.sin(prevAngle) * size + y) / 2;
            const bulgeAmount = size * 0.1;
            const bulgeX = midX + Math.cos(angle - Math.PI/2) * bulgeAmount;
            const bulgeY = midY + Math.sin(angle - Math.PI/2) * bulgeAmount;
            
            this.ctx.quadraticCurveTo(bulgeX, bulgeY, x, y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    // Energetic, dynamic shape for adventurous mood
    drawEnergeticShape(size) {
        const time = Date.now() * 0.001;
        this.ctx.beginPath();
        
        // Create dynamic star-like shape
        const points = 7; // Number of points
        const innerRadius = size * 0.4;
        const outerRadius = size * (0.8 + Math.sin(time) * 0.2);
        const angleStep = (Math.PI * 2) / points;
        
        // First point
        let angle = 0;
        let x = Math.cos(angle) * outerRadius;
        let y = Math.sin(angle) * outerRadius;
        this.ctx.moveTo(x, y);
        
        // Create star shape by alternating inner and outer radius
        for (let i = 0; i < points; i++) {
            // Outer point
            angle = i * angleStep;
            x = Math.cos(angle) * outerRadius;
            y = Math.sin(angle) * outerRadius;
            this.ctx.lineTo(x, y);
            
            // Inner point
            angle += angleStep / 2;
            x = Math.cos(angle) * innerRadius;
            y = Math.sin(angle) * innerRadius;
            this.ctx.lineTo(x, y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // Add these new methods to the AbstractVisualization class to handle LLM parameters
    
    /**
     * Apply parameters from LLM to the visualization
     */
    async applyLLMParameters(params) {
        console.log('Applying LLM parameters to visualization:', params);
        
        // Store the raw parameters
        this.llmParameters = params;
        
        // Apply color palette
        if (params.dominantColors && params.dominantColors.length > 0) {
            this.applyLLMColorPalette(params);
        }
        
        // Apply motion parameters
        this.applyLLMMotionParameters(params);
        
        // Apply emotional tone
        this.applyLLMEmotionalTone(params);
        
        // Update some particles with new properties to reflect the change
        const updateCount = Math.ceil(this.particles.length * 0.2);
        for (let i = 0; i < updateCount; i++) {
            const index = Math.floor(Math.random() * this.particles.length);
            this.particles[index] = this.createParticle(this.particles[index].layerType);
        }
        
        // Trigger a flow field update to reflect new patterns
        this.generateFlowField();
        
        console.log('LLM parameters applied successfully');
    }
    
    /**
     * Apply LLM-generated color palette
     */
    applyLLMColorPalette(params) {
        // Create a custom palette from the LLM-provided colors
        const customPalette = {
            primary: this.hexToHsl(params.dominantColors[0]),
            secondary: params.dominantColors.length > 1 ? this.hexToHsl(params.dominantColors[1]) : this.hexToHsl(params.dominantColors[0]),
            accent: params.dominantColors.length > 2 ? this.hexToHsl(params.dominantColors[2]) : this.hexToHsl(params.dominantColors[0]),
            backgroundGradient: [
                this.hexToHsl(params.dominantColors[0]),
                params.dominantColors.length > 1 ? this.hexToHsl(params.dominantColors[1]) : this.hexToHsl(params.dominantColors[0])
            ],
            saturation: 70 + Math.round(params.energyLevel * 20), // Higher energy = more saturation
            luminance: [
                10 + Math.round(params.energyLevel * 10),
                50 + Math.round(params.energyLevel * 20)
            ],
            depth: 0.4 + params.energyLevel * 0.4 // Higher energy = more depth
        };
        
        // Set as target palette
        this.targetPalette = customPalette;
        
        console.log('LLM color palette applied', customPalette);
    }
    
    /**
     * Apply LLM-generated motion parameters
     */
    applyLLMMotionParameters(params) {
        // Create custom effect settings based on LLM parameters
        const customEffect = {
            organicMovement: params.energyLevel * 0.8 + 0.2,
            fluidity: (1 - params.turbulence) * 0.7 + 0.3,
            expressiveness: params.energyLevel * 0.7 + 0.3,
            flowFieldScale: 0.005 + params.turbulence * 0.02,
            flowFieldSpeed: 0.0005 + params.flowSpeed * 0.002,
            turbulence: params.turbulence * 0.3,
            particleSize: params.particleSize,
            palette: 'custom' // Using our custom palette
        };
        
        // Set as target effect
        this.targetEffect = customEffect;
        
        // Adjust transition speed based on transition style
        if (params.transitionStyle === 'sudden' || params.transitionStyle === 'rapid') {
            this.transitionSpeed = 0.03;
        } else if (params.transitionStyle === 'very slow' || params.transitionStyle === 'gradual') {
            this.transitionSpeed = 0.005;
        } else {
            this.transitionSpeed = 0.01; // Default
        }
        
        console.log('LLM motion parameters applied', customEffect);
    }
    
    /**
     * Apply LLM-generated emotional tone
     */
    applyLLMEmotionalTone(params) {
        // Update context mood for shape generation
        const previousMood = this.contextMood;
        
        // Map emotional tone to a visualization mood
        const moodMap = {
            'happy': 'adventurous',
            'joyful': 'adventurous',
            'excited': 'adventurous',
            'energetic': 'adventurous',
            
            'calm': 'reflective',
            'peaceful': 'reflective',
            'serene': 'reflective',
            'tranquil': 'reflective',
            'relaxed': 'reflective',
            
            'sad': 'intimate',
            'melancholic': 'intimate',
            'nostalgic': 'intimate',
            'longing': 'intimate',
            
            'anxious': 'technical',
            'tense': 'technical',
            'nervous': 'technical',
            'stressed': 'technical',
            
            'mysterious': 'philosophical',
            'curious': 'philosophical',
            'wondering': 'philosophical',
            'thoughtful': 'philosophical',
            
            'angry': 'passionate',
            'intense': 'passionate',
            'passionate': 'passionate',
            'fiery': 'passionate',
            
            'dreamy': 'dreamy',
            'fantasy': 'dreamy',
            'magical': 'dreamy',
            'whimsical': 'dreamy'
        };
        
        // Find matching mood or default to neutral
        let newMood = 'neutral';
        const emotionalTone = params.emotionalTone.toLowerCase();
        
        for (const [emotion, mood] of Object.entries(moodMap)) {
            if (emotionalTone.includes(emotion)) {
                newMood = mood;
                break;
            }
        }
        
        // Check secondary emotions for additional influence
        if (params.secondaryEmotions && params.secondaryEmotions.length > 0) {
            // Store secondary moods for layered visuals
            this.secondaryMoods = [];
            
            params.secondaryEmotions.forEach(emotion => {
                const emotionLower = emotion.toLowerCase();
                for (const [emotionKey, mood] of Object.entries(moodMap)) {
                    if (emotionLower.includes(emotionKey) && !this.secondaryMoods.includes(mood)) {
                        this.secondaryMoods.push(mood);
                    }
                }
            });
            
            console.log('Secondary moods:', this.secondaryMoods);
        }
        
        // Update mood history
        this.moodHistory.unshift(newMood);
        this.moodHistory = this.moodHistory.slice(0, 3);
        
        // Only change context mood if it's consistently different
        if (newMood !== previousMood) {
            console.log(`Changing visualization mood from ${previousMood} to ${newMood}`);
            this.contextMood = newMood;
        }
    }
    
    /**
     * Convert hex color to HSL hue value
     */
    hexToHsl(hex) {
        // Remove # if present
        hex = hex.replace(/^#/, '');
        
        // Parse hex
        let r, g, b;
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16) / 255;
            g = parseInt(hex[1] + hex[1], 16) / 255;
            b = parseInt(hex[2] + hex[2], 16) / 255;
        } else {
            r = parseInt(hex.substr(0, 2), 16) / 255;
            g = parseInt(hex.substr(2, 2), 16) / 255;
            b = parseInt(hex.substr(4, 2), 16) / 255;
        }
        
        // Calculate HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            // Achromatic
            h = 0;
            s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }
        
        // Convert hue to degrees
        return Math.round(h * 360);
    }
    
    // Enhance the drawOrganicParticles method to incorporate LLM-generated visual metaphors
    drawOrganicParticles(particles, opacity = 1) {
        const time = Date.now() * 0.001;
        
        particles.forEach(particle => {
            // Save context for transformations
            this.ctx.save();
            
            // Position at particle center
            this.ctx.translate(particle.x, particle.y);
            
            // Gradual rotation for organic feel
            const rotationSpeed = 0.2;
            this.ctx.rotate(particle.individualOffset + time * rotationSpeed);
            
            // Get current size (with pulsing effect)
            const size = particle.currentSize || particle.size;
            
            // Draw a more organic shape based on context mood and LLM parameters
            this.ctx.fillStyle = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.luminance}%, ${particle.alpha * opacity})`;
            
            // Different organic shapes based on mood and LLM visual metaphors
            if (this.llmParameters && this.llmParameters.visualMetaphors && 
                this.llmParameters.visualMetaphors.length > 0 && Math.random() < 0.3) {
                // Use LLM-suggested metaphors for 30% of particles
                this.drawMetaphorInspiredShape(size, this.llmParameters.visualMetaphors);
            } else {
                // Use mood-based shapes for the rest
                this.drawMoodBasedShape(size);
            }
            
            // Add subtle glow for depth if appropriate
            if (this.currentPalette.depth > 0.4) {
                const glowSize = size * 2.5;
                const glowGradient = this.ctx.createRadialGradient(0, 0, size/2, 0, 0, glowSize);
                glowGradient.addColorStop(0, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.luminance}%, ${0.2 * opacity})`);
                glowGradient.addColorStop(1, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.luminance}%, 0)`);
                
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    // Draw shape based on current mood
    drawMoodBasedShape(size) {
        // Different organic shapes based on mood
        if (this.contextMood === 'dreamy' || this.contextMood === 'philosophical') {
            // Soft, cloudlike shapes
            this.drawCloudShape(size);
        } else if (this.contextMood === 'intimate' || this.contextMood === 'passionate') {
            // Warm, flowing shapes
            this.drawFlowingShape(size);
        } else if (this.contextMood === 'technical') {
            // More geometric but still soft
            this.drawTechShape(size);
        } else if (this.contextMood === 'adventurous') {
            // Dynamic, energetic shapes
            this.drawEnergeticShape(size);
        } else {
            // Default: soft organic blobs
            this.drawOrganicBlob(size);
        }
    }
    
    // Draw shape inspired by LLM-provided visual metaphors
    drawMetaphorInspiredShape(size, metaphors) {
        // Select a random metaphor from the list
        const metaphor = metaphors[Math.floor(Math.random() * metaphors.length)].toLowerCase();
        
        // Map common metaphors to shape drawing functions
        if (metaphor.includes('wave') || metaphor.includes('ocean') || metaphor.includes('water')) {
            this.drawWaveShape(size);
        } else if (metaphor.includes('star') || metaphor.includes('sparkle') || metaphor.includes('light')) {
            this.drawStarShape(size);
        } else if (metaphor.includes('leaf') || metaphor.includes('plant') || metaphor.includes('tree')) {
            this.drawLeafShape(size);
        } else if (metaphor.includes('cloud') || metaphor.includes('mist') || metaphor.includes('fog')) {
            this.drawCloudShape(size * 1.2);
        } else if (metaphor.includes('fire') || metaphor.includes('flame') || metaphor.includes('burn')) {
            this.drawFlameShape(size);
        } else if (metaphor.includes('mountain') || metaphor.includes('peak') || metaphor.includes('rock')) {
            this.drawMountainShape(size);
        } else if (metaphor.includes('wind') || metaphor.includes('breeze') || metaphor.includes('air')) {
            this.drawWindShape(size);
        } else if (metaphor.includes('flower') || metaphor.includes('bloom') || metaphor.includes('petal')) {
            this.drawFlowerShape(size);
        } else if (metaphor.includes('crystal') || metaphor.includes('gem') || metaphor.includes('mineral')) {
            this.drawCrystalShape(size);
        } else if (metaphor.includes('rain') || metaphor.includes('drop') || metaphor.includes('drizzle')) {
            this.drawRainShape(size);
        } else {
            // Default to a nature-inspired organic shape
            this.drawOrganicBlob(size);
        }
    }
    
    // Additional shape drawing methods for metaphors
    
    drawWaveShape(size) {
        const time = Date.now() * 0.001;
        this.ctx.beginPath();
        
        // Draw a wave-like shape
        const waveHeight = size * 0.4;
        const waveLength = size * 2;
        
        this.ctx.moveTo(-size, 0);
        
        // Create wave path
        for (let x = -size; x <= size; x += 5) {
            const y = Math.sin((x + time * 5) / waveLength * Math.PI * 2) * waveHeight;
            this.ctx.lineTo(x, y);
        }
        
        // Complete the shape by drawing back to start
        this.ctx.lineTo(size, size);
        this.ctx.lineTo(-size, size);
        this.ctx.closePath();
        
        this.ctx.fill();
    }
    
    drawStarShape(size) {
        const time = Date.now() * 0.001;
        const points = 5 + Math.floor(Math.random() * 3); // 5-7 points
        const outerRadius = size;
        const innerRadius = size * 0.4;
        
        this.ctx.beginPath();
        
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * 2 * i) / (points * 2) + time * 0.5;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawLeafShape(size) {
        this.ctx.beginPath();
        
        // Draw a leaf-like shape
        this.ctx.ellipse(0, 0, size * 0.5, size, Math.PI / 4, 0, Math.PI * 2);
        
        // Add a stem
        this.ctx.moveTo(size * 0.35, size * 0.35);
        this.ctx.lineTo(size * 0.7, size * 0.7);
        
        this.ctx.fill();
    }
    
    drawFlameShape(size) {
        const time = Date.now() * 0.002;
        this.ctx.beginPath();
        
        // Base of the flame
        this.ctx.moveTo(-size * 0.5, size * 0.5);
        
        // Left side
        this.ctx.quadraticCurveTo(
            -size * 0.3, 0,
            -size * 0.2, -size * 0.3
        );
        
        // Middle peak with time-based variation
        this.ctx.quadraticCurveTo(
            -size * 0.1 + Math.sin(time) * size * 0.1, -size * (0.8 + Math.sin(time) * 0.2),
            size * 0.1 + Math.sin(time + 1) * size * 0.1, -size * (0.7 + Math.sin(time + 2) * 0.2)
        );
        
        // Right side
        this.ctx.quadraticCurveTo(
            size * 0.3, 0,
            size * 0.5, size * 0.5
        );
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawMountainShape(size) {
        this.ctx.beginPath();
        
        // Base of the mountain
        this.ctx.moveTo(-size, size * 0.5);
        
        // Left slope
        this.ctx.lineTo(-size * 0.3, -size * 0.3);
        
        // Mountain peak
        this.ctx.lineTo(0, -size * 0.7);
        
        // Right slope
        this.ctx.lineTo(size * 0.4, -size * 0.1);
        
        // Second peak
        this.ctx.lineTo(size * 0.7, -size * 0.4);
        
        // Down to base
        this.ctx.lineTo(size, size * 0.5);
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawWindShape(size) {
        const time = Date.now() * 0.001;
        this.ctx.beginPath();
        
        // Create flowing wind curves
        this.ctx.moveTo(-size, 0);
        
        // First wind curve
        this.ctx.bezierCurveTo(
            -size * 0.5, -size * 0.3 + Math.sin(time) * size * 0.2,
            0, size * 0.3 + Math.sin(time + 1) * size * 0.2,
            size * 0.5, -size * 0.1 + Math.sin(time + 2) * size * 0.2
        );
        
        // Continue the curve
        this.ctx.bezierCurveTo(
            size * 0.7, -size * 0.4 + Math.sin(time + 3) * size * 0.2,
            size, size * 0.2 + Math.sin(time + 4) * size * 0.1,
            size, 0
        );
        
        // Connect back with flowing curves
        this.ctx.bezierCurveTo(
            size * 0.8, size * 0.3,
            size * 0.2, size * 0.3,
            -size * 0.5, size * 0.3
        );
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawFlowerShape(size) {
        const time = Date.now() * 0.001;
        const petalCount = 5 + Math.floor(Math.random() * 3); // 5-7 petals
        
        // Draw flower center
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw each petal
        for (let i = 0; i < petalCount; i++) {
            const angle = (Math.PI * 2 * i) / petalCount + time * 0.2;
            this.ctx.save();
            this.ctx.rotate(angle);
            
            // Petal shape
            this.ctx.beginPath();
            this.ctx.ellipse(size * 0.5, 0, size * 0.5, size * 0.25, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }
    
    drawCrystalShape(size) {
        this.ctx.beginPath();
        
        // Crystal top point
        this.ctx.moveTo(0, -size);
        
        // Crystal facets
        const facets = 6 + Math.floor(Math.random() * 3); // 6-8 facets
        
        for (let i = 0; i < facets; i++) {
            const angle = (Math.PI * 2 * i) / facets;
            const x = Math.cos(angle) * size * 0.5;
            const y = Math.sin(angle) * size * 0.5;
            
            this.ctx.lineTo(x, y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawRainShape(size) {
        const time = Date.now() * 0.001;
        
        // Draw a raindrop shape
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        
        // Create the teardrop shape
        this.ctx.bezierCurveTo(
            size * 0.5, -size * 0.7,
            size * 0.7, -size * 0.3,
            0, size * 0.3 + Math.sin(time * 3) * size * 0.1
        );
        
        this.ctx.bezierCurveTo(
            -size * 0.7, -size * 0.3,
            -size * 0.5, -size * 0.7,
            0, -size
        );
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    // Enhanced update transitions method to create more fluid transitions
    updateTransitions() {
        // Use weighted average for smoother historical transitions
        const weightedSentiment = (this.sentimentHistory[0] * 0.6 + 
                                 (this.sentimentHistory[1] || 0) * 0.3 + 
                                 (this.sentimentHistory[2] || 0) * 0.1);
        
        // Transition effect properties if target effect exists
        if (this.targetEffect) {
            // For each property in the effect, transition toward target
            for (const [key, targetValue] of Object.entries(this.targetEffect)) {
                // Skip non-numeric properties for smooth transitions
                if (typeof targetValue === 'number' && typeof this.currentEffect[key] === 'number') {
                    const diff = targetValue - this.currentEffect[key];
                    if (Math.abs(diff) > 0.001) {
                        // Very smooth, gradual transitions
                        this.currentEffect[key] += diff * this.transitionSpeed;
                    }
                } else if (key !== 'palette') {
                    // For non-numeric properties, use probability-based transition
                    // More likely to change as time passes
                    const transitionChance = Math.random() < this.transitionSpeed * 10;
                    if (transitionChance) {
                        this.currentEffect[key] = targetValue;
                    }
                }
            }
        }
        
        // Transition color palette if target palette exists
        if (this.targetPalette) {
            for (const [key, targetValue] of Object.entries(this.targetPalette)) {
                if (Array.isArray(targetValue)) {
                    // For array values (like luminance range or gradient)
                    if (!Array.isArray(this.currentPalette[key])) {
                        // Initialize array if it doesn't exist
                        this.currentPalette[key] = [...targetValue];
                    } else {
                        // Transition each element in the array
                        for (let i = 0; i < targetValue.length; i++) {
                            if (typeof targetValue[i] === 'number' && typeof this.currentPalette[key][i] === 'number') {
                                const diff = targetValue[i] - this.currentPalette[key][i];
                                if (Math.abs(diff) > 0.1) {
                                    this.currentPalette[key][i] += diff * this.transitionSpeed;
                                }
                            }
                        }
                    }
                } else if (typeof targetValue === 'number') {
                    // For numeric values
                    const diff = targetValue - this.currentPalette[key];
                    if (Math.abs(diff) > 0.1) {
                        this.currentPalette[key] += diff * this.transitionSpeed;
                    }
                }
            }
        }
    }
}
