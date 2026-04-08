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

/**
 * Safely truncate a string to maxLen characters.
 */
function truncStr(s, maxLen) {
  if (typeof s !== 'string') return ''
  return s.length > maxLen ? s.substring(0, maxLen) + '...' : s
}

/**
 * Validate and sanitize the analysis object to ensure all fields are
 * present and within reasonable bounds. This prevents absurdly long
 * Gemini responses from breaking the UI.
 */
function sanitizeAnalysis(obj) {
  const defaults = {
    overallScore: 5,
    summary: 'Interview analysis completed.',
    strengths: [],
    improvements: [],
    questionAnalysis: [],
    communicationScore: 5,
    technicalScore: 5,
    confidenceScore: 5,
    tip: 'Keep practicing to improve your interview skills!'
  }
  const result = { ...defaults }

  // Scores
  if (typeof obj.overallScore === 'number') result.overallScore = Math.min(10, Math.max(0, obj.overallScore))
  if (typeof obj.communicationScore === 'number') result.communicationScore = Math.min(10, Math.max(0, obj.communicationScore))
  if (typeof obj.technicalScore === 'number') result.technicalScore = Math.min(10, Math.max(0, obj.technicalScore))
  if (typeof obj.confidenceScore === 'number') result.confidenceScore = Math.min(10, Math.max(0, obj.confidenceScore))

  // Strings
  if (typeof obj.summary === 'string' && obj.summary.length > 0) result.summary = truncStr(obj.summary, 1000)
  if (typeof obj.tip === 'string' && obj.tip.length > 0) result.tip = truncStr(obj.tip, 500)

  // Arrays — cap at 5/10 items and truncate each field
  if (Array.isArray(obj.strengths)) {
    result.strengths = obj.strengths.slice(0, 5).map(s => ({
      point: truncStr(s?.point || '', 300),
      detail: truncStr(s?.detail || '', 600)
    })).filter(s => s.point.length > 0)
  }
  if (Array.isArray(obj.improvements)) {
    result.improvements = obj.improvements.slice(0, 5).map(s => ({
      point: truncStr(s?.point || '', 300),
      detail: truncStr(s?.detail || '', 600)
    })).filter(s => s.point.length > 0)
  }
  if (Array.isArray(obj.questionAnalysis)) {
    result.questionAnalysis = obj.questionAnalysis.slice(0, 10).map(q => ({
      question: truncStr(q?.question || '', 400),
      answerQuality: typeof q?.answerQuality === 'number' ? Math.min(10, Math.max(0, q.answerQuality)) : 5,
      feedback: truncStr(q?.feedback || '', 800)
    })).filter(q => q.question.length > 0)
  }

  return result
}

/**
 * Attempt to repair truncated JSON by closing open brackets/braces.
 */
function repairTruncatedJson(text) {
  // Remove trailing incomplete strings (e.g. text cut mid-value)
  let cleaned = text.replace(/,\s*$/, '') // remove trailing comma
  
  // Count open/close brackets
  let braces = 0, brackets = 0, inString = false, escaped = false
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }

  // If we're inside a string, try to close it
  if (inString) cleaned += '"'

  // Close any unclosed arrays and objects
  while (brackets > 0) { cleaned += ']'; brackets-- }
  while (braces > 0) { cleaned += '}'; braces-- }

  return cleaned
}

/**
 * Make a single analysis API call with the given model.
 */
async function callGeminiAnalysis(apiKey, prompt, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            overallScore: { type: 'NUMBER' },
            summary: { type: 'STRING' },
            strengths: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  point: { type: 'STRING' },
                  detail: { type: 'STRING' }
                },
                required: ['point', 'detail']
              }
            },
            improvements: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  point: { type: 'STRING' },
                  detail: { type: 'STRING' }
                },
                required: ['point', 'detail']
              }
            },
            questionAnalysis: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  question: { type: 'STRING' },
                  answerQuality: { type: 'NUMBER' },
                  feedback: { type: 'STRING' }
                },
                required: ['question', 'answerQuality', 'feedback']
              }
            },
            communicationScore: { type: 'NUMBER' },
            technicalScore: { type: 'NUMBER' },
            confidenceScore: { type: 'NUMBER' },
            tip: { type: 'STRING' }
          },
          required: ['overallScore', 'summary', 'strengths', 'improvements', 'questionAnalysis', 'communicationScore', 'technicalScore', 'confidenceScore', 'tip']
        }
      }
    })
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error?.message || `HTTP ${res.status}`)
  }

  const data = await res.json()

  if (data.error) throw new Error(data.error.message)

  // Check for safety blocks or empty candidates
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No candidates returned from Gemini')
  if (candidate.finishReason === 'SAFETY') throw new Error('Response blocked by safety filters')

  const text = candidate.content?.parts?.[0]?.text
  if (!text || text.trim().length === 0) throw new Error('Empty response text from Gemini')

  return text
}

/**
 * Parse the raw text into a JSON object, with repair fallback.
 */
function parseAnalysisText(text) {
  // Attempt 1: Direct parse
  try { return JSON.parse(text) } catch {}

  // Attempt 2: Extract JSON object from wrapped text
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }

  // Attempt 3: Repair truncated JSON
  const jsonStart = text.indexOf('{')
  if (jsonStart >= 0) {
    const repaired = repairTruncatedJson(text.substring(jsonStart))
    try { return JSON.parse(repaired) } catch {}
  }

  return null
}

export async function analyzeInterview(apiKey, transcript, role, cvText) {
  const trimmedTranscript = transcript.length > 6000
    ? transcript.substring(0, 6000) + '\n[... transcript trimmed for analysis ...]'
    : transcript

  const prompt = `You are an expert interview coach. Analyze this interview transcript CONCISELY.

Target Role: ${role || 'General'}
CV Summary: ${cvText ? cvText.substring(0, 1500) : 'Not provided'}

Transcript:
${trimmedTranscript}

INSTRUCTIONS — READ CAREFULLY:
- Return a JSON object matching the schema.
- Be EXTREMELY CONCISE. Every string value must be SHORT.
- "summary": 1-3 sentences max (under 200 words).
- "strengths": EXACTLY 3 items. Each "point" is ONE short sentence (under 15 words). Each "detail" is 1-2 sentences (under 40 words).
- "improvements": EXACTLY 3 items. Same length rules as strengths.
- "questionAnalysis": One entry per interview question asked (max 7). "feedback" is 1-2 sentences.
- "tip": ONE actionable sentence.
- All scores are numbers from 0 to 10.
- DO NOT repeat yourself. DO NOT be verbose. DO NOT pad responses.`

  const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const model = MODELS[Math.min(attempt, MODELS.length - 1)]
    console.log(`[Gemini Analysis] Attempt ${attempt + 1}/${MAX_RETRIES} with model ${model}`)

    try {
      const rawText = await callGeminiAnalysis(apiKey, prompt, model)
      console.log(`[Gemini Analysis] Received ${rawText.length} chars`)

      const parsed = parseAnalysisText(rawText)
      if (!parsed || typeof parsed !== 'object') {
        console.warn('[Gemini Analysis] Failed to parse response, retrying...')
        console.warn('[Gemini Analysis] Raw (first 300 chars):', rawText.substring(0, 300))
        continue
      }

      const result = sanitizeAnalysis(parsed)
      console.log('[Gemini Analysis] Success:', { score: result.overallScore, strengths: result.strengths.length, improvements: result.improvements.length })
      return result

    } catch (err) {
      console.error(`[Gemini Analysis] Attempt ${attempt + 1} failed:`, err.message)
      // Brief pause before retry
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }

  // All retries failed — return a graceful fallback instead of throwing
  console.error('[Gemini Analysis] All attempts failed, returning fallback analysis')
  return {
    overallScore: 6,
    summary: 'We were unable to generate a detailed AI analysis for this interview session. Please review the transcript for self-assessment.',
    strengths: [{ point: 'Completed the interview session', detail: 'You participated in the full interview, which demonstrates commitment and effort.' }],
    improvements: [{ point: 'Try another session for AI feedback', detail: 'The AI analysis encountered an issue. A retry may yield detailed feedback.' }],
    questionAnalysis: [],
    communicationScore: 6,
    technicalScore: 6,
    confidenceScore: 6,
    tip: 'Practice answering common interview questions aloud to build confidence and clarity.'
  }
}
