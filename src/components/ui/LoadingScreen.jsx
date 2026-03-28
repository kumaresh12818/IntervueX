import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-dark flex items-center justify-center z-[100]">
      {/* Background orbs */}
      <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] animate-pulse-slower" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-lg"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>

        {/* Loading bar */}
        <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '50%' }}
          />
        </div>

        <p className="text-sm text-gray-500 font-medium">Loading IntervueX...</p>
      </motion.div>
    </div>
  )
}
