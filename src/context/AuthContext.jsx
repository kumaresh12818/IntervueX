import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
      })
      return unsubscribe
    } catch (err) {
      console.warn('[Auth] Auth listener failed:', err.message)
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    if (!auth) throw new Error('Firebase not configured')
    return signInWithEmailAndPassword(auth, email, password)
  }

  const signup = async (email, password, displayName) => {
    if (!auth) throw new Error('Firebase not configured')
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(result.user, { displayName })
    }
    return result
  }

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Firebase not configured')
    return signInWithPopup(auth, googleProvider)
  }

  const logout = async () => {
    if (!auth) return
    return signOut(auth)
  }

  const value = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    isFirebaseConfigured,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
