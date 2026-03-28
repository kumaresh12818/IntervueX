/**
 * IntervueX — Gemini Live API Service
 * Uses raw audio streaming (works in ALL browsers) + audio output.
 * Supports model fallback and multi-endpoint retry.
 */

const MODELS = [
  'gemini-2.5-flash-preview-native-audio-dialog',
  'gemini-2.5-flash-native-audio-latest',
]

function makeEndpoints(apiKey) {
  const base = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage'
  const svc = 'GenerativeService.BidiGenerateContent'
  return [
    `${base}.v1beta.${svc}?key=${apiKey}`,
    `${base}.v1alpha.${svc}?key=${apiKey}`,
  ]
}

export class GeminiLiveService {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.ws = null
    this.isConnected = false
    this.playCtx = null
    this.audioQueue = []
    this.isPlaying = false
    this.pendingText = ''
    this.turnDone = false
    this.safetyTimer = null
    this.modelIdx = 0
    this.epIdx = 0
    this.setupOk = false
    this.currentModel = ''
    this.systemInstruction = ''
    this.voiceName = 'Kore'

    // Mic state
    this.micStream = null
    this.micCtx = null
    this.micProcessor = null
    this.micActive = false

    // Callbacks
    this.onStateChange = null
    this.onTranscript = null
    this.onError = null
    this.onAudioLevel = null
  }

  connect(systemInstruction, voiceName = 'Kore') {
    this.systemInstruction = systemInstruction
    this.voiceName = voiceName
    this.modelIdx = 0
    this._tryModel()
  }

  _tryModel() {
    if (this.modelIdx >= MODELS.length) {
      this.onError?.('All models failed. Check your API key and network.')
      this.onStateChange?.('disconnected')
      return
    }
    this.currentModel = MODELS[this.modelIdx]
    this.epIdx = 0
    this.setupOk = false
    console.log('[Gemini] Trying model:', this.currentModel)
    this._tryEndpoint()
  }

  _tryEndpoint() {
    const endpoints = makeEndpoints(this.apiKey)
    if (this.epIdx >= endpoints.length) {
      this.modelIdx++
      setTimeout(() => this._tryModel(), 500)
      return
    }
    const url = endpoints[this.epIdx]
    this.onStateChange?.('connecting')

    try { this.ws = new WebSocket(url) }
    catch (e) { this.epIdx++; this._tryEndpoint(); return }

    this.ws.onopen = () => {
      const payload = {
        setup: {
          model: `models/${this.currentModel}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } }
            }
          },
          systemInstruction: { parts: [{ text: this.systemInstruction }] },
          realtimeInputConfig: { automaticActivityDetection: { disabled: false } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      }
      this.ws.send(JSON.stringify(payload))
    }

    this.ws.onmessage = (event) => {
      const raw = event.data
      if (raw instanceof Blob) {
        raw.text().then(txt => {
          try { this._handleMsg(JSON.parse(txt)) } catch (e) {}
        })
        return
      }
      try { this._handleMsg(JSON.parse(raw)) } catch (e) {}
    }

    this.ws.onerror = () => {}

    this.ws.onclose = (e) => {
      if (!this.setupOk) {
        this.epIdx++
        if (this.epIdx < makeEndpoints(this.apiKey).length) {
          setTimeout(() => this._tryEndpoint(), 500)
          return
        }
        this.modelIdx++
        setTimeout(() => this._tryModel(), 500)
        return
      }
      this.isConnected = false
      this.onStateChange?.('disconnected')
    }
  }

  _handleMsg(data) {
    if (data.setupComplete || data.setup_complete) {
      this.setupOk = true
      this.isConnected = true
      this.onStateChange?.('connected')
      return
    }
    if (data.error) {
      this.onError?.(data.error.message || 'Server error')
      return
    }

    const sc = data.serverContent || data.server_content
    if (!sc) return

    if (sc.interrupted) {
      this.audioQueue = []
      this.isPlaying = false
      this.turnDone = false
      clearTimeout(this.safetyTimer)
      this.onStateChange?.('listening')
      return
    }

    const turn = sc.modelTurn || sc.model_turn
    if (turn?.parts) {
      for (const p of turn.parts) {
        if (p.inlineData?.data) {
          this.turnDone = false
          this.onStateChange?.('speaking')
          this.audioQueue.push(p.inlineData.data)
          if (!this.isPlaying) this._playNext()
        }
      }
    }

    const it = sc.inputTranscription || sc.input_transcription
    if (it?.text) this.onTranscript?.('user', it.text)

    const ot = sc.outputTranscription || sc.output_transcription
    if (ot?.text) this.pendingText += ot.text

    if (sc.turnComplete || sc.turn_complete) {
      this.turnDone = true
      if (this.pendingText) {
        this.onTranscript?.('ai', this.pendingText)
        this.pendingText = ''
      }
      if (!this.isPlaying && this.audioQueue.length === 0) {
        this.onStateChange?.('listening')
      }
      clearTimeout(this.safetyTimer)
      this.safetyTimer = setTimeout(() => {
        if (this.isPlaying) {
          console.warn('[Gemini] Safety timeout: forcing listening state')
          this.isPlaying = false
          this.audioQueue = []
          this.onStateChange?.('listening')
        }
      }, 30000)
    }
  }

  _playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false
      if (this.turnDone) {
        clearTimeout(this.safetyTimer)
        this.onStateChange?.('listening')
      }
      return
    }
    this.isPlaying = true
    const b64 = this.audioQueue.shift()
    try {
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

      if (!this.playCtx) this.playCtx = new AudioContext()
      if (this.playCtx.state === 'suspended') this.playCtx.resume()

      const n = Math.floor(bytes.length / 2)
      const buf = this.playCtx.createBuffer(1, n, 24000)
      const ch = buf.getChannelData(0)
      const view = new DataView(bytes.buffer)
      for (let j = 0; j < n; j++) ch[j] = view.getInt16(j * 2, true) / 32768

      let sum = 0
      for (let j = 0; j < ch.length; j++) sum += Math.abs(ch[j])
      this.onAudioLevel?.(Math.min(1, (sum / ch.length) * 8))

      const src = this.playCtx.createBufferSource()
      src.buffer = buf
      src.connect(this.playCtx.destination)
      src.start(0)
      src.onended = () => this._playNext()
    } catch (e) {
      console.error('[Gemini] Playback error:', e)
      this._playNext()
    }
  }

  // ═══ Microphone: raw PCM streaming (works in ALL browsers) ═══

  async startMic() {
    if (this.micStream) return
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
      this.micCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = this.micCtx.createMediaStreamSource(this.micStream)
      const nativeRate = this.micCtx.sampleRate

      // ScriptProcessorNode: deprecated but works in ALL browsers including Opera GX
      this.micProcessor = this.micCtx.createScriptProcessor(4096, 1, 1)
      this.micProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.micActive) return
        // Don't send audio while AI is speaking (prevents echo/feedback)
        if (this.isPlaying) return

        let float32 = e.inputBuffer.getChannelData(0)

        // Downsample to 16kHz if needed
        if (nativeRate !== 16000) {
          float32 = this._downsample(float32, nativeRate, 16000)
        }

        // Convert float32 to int16 PCM
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]))
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        // Base64 encode
        const uint8 = new Uint8Array(int16.buffer)
        let binary = ''
        const chunk = 8192
        for (let i = 0; i < uint8.length; i += chunk) {
          binary += String.fromCharCode.apply(null, uint8.subarray(i, Math.min(i + chunk, uint8.length)))
        }

        this._sendAudioChunk(btoa(binary))
      }

      source.connect(this.micProcessor)
      this.micProcessor.connect(this.micCtx.destination)
      this.micActive = true
      console.log(`[Gemini] Mic started (native: ${nativeRate}Hz → sending 16kHz PCM)`)
    } catch (err) {
      console.error('[Gemini] Mic error:', err)
      this.onError?.('Microphone access denied. Please allow mic access and try again.')
    }
  }

  muteMic() { this.micActive = false }
  unmuteMic() { this.micActive = true }

  destroyMic() {
    this.micActive = false
    if (this.micProcessor) { this.micProcessor.disconnect(); this.micProcessor = null }
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null }
    if (this.micCtx) { this.micCtx.close().catch(() => {}); this.micCtx = null }
  }

  _sendAudioChunk(base64) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64 }]
      }
    }))
  }

  _downsample(buffer, fromRate, toRate) {
    const ratio = fromRate / toRate
    const newLen = Math.floor(buffer.length / ratio)
    const result = new Float32Array(newLen)
    for (let i = 0; i < newLen; i++) {
      result[i] = buffer[Math.floor(i * ratio)]
    }
    return result
  }

  sendText(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ realtimeInput: { text } }))
  }

  disconnect() {
    this.destroyMic()
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null }
    if (this.playCtx) { this.playCtx.close().catch(() => {}); this.playCtx = null }
    this.audioQueue = []; this.isPlaying = false; this.isConnected = false
    this.setupOk = false; this.pendingText = ''
    this.turnDone = false; clearTimeout(this.safetyTimer)
  }
}

export async function analyzeInterview(apiKey, transcript, role, cvText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const prompt = `You are an expert interview coach. Analyze this interview.\n\nTarget Role: ${role}\nCV: ${cvText?.substring(0, 2000) || 'N/A'}\n\nTranscript:\n${transcript}\n\nRespond ONLY with valid JSON:\n{"overallScore":<0-10>,"summary":"<2-3 sentences>","strengths":[{"point":"","detail":""}],"improvements":[{"point":"","detail":""}],"questionAnalysis":[{"question":"","answerQuality":<0-10>,"feedback":""}],"communicationScore":<0-10>,"technicalScore":<0-10>,"confidenceScore":<0-10>,"tip":"<one actionable tip>"}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } })
  })
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (match) return JSON.parse(match[0])
  throw new Error('Failed to parse analysis')
}
