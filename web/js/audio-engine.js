/**
 * audio-engine.js
 * NeuralAudioEngine Class
 * Handles Web Audio API context, loading, decoding, and analyzing audio data.
 */

class NeuralAudioEngine {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.source = null;
        this.gainNode = null; // Added for volume control
        this.dataArray = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.isMuted = false;
        this.volume = 0.7; // Default volume
    }

    initContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    async loadFromUrl(url) {
        this.initContext();
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Audio file not found");
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.playBuffer(decodedBuffer);
            return true;
        } catch (err) {
            console.error("Audio Load Error:", err);
            return false;
        }
    }

    async loadFromFile(file) {
        this.initContext();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                    this.playBuffer(decodedBuffer);
                    resolve(true);
                } catch (err) {
                    console.error("Decode Error:", err);
                    resolve(false);
                }
            };
            reader.onerror = () => resolve(false);
            reader.readAsArrayBuffer(file);
        });
    }

    playBuffer(buffer) {
        this.stop(); // Stop previous if any

        this.source = this.ctx.createBufferSource();
        this.source.buffer = buffer;
        this.source.loop = true;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        
        // Create GainNode for volume/mute
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this.isMuted ? 0 : this.volume;

        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        // Connection Chain: Source -> Analyser -> Gain -> Destination
        this.source.connect(this.analyser);
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
        
        this.source.start(0);
        this.realStartTime = Date.now(); 
        this.isPlaying = true;
    }

    setMute(muted) {
        this.isMuted = muted;
        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
        }
    }

    setVolume(value) {
        this.volume = parseFloat(value);
        if (this.gainNode && !this.isMuted) {
            this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
        }
    }

    pause() {
        if (this.ctx && (this.ctx.state === 'running' || this.ctx.state === 'interrupted')) {
            console.log("Suspending AudioContext...");
            this.ctx.suspend().then(() => {
                this.isPlaying = false;
                console.log("AudioContext Suspended.");
            });
        } else {
            this.isPlaying = false;
        }
    }

    resume() {
        if (this.ctx && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
            console.log("Resuming AudioContext...");
            this.ctx.resume().then(() => {
                this.isPlaying = true;
                console.log("AudioContext Resumed. State:", this.ctx.state);
            });
        } else if (this.ctx) {
            this.isPlaying = true;
        }
    }

    stop() {
        this.isPlaying = false;
        this.realStartTime = 0;
        if (this.source) {
            try { this.source.stop(); } catch(e) {}
            try { this.source.disconnect(); } catch(e) {}
            this.source = null;
        }
        if (this.gainNode) {
            try { this.gainNode.disconnect(); } catch(e) {}
            this.gainNode = null;
        }
    }

    getFrequencyData() {
        if (!this.analyser || !this.ctx || this.ctx.state === 'closed') return null;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        return {
            data: this.dataArray,
            sampleRate: this.ctx.sampleRate,
            fftSize: this.analyser.fftSize,
            currentTime: (Date.now() - this.realStartTime) / 1000
        };
    }

    get state() {
        return this.ctx ? this.ctx.state : 'closed';
    }
}
