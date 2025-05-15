# 🍳 Cook and Learn AI

**Cook and Learn AI** is an AI-powered web application that helps users **learn from YouTube videos** in two powerful ways:

- 📚 **Lecture Summarization & Quizzes**  
  Generate topic-wise summaries, timestamps, and interactive quizzes from YouTube lectures.
  
- 👩‍🍳 **Voice-Controlled Cooking Assistant**  
  Extract step-by-step instructions from cooking videos and guide users using voice commands.

---

## 🚀 Features

- **YouTube Transcript Summarization** using **Gemini API**
- **Semantic Quiz Generation** powered by **Pinecone** and **Cohere embeddings**
- **Voice Navigation for Recipes** using **Deepgram** (STT) and **ElevenLabs** (TTS)
- **Real-time Q&A** from video content using **Gemini**
- Built with **Next.js** and **Tailwind CSS**

---

## 🛠 Tech Stack

- **Framework**: Next.js (Full Stack with App Router)
- **Languages**: TypeScript
- **Styling**: Tailwind CSS  
- **AI & APIs**: Gemini, Pinecone, Cohere, Deepgram, ElevenLabs  
- **Dev Tools**: Git, Postman, Visual Studio Code, npm

---

## 📦 Installation

```bash
# 1. Clone the repository
git clone https://github.com/Anushka404/Cook-Learn-AI.git
cd Cook-Learn-AI

# 2. Install dependencies
npm install

# 3. Add environment variables
# Create a `.env` file in the root directory and add:
GEMINI_API_KEY=your_gemini_key
PINECONE_API_KEY=your_pinecone_key
COHERE_API_KEY=your_cohere_key
DEEPGRAM_API_KEY=your_deepgram_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# 4. Run the development server
npm run dev
