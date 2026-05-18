<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# SplitterBud

**A real-time shared expense tracker built for exactly two friends.**  
Log what you spend, see who owes who, and settle up — no spreadsheets, no awkward conversations.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat&logo=firebase)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)

</div>

---

## What is SplitterBud?

SplitterBud is a minimalist expense-splitting app designed specifically for two people — roommates, travel partners, couples, or any two friends who share costs regularly. Instead of manually calculating who paid what, SplitterBud tracks every expense in a shared workspace and always shows you the live balance: who owes who and exactly how much.

Everything syncs in real time via Firebase, so both users always see the same up-to-date picture without refreshing.

---

## How It Works

1. **Sign up** with Google, email/password, or as a guest
2. **Create a workspace** and give it a name (e.g. "Japan Trip", "Apartment")
3. **Share the 6-character invite code** with your friend so they can join
4. **Log expenses** — who paid, how much, what category, and a description
5. **Check the dashboard** to see the live balance and who owes what
6. **Settle up** at the end of the week by clicking "Settle Week"

---

## Features

### Shared Workspace
Each pair of friends gets a private workspace identified by a unique 6-character invite code. The workspace is capped at 2 members — it's built for exactly two people.

### Expense Logging
Add expenses with:
- Amount
- Category (Food, Transport, Rent, Utilities, Other)
- Date
- Description
- Who paid

Expenses can be edited or deleted at any time. All changes are tracked.

### 50/50 Split Dashboard
The dashboard automatically calculates the running balance based on a strict 50/50 split. It shows:
- Total workspace spend
- Each person's individual contribution
- Who currently owes who and the exact amount

### Weekly Settlements
Expenses are grouped into weekly periods. Once debts are cleared in real life, either user can mark the current period as "Settled" — locking it and starting fresh.

### Real-time Notifications
When your friend adds or edits an expense, you get an instant in-app notification. For edits, you can **approve** the change or **revert** it back to the original amount — giving both users control over the shared ledger.

### Activity Log
A full chronological history of every action taken in the workspace: who added what, who edited what, and who deleted what — with timestamps.

### Authentication
Supports three sign-in methods:
- Google OAuth
- Email & password
- Anonymous guest access

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Backend / DB | Firebase Firestore |
| Auth | Firebase Authentication |
| AI | Google Gemini API |
| Build Tool | Vite |

---

## Run Locally

**Prerequisites:** Node.js

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Set your Gemini API key in `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

> You'll also need a Firebase project with Firestore and Authentication enabled. Copy your Firebase config into `src/lib/firebase.ts`.
