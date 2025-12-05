class EnvironmentalAudioEngine {
    constructor() {
        this.audioContext = null;
        this.oscillators = [];
        this.gainNodes = [];
        this.convolver = null;
        this.masterGain = null;
        this.isRunning = false;
        
        // Base frequencies for each octave (A notes)
        this.baseFrequencies = [55, 110, 220, 440, 880, 1760, 3520, 7040];
        this.currentFrequencies = [...this.baseFrequencies];
        
        // Individual volume levels (softer overall, varied per oscillator)
        this.oscillatorVolumes = [0.03, 0.03, 0.02, 0.025, 0.015, 0.02, 0.01, 0.008];
        
        // Intermittent oscillators (A6 and A8)
        this.intermittentOscillators = [5, 7]; // Indices for A6 and A8
        this.intermittentTimers = [];
        
        // Environmental parameters
        this.latitude = 0;
        this.longitude = 0;
        this.speed = 0; // meters per second
        this.temperature = 20;
        this.timeOfDay = 0.5; // 0.0 = midnight, 0.5 = noon, 1.0 = midnight
        
        this.onFrequencyUpdate = null;
    }
    
    async start() {
        if (this.isRunning) return;
        
        // Create audio context (must be after user interaction on iOS)
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume context if suspended (iOS requirement)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        // Additional iOS fix - force resume again after a tiny delay
        setTimeout(() => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, 100);
        
        // Create reverb
        this.convolver = this.audioContext.createConvolver();
        this.convolver.buffer = this.createReverbImpulse();
        
        // Create master gain for overall volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.6; // Master volume
        
        // Connect reverb -> master gain -> destination
        this.convolver.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
        
        // Create 8 oscillators with individual gain nodes
        for (let i = 0; i < 8; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = this.baseFrequencies[i];
            
            // Set individual volume per oscillator
            const isIntermittent = this.intermittentOscillators.includes(i);
            gainNode.gain.value = isIntermittent ? 0 : this.oscillatorVolumes[i];
            
            // Connect oscillator -> gain -> reverb
            oscillator.connect(gainNode);
            gainNode.connect(this.convolver);
            
            oscillator.start();
            
            this.oscillators.push(oscillator);
            this.gainNodes.push(gainNode);
        }
        
        this.isRunning = true;
        this.updateFrequencies();
        
        // Start intermittent behavior for A6 and A8
        this.startIntermittentOscillators();
    }
    
    createReverbImpulse() {
        // Create a reverb impulse response (simulates room acoustics)
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 3; // 3 second reverb
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Exponential decay with some randomness
                const decay = Math.pow(1 - i / length, 2);
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }
        
        return impulse;
    }
    
    startIntermittentOscillators() {
        // A6 (index 5): Pulse on/off every 8-15 seconds
        const startA6Timer = () => {
            const interval = 8000 + Math.random() * 7000; // 8-15 seconds
            const duration = 2000 + Math.random() * 4000; // 2-6 seconds on
            
            const timer = setTimeout(() => {
                this.fadeIn(5, 0.5); // Fade in over 0.5s
                setTimeout(() => {
                    this.fadeOut(5, 1.0); // Fade out over 1s
                    startA6Timer(); // Schedule next pulse
                }, duration);
            }, interval);
            
            this.intermittentTimers.push(timer);
        };
        
        // A8 (index 7): Pulse on/off every 10-20 seconds
        const startA8Timer = () => {
            const interval = 10000 + Math.random() * 10000; // 10-20 seconds
            const duration = 1000 + Math.random() * 3000; // 1-4 seconds on
            
            const timer = setTimeout(() => {
                this.fadeIn(7, 0.3); // Fade in over 0.3s
                setTimeout(() => {
                    this.fadeOut(7, 0.8); // Fade out over 0.8s
                    startA8Timer(); // Schedule next pulse
                }, duration);
            }, interval);
            
            this.intermittentTimers.push(timer);
        };
        
        // Start the timers
        startA6Timer();
        startA8Timer();
    }
    
    fadeIn(oscIndex, duration) {
        if (!this.isRunning || !this.gainNodes[oscIndex]) return;
        const now = this.audioContext.currentTime;
        const gainNode = this.gainNodes[oscIndex];
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.oscillatorVolumes[oscIndex], now + duration);
    }
    
    fadeOut(oscIndex, duration) {
        if (!this.isRunning || !this.gainNodes[oscIndex]) return;
        const now = this.audioContext.currentTime;
        const gainNode = this.gainNodes[oscIndex];
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
    }
    
    stop() {
        if (!this.isRunning) return;
        
        // Clear intermittent timers
        this.intermittentTimers.forEach(timer => clearTimeout(timer));
        this.intermittentTimers = [];
        
        // Stop all oscillators
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {
                // Already stopped
            }
        });
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.oscillators = [];
        this.gainNodes = [];
        this.convolver = null;
        this.masterGain = null;
        this.audioContext = null;
        this.isRunning = false;
    }
    
    setEnvironmentalData(lat, lon, speed, temp, timeOfDay) {
        this.latitude = lat;
        this.longitude = lon;
        this.speed = speed;
        this.temperature = temp;
        this.timeOfDay = timeOfDay;
        
        this.updateFrequencies();
    }
    
    updateFrequencies() {
        if (!this.isRunning) return;
        
        // Normalize environmental parameters
        const latNorm = (this.latitude + 90) / 180; // 0 to 1
        const lonNorm = (this.longitude + 180) / 360; // 0 to 1
        const speedNorm = Math.min(this.speed / 30, 1); // Max at 30 m/s
        const tempNorm = (this.temperature + 20) / 60; // -20°C to 40°C
        
        // Calculate frequencies for each oscillator
        // A1 (55 Hz): Latitude - slow drift (±10% of base)
        this.currentFrequencies[0] = this.baseFrequencies[0] * (0.9 + latNorm * 0.2);
        
        // A2 (110 Hz): Longitude - slow drift (±10% of base)
        this.currentFrequencies[1] = this.baseFrequencies[1] * (0.9 + lonNorm * 0.2);
        
        // A3 (220 Hz): Speed - more responsive (±20% of base)
        this.currentFrequencies[2] = this.baseFrequencies[2] * (0.8 + speedNorm * 0.4);
        
        // A4 (440 Hz): Temperature - moderate drift (±15% of base)
        this.currentFrequencies[3] = this.baseFrequencies[3] * (0.85 + tempNorm * 0.3);
        
        // A5 (880 Hz): Time of day - cyclical (±15% of base)
        this.currentFrequencies[4] = this.baseFrequencies[4] * (0.85 + this.timeOfDay * 0.3);
        
        // A6 (1760 Hz): Combined lat+speed (±25% of base)
        const combo1 = (latNorm + speedNorm) / 2;
        this.currentFrequencies[5] = this.baseFrequencies[5] * (0.75 + combo1 * 0.5);
        
        // A7 (3520 Hz): Combined lon+temp (±25% of base)
        const combo2 = (lonNorm + tempNorm) / 2;
        this.currentFrequencies[6] = this.baseFrequencies[6] * (0.75 + combo2 * 0.5);
        
        // A8 (7040 Hz): All combined (±30% of base)
        const comboAll = (latNorm + lonNorm + speedNorm + tempNorm + this.timeOfDay) / 5;
        this.currentFrequencies[7] = this.baseFrequencies[7] * (0.7 + comboAll * 0.6);
        
        // Apply frequencies to oscillators with smooth ramping
        this.oscillators.forEach((osc, i) => {
            if (osc.frequency) {
                // Use exponentialRampToValueAtTime for smooth transitions
                const now = this.audioContext.currentTime;
                osc.frequency.cancelScheduledValues(now);
                osc.frequency.setValueAtTime(osc.frequency.value, now);
                osc.frequency.exponentialRampToValueAtTime(
                    Math.max(20, this.currentFrequencies[i]), // Clamp to valid range
                    now + 0.1 // 100ms ramp
                );
            }
        });
        
        // Notify UI of frequency update
        if (this.onFrequencyUpdate) {
            this.onFrequencyUpdate(this.currentFrequencies);
        }
    }
}
