import { motion } from 'framer-motion'

export default function GlassCard({
  children,
  className = '',
  hover = true,
  gradient = false,
  onClick,
  ...props
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, transition: { duration: 0.3 } } : undefined}
      onClick={onClick}
      className={`
        relative rounded-2xl overflow-hidden
        ${gradient ? 'gradient-border' : 'glass'}
        ${hover ? 'glass-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
      {/* Subtle top shine */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </motion.div>
  )
}
