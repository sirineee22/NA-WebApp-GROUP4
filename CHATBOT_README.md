# 🤖 Math Tutor AI Chatbot

Your educational web application now includes an intelligent AI math tutor powered by **DeepSeek Math** - a specialized mathematical reasoning model that's 100% free to use!

## ✨ Features

- **🧮 Mathematical Expertise**: Specialized in numerical methods, linear algebra, and mathematical reasoning
- **📚 Context-Aware**: Understands which lesson/module you're currently studying
- **🌍 Bilingual**: Responds in French or English based on your question
- **💡 Smart Suggestions**: Recommends related topics to explore
- **🎯 Step-by-Step**: Provides detailed explanations with mathematical notation
- **🚀 Always Available**: Floating chat button accessible from any page

## 🚀 Quick Start

### 1. Get Your Free DeepSeek API Key

1. Visit [https://platform.deepseek.com/](https://platform.deepseek.com/)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you'll need it in the next step)

### 2. Run the Setup Script

```bash
cd backend
python setup_chatbot.py
```

The script will:
- Ask for your API key
- Test the connection
- Create necessary configuration files
- Guide you through the next steps

### 3. Start Your Application

```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend
npm run dev
```

### 4. Test the Chatbot

1. Look for the floating blue chat button (bottom-right corner)
2. Click it to open the Math Tutor AI
3. Ask your first math question!

## 💬 Example Questions to Try

### French Questions
- "Comment résoudre un système linéaire avec la méthode de Gauss ?"
- "Explique-moi la décomposition LU étape par étape"
- "Quelle est la différence entre Jacobi et Gauss-Seidel ?"
- "Comment calculer le déterminant d'une matrice ?"
- "Peux-tu m'expliquer l'interpolation polynomiale ?"

### English Questions
- "How do I solve a linear system using Gauss elimination?"
- "Explain LU decomposition step by step"
- "What's the difference between Jacobi and Gauss-Seidel methods?"
- "How do I calculate the determinant of a matrix?"
- "Can you explain polynomial interpolation?"

## 🏗️ Architecture

### Backend Components
- **`chatbot_router.py`**: FastAPI router for chatbot endpoints
- **`config.py`**: Configuration management for API keys
- **`main.py`**: Main application with chatbot integration

### Frontend Components
- **`MathTutorChatbot.tsx`**: React component for the chat interface
- **`App.tsx`**: Main app with chatbot integration

### API Endpoints
- `POST /api/chatbot/chat`: Send a message to the AI tutor
- `GET /api/chatbot/health`: Health check for the chatbot service

## 🔧 Configuration

### Environment Variables
```bash
# .env file
DEEPSEEK_API_KEY=your_actual_api_key_here
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DATABASE_URL=./instance/database.db
```

### DeepSeek API Settings
- **Model**: `deepseek-math` (specialized in mathematical reasoning)
- **Temperature**: 0.3 (focused, consistent responses)
- **Max Tokens**: 1000 (detailed explanations)
- **Timeout**: 30 seconds

## 🎯 Context Awareness

The chatbot automatically detects which lesson you're studying based on your current URL:

- **Gauss Methods**: `/gauss` → "Gauss Elimination Method"
- **LU Decomposition**: `/lu` → "LU Decomposition"
- **Jacobi Method**: `/jacobi` → "Jacobi Iterative Method"
- **Interpolation**: `/interpolation` → "Polynomial Interpolation"
- **Linear Systems**: `/systemes-lineaires` → "Linear Systems"
- **Non-linear Equations**: `/equations-non-lineaires` → "Non-linear Equations"

## 🚨 Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Run the setup script: `python setup_chatbot.py`
   - Check your `.env` file has the correct API key

2. **"DeepSeek API error"**
   - Verify your API key is correct
   - Check if DeepSeek service is available
   - Ensure you have internet connection

3. **Chatbot not appearing**
   - Check browser console for errors
   - Verify backend is running on port 8000
   - Check CORS configuration

4. **Slow responses**
   - DeepSeek API may have occasional delays
   - Check your internet connection
   - Verify API key has proper permissions

### Debug Mode

Enable detailed logging in your backend:
```python
# In main.py, change logging level
logging.basicConfig(level=logging.DEBUG)
```

## 📚 Advanced Usage

### Custom Prompts

You can customize the AI's behavior by modifying the system prompt in `chatbot_router.py`:

```python
def create_math_context_prompt(user_context: str, lesson_context: str) -> str:
    # Modify this function to change the AI's personality
    # or add specific teaching instructions
```

### Integration with User Progress

The chatbot can be enhanced to:
- Remember user's learning history
- Provide personalized recommendations
- Track question patterns
- Suggest remedial topics

### Multi-language Support

The chatbot automatically detects the language of your question and responds accordingly. You can extend this by:

1. Adding more language detection logic
2. Customizing prompts for different languages
3. Supporting mathematical notation in various languages

## 🔒 Security & Privacy

- **No Data Storage**: Chat messages are not stored in your database
- **API Key Protection**: Keys are stored in environment variables
- **Request Validation**: All inputs are validated using Pydantic models
- **Rate Limiting**: Built-in timeout protection (30 seconds)

## 🌟 Why DeepSeek Math?

- **🎯 Mathematical Specialization**: Better than general-purpose AI for math
- **💰 100% Free**: No hidden costs or credit card required
- **🚀 No Rate Limits**: Perfect for educational use
- **📚 Educational Focus**: Designed for step-by-step explanations
- **🔬 Active Development**: Regular updates and improvements

## 🤝 Contributing

Want to improve the chatbot? Here are some ideas:

1. **Enhanced Context Detection**: Better lesson/module recognition
2. **Mathematical Notation**: Improved LaTeX rendering
3. **Progress Tracking**: Save chat history for learning analytics
4. **Offline Mode**: Cache common responses for offline use
5. **Voice Integration**: Add speech-to-text capabilities

## 📞 Support

- **DeepSeek API**: [https://platform.deepseek.com/docs](https://platform.deepseek.com/docs)
- **Project Issues**: Check your project's issue tracker
- **Community**: Join mathematical education communities

## 🎉 Success Stories

Share how the chatbot helped you or your students learn! Some ideas:

- "The chatbot explained LU decomposition better than my textbook!"
- "Finally understood the difference between Jacobi and Gauss-Seidel"
- "Perfect for reviewing before exams"
- "Great for students who need extra help"

---

**Happy Learning with AI! 🚀📚**
