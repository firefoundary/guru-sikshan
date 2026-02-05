# Guru Sikshan - AI-Powered Teacher Training Platform

An intelligent platform for continuous teacher professional development that uses AI to analyze teacher-reported issues, identify competency gaps, and deliver personalized micro-learning modules.

## Overview

Guru Sikshan addresses the challenge of providing contextualized, ongoing professional development for teachers in resource-constrained educational environments. The system creates a feedback loop where teachers report classroom challenges, AI analyzes these issues to identify competency gaps, and delivers targeted training modules tailored to individual needs.

## Features

- Teacher issue reporting via mobile app
- AI-powered competency gap analysis using semantic search
- Personalized training module recommendations
- Progress tracking and completion monitoring
- Admin dashboard for monitoring and analytics
- Multi-language support (English and Hindi)
- PDF-based training content management
- Feedback collection and training effectiveness measurement

## Tech Stack

### Frontend

**Teacher Mobile App**
- React Native with Expo
- TypeScript
- React Navigation
- Custom UI components
- Context API for state management

**Admin Dashboard**
- React with Vite
- TypeScript
- shadcn/ui components
- Tailwind CSS
- React Router v6
- React Query

### Backend

**API Server**
- Node.js with Express.js
- TypeScript
- Supabase client for database
- bcrypt for authentication
- CORS middleware
- Port: 3000

**AI Personalization Service**
- Python with Flask
- Google Gemini API (gemini-pro)
- sentence-transformers (all-MiniLM-L6-v2)
- ChromaDB for vector storage
- pdfplumber for PDF processing
- Port: 5001

### Database & Storage

- PostgreSQL via Supabase
- Supabase Auth for authentication
- Supabase Storage for PDF modules

### AI/ML

- Semantic search with sentence-transformers/all-MiniLM-L6-v2
- Google Gemini for content generation and embeddings
- RAG (Retrieval Augmented Generation) system
- ChromaDB for persistent vector storage

