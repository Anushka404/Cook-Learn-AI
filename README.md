# 🍳 Cook and Learn AI

**Cook and Learn AI** is an AI-powered web application that helps users **learn from YouTube videos** in two powerful ways:

- 📚 **Lecture Summarization & Quizzes**  
  Generate topic-wise summaries, timestamps, and interactive quizzes from YouTube lectures.
  
- 👩‍🍳 **Voice-Controlled Cooking Assistant**  
  Extract step-by-step instructions from cooking videos and guide users using voice commands.

---

## 🚀 Features

- **YouTube Transcript Summarization** using **Step-3-flash via OpenRouter**
- **Semantic Quiz Generation** powered by **Redis** for VectorStore and **Cohere embeddings through LangChain**
- **Voice Navigation for Recipes** using **Deepgram** (STT and TTS)
- **Real-time Q&A** from video content using **Step-3-flash**
- Built with **Next.js** and **Tailwind CSS**

---

## 🛠 Tech Stack

- **Framework**: Next.js (Full Stack with App Router)
- **Languages**: TypeScript
- **Styling**: Tailwind CSS  
- **AI & APIs**: Step-3-flash, LangChain, Cohere (from LangChain), Deepgram
- **Vector DB**: Redis Cloud
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
OPENROUTER_API_KEY=your_openrouter_key
REDIS_URL=your_redis_url
RAPIDAPI_KEY=your_rapidapi_key
COHERE_API_KEY=your_cohere_key
DEEPGRAM_API_KEY=your_deepgram_key

# 4. Run the development server
npm run dev
