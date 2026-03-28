import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * AnimatedOrb – the AI's visual representation in the interview room.
 * Pulsates gently when idle/listening, reacts with intensity when AI speaks.
 */
export default function AnimatedOrb({ state = 'idle', audioLevel = 0 }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  // State-based scale and color
  const stateConfig = {
    idle: { scale: 1, color: 'from-primary/40 to-secondary/40', pulse: true },
    listening: { scale: 1.05, color: 'from-primary/60 to-secondary/60', pulse: true },
    speaking: { scale: 1.1 + audioLevel * 0.3, color: 'from-primary to-secondary', pulse: false },
    connecting: { scale: 0.95, color: 'from-gray-500/40 to-gray-600/40', pulse: true },
    disconnected: { scale: 0.9, color: 'from-red-500/40 to-red-600/40', pulse: false },
  }

  const config = stateConfig[state] || stateConfig.idle

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const size = 320
    canvas.width = size
    canvas.height = size

    let frame = 0
    const animate = () => {
      frame++
      ctx.clearRect(0, 0, size, size)

      const cx = size / 2
      const cy = size / 2
      const baseRadius = 80
      const intensity = state === 'speaking' ? 0.3 + audioLevel * 0.7 : 0.1

      // Outer glow rings
      for (let ring = 3; ring >= 0; ring--) {
        const radius = baseRadius + ring * 25 + Math.sin(frame * 0.02 + ring) * 5 * (1 + intensity)
        const alpha = (0.08 - ring * 0.015) * (1 + intensity)

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        gradient.addColorStop(0, `rgba(59, 130, 246, ${alpha * 2})`)
        gradient.addColorStop(0.5, `rgba(139, 92, 246, ${alpha})`)
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)')

        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // Core orb with distortion when speaking
      const points = 128
      ctx.beginPath()
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        const noise = state === 'speaking'
          ? Math.sin(angle * 4 + frame * 0.08) * 8 * intensity +
            Math.sin(angle * 7 + frame * 0.12) * 4 * intensity
          : Math.sin(angle * 3 + frame * 0.03) * 2

        const r = baseRadius + noise
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius)
      coreGrad.addColorStop(0, 'rgba(96, 165, 250, 0.9)')
      coreGrad.addColorStop(0.4, 'rgba(59, 130, 246, 0.7)')
      coreGrad.addColorStop(0.7, 'rgba(139, 92, 246, 0.5)')
      coreGrad.addColorStop(1, 'rgba(139, 92, 246, 0.1)')

      ctx.fillStyle = coreGrad
      ctx.fill()

      // Inner bright core
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.4)
      innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
      innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.beginPath()
      ctx.arc(cx, cy, baseRadius * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = innerGrad
      ctx.fill()

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [state, audioLevel])

  const stateLabels = {
    idle: 'Ready',
    listening: 'Listening...',
    speaking: 'AI Speaking...',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <motion.div
        className="relative"
        animate={{
          scale: config.scale,
        }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <canvas
          ref={canvasRef}
          className="w-64 h-64 md:w-80 md:h-80"
          style={{ imageRendering: 'auto' }}
        />

        {/* Outer breathing ring */}
        {config.pulse && (
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>

      {/* State label */}
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <span className={`w-2 h-2 rounded-full ${
          state === 'speaking' ? 'bg-primary animate-pulse' :
          state === 'listening' ? 'bg-accent-success animate-pulse' :
          state === 'connecting' ? 'bg-accent-warning animate-pulse' :
          state === 'disconnected' ? 'bg-accent-error' :
          'bg-gray-500'
        }`} />
        <span className="text-sm text-gray-400 font-medium">
          {stateLabels[state]}
        </span>
      </motion.div>
    </div>
  )
}
