import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar({ transparent = false }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navClass = scrolled || !transparent
    ? 'glass-strong shadow-glass'
    : 'bg-transparent'

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navClass}`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-md transition-shadow duration-300">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight">
            Intervue<span className="gradient-text">X</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Dashboard
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={logout}
                className="px-5 py-2.5 rounded-xl text-sm font-medium btn-ghost text-gray-300 hover:text-white"
              >
                Log Out
              </motion.button>
            </>
          ) : (
            <>
              <Link to="/auth/login">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium btn-ghost text-gray-300 hover:text-white"
                >
                  Sign In
                </motion.button>
              </Link>
              <Link to="/auth/signup">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium btn-glow text-white"
                >
                  Get Started
                </motion.button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/5"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-strong border-t border-white/5"
          >
            <div className="px-6 py-4 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                    Dashboard
                  </Link>
                  <button onClick={() => { logout(); setMenuOpen(false); }}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth/login" onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                    Sign In
                  </Link>
                  <Link to="/auth/signup" onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium btn-glow text-white text-center">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
