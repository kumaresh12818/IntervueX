import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, RotateCcw, Clock, Target, TrendingUp,
  MessageSquare, CheckCircle2, AlertTriangle, Lightbulb,
  Sparkles, ChevronRight, Award
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/layout/Navbar'
import PageTransition from '../components/layout/PageTransition'
import GlassCard from '../components/ui/GlassCard'
import ScoreRing from '../components/ui/ScoreRing'
import LoadingScreen from '../components/ui/LoadingScreen'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
}

export default function InterviewResult() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [data, setData] = useState(location.state || null)
  const [loading, setLoading] = useState(!location.state)

  useEffect(() => {
    const fetchData = async () => {
      if (data) return
      try {
        const docSnap = await getDoc(doc(db, 'interviews', id))
        if (docSnap.exists()) {
          const interview = docSnap.data()
          setData({
            analysis: interview.analysis,
            targetRole: interview.targetRole,
            elapsed: interview.duration,
          })
        }
      } catch (err) {
        console.error('Failed to fetch result:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, data])

  if (loading) return <LoadingScreen />

  const analysis = data?.analysis || {}
  const targetRole = data?.targetRole || 'Interview'
  const elapsed = data?.elapsed || 0

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-accent-success'
    if (score >= 6) return 'text-primary'
    if (score >= 4) return 'text-accent-warning'
    return 'text-accent-error'
  }

  const getScoreLabel = (score) => {
    if (score >= 9) return 'Outstanding'
    if (score >= 8) return 'Excellent'
    if (score >= 7) return 'Very Good'
    if (score >= 6) return 'Good'
    if (score >= 5) return 'Average'
    if (score >= 4) return 'Below Average'
    return 'Needs Work'
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-dark text-white">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 animated-grid opacity-20" />
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[150px]" />
        </div>

        <Navbar />

        <div className="relative z-10 pt-28 pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="initial" animate="animate" variants={stagger}>
              {/* Header */}
              <motion.div variants={fadeInUp} transition={{ duration: 0.5 }} className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-sm text-gray-400 font-medium">Interview Complete</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Your <span className="gradient-text">Performance Report</span>
                </h1>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-4">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> {targetRole}
                  </span>
                  {elapsed > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {formatTime(elapsed)}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Score Hero */}
              <motion.div variants={fadeInUp} transition={{ duration: 0.6 }}>
                <GlassCard hover={false} className="p-10 mb-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
                  <div className="relative">
                    <div className="flex flex-col items-center">
                      <ScoreRing
                        score={analysis.overallScore || 0}
                        maxScore={10}
                        size={180}
                        strokeWidth={12}
                        label=""
                      />
                      <div className="mt-4">
                        <h2 className={`text-xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                          {getScoreLabel(analysis.overallScore)}
                        </h2>
                        <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
                          {analysis.summary}
                        </p>
                      </div>
                    </div>

                    {/* Sub scores */}
                    <div className="grid grid-cols-3 gap-4 mt-8">
                      {[
                        { label: 'Communication', score: analysis.communicationScore },
                        { label: 'Technical', score: analysis.technicalScore },
                        { label: 'Confidence', score: analysis.confidenceScore },
                      ].map((item, i) => (
                        <div key={i} className="text-center">
                          <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                            {item.score?.toFixed(1) || '—'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Strengths & Improvements */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Strengths */}
                <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
                  <GlassCard hover={false} className="p-6 h-full">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-accent-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-accent-success" />
                      </div>
                      <h3 className="font-semibold">Strengths</h3>
                    </div>
                    <div className="space-y-4">
                      {(analysis.strengths || []).map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex gap-3"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-accent-success mt-2 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-200">{item.point}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.detail}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Improvements */}
                <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
                  <GlassCard hover={false} className="p-6 h-full">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-accent-warning/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-accent-warning" />
                      </div>
                      <h3 className="font-semibold">Areas to Improve</h3>
                    </div>
                    <div className="space-y-4">
                      {(analysis.improvements || []).map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex gap-3"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-accent-warning mt-2 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-200">{item.point}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.detail}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              </div>

              {/* Question Analysis */}
              {analysis.questionAnalysis?.length > 0 && (
                <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
                  <GlassCard hover={false} className="p-6 mb-8">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">Question-by-Question Feedback</h3>
                    </div>
                    <div className="space-y-4">
                      {analysis.questionAnalysis.map((qa, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                          className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <p className="text-sm text-gray-300 font-medium flex-1">
                              "{qa.question}"
                            </p>
                            <span className={`text-sm font-bold flex-shrink-0 ${getScoreColor(qa.answerQuality)}`}>
                              {qa.answerQuality}/10
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{qa.feedback}</p>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Pro Tip */}
              {analysis.tip && (
                <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
                  <GlassCard hover={false} className="p-6 mb-8">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-amber-400 text-sm mb-1">Pro Tip</h3>
                        <p className="text-gray-300 text-sm">{analysis.tip}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link to="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-3.5 rounded-xl btn-ghost font-semibold text-sm flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </motion.button>
                </Link>
                <Link to="/interview/setup">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-3.5 btn-glow rounded-xl font-semibold text-sm flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Practice Again
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
