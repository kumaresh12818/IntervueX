/**
 * IntervueX — AssemblyAI Real-Time Speech Recognition Service
 * Works in ALL browsers (Opera GX, Firefox, Safari, Chrome, Edge)
 * Uses AssemblyAI streaming API via WebSocket with PCM audio from mic
 * Falls back to browser SpeechRecognition if AssemblyAI fails
 */

const ASSEMBLYAI_WS_BASE = 'wss://streaming.assemblyai.com/v3/ws'

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
    this.mode = null // 'assemblyai' | 'native' | 'text-only'
  }

  async start(assemblyAiKey) {
    // Try AssemblyAI first (works in ALL browsers)
    if (assemblyAiKey) {
      try {
        await this._startAssemblyAI(assemblyAiKey)
        return
      } catch (err) {
        console.warn('[Speech] AssemblyAI failed, trying native fallback:', err.message)
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

  async _startAssemblyAI(apiKey) {
    // 1. Get temporary token via our proxy to avoid CORS
    this.onStatusChange?.('connecting')
    const tokenRes = await fetch(
      `/api/assembly/v3/token?expires_in_seconds=600`,
      { headers: { Authorization: apiKey } }
    )
    if (!tokenRes.ok) throw new Error(`Token request failed: ${tokenRes.status}`)
    const { token } = await tokenRes.json()

    // 2. Get mic access
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    })

    // 3. Set up audio processing at 16kHz
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
    const source = this.audioCtx.createMediaStreamSource(this.micStream)
    const nativeRate = this.audioCtx.sampleRate

    // 4. Connect to AssemblyAI
    const wsUrl = `${ASSEMBLYAI_WS_BASE}?sample_rate=${nativeRate <= 16000 ? nativeRate : 16000}&speech_model=universal&token=${token}`
    this.ws = new WebSocket(wsUrl)

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 10000)
      this.ws.onopen = () => { clearTimeout(timeout); resolve() }
      this.ws.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket error')) }
    })

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'Turn') {
          if (data.end_of_turn && data.transcript?.trim()) {
            this.onFinalTranscript?.(data.transcript.trim())
          } else if (data.transcript) {
            this.onPartialTranscript?.(data.transcript)
          }
        }
      } catch {}
    }

    this.ws.onclose = () => {
      if (this.isActive) {
        console.log('[Speech] AssemblyAI WebSocket closed')
        this.onStatusChange?.('disconnected')
      }
    }

    this.ws.onerror = () => this.onError?.('Speech recognition connection error')

    // 5. Stream audio as PCM int16
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (e) => {
      if (!this.isActive || this.isMuted) return
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

      let float32 = e.inputBuffer.getChannelData(0)

      // Downsample if needed (simple linear interpolation)
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

      // Convert to int16 PCM
      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      // Send as binary
      this.ws.send(int16.buffer)
    }

    source.connect(this.processor)
    this.processor.connect(this.audioCtx.destination)

    this.isActive = true
    this.mode = 'assemblyai'
    this.onStatusChange?.('active')
    console.log(`[Speech] AssemblyAI active (mic: ${nativeRate}Hz)`)
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
  }

  unmute() {
    this.isMuted = false
    if (this._nativeRec && this.isActive) {
      try { this._nativeRec.start() } catch {}
    }
  }

  stop() {
    this.isActive = false
    this.isMuted = false

    if (this._nativeRec) { try { this._nativeRec.stop() } catch {}; this._nativeRec = null }
    if (this.processor) { this.processor.disconnect(); this.processor = null }
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null }
    if (this.audioCtx) { this.audioCtx.close().catch(() => {}); this.audioCtx = null }
    if (this.ws) {
      try { this.ws.send(JSON.stringify({ type: 'Terminate' })) } catch {}
      this.ws.close()
      this.ws = null
    }
    this.onStatusChange?.('stopped')
  }
}
