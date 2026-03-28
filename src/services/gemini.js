/**
 * IntervueX — Gemini Live API Service
 * Text input + audio output. No raw audio streaming (unreliable across browsers).
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
    this.onStateChange?.('connecting')

    try { this.ws = new WebSocket(endpoints[this.epIdx]) }
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
          outputAudioTranscription: {},
        }
      }
      this.ws.send(JSON.stringify(payload))
    }

    this.ws.onmessage = (event) => {
      const raw = event.data
      if (raw instanceof Blob) {
        raw.text().then(txt => { try { this._handleMsg(JSON.parse(txt)) } catch {} })
        return
      }
      try { this._handleMsg(JSON.parse(raw)) } catch {}
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

  sendText(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ realtimeInput: { text } }))
  }

  disconnect() {
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null }
    if (this.playCtx) { this.playCtx.close().catch(() => {}); this.playCtx = null }
    this.audioQueue = []; this.isPlaying = false; this.isConnected = false
    this.setupOk = false; this.pendingText = ''
    this.turnDone = false; clearTimeout(this.safetyTimer)
  }
}

export async function analyzeInterview(apiKey, transcript, role, cvText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const prompt = `You are an expert interview coach. Analyze this interview.\n\nTarget Role: ${role || 'General'}\nCV: ${cvText?.substring(0, 2000) || 'None'}\n\nTranscript:\n${transcript}\n\nReturn EXACTLY this JSON structure. Do not include markdown formatting.\n{"overallScore":8.5,"summary":"...","strengths":[{"point":"...","detail":"..."}],"improvements":[{"point":"...","detail":"..."}],"questionAnalysis":[{"question":"...","answerQuality":8.0,"feedback":"..."}],"communicationScore":8.0,"technicalScore":8.0,"confidenceScore":8.0,"tip":"..."}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      contents: [{ parts: [{ text: prompt }] }], 
      generationConfig: { 
        temperature: 0.2, 
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            overallScore: { type: "NUMBER" },
            summary: { type: "STRING" },
            strengths: { 
              type: "ARRAY", 
              items: { type: "OBJECT", properties: { point: { type: "STRING" }, detail: { type: "STRING" } } } 
            },
            improvements: { 
              type: "ARRAY", 
              items: { type: "OBJECT", properties: { point: { type: "STRING" }, detail: { type: "STRING" } } } 
            },
            questionAnalysis: { 
              type: "ARRAY", 
              items: { type: "OBJECT", properties: { question: { type: "STRING" }, answerQuality: { type: "NUMBER" }, feedback: { type: "STRING" } } } 
            },
            communicationScore: { type: "NUMBER" },
            technicalScore: { type: "NUMBER" },
            confidenceScore: { type: "NUMBER" },
            tip: { type: "STRING" }
          },
          required: ["overallScore", "summary", "strengths", "improvements", "questionAnalysis", "communicationScore", "technicalScore", "confidenceScore", "tip"]
        }
      } 
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  try {
    return JSON.parse(text)
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Failed to parse analysis: ' + text)
  }
}
