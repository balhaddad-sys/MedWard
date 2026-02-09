# MedWard Pro

Clinical Ward Management System for healthcare professionals. Manage patients, lab results, tasks, shift handovers, and access AI-powered clinical assistance — all in one application.

## Features

- **Patient Management** — Track patients with acuity levels, diagnoses, medications, allergies, and bed assignments
- **Lab Results** — Upload lab images for AI-powered extraction, view trending data, and receive critical value alerts
- **Task Management** — Create, assign, and track clinical tasks with priority levels and due dates
- **Shift Handover** — Generate structured handover reports for seamless shift transitions
- **Clinical AI Assistant** — Chat-based clinical decision support powered by Claude AI
- **Drug Information** — Look up drug details, interactions, and dosing guidance
- **Three Clinical Modes** — Ward, Acute Care (On-Call), and Clinic modes with adaptive UI
- **Offline Support** — Service worker caching and IndexedDB queue for offline data entry
- **PWA** — Installable as a native-like app on mobile and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Styling | Tailwind CSS 3.4 |
| State | Zustand 5 |
| Routing | React Router 7 |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| AI | Anthropic Claude API (via Cloud Functions) |
| Charts | Recharts |
| PDF Export | jsPDF |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Firebase project with Firestore, Auth, Storage, and Cloud Functions enabled

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd MedWard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables — copy the example and fill in your Firebase project credentials:
   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Firebase Emulators (Optional)

To run with local Firebase emulators for development:

```bash
# Set VITE_USE_EMULATORS=true in .env.local
npm run firebase:emulators
```

### Cloud Functions

```bash
cd functions
npm install
npm run build
```

## Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting + Cloud Functions
npm run deploy
```

## Project Structure

```
src/
├── components/       # Reusable UI and feature components
├── pages/            # Route-level page components
├── layouts/          # Layout wrappers (ClinicalLayout)
├── stores/           # Zustand state stores
├── services/         # Firebase, AI, and business logic services
├── config/           # App configuration and constants
├── context/          # React context (clinical mode)
├── types/            # TypeScript interfaces
├── utils/            # Utility functions
└── styles/           # Global CSS
functions/            # Firebase Cloud Functions (AI endpoints)
labx/                 # Python lab image extraction engine
public/               # Static assets, PWA manifest, service worker
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_USE_EMULATORS` | Connect to local Firebase emulators |

## Security

- All data access requires Firebase Authentication
- Firestore security rules enforce role-based access control with data validation
- Audit logging for compliance tracking
- Storage rules limit uploads to authenticated users with size and type restrictions
- Security headers configured via Firebase Hosting (X-Frame-Options, CSP, etc.)
- No credentials are committed to the repository

## License

Proprietary. All rights reserved.
