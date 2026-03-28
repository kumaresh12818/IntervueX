<div align="center">

# 🎯 IntervueX

### AI-Powered Virtual Interview Platform

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Firebase](https://img.shields.io/badge/Firebase-11.2-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Live_API-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Master your next interview with real-time AI voice coaching.**
Upload your CV, practice with a realistic AI interviewer powered by Google Gemini,
and receive instant, detailed feedback to land your dream job.

[🚀 Live Demo](#) · [📖 Documentation](#features) · [🐛 Report Bug](../../issues) · [💡 Request Feature](../../issues)

---

</div>

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎤 **Live Voice Interview** | Real-time bidirectional audio via Gemini Live API WebSocket |
| 📄 **CV-Tailored Questions** | Upload your PDF resume — AI crafts questions specific to your background |
| 📊 **Instant Analysis** | Detailed scoring across communication, technical skills, and confidence |
| 🔮 **Animated AI Orb** | Canvas-based visualizer that reacts to speech in real-time |
| 🔐 **Secure Auth** | Firebase Authentication with email/password and Google SSO |
| 📱 **Responsive Design** | Fully responsive dark-mode UI with glassmorphism aesthetics |
| 🗂️ **Interview History** | Track all past sessions with scores stored in Firestore |
| ⚡ **Vercel Ready** | One-click deploy with optimized SPA routing |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 6, React Router v6 |
| **Styling** | Tailwind CSS 3.4, Custom Glassmorphism Design System |
| **Animations** | Framer Motion 11, Canvas API |
| **Authentication** | Firebase Auth (Email + Google SSO) |
| **Database** | Cloud Firestore |
| **Storage** | Firebase Cloud Storage |
| **AI Engine** | Google Gemini 2.5 Flash — Live API (WebSocket) |
| **Audio** | Web Audio API + AudioWorklet (16kHz PCM capture) |
| **PDF Parsing** | pdf.js (pdfjs-dist) |
| **Icons** | Lucide React |
| **Deployment** | Vercel |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A [Firebase project](https://console.firebase.google.com/) with Auth, Firestore, and Storage enabled
- A [Google AI Studio](https://aistudio.google.com/) API key with Gemini Live API access

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/intervuex.git
cd intervuex
npm install
```

### 2. Configure Environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

```env
# Firebase
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** → Email/Password + Google Sign-In
4. Enable **Cloud Firestore** → Start in test mode
5. Enable **Cloud Storage** → Start in test mode
6. Copy your web app config to `.env`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
intervuex/
├── public/
│   └── favicon.svg                  # App icon
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx           # Glassmorphic navigation bar
│   │   │   ├── PageTransition.jsx   # Framer Motion page wrapper
│   │   │   └── ProtectedRoute.jsx   # Auth route guard
│   │   └── ui/
│   │       ├── AnimatedOrb.jsx      # Canvas AI voice visualizer
│   │       ├── GlassCard.jsx        # Reusable glass card
│   │       ├── LoadingScreen.jsx    # Animated loading state
│   │       └── ScoreRing.jsx        # SVG score progress ring
│   ├── context/
│   │   └── AuthContext.jsx          # Firebase auth provider
│   ├── pages/
│   │   ├── Landing.jsx              # Hero + features landing page
│   │   ├── Login.jsx                # Sign in page
│   │   ├── Signup.jsx               # Create account page
│   │   ├── Dashboard.jsx            # User dashboard + history
│   │   ├── InterviewSetup.jsx       # Role + CV upload wizard
│   │   ├── InterviewLive.jsx        # Real-time voice interview
│   │   └── InterviewResult.jsx      # Analysis & scoring report
│   ├── services/
│   │   ├── firebase.js              # Firebase initialization
│   │   └── gemini.js                # Gemini Live WebSocket + REST
│   ├── App.jsx                      # Route definitions
│   ├── main.jsx                     # React entry point
│   └── index.css                    # Tailwind + design system
├── .env.example                     # Environment template
├── index.html                       # HTML entry with SEO
├── tailwind.config.js               # Custom theme & animations
├── vite.config.js                   # Build configuration
├── vercel.json                      # SPA deployment config
└── package.json
```

---

## 🎨 Design System

IntervueX uses a custom dark-mode design system built on Tailwind CSS:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-dark` | `#09090B` | Page backgrounds |
| `primary` | `#3B82F6` | CTAs, active states, links |
| `secondary` | `#8B5CF6` | Accents, gradients |
| `accent-success` | `#22C55E` | Positive indicators |
| `accent-warning` | `#F59E0B` | Warnings, improvement areas |
| `accent-error` | `#EF4444` | Errors, destructive actions |

**Glassmorphism:** `backdrop-blur-xl` + `bg-white/3-6%` + `border-white/6-10%`

**Typography:** Inter (Google Fonts) — weights 300–900

---

## 🌐 Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to [Vercel Dashboard](https://vercel.com/dashboard) for automatic deployments.

> **Important:** Add all `VITE_*` environment variables in Vercel's project settings → Environment Variables.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🔊 How the Live Interview Works

1. **WebSocket Connection** → Connects to Gemini Live API at `wss://generativelanguage.googleapis.com/ws/...`
2. **Setup Message** → Sends model config with system instruction containing CV text and target role
3. **Audio Capture** → Microphone audio captured at 16kHz PCM via AudioWorklet
4. **Streaming** → PCM frames encoded to base64 and streamed to WebSocket in real-time
5. **AI Response** → Receives base64 PCM audio at 24kHz, decoded and played via Web Audio API
6. **Gapless Playback** → Audio chunks are scheduled for seamless playback using `AudioContext.currentTime`
7. **Post-Interview** → Transcript analyzed by Gemini REST API for detailed scoring

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ using React, Firebase, and Google Gemini AI**

[⬆ Back to Top](#-intervuex)

</div>
