# ESO Personalized Collection & Trading Platform: Comprehensive Development Plan

## 1. Executive Summary
This project aims to build a first-of-its-kind ESO platform that combines account-wide character knowledge (motifs, recipes, furnishing plans) with real-time market data. The core value proposition is **personalized decision support**: moving from "what is the price of X?" to "should I buy X right now based on what I already know and my current gold?"

## 2. System Architecture & Data Flow
The platform follows a multi-tier architecture to bridge the gap between the closed ESO ecosystem and the web:

1.  **Data Acquisition (In-Game):**
    *   **Lua Addon:** Scans `LibSkills`, `LibCharacterKnowledge`, or native API calls to track known/unknown items.
    *   **Local Storage:** Writes account/character data to `SavedVariables/ProjectName.lua`.
2.  **The Bridge (Desktop):**
    *   **Desktop Client:** A background process (Electron/Tauri) that watches the Lua file.
    *   **Processing:** Parses Lua tables into JSON, handles local encryption/obfuscation if needed.
    *   **Ingestion:** Authenticated POST requests to the Backend API.
3.  **The Engine (Cloud Backend):**
    *   **API Gateway:** Node.js/FastAPI handling authentication and data synchronization.
    *   **Market Integration:** Cron jobs to ingest price data from public sources (TTC/MM exports or partner APIs).
    *   **Matching Engine:** Calculates "Best Value" by cross-referencing user "Unknowns" with "Lowest Market Prices."
4.  **The Interface (Web):**
    *   **React Application:** High-performance dashboard for personalized insights.

## 3. Recommended Tech Stack
### Frontend (React Web App)
*   **Framework:** **Next.js 14+ (App Router)** for SEO (public market pages) and fast SSR for user dashboards.
*   **Styling:** **Tailwind CSS** with **Shadcn/UI** for a professional, gaming-centric aesthetic.
*   **Data Fetching:** **TanStack Query (v5)** for robust caching and optimistic updates.
*   **State Management:** **Zustand** for lightweight client-side state (filters, UI preferences).
*   **Visualization:** **Recharts** or **Tremor** for completion progress graphs and price history charts.

### Backend & Infrastructure
*   **Backend:** **Node.js (NestJS)** for a scalable, structured TypeScript environment.
*   **Database:** **PostgreSQL** (Relational data: Users, Characters, Items) + **Redis** (Real-time price caching).
*   **Authentication:** **Clerk** or **NextAuth.js** (Discord integration is highly recommended for the ESO community).
*   **Desktop Client:** **Tauri** (Rust-based, significantly smaller footprint than Electron).

## 4. Phase-by-Phase Development Roadmap

### Phase 1: Foundation & Data Engineering (Weeks 1-3)
1.  **Item Database Construction:** Scrape and normalize a master list of all motifs, recipes, and furnishing plans from the ESO game files.
2.  **Schema Design:** Design a relational model that supports multi-character accounts (one User -> many Characters -> many Learned Items).
3.  **Market Data Pipeline:** Build a service to ingest price data (Min, Max, Avg, Suggested) and store it with timestamps.

### Phase 2: Local Integration (Weeks 4-6)
1.  **ESO Addon Development:** 
    *   Implement scanning logic for Motifs (`GetItemLinkRecipeRankRequirement`), Recipes, and Styles.
    *   Implement "Scan on Login" and "Scan on Zone Change" triggers.
2.  **Tauri Desktop Client:**
    *   Implement "Select ESO Folder" logic.
    *   Build the `fs` watcher to detect changes in `SavedVariables`.
    *   Implement secure login linked to the web platform.

### Phase 3: Core React Features (Weeks 7-10)
1.  **The "Personalized Shop":**
    *   A view that shows current Guild Trader listings *only* for items the user doesn't know.
    *   Sort by "Value" (Price / Utility).
2.  **Collection Tracker:**
    *   Visual "Sticker Book" style UI for all collectibles.
    *   "Total Gold to 100%" calculation based on current market averages.
3.  **Alerting System:**
    *   User-defined watchlists (e.g., "Notify me if *Worm Cult Chests* drop below 50k").
    *   Browser/Discord notifications.

### Phase 4: Advanced Trading & Social (Weeks 11-13)
1.  **The "Trade Matcher":**
    *   Identify users who have a duplicate in their inventory that another user needs.
    *   Facilitate secure "WTT" (Want To Trade) requests.
2.  **Farming vs. Buying Logic:**
    *   Analyze drop rates vs. gold cost to recommend whether the user should farm a motif or buy it.

## 5. Detailed React Web Application Features
### The Dashboard (Home)
*   **Quick Stats:** Completion %, Gold Value of Duplicates, Top 3 Missing "Cheap" Items.
*   **Activity Feed:** "New motifs added to market," "Friend X just completed Minotaur set."

### Advanced Filtering (The Secret Sauce)
*   **Contextual Filters:**
    *   `Character`: "What does my Master Crafter still need?"
    *   `Budget`: "Show me everything I can afford with 100,000g."
    *   `Location`: "What should I buy while I'm in Grahtwood?"

### User Experience (UX) Considerations
*   **Mobile First:** Traders often use a second screen (phone/tablet) while playing.
*   **Dark Mode:** Standard for gaming applications.
*   **Performance:** Use virtualization (e.g., `react-window`) for long lists of recipes/motifs.

## 6. Security, Privacy & Compliance
*   **No Automation:** The addon must be read-only regarding game state to avoid ZeniMax TOS violations.
*   **Data Privacy:** Allow users to "Anonymize" their account data or opt-out of the public "Trade Matcher."
*   **API Security:** Rate-limiting on the ingestion endpoint to prevent DDOS or fake data injection.

---
*Note: This is a high-level roadmap and should be adjusted as technical hurdles or new requirements arise.*
