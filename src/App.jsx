import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import InterviewSetup from './pages/InterviewSetup'
import InterviewLive from './pages/InterviewLive'
import InterviewResult from './pages/InterviewResult'
import ProtectedRoute from './components/layout/ProtectedRoute'

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />

        {/* Protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/interview/setup" element={
          <ProtectedRoute><InterviewSetup /></ProtectedRoute>
        } />
        <Route path="/interview/live" element={
          <ProtectedRoute><InterviewLive /></ProtectedRoute>
        } />
        <Route path="/interview/result/:id" element={
          <ProtectedRoute><InterviewResult /></ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  )
}
