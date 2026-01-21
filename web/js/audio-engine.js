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
        this.dataArray = null;
        this.isPlaying = false;
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
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        this.source.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.source.start(0);
        this.isPlaying = true;
    }

    stop() {
        this.isPlaying = false;
        if (this.source) {
            try { this.source.stop(); } catch(e) {}
            try { this.source.disconnect(); } catch(e) {}
            this.source = null;
        }
    }

    getFrequencyData() {
        if (!this.analyser || !this.isPlaying) return null;
        this.analyser.getByteFrequencyData(this.dataArray);
        return {
            data: this.dataArray,
            sampleRate: this.ctx.sampleRate,
            fftSize: this.analyser.fftSize
        };
    }

    get state() {
        return this.ctx ? this.ctx.state : 'closed';
    }
}
