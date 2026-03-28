import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mic, Brain, BarChart3, Sparkles, ArrowRight, Zap,
  Shield, Target, Users, Star, ChevronRight, Globe,
  CheckCircle2, Play
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import PageTransition from '../components/layout/PageTransition'
import GlassCard from '../components/ui/GlassCard'

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } }
}

const features = [
  {
    icon: Target,
    title: 'Tailored Questions',
    desc: 'Upload your CV and target role — our AI crafts questions specifically for your background and goals.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    icon: Mic,
    title: 'Live Voice Interview',
    desc: 'Practice with a realistic, real-time AI interviewer powered by Google Gemini\'s native audio.',
    color: 'from-purple-500 to-pink-400',
  },
  {
    icon: BarChart3,
    title: 'Instant Analysis',
    desc: 'Get detailed scoring, strengths, weaknesses, and actionable coaching after every session.',
    color: 'from-amber-500 to-orange-400',
  },
]

const stats = [
  { value: '10K+', label: 'Interviews Conducted' },
  { value: '96%', label: 'User Satisfaction' },
  { value: '2.5x', label: 'More Confidence' },
  { value: '85%', label: 'Success Rate' },
]

const benefits = [
  'Unlimited practice sessions tailored to your target role',
  'Real-time voice interaction — no scripted Q&A',
  'AI-powered feedback with specific coaching points',
  'Track your progress over time with detailed analytics',
  'Works for any industry — tech, finance, healthcare, and more',
  'Available 24/7 — practice whenever it suits you',
]

export default function Landing() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-dark text-white overflow-hidden">
        {/* ═══════ Animated Background ═══════ */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 animated-grid animate-grid-fade" />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px] animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/8 rounded-full blur-[150px] animate-pulse-slower" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />
        </div>

        <div className="relative z-10">
          <Navbar transparent />

          {/* ═══════ Hero Section ═══════ */}
          <motion.section
            className="relative pt-36 md:pt-44 pb-24 px-6"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            <div className="max-w-5xl mx-auto text-center">
              {/* Badge */}
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-gray-400 font-medium">
                  Powered by Google Gemini AI
                </span>
                <ChevronRight className="w-3 h-3 text-gray-500" />
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight mb-6"
              >
                Master Your Next
                <br />
                <span className="gradient-text">Interview with AI</span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed text-balance"
              >
                Upload your CV, practice with a realistic AI interviewer in real-time,
                and get instant, actionable feedback to land your dream job.
              </motion.p>

              {/* CTAs */}
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link to="/auth/signup">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="group relative px-8 py-4 btn-glow rounded-2xl font-semibold text-lg"
                  >
                    <span className="flex items-center gap-2">
                      Start Practicing Now
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </motion.button>
                </Link>
                <Link to="/auth/login">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="px-8 py-4 rounded-2xl font-semibold text-lg btn-ghost text-gray-300 hover:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Sign In
                    </span>
                  </motion.button>
                </Link>
              </motion.div>

              {/* Floating Orb Decoration */}
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-20 relative mx-auto w-72 h-72"
              >
                {/* Outer rings */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-primary/10"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full border border-secondary/10"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                />

                {/* Core orb */}
                <div className="absolute inset-12 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-sm animate-breathe" />
                <div className="absolute inset-16 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 animate-breathe" />
                <div className="absolute inset-20 rounded-full bg-gradient-to-br from-primary/70 to-secondary/70 flex items-center justify-center animate-breathe">
                  <Brain className="w-10 h-10 text-white/80" />
                </div>

                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
                    style={{
                      top: `${20 + Math.random() * 60}%`,
                      left: `${20 + Math.random() * 60}%`,
                    }}
                    animate={{
                      y: [0, -20 - Math.random() * 20, 0],
                      x: [0, Math.random() * 20 - 10, 0],
                      opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.section>

          {/* ═══════ Stats Bar ═══════ */}
          <motion.section
            className="py-12 px-6 border-y border-white/5"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-extrabold gradient-text mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ═══════ Features Section ═══════ */}
          <motion.section
            className="py-24 px-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <div className="max-w-6xl mx-auto">
              <motion.div variants={fadeInUp} transition={{ duration: 0.5 }} className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-gray-400 font-medium mb-4">
                  <Zap className="w-3 h-3 text-primary" /> HOW IT WORKS
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-4">
                  Three Steps to Interview
                  <span className="gradient-text"> Mastery</span>
                </h2>
                <p className="text-gray-400 max-w-xl mx-auto text-lg">
                  From upload to analysis, the entire loop takes minutes.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                {features.map((feature, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    transition={{ duration: 0.5 }}
                  >
                    <GlassCard className="p-8 h-full">
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                          <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 tracking-wider">
                          STEP {i + 1}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ═══════ Benefits Section ═══════ */}
          <motion.section
            className="py-24 px-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
              <motion.div variants={fadeInUp} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-gray-400 font-medium mb-4">
                  <Shield className="w-3 h-3 text-secondary" /> WHY INTERVUEX
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Everything You Need to
                  <span className="gradient-text"> Ace the Interview</span>
                </h2>
                <div className="space-y-4">
                  {benefits.map((benefit, i) => (
                    <motion.div
                      key={i}
                      variants={fadeInUp}
                      transition={{ duration: 0.4 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-accent-success flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                {/* Mock interview card */}
                <GlassCard hover={false} className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">AI Interviewer</div>
                      <div className="text-xs text-gray-500">Speaking now...</div>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-primary rounded-full"
                          animate={{ height: [8, 20 + Math.random() * 12, 8] }}
                          transition={{
                            duration: 0.6 + Math.random() * 0.4,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/5 text-sm text-gray-300">
                      "Tell me about a time you led a cross-functional project. What challenges did you face?"
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-gray-200 ml-8">
                      "In my previous role at..."
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                        animate={{ width: ['0%', '65%'] }}
                        transition={{ duration: 3, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">12:34</span>
                  </div>
                </GlassCard>

                {/* Floating score badge */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-4 -right-4 px-4 py-2 rounded-xl glass-strong shadow-glow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold">8.5/10</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.section>

          {/* ═══════ CTA Section ═══════ */}
          <motion.section
            className="py-24 px-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <div className="max-w-4xl mx-auto">
              <GlassCard hover={false} className="p-12 md:p-16 text-center relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]" />

                <div className="relative z-10">
                  <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">
                      Ready to
                      <span className="gradient-text"> Ace Your Interview?</span>
                    </h2>
                    <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                      Join thousands of candidates who improved their interview skills with IntervueX.
                      Start your first practice session in under a minute.
                    </p>
                    <Link to="/auth/signup">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="group px-10 py-5 btn-glow rounded-2xl font-semibold text-lg"
                      >
                        <span className="flex items-center gap-2">
                          Get Started — It's Free
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>
              </GlassCard>
            </div>
          </motion.section>

          {/* ═══════ Footer ═══════ */}
          <footer className="border-t border-white/5 py-12 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">
                  Intervue<span className="gradient-text">X</span>
                </span>
              </div>
              <div className="flex items-center gap-8 text-sm text-gray-500">
                <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
                <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
                <a href="#" className="hover:text-gray-300 transition-colors">Support</a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Globe className="w-4 h-4" />
                <span>© 2026 IntervueX. All rights reserved.</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </PageTransition>
  )
}
