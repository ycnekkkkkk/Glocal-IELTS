# 🎓 Glocal IELTS Diagnostic System

A comprehensive AI-powered IELTS diagnostic platform that provides personalized skill assessment and learning roadmaps.

## ✨ Features

### 🎯 Core Functionality
- **5-Level Assessment**: Beginner to Advanced (IELTS 3.0-7.0+)
- **4 Skills Testing**: Listening, Reading, Speaking, Writing
- **AI-Powered Evaluation**: Using Google Gemini AI for detailed analysis
- **Overall Diagnosis**: Comprehensive report with personalized improvement roadmap

### 💾 Test History
- **Auto-Save**: Tests automatically saved after completion
- **History View**: Browse and reload previous test results
- **Persistent Storage**: LocalStorage-based data persistence
- **Quick Access**: View past performance and track progress

### 📱 User Experience
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Modern UI**: Clean, professional interface with Tailwind CSS
- **Real-time Feedback**: Instant scoring and detailed analysis
- **Interactive Testing**: Speech recognition for Speaking tests

## 🏗️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **AI Integration**: Google Gemini 2.0 Flash
- **API Design**: RESTful architecture
- **Services**: Modular test generation and scoring

### Frontend
- **Framework**: Next.js 15.1 (React 19)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Charts**: Chart.js for data visualization
- **Storage**: Browser LocalStorage API

## 📂 Project Structure

```
Glocal-IELTS/
├── backend/
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   │   ├── test_generator.py
│   │   │   ├── scoring_service.py
│   │   │   ├── overall_diagnosis_service.py
│   │   │   └── gemini_service.py
│   │   ├── main.py         # FastAPI app
│   │   └── models.py       # Data models
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── page.tsx        # Main application
    │   ├── layout.tsx      # Layout component
    │   └── globals.css     # Global styles
    ├── lib/
    │   ├── api.ts          # API client
    │   └── testStorage.ts  # Test history storage
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- Google Gemini API key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set environment variable:
```bash
export GEMINI_API_KEY="your-api-key-here"
```

4. Run the server:
```bash
uvicorn app.main:app --reload --port 8001
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Open browser:
```
http://localhost:3000
```

## 📖 Usage Flow

1. **Select Level**: Choose your current English proficiency level
2. **Choose Skills**: Pick which skills to test (can test all 4)
3. **Take Test**: Complete AI-generated test questions
4. **Get Results**: Receive detailed band scores and analysis
5. **View Report**: Access comprehensive diagnosis with improvement roadmap
6. **Track Progress**: Review saved tests in History section

## 🎨 Key Features Detail

### Test Generation
- Dynamic test creation using AI
- Appropriate difficulty based on selected level
- Variety of question types (MCQ, Fill-in-blanks, Matching, Essay)

### Scoring System
- Automated scoring for Listening and Reading
- AI-based evaluation for Speaking and Writing
- IELTS band score mapping (0-9 scale)

### Diagnosis Report
- Overall band score calculation
- Skill balance analysis
- Strengths and weaknesses identification
- Phased learning roadmap
- Resource recommendations

### Test History
- Automatic save after completion
- View past performance
- Delete old tests
- Compare progress over time

## 🔒 Data Privacy

- All test data stored locally in browser
- No server-side user data storage
- Test history limited to 20 most recent tests
- Can be cleared anytime

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is for educational purposes.

## 👤 Author

**Cao Ngọc Ý**
- GitHub: [@ycnekkkkkk](https://github.com/ycnekkkkkk)

## 🙏 Acknowledgments

- Google Gemini AI for powering the test generation and evaluation
- Next.js team for the amazing framework
- FastAPI for the efficient backend framework

---

**Note**: This is a diagnostic tool and does not replace official IELTS testing. Band scores are estimates based on AI analysis.

