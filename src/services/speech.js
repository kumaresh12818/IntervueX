/**
 * IntervueX — Deepgram Real-Time Speech Recognition Service
 * Works in ALL browsers (Opera GX, Firefox, Safari, Chrome, Edge)
 * Uses Deepgram streaming API via WebSocket with PCM audio from mic
 * Falls back to browser SpeechRecognition if Deepgram fails
 */

export class SpeechService {
  constructor() {
    this.ws = null
    this.micStream = null
    this.audioCtx = null
    this.processor = null
    this.isActive = false
    this.isMuted = false
    this.onFinalTranscript = null
    this.onPartialTranscript = null
    this.onError = null
    this.onStatusChange = null
    this.mode = null // 'deepgram' | 'native' | 'text-only'
    this._utteranceBuffer = ''
    this._keepAliveInterval = null
  }

  async start(apiKey) {
    if (apiKey) {
      try {
        await this._startDeepgram(apiKey)
        return
      } catch (err) {
        console.warn('[Speech] Deepgram failed, trying native fallback:', err.message)
      }
    }

    // Fallback: native SpeechRecognition (Chrome/Edge only)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      try {
        this._startNative(SR)
        return
      } catch (err) {
        console.warn('[Speech] Native recognition failed:', err.message)
      }
    }

    // Final fallback: text-only mode
    this.mode = 'text-only'
    this.onStatusChange?.('text-only')
    console.log('[Speech] No speech recognition available. Text-only mode.')
  }

  async _startDeepgram(apiKey) {
    this.onStatusChange?.('connecting')

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    })

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
    const source = this.audioCtx.createMediaStreamSource(this.micStream)
    const nativeRate = this.audioCtx.sampleRate

    const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&utterance_end_ms=4000&vad_events=true&smart_format=true&punctuate=true`
    
    // Pass the key via WebSockets protocol auth Header
    this.ws = new WebSocket(wsUrl, ['token', apiKey])

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 10000)
      this.ws.onopen = () => { clearTimeout(timeout); resolve() }
      this.ws.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket error')) }
    })

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // 1. Handle complete silence detection (True End of Turn)
        if (data.type === 'UtteranceEnd') {
          const finalUtterance = this._utteranceBuffer.trim()
          if (finalUtterance) {
            this.onFinalTranscript?.(finalUtterance)
            this._utteranceBuffer = ''
          }
          return
        }

        // 2. Handle actively streaming words
        if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
          const transcript = data.channel.alternatives[0].transcript
          
          if (data.is_final) {
            if (transcript) this._utteranceBuffer += transcript + ' '
          }

          const currentPartial = (data.is_final ? '' : transcript || '')
          const currentText = (this._utteranceBuffer + currentPartial).trim()
          
          if (currentText) {
            this.onPartialTranscript?.(currentText)
          }
        }
      } catch {}
    }

    this.ws.onclose = () => {
      if (this.isActive) {
        console.log('[Speech] Deepgram WebSocket closed')
        this.onStatusChange?.('disconnected')
      }
    }

    this.ws.onerror = () => this.onError?.('Speech recognition connection error')

    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (e) => {
      if (!this.isActive || this.isMuted) return
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

      let float32 = e.inputBuffer.getChannelData(0)

      if (nativeRate > 16000) {
        const ratio = nativeRate / 16000
        const newLen = Math.floor(float32.length / ratio)
        const resampled = new Float32Array(newLen)
        for (let i = 0; i < newLen; i++) {
          const pos = i * ratio
          const idx = Math.floor(pos)
          const frac = pos - idx
          resampled[i] = float32[idx] * (1 - frac) + (float32[idx + 1] || 0) * frac
        }
        float32 = resampled
      }

      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      this.ws.send(int16.buffer)
    }

    source.connect(this.processor)
    this.processor.connect(this.audioCtx.destination)

    this.isActive = true
    this.mode = 'deepgram'
    this.onStatusChange?.('active')
    console.log(`[Speech] Deepgram active (mic: ${nativeRate}Hz)`)
  }

  _startNative(SR) {
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onresult = (event) => {
      if (this.isMuted) return
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim()
          if (text && text.length > 1) {
            this.onFinalTranscript?.(text)
          }
        }
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') this.onError?.('Microphone blocked.')
    }

    rec.onend = () => {
      if (this.isActive && !this.isMuted) {
        setTimeout(() => { try { rec.start() } catch {} }, 100)
      }
    }

    rec.start()
    this._nativeRec = rec
    this.isActive = true
    this.mode = 'native'
    this.onStatusChange?.('active')
    console.log('[Speech] Native SpeechRecognition active')
  }

  mute() {
    this.isMuted = true
    if (this._nativeRec) try { this._nativeRec.stop() } catch {}

    // Prevent Deepgram from closing the socket (12s idle timeout) when we stop sending audio
    if (this.mode === 'deepgram' && this.ws?.readyState === WebSocket.OPEN) {
      if (!this._keepAliveInterval) {
        this._keepAliveInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'KeepAlive' }))
          }
        }, 3000)
      }
    }
  }

  unmute() {
    this.isMuted = false
    if (this._nativeRec && this.isActive) {
      try { this._nativeRec.start() } catch {}
    }
    
    if (this._keepAliveInterval) {
      clearInterval(this._keepAliveInterval)
      this._keepAliveInterval = null
    }
  }

  stop() {
    this.isActive = false
    this.isMuted = false

    if (this._keepAliveInterval) {
      clearInterval(this._keepAliveInterval)
      this._keepAliveInterval = null
    }

    if (this._nativeRec) { try { this._nativeRec.stop() } catch {}; this._nativeRec = null }
    this._utteranceBuffer = ''
    if (this.processor) { this.processor.disconnect(); this.processor = null }
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null }
    if (this.audioCtx) { this.audioCtx.close().catch(() => {}); this.audioCtx = null }
    if (this.ws) {
      try { this.ws.send(JSON.stringify({ type: 'CloseStream' })) } catch {}
      this.ws.close()
      this.ws = null
    }
    this.onStatusChange?.('stopped')
  }
}
