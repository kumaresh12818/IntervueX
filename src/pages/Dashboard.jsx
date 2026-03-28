import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Clock, Trophy, ChevronRight, LogOut,
  Sparkles, BarChart3, Mic, Calendar, Star
} from 'lucide-react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/layout/Navbar'
import PageTransition from '../components/layout/PageTransition'
import GlassCard from '../components/ui/GlassCard'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInterviews = async () => {
      if (!user || !db) return
      try {
        // Try compound query first (requires composite index)
        let data = []
        try {
          const q = query(
            collection(db, 'interviews'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          )
          const snapshot = await getDocs(q)
          data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        } catch (indexErr) {
          // If composite index is missing, fallback to simple query + client-side sort
          console.warn('[Dashboard] Composite index not ready, using fallback query:', indexErr.message)
          if (indexErr.message?.includes('index')) {
            console.info('[Dashboard] Click the link above in the Firebase error to create the required index.')
          }
          const q = query(
            collection(db, 'interviews'),
            where('userId', '==', user.uid)
          )
          const snapshot = await getDocs(q)
          data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          // Sort client-side: newest first
          data.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0
            const bTime = b.createdAt?.seconds || 0
            return bTime - aTime
          })
        }
        setInterviews(data)
      } catch (err) {
        console.error('[Dashboard] Error fetching interviews:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchInterviews()
  }, [user])

  const avgScore = interviews.length > 0
    ? (interviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) / interviews.length).toFixed(1)
    : '—'

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-accent-success'
    if (score >= 6) return 'text-primary'
    if (score >= 4) return 'text-accent-warning'
    return 'text-accent-error'
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-dark text-white">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 animated-grid opacity-20" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[200px]" />
        </div>

        <Navbar />

        <div className="relative z-10 pt-28 pb-16 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div initial="initial" animate="animate" variants={stagger}>
              {/* Header */}
              <motion.div variants={fadeInUp} transition={{ duration: 0.5 }} className="mb-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                      Welcome back,{' '}
                      <span className="gradient-text">
                        {user?.displayName || user?.email?.split('@')[0] || 'there'}
                      </span>
                    </h1>
                    <p className="text-gray-500">Ready for another practice session?</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold shadow-glow-sm">
                      {(user?.displayName || user?.email || '?')[0].toUpperCase()}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div variants={fadeInUp} transition={{ duration: 0.5 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <GlassCard hover={false} className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Mic className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{interviews.length}</div>
                      <div className="text-xs text-gray-500 font-medium">Total Interviews</div>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard hover={false} className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{avgScore}</div>
                      <div className="text-xs text-gray-500 font-medium">Average Score</div>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard hover={false} className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-success/10 flex items-center justify-center">
                      <Star className="w-6 h-6 text-accent-success" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {interviews.length > 0
                          ? Math.max(...interviews.map(i => i.overallScore || 0)).toFixed(1)
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">Best Score</div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Start New Interview Card */}
              <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
                <GlassCard
                  onClick={() => navigate('/interview/setup')}
                  className="p-8 mb-10 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 group-hover:from-primary/10 group-hover:to-secondary/10 transition-all duration-500" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-md"
                      >
                        <Plus className="w-8 h-8 text-white" />
                      </motion.div>
                      <div>
                        <h2 className="text-xl font-bold mb-1">Start New Interview</h2>
                        <p className="text-gray-400 text-sm">Upload your CV, pick a role, and jump into a live session</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </GlassCard>
              </motion.div>

              {/* Interview History */}
              <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    Past Interviews
                  </h2>
                  {interviews.length > 0 && (
                    <span className="text-sm text-gray-500">{interviews.length} sessions</span>
                  )}
                </div>

                {loading ? (
                  <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5" />
                          <div className="flex-1">
                            <div className="h-4 w-32 bg-white/5 rounded mb-2" />
                            <div className="h-3 w-20 bg-white/5 rounded" />
                          </div>
                          <div className="h-8 w-16 bg-white/5 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : interviews.length === 0 ? (
                  <GlassCard hover={false} className="p-12 text-center">
                    <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">No interviews yet</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Start your first session to see your results here
                    </p>
                    <Link to="/interview/setup">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-6 py-3 btn-glow rounded-xl text-sm font-semibold"
                      >
                        Start Your First Interview
                      </motion.button>
                    </Link>
                  </GlassCard>
                ) : (
                  <div className="grid gap-4">
                    {interviews.map((interview, i) => (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <GlassCard
                          onClick={() => navigate(`/interview/result/${interview.id}`)}
                          className="p-5 group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                              <Mic className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">
                                {interview.targetRole || 'Interview Session'}
                              </h3>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(interview.createdAt)}
                                </span>
                                {interview.experienceLevel && (
                                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                                    {interview.experienceLevel}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-lg font-bold ${getScoreColor(interview.overallScore)}`}>
                                {interview.overallScore?.toFixed(1) || '—'}
                                <span className="text-xs text-gray-500 font-normal">/10</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
