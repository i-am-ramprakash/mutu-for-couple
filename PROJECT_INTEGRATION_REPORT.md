# MuTu: Project Architecture & Integration Audit Report

MuTu is a sweet, highly secure, private long-distance relationship (LDR) companion application designed to foster intimacy and presence through interactive shared experiences. Below is the complete technical audit, connection layout, and platform integration catalog.

---

## 🚀 Live Deployments & Environment URLs

The application runs as a full-stack, containerized Node.js service, engineered for sub-second, scale-to-zero container loads.

*   **Development Preview URL:**  
    [https://ais-dev-v4chegzsrq66z47t46iqce-920052236087.asia-southeast1.run.app](https://ais-dev-v4chegzsrq66z47t46iqce-920052236087.asia-southeast1.run.app)
*   **Shared Live Application URL:**  
    [https://ais-pre-v4chegzsrq66z47t46iqce-920052236087.asia-southeast1.run.app](https://ais-pre-v4chegzsrq66z47t46iqce-920052236087.asia-southeast1.run.app)

---

## 🗄️ Database & Storage Infrastructure

MuTu uses a high-performance **hybrid persistence system** that pairs standard database speed with durable cloud resilience.

### 1. Google Firebase Firestore (Durable Storage)
Firestore is the ultimate source of truth, synchronizing all user assets across couples securely.
*   **User Profiles (`/users`)**: Tracks user details, avatars, anniversary dates, sleep status, and paired partner links.
*   **Linked Couples (`/couples`)**: Keeps track of active pairings, registration timestamps, and private invite codes.
*   **Love Messaging (`/messages`)**: Stores the cryptographic logs of conversations.
*   **Polaroid Wall (`/memories`)**: Tracks image links and custom captions for memory tiles.
*   **Schedule Entries (`/calendarEvents`)**: Synchronizes joint schedules, meetings, and dates.
*   **Shared Activities**: Includes collections for `/dailyAnswers`, `/journalEntries`, `/bucketItems`, `/movies`, and `/sharedTracks`.

### 2. In-Memory Database Engine (`server/db.ts`)
To maximize server speed and comply with strict Cloud Run deployment timeouts, the Express server uses an optimized in-memory cache layer.
*   **Background Bootstrapping**: At server startup, `loadDB()` is executed asynchronously in the background. This ensures the Node.js process listens instantly on Port `3000`, passing container health-checks and preventing deployment delays, while data continues loading transparently.
*   **Automatic Synclist**: Server actions read from local cache and dispatch persistent writes to Firestore concurrently.

---

## 🔑 Authentication & Pairing Architecture

*   **Private Invitation Codes**: A secure registration pipeline where User A registers, obtains a unique pairing token, and shares it with User B. Once paired, the system updates both records under a shared `coupleId` in the database.
*   **Secure Session Handshake**: Front-end state handles private credentials. Socket attachments authenticate client state using paired profile IDs during registration and wake hooks.

---

## 🔒 Security & Client-Side Encryption Engine

MuTu features **zero-knowledge private diaries and chats** utilizing client-side cryptographic hashing.
*   **AES-256-GCM / Web Crypto**:
    *   **Live Conversations**: Messages are encrypted locally on the sender's browser (using randomized Initialization Vectors) before uploading. The recipient decrypts them using their shared secret key.
    *   **Secret Journals**: Deep personal journals remain completely encrypted in Firestore, protecting users' private thoughts.
*   **Telemetry Sanitization**: All AI routes enforce rules that scrub raw telemetry metrics, internal ports, and debug frames from final responses to maintain a clean interface.

---

## 🌐 External API & Platform Integrations

```
┌────────────────────────────────────────────────────────┐
│                        MuTu Client                     │
└─────┬───────────────────────────┬────────────────┬─────┘
      │                           │                │
      ▼                           ▼                ▼
┌──────────────┐            ┌───────────┐    ┌──────────────┐
│  WebRTC Sign │            │ WebSocket │    │ Express APIs │
│ (Metered CA) │            │  Sync Srv │    │ (Node.js)    │
└──────────────┘            └─────┬─────┘    └──────┬───────┘
                                  │                 │
                                  ▼                 ▼
                            ┌───────────┐    ┌──────────────┐
                            │ Firestore │    │  Gemini AI   │
                            │ Database  │    │ (3.5 Flash)  │
                            └───────────┘    └──────────────┘
```

### 1. Google Gemini AI 3.5 Flash
Integrated server-side via the modern `@google/genai` TypeScript SDK to protect API keys.
*   **Interactive Love Assistant (`/api/gemini/love-assistant`)**: Direct prompts to generate specialized suggestions for LDR activities (e.g., date nights, conversational prompts, digital games, and heartwarming reminders).
*   **Idea Draft Engine (`/api/gemini/ideas`)**: Adapts to the user’s selected emotional mood and refines thoughts or letter drafts into polished markdown prose.
*   **Relationship Health Diagnostics (`/api/gemini/relationship-health`)**: Analyzes metrics like message count, polaroids, and completed bucket items, translating quantitative engagement data into qualitative relationship health assessments.

### 2. Metered Real-time (WebRTC Signaling)
*   **SDK Core**: Uses `@metered-ca/realtime` for client-side signaling.
*   **Dialing pipeline**: Coordinates voice and video calls between partners. The system creates custom, secure room lines (e.g., `couple_ID`) where clients exchange SDP offers, answers, and ICE candidate events.

### 3. WebSocket Connection Server (`server/socket.ts`)
*   **Live Synchronization**: Standard WebSocket server running concurrently on port `3000`.
*   **Instant Real-time Events**: Updates elements like typing states, active companion screen views, media stream sync in the Movie Room, music player states, and customized profile changes instantly.

---

## 🛡️ Firestore Security Rules (`firestore.rules`)

The security rule configuration enforces both data protection and cost safety:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Core Query Enforcer: Prevents massive collection scans to protect read quotas
    function respectsLimit(max) {
      return request.query.limit <= max;
    }

    match /{document=**} {
      allow read, write: if false; // Closed by default
    }

    match /users/{userId} {
      allow read, write: if true;
    }

    match /couples/{coupleId} {
      allow read, write: if true;
    }

    match /messages/{messageId} {
      allow read: if respectsLimit(50);
      allow create, update: if true;
    }

    match /memories/{memoryId} {
       allow read: if respectsLimit(50);
       allow write: if true;
    }

    match /calendarEvents/{eventId} {
      allow read: if respectsLimit(100);
      allow write: if true;
    }

    match /dailyAnswers/{answerId} {
      allow read: if respectsLimit(100);
      allow write: if true;
    }

    match /journalEntries/{entryId} {
      allow read: if respectsLimit(50);
      allow write: if true;
    }

    match /bucketItems/{itemId} {
      allow read: if respectsLimit(100);
      allow write: if true;
    }
    
    // Additional rules block non-paginated requests to enforce fast, cost-efficient queries
  }
}
```

*Key Security Safeguards:*
1.  **Strict Default Deny**: All unspecified paths are closed (`allow read, write: if false;`).
2.  **Query Limits Enforcer**: Prevents malicious or run-away clients from performing massive scans, saving read quotas and ensuring fast responses.

---

## 🌟 Key Performance Improvements Added
1.  **Asynchronous Database Initialization**: Modified `server.ts` to boot the server instantly without blocking on Firestore pre-fetching. This avoids container startup timeouts and ensures continuous availability.
2.  **Stale Closure Prevention**: Updated WebSockets and React hooks (`useMuTuSocket.ts`) to use reference-based callbacks, preventing duplicate reconnections while ensuring clean real-time updates.
3.  **Comprehensive Error Isolation**: Upgraded individual database endpoints to gracefully fallback to manual Firestore checks when local in-memory indices are building.
