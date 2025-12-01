# 📄 PaperWise Frontend

**Smart CS Paper Analyser — Next.js Frontend**

The **PaperWise Frontend** is the user interface of the PaperWise platform.
Built with **Next.js (App Router)**, it delivers a fast, interactive experience for reading papers, running semantic search, exploring recommendations, managing notes, and performing intelligent Q&A — all powered by the PaperWise backend.

---

## 📌 Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Tech Stack](#tech-stack)
* [Architecture](#architecture)
* [Project Structure](#project-structure)
* [Copyright](#copyright)

---

## 🔍 Overview

The PaperWise frontend provides all user-facing functionality and communicates directly with the FastAPI backend.
It handles:

* User onboarding & authentication (Supabase Auth)
* Browsing and viewing research papers
* Semantic search and personalised recommendations
* Interactive Q&A interface powered by RAG
* Notes, folders, and paper organisation
  
---

## ✨ Features

* ⚡ **Next.js App Router** with server & client components
* 🔐 **Supabase Authentication** (email login, magic link, OAuth optional)
* 📄 **Paper viewer** with metadata, abstract, and downloadable assets
* 🔍 **Semantic search UI** integrated with backend vector search
* 🧠 **RAG-based Q&A chat interface**
* ⭐ **Personalised recommendations** with high-ranking filters
* 🗂 **Notes, folders, and paper organisation**
* 🎨 **ShadCN UI components** + Tailwind CSS
* 📱 Fully responsive layout
* 🧭 Sidebar + Dashboard layout with dynamic routing

---

## 🛠 Tech Stack

### **Framework & UI**

* Next.js 14+ (App Router)
* React 18
* ShadCN UI
* Tailwind CSS
* Lucide Icons

### **Authentication**

* Supabase JS Client
* Next.js server actions

### **State & Data**

* Client/server component hybrid data fetching

---

## 🏗 Architecture

The frontend integrates with backend systems through a set of API calls and dynamic components.

### **1️⃣ UI Layer (Next.js + ShadCN)**

* Renders pages for papers, recommendations, search, and chat

### **2️⃣ Authentication Layer (Supabase)**

Handles:

* Email/password login
* Magic link verification
* Login with Google OAuth
* Client-side session syncing
* Protected routes and dashboards

### **3️⃣ Backend Communication Layer**

Communicates with FastAPI backend for:

* Paper metadata
* Processed structured content
* Embeddings search results
* Q&A chat responses (Gemini RAG)
* Recommendations
* Notes and folder CRUD

> Backend repository: [PaperWise Backend API](https://github.com/samanthalz/paperwise-backend)

### **4️⃣ Rendering & State**

Next.js features used:

* Server components
* Route groups
* Server Actions
* Optimised caching for metadata

---

## 📁 Project Structure

```
paperwise-frontend/
│── app/
│   ├── (auth)/             # Login, register, and password reset pages
│   ├── (private)/          # Authenticated user pages
│       ├── dashboard/      # Main dashboard layout and pages
│       ├── search/         # Semantic search pages
│       ├── settings/       # User settings pages
│
│── components/
│   ├── ui/                 # ShadCN UI components
│   ├── paper-detail/       # Paper detail component
│   ├── paper-tabs/         # Tab components for paper view
│   ├── topbars/            # Topbar/navigation components
│   └── (misc components)   # Other components not in specific folders
│
│── api/
│   ├── arxiv/              # ArXiv API interactions
│   ├── ask/                # Q&A / RAG endpoints
│   ├── check-email/        # Email verification
│   ├── paper-status/       # Paper metadata/status endpoints
│   ├── save-paper/         # Paper saving endpoints
│
│── auth/
│   ├── callback/           # OAuth / magic link callback pages
│   ├── confirm/            # Email confirmation pages
│
│── utils/
│   ├── supabase/           # Supabase client utilities
│   ├── citation.ts         # Citation helper functions
│
│── public/                 # Static assets (images, icons, fonts)
│── styles/                 # Tailwind CSS globals and custom styles
│── README.md
│── package.json
```

---

## 📜 Copyright

```
Copyright (c) 2025 PaperWise / samanthalz

All rights reserved.

This source code and its associated files are proprietary and confidential.
Unauthorized copying, distribution, modification, or use of this code, via
any medium, is strictly prohibited.

No license is granted to use, distribute, or modify this software unless
explicit written permission is obtained from the copyright holder.
```

---
