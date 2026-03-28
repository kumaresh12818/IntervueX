import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Clock,
  MessageSquare, AlertCircle, Send, Radio, X, Keyboard
} from 'lucide-react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { GeminiLiveService, analyzeInterview } from '../services/gemini'
import { SpeechService } from '../services/speech'
import AnimatedOrb from '../components/ui/AnimatedOrb'

export default function InterviewLive() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { targetRole, experienceLevel, cvText, cvUrl } = location.state || {}
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Candidate'

  const [connState, setConnState] = useState('idle')
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [transcript, setTranscript] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [textInput, setTextInput] = useState('')
  const [ending, setEnding] = useState(false)
  const [speechMode, setSpeechMode] = useState(null) // 'assemblyai' | 'native' | 'text-only'
  const [partial, setPartial] = useState('')

  const videoRef = useRef(null)
  const geminiRef = useRef(null)
  const speechRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const chatEndRef = useRef(null)
  const transcriptRef = useRef([])
  const isPlayingRef = useRef(false)

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  useEffect(() => { transcriptRef.current = transcript }, [transcript])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [transcript])
  useEffect(() => { isPlayingRef.current = connState === 'speaking' }, [connState])

  // Mute/unmute speech when AI starts/stops speaking (echo prevention)
  useEffect(() => {
    if (!speechRef.current) return
    if (connState === 'speaking') {
      speechRef.current.mute()
    } else if (connState === 'listening' || connState === 'connected') {
      speechRef.current.unmute()
    }
  }, [connState])

  // Timer
  useEffect(() => {
    if (['connected', 'speaking', 'listening'].includes(connState)) {
      if (!startTimeRef.current) startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [connState])

  // Fade audio level
  useEffect(() => {
    if (connState !== 'speaking') {
      const fade = setInterval(() => setAudioLevel(prev => Math.max(0, prev - 0.05)), 50)
      return () => clearInterval(fade)
    }
  }, [connState])

  // Setup camera
  const setupCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }, audio: false,
      })
      cameraStreamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsCameraOn(true)
    } catch { setIsCameraOn(false) }
  }, [])

  // Connect to Gemini + start speech recognition
  const startInterview = useCallback(async () => {
    setError('')
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) { setError('Gemini API key not configured.'); return }

    // --- Gemini setup ---
    const gemini = new GeminiLiveService(apiKey)
    geminiRef.current = gemini

    gemini.onStateChange = (state) => setConnState(state)
    gemini.onAudioLevel = (level) => setAudioLevel(level)
    gemini.onError = (msg) => setError(msg)
    gemini.onTranscript = (role, text) => {
      if (role === 'ai') setTranscript(prev => [...prev, { role: 'ai', text, time: Date.now() }])
    }

    const sysInstruction = `You are a professional, calm, and friendly AI interviewer conducting a realistic job interview.

The candidate's name is ${userName}.
Target Role: ${targetRole || 'General Position'}
Experience Level: ${experienceLevel || 'Not specified'}

Candidate's CV/Resume:
${cvText || 'Not provided'}

INTERVIEW PROTOCOL:
1. Start by warmly greeting "${userName}" by their first name
2. Introduce yourself briefly as their AI interviewer for today
3. Ask them to briefly introduce themselves
4. Then ask 5-7 interview questions, mixing behavioral (STAR method) and technical/role-specific questions
5. After each answer, ask intelligent follow-up or counter-questions when appropriate
6. Reference specific items from their CV when relevant
7. Be encouraging but probe deeper when answers are vague
8. After all questions, thank them warmly and wrap up

RULES:
- Ask ONE question at a time, keep questions concise (1-2 sentences)
- Wait for the candidate's response before continuing
- Be calm, professional, and conversational
- Adapt difficulty based on their experience level
- Always speak in English`

    gemini.connect(sysInstruction, 'Kore')

    // Wait for connection, then start speech + trigger greeting
    const waitForConnection = setInterval(() => {
      if (gemini.isConnected) {
        clearInterval(waitForConnection)

        // --- Speech recognition setup (AssemblyAI → native → text-only) ---
        const speech = new SpeechService()
        speechRef.current = speech

        speech.onFinalTranscript = (text) => {
          if (isPlayingRef.current) return // skip echo
          gemini.sendText(text)
          setTranscript(prev => [...prev, { role: 'user', text, time: Date.now() }])
          setPartial('')
        }
        speech.onPartialTranscript = (text) => setPartial(text)
        speech.onError = (msg) => setError(msg)
        speech.onStatusChange = (status) => {
          if (status === 'active') setSpeechMode(speech.mode)
          else if (status === 'text-only') setSpeechMode('text-only')
        }

        const assemblyKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY
        speech.start(assemblyKey)

        // Trigger AI greeting
        setTimeout(() => {
          gemini.sendText(`[The candidate ${userName} has joined. Please greet them and begin the interview.]`)
        }, 1000)
      }
    }, 200)

    setTimeout(() => clearInterval(waitForConnection), 30000)
  }, [userName, targetRole, experienceLevel, cvText])

  // Auto-start on mount
  useEffect(() => {
    if (!targetRole) { navigate('/interview/setup'); return }
    setupCamera()
    startInterview()
    return () => {
      geminiRef.current?.disconnect()
      speechRef.current?.stop()
      cameraStreamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(timerRef.current)
    }
  }, [])

  const toggleMic = () => {
    const newState = !isMicOn
    setIsMicOn(newState)
    if (speechRef.current) {
      newState ? speechRef.current.unmute() : speechRef.current.mute()
    }
  }

  const toggleCamera = () => {
    const tracks = cameraStreamRef.current?.getVideoTracks()
    if (tracks) { tracks.forEach(t => { t.enabled = !isCameraOn }); setIsCameraOn(!isCameraOn) }
  }

  const handleSendText = () => {
    if (!textInput.trim() || !geminiRef.current?.isConnected) return
    geminiRef.current.sendText(textInput.trim())
    setTranscript(prev => [...prev, { role: 'user', text: textInput.trim(), time: Date.now() }])
    setTextInput('')
  }

  const endInterview = async () => {
    setEnding(true)
    speechRef.current?.stop()
    geminiRef.current?.disconnect()
    cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    clearInterval(timerRef.current)

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    const tText = transcriptRef.current.length > 0
      ? transcriptRef.current.map(t => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`).join('\n')
      : `Interview lasted ${formatTime(elapsed)}.`

    let analysis
    try { analysis = await analyzeInterview(apiKey, tText, targetRole, cvText) }
    catch { analysis = { overallScore: 7, summary: 'Interview completed.', strengths: [], improvements: [], questionAnalysis: [], communicationScore: 7, technicalScore: 7, confidenceScore: 7, tip: 'Keep practicing!' } }

    let savedId = null
    try {
      if (db && user?.uid) {
        const docRef = await addDoc(collection(db, 'interviews'), {
          userId: user.uid, targetRole: targetRole || 'General', experienceLevel: experienceLevel || '', cvUrl: cvUrl || '',
          transcript: transcriptRef.current, duration: elapsed, overallScore: analysis.overallScore || 0, analysis, createdAt: serverTimestamp(),
        })
        savedId = docRef.id
      }
    } catch (err) { console.error('[Firestore] Save failed:', err) }

    navigate(savedId ? `/interview/result/${savedId}` : '/interview/result/local', { state: { analysis, targetRole, elapsed } })
  }

  const stateLabel = { idle: 'Initializing...', connecting: 'Connecting...', connected: 'Connected', listening: 'Listening', speaking: 'AI Speaking', disconnected: 'Disconnected' }
  const speechLabel = { assemblyai: '🎤 AssemblyAI', native: '🎤 Chrome Voice', 'text-only': '⌨️ Text Only' }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/5 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-[10px] font-bold text-red-400 tracking-wider">LIVE</span>
          </div>
          <span className="text-sm text-gray-400 font-medium hidden sm:block">{targetRole}</span>
          {speechMode && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 font-mono">
              {speechLabel[speechMode]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider ${
            ['connected', 'listening', 'speaking'].includes(connState) ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : connState === 'connecting' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
            : 'bg-white/5 text-gray-500 border border-white/10'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {stateLabel[connState] || connState}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono text-xs">
            <Clock className="w-3 h-3" />{formatTime(elapsed)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col md:flex-row gap-2 p-2">
          {/* User Camera */}
          <div className="flex-1 relative rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5">
            {isCameraOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0a]">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-4xl font-bold text-white/80">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
              <span className="text-xs font-medium">{userName}</span>
              {isMicOn ? <Mic className="w-3 h-3 text-white/60" /> : <MicOff className="w-3 h-3 text-red-400" />}
            </div>
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-mono text-gray-500 bg-black/40">YOU</div>
            {/* Live partial transcript */}
            {partial && (
              <div className="absolute bottom-14 left-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm">
                <span className="text-xs text-gray-300 italic">{partial}</span>
              </div>
            )}
          </div>

          {/* AI Panel */}
          <div className="flex-1 relative rounded-xl overflow-hidden bg-[#0d0d1a] border border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04)_0%,transparent_70%)]" />
            <div className={`absolute inset-0 transition-all duration-1000 ${connState === 'speaking' ? 'bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_60%)]' : ''}`} />
            <div className="w-full h-full flex items-center justify-center relative">
              <AnimatedOrb state={connState} audioLevel={audioLevel} />
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
              <span className="text-xs font-medium">AI Interviewer</span>
              {connState === 'speaking' && (
                <div className="flex items-center gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <motion.div key={i} className="w-0.5 rounded-full bg-primary"
                      animate={{ height: [3, 10 + Math.random() * 6, 3] }}
                      transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.08 }} />
                  ))}
                </div>
              )}
            </div>
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-mono text-gray-500 bg-black/40">AI</div>
          </div>
        </div>

        {/* Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.3 }}
              className="h-full border-l border-white/5 bg-[#111] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-sm font-semibold">Transcript</span>
                <button onClick={() => setShowChat(false)} className="p-1 rounded hover:bg-white/5"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {transcript.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <MessageSquare className="w-8 h-8 mb-2" /><span className="text-xs">Conversation will appear here</span>
                  </div>
                )}
                {transcript.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] font-mono text-gray-600 tracking-wider uppercase">{msg.role === 'user' ? 'You' : 'AI Interviewer'}</span>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user' ? 'bg-primary/10 border border-primary/20 rounded-br-sm' : 'bg-secondary/10 border border-secondary/20 rounded-bl-sm'
                    }`}>{msg.text}</div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-white/5">
                <div className="flex gap-2">
                  <input value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                    placeholder="Type your answer..." className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/40 text-white placeholder:text-gray-600"
                    disabled={!geminiRef.current?.isConnected} />
                  <button onClick={handleSendText} disabled={!textInput.trim()} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Text-only mode banner + input */}
      {speechMode === 'text-only' && (
        <div className="px-4 py-3 bg-[#141414] border-t border-amber-500/10">
          <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Voice not available. Type your responses below.</span>
          </div>
          <div className="max-w-2xl mx-auto flex gap-2">
            <input value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Type your response and press Enter..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/40 text-white placeholder:text-gray-500"
              disabled={!geminiRef.current?.isConnected} autoFocus />
            <button onClick={handleSendText} disabled={!textInput.trim()}
              className="px-5 py-3 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 transition-colors font-medium text-sm flex items-center gap-2">
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-xs underline whitespace-nowrap">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 py-4 px-4 bg-[#1a1a1a]/80 backdrop-blur-md border-t border-white/5 z-20">
        {speechMode !== 'text-only' && (
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMicOn ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
            }`}>
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </motion.button>
        )}
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isCameraOn ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
          }`}>
          {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </motion.button>
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => setShowChat(!showChat)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            showChat ? 'bg-primary/20 text-primary' : 'bg-white/10 hover:bg-white/15 text-white'
          }`}>
          <MessageSquare className="w-5 h-5" />
        </motion.button>
        <div className="w-px h-8 bg-white/10 mx-1" />
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={endInterview} disabled={ending}
          className="px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
          {ending ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>) : (<><PhoneOff className="w-4 h-4" /> End Interview</>)}
        </motion.button>
      </div>
    </div>
  )
}
