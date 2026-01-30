# IELTS Test System

A comprehensive IELTS test platform with AI-powered test generation and detailed scoring analysis.

## Features

### Test Generation
- **AI-Powered**: Uses Google Gemini API to generate personalized tests
- **5 Levels**: From Beginner (IELTS 3.0-4.0) to Advanced (IELTS 7.5-8.0)
- **Two-Phase System**: Listening & Speaking or Reading & Writing (30 minutes each)

### Test Content

#### Listening (20 questions, 4 sections)
- Section 1: Daily conversation
- Section 2: Social monologue
- Section 3: Academic conversation
- Section 4: Academic lecture
- Text-to-speech audio (listen once only)
- Question types: Multiple choice, Matching, True/False/Not Given, Fill-in-blank, Short answer

#### Speaking (10 minutes)
- Part 1: 3-4 intro questions (20 seconds each)
- Part 2: Cue card with 1 minute preparation + 2 minutes speaking
- Part 3: 3-4 analytical questions (30 seconds each)
- Automatic question reading (text-to-speech)
- Voice recording with speech recognition
- Auto-submit on timeout

#### Reading (20 questions, 2 passages)
- Passage 1: Contains chart/visual data (10 questions)
- Passage 2: Social/societal topic (10 questions)
- **10 Different Question Types**:
  - Multiple choice
  - True/False/Not Given
  - Yes/No/Not Given
  - Matching headings
  - Matching information
  - Summary completion
  - Sentence completion
  - Short answer
  - Diagram labeling
  - Classification

#### Writing (15 minutes)
- Task 1: 50-80 words, describe chart from Reading Passage 1
- Task 2: 100-120 words, essay based on Reading Passage 2 topic
- Word count indicators
- Chart visualization for Task 1

### Scoring & Analysis

#### Automatic Scoring
- **Listening/Reading**: Objective matching with question type analysis
- **Speaking**: AI evaluation on 4 criteria (Fluency, Lexical, Grammar, Pronunciation)
- **Writing**: AI evaluation on 4 criteria (Task Achievement, Coherence, Lexical, Grammar)
- IELTS band conversion (0.0-9.0)

#### Detailed Analysis
- **IELTS Analysis**: Strengths/weaknesses, question type performance
- **Extended Analysis ("Beyond IELTS")**:
  - Reflex level and processing speed
  - Mother tongue influence (translation, vocabulary, comprehension)
  - Grammar analysis (meaning errors, structure, naturalness)
  - Pronunciation analysis (comprehension, rhythm, stress, sounds)
  - Vocabulary analysis (level, naturalness, range)

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Google Gemini AI**: Test generation and scoring
- **In-memory storage**: No database required
- **Pydantic**: Data validation

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **Recharts**: Chart visualization
- **Web Speech API**: Speech recognition and synthesis

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Backend Setup

1. Navigate to backend directory:
```bash
cd ielts/backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
# Optional: Add backup keys
# GEMINI_API_KEYS=key1,key2,key3
```

4. Run the server:
```bash
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd ielts/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

4. Run the development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Project Structure

```
ielts/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── models/              # Data models
│   │   ├── routes/              # API endpoints
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   │   ├── gemini_service.py    # Gemini API integration
│   │   │   ├── test_generator.py    # Test generation
│   │   │   └── scoring_service.py    # Scoring & analysis
│   │   └── storage.py           # In-memory storage
│   └── requirements.txt
├── frontend/
│   ├── app/                     # Next.js app directory
│   │   ├── page.tsx             # Home page
│   │   ├── level-selection/     # Level selection
│   │   ├── phase-selection/     # Phase selection
│   │   ├── test/                # Test taking page
│   │   └── results/             # Results page
│   ├── components/
│   │   └── UnifiedSpeaking.tsx  # Speaking component
│   └── lib/
│       └── api.ts               # API client
└── README.md
```

## API Endpoints

### Session Management
- `POST /api/sessions` - Create new test session
- `GET /api/sessions/{id}` - Get session information
- `POST /api/sessions/{id}/select-phase` - Select test phase

### Test Generation
- `POST /api/sessions/{id}/generate` - Generate Phase 1 content
- `POST /api/sessions/{id}/generate-phase2` - Generate Phase 2 content

### Test Submission
- `POST /api/sessions/{id}/submit-phase1` - Submit Phase 1 answers
- `POST /api/sessions/{id}/submit-phase2` - Submit Phase 2 answers
- `POST /api/sessions/{id}/aggregate` - Aggregate final results

## Workflow

1. **Select Level** → User chooses proficiency level
2. **Create Session** → System creates test session
3. **Select Phase** → User chooses Listening & Speaking or Reading & Writing
4. **Generate Test** → AI generates test content (calls Gemini once)
5. **Take Phase 1** → User completes test (30 minutes)
6. **Submit Phase 1** → AI scores and saves results
7. **Generate Phase 2** → AI generates remaining phase
8. **Take Phase 2** → User completes remaining phase
9. **Submit Phase 2** → AI scores Phase 2
10. **View Results** → System aggregates and displays comprehensive results

## Environment Variables

### Backend (.env)
```env
GEMINI_API_KEY=your_api_key
GEMINI_API_KEYS=key1,key2,key3  # Optional: Multiple keys for rotation
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Development

### Backend
```bash
# Run with auto-reload
uvicorn app.main:app --reload

# Run on specific port
uvicorn app.main:app --port 8000
```

### Frontend
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Production Deployment

### Backend
- Use a production ASGI server like Gunicorn with Uvicorn workers
- Set up environment variables securely
- Configure CORS for your frontend domain

### Frontend
- Build static files: `npm run build`
- Deploy to Vercel, Netlify, or any static hosting
- Update `NEXT_PUBLIC_API_URL` to production backend URL

## Notes

- **In-memory storage**: Sessions are stored in memory and will be lost on server restart
- **API keys**: Make sure to secure your Gemini API keys
- **Browser support**: Speaking section requires Chrome or Edge (Web Speech API)
- **Time limits**: All sections have strict time limits as per IELTS standards

## License

This project is for educational purposes.
