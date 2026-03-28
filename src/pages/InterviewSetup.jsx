import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  Upload, FileText, Briefcase, ChevronRight, AlertCircle,
  CheckCircle2, X, Sparkles, GraduationCap, Loader2
} from 'lucide-react'
import { getStorage } from 'firebase/storage'   // keep it for other parts though we are removing uploadBytes and getDownloadURL
import { storage } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/layout/Navbar'
import PageTransition from '../components/layout/PageTransition'
import GlassCard from '../components/ui/GlassCard'

const experienceLevels = [
  { value: 'entry', label: 'Entry Level', desc: '0-2 years' },
  { value: 'mid', label: 'Mid Level', desc: '3-5 years' },
  { value: 'senior', label: 'Senior', desc: '5-10 years' },
  { value: 'lead', label: 'Lead / Staff', desc: '10+ years' },
]

export default function InterviewSetup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [targetRole, setTargetRole] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvText, setCvText] = useState('')
  const [cvUrl, setCvUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')

  // Extract text from PDF using pdfjs-dist
  const extractTextFromPDF = async (file) => {
    setExtracting(true)
    setError('')
    try {
      const pdfjsLib = await import('pdfjs-dist')

      // Try multiple CDN sources for the worker
      const version = pdfjsLib.version
      const workerUrls = [
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
        `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`,
      ]

      let workerSet = false
      for (const url of workerUrls) {
        try {
          const res = await fetch(url, { method: 'HEAD' })
          if (res.ok) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = url
            workerSet = true
            break
          }
        } catch {}
      }

      if (!workerSet) {
        console.warn('PDF worker not found on CDN, using inline processing')
        pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
      }).promise

      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((item) => item.str).join(' ') + '\n'
      }

      const result = text.trim()
      if (!result) {
        setError('No text found in PDF. The file may be image-based or scanned.')
        return ''
      }

      setCvText(result)
      return result
    } catch (err) {
      console.error('PDF extraction error:', err)
      setError(`Failed to extract text: ${err.message}. Try a different PDF.`)
      return ''
    } finally {
      setExtracting(false)
    }
  }

  // Upload CV to Cloudinary
  const uploadCV = async (file) => {
    setUploading(true)
    setError('')
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) throw new Error('Cloudinary upload failed')
      
      const data = await response.json()
      setCvUrl(data.secure_url)
      return data.secure_url
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload CV. Please try again.')
      return ''
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB')
      return
    }

    setError('')
    setCvFile(file)

    // Extract text and upload in parallel
    const [text, url] = await Promise.all([
      extractTextFromPDF(file),
      uploadCV(file),
    ])
  }, [user])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
  })

  const handleStartInterview = () => {
    navigate('/interview/live', {
      state: {
        targetRole,
        experienceLevel,
        cvText,
        cvUrl,
      },
    })
  }

  const canProceedToStep2 = targetRole.trim() && experienceLevel
  const canStartInterview = canProceedToStep2 && cvText

  return (
    <PageTransition>
      <div className="min-h-screen bg-dark text-white">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 animated-grid opacity-20" />
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-secondary/5 rounded-full blur-[150px]" />
        </div>

        <Navbar />

        <div className="relative z-10 pt-28 pb-16 px-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl font-bold mb-2">
                Set Up Your <span className="gradient-text">Interview</span>
              </h1>
              <p className="text-gray-500">Tell us about the role and upload your CV</p>
            </motion.div>

            {/* Progress */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 mb-10"
            >
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                step >= 1 ? 'bg-gradient-to-r from-primary to-primary-light' : 'bg-white/10'
              }`} />
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                step >= 2 ? 'bg-gradient-to-r from-primary-light to-secondary' : 'bg-white/10'
              }`} />
            </motion.div>

            <AnimatePresence mode="wait">
              {/* Step 1: Role & Experience */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                >
                  <GlassCard hover={false} className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold">Target Role</h2>
                        <p className="text-xs text-gray-500">What position are you preparing for?</p>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="input-dark mb-8"
                      placeholder="e.g. Senior Frontend Engineer, Product Manager, Data Scientist..."
                    />

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <h2 className="font-semibold">Experience Level</h2>
                        <p className="text-xs text-gray-500">Select your current experience level</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-8">
                      {experienceLevels.map((level) => (
                        <motion.button
                          key={level.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setExperienceLevel(level.value)}
                          className={`p-4 rounded-xl text-left transition-all duration-300 ${
                            experienceLevel === level.value
                              ? 'bg-primary/15 border-primary/40 border shadow-glow-sm'
                              : 'glass glass-hover border border-transparent'
                          }`}
                        >
                          <div className="font-medium text-sm">{level.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{level.desc}</div>
                        </motion.button>
                      ))}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep(2)}
                      disabled={!canProceedToStep2}
                      className="w-full py-3.5 btn-glow rounded-xl font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </GlassCard>
                </motion.div>
              )}

              {/* Step 2: CV Upload */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <GlassCard hover={false} className="p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold">Upload Your CV</h2>
                        <p className="text-xs text-gray-500">We'll use it to tailor interview questions</p>
                      </div>
                    </div>

                    {/* Role summary */}
                    <div className="flex items-center gap-2 mb-6 mt-4">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {targetRole}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium">
                        {experienceLevels.find(l => l.value === experienceLevel)?.label}
                      </span>
                      <button
                        onClick={() => setStep(1)}
                        className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 rounded-xl bg-accent-error/10 border border-accent-error/20 text-accent-error text-sm mb-4"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    {/* Dropzone */}
                    {!cvFile ? (
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                          isDragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                        }`}
                      >
                        <input {...getInputProps()} />
                        <Upload className={`w-10 h-10 mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-gray-500'}`} />
                        <p className="text-sm text-gray-300 font-medium mb-1">
                          {isDragActive ? 'Drop your CV here...' : 'Drag & drop your CV here'}
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF format, up to 10MB
                        </p>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass rounded-xl p-5"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{cvFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {(cvFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {(uploading || extracting) ? (
                              <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            ) : cvText ? (
                              <CheckCircle2 className="w-5 h-5 text-accent-success" />
                            ) : null}
                            <button
                              onClick={() => {
                                setCvFile(null)
                                setCvText('')
                                setCvUrl('')
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        {extracting && (
                          <div className="mt-3 text-xs text-gray-500">Extracting text from CV...</div>
                        )}
                        {cvText && (
                          <div className="mt-3 p-3 rounded-lg bg-white/[0.02] max-h-32 overflow-y-auto">
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-6">
                              {cvText.substring(0, 500)}...
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-8">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStep(1)}
                        className="px-6 py-3.5 rounded-xl btn-ghost font-semibold text-sm"
                      >
                        Back
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStartInterview}
                        disabled={!canStartInterview}
                        className="flex-1 py-3.5 btn-glow rounded-xl font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Enter Interview Room
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
