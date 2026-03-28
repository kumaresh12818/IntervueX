import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Animated circular progress ring for displaying interview scores.
 */
export default function ScoreRing({
  score = 0,
  maxScore = 10,
  size = 200,
  strokeWidth = 10,
  label = 'Overall Score',
  color = 'url(#scoreGradient)',
  delay = 0,
}) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (animatedScore / maxScore) * circumference

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score)
    }, delay + 300)
    return () => clearTimeout(timer)
  }, [score, delay])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: 'easeOut' }}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="score-ring"
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>

          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={animatedScore}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold gradient-text"
          >
            {animatedScore.toFixed(1)}
          </motion.span>
          <span className="text-xs text-gray-500 font-medium">/ {maxScore}</span>
        </div>
      </div>

      <span className="text-sm text-gray-400 font-medium">{label}</span>
    </motion.div>
  )
}
