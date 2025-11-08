from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import json
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatMessage(BaseModel):
    message: str
    user_id: int
    context: str = ""
    lesson_id: Optional[int] = None

class DeepSeekResponse(BaseModel):
    response: str
    confidence: float
    suggested_topics: list[str]

# DeepSeek API configuration
from config import config

DEEPSEEK_API_URL = config.DEEPSEEK_API_URL
DEEPSEEK_API_KEY = config.DEEPSEEK_API_KEY

def create_math_context_prompt(user_context: str, lesson_context: str) -> str:
    """Create a context-aware prompt for mathematical tutoring"""
    
    base_prompt = """You are an expert mathematics tutor specializing in numerical methods and linear algebra. 
    
    Your expertise includes:
    - Gauss elimination and LU decomposition
    - Jacobi and Gauss-Seidel iterative methods
    - Matrix operations and determinants
    - Linear systems and interpolation
    - Convergence analysis and error estimation
    
    Teaching approach:
    - Always provide step-by-step explanations
    - Use clear mathematical notation
    - Explain the "why" behind each step
    - Give practical examples when possible
    - Encourage understanding over memorization
    - If a student makes an error, guide them to discover it themselves
    
    Current lesson context: {lesson_context}
    Student's learning context: {user_context}
    
    Respond in the same language as the student's question (French or English).
    Use LaTeX notation for mathematical expressions when appropriate.
    Format your responses clearly with proper spacing and structure.
    """
    
    return base_prompt.format(
        lesson_context=lesson_context or "General numerical methods",
        user_context=user_context or "Student learning numerical methods"
    )

def get_fallback_response(message: str, context: str) -> tuple[str, list[str]]:
    """Fallback responses when API is not available"""
    
    message_lower = message.lower()
    
    # French responses
    if any(word in message_lower for word in ['bonjour', 'salut', 'hello', 'hi']):
        response = """Bonjour ! Je suis votre tuteur de mathématiques. 

Je peux vous aider avec :
• Méthodes de Gauss et décomposition LU
• Méthodes itératives (Jacobi, Gauss-Seidel)
• Opérations matricielles et déterminants
• Systèmes linéaires et interpolation
• Analyse de convergence

Posez-moi votre question de mathématiques !"""
        topics = ["Gauss", "Décomposition LU", "Méthodes Itératives"]
        
    elif any(word in message_lower for word in ['gauss', 'élimination', 'système linéaire']):
        response = """**Méthode d'élimination de Gauss** - Résolution étape par étape :

1. **Forme matricielle** : Transformez le système en matrice augmentée
2. **Élimination** : Utilisez des opérations élémentaires pour créer des zéros
3. **Substitution** : Résolvez de bas en haut

**Exemple simple** :
```
2x + y = 5
x + 3y = 7
```

**Étape 1** : Matrice augmentée
```
[2  1 | 5]
[1  3 | 7]
```

**Étape 2** : Élimination (R2 - 0.5×R1)
```
[2  1 | 5]
[0  2.5 | 4.5]
```

**Étape 3** : y = 4.5/2.5 = 1.8, puis x = (5-1.8)/2 = 1.6

Voulez-vous que j'explique une étape spécifique ?"""
        topics = ["Élimination", "Matrice Augmentée", "Substitution"]
        
    elif any(word in message_lower for word in ['lu', 'décomposition']):
        response = """**Décomposition LU** - Factorisation matricielle :

La décomposition LU décompose une matrice A en :
**A = L × U**

Où :
• **L** = matrice triangulaire inférieure (Lower)
• **U** = matrice triangulaire supérieure (Upper)

**Avantages** :
- Résolution rapide de systèmes linéaires
- Calcul efficace du déterminant
- Inversion matricielle simplifiée

**Processus** :
1. Factoriser A = LU
2. Résoudre Ly = b (substitution avant)
3. Résoudre Ux = y (substitution arrière)

Voulez-vous voir un exemple concret ?"""
        topics = ["Factorisation", "Triangulaire", "Substitution"]
        
    elif any(word in message_lower for word in ['jacobi', 'gauss-seidel', 'itératif']):
        response = """**Méthodes itératives** - Comparaison :

**Méthode de Jacobi** :
- Utilise les valeurs de l'itération précédente
- Plus simple à implémenter
- Convergence plus lente

**Méthode de Gauss-Seidel** :
- Utilise les nouvelles valeurs calculées
- Convergence plus rapide
- Plus efficace en mémoire

**Exemple** : Résoudre Ax = b
```
x₁ = (b₁ - a₁₂x₂ - a₁₃x₃) / a₁₁
x₂ = (b₂ - a₂₁x₁ - a₂₃x₃) / a₂₂
x₃ = (b₃ - a₃₁x₁ - a₃₂x₂) / a₃₃
```

Quelle méthode vous intéresse le plus ?"""
        topics = ["Jacobi", "Gauss-Seidel", "Convergence"]
        
    else:
        response = """Je suis votre tuteur de mathématiques spécialisé en méthodes numériques !

**Je peux vous aider avec** :
• **Algèbre linéaire** : Gauss, LU, déterminants
• **Méthodes itératives** : Jacobi, Gauss-Seidel
• **Interpolation** : Polynômes, splines
• **Analyse numérique** : Convergence, erreurs

**Posez votre question** en français ou en anglais, je répondrai dans la même langue !

Exemples de questions :
- "Comment résoudre un système avec Gauss ?"
- "Explique-moi la décomposition LU"
- "Quelle est la différence entre Jacobi et Gauss-Seidel ?" """
        topics = ["Algèbre Linéaire", "Méthodes Numériques", "Interpolation"]
    
    return response, topics

@router.post("/chat", response_model=DeepSeekResponse)
async def chat_with_deepseek(chat_data: ChatMessage):
    try:
        # Create context-aware system prompt
        system_prompt = create_math_context_prompt(
            user_context=f"Student ID: {chat_data.user_id}",
            lesson_context=chat_data.context
        )
        
        # Prepare the request for DeepSeek
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": chat_data.message}
            ],
            "temperature": 0.3,  # Lower temperature for more focused math responses
            "max_tokens": 1000,
            "stream": False
        }
        
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        logger.info(f"Sending request to DeepSeek API for user {chat_data.user_id}")
        
        # Make request to DeepSeek
        response = requests.post(
            DEEPSEEK_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            
            # Extract confidence and suggested topics (if available)
            confidence = 0.9  # DeepSeek doesn't provide confidence scores, so we estimate
            suggested_topics = extract_suggested_topics(ai_response)
            
            logger.info(f"Successfully received response from DeepSeek for user {chat_data.user_id}")
            
            return DeepSeekResponse(
                response=ai_response,
                confidence=confidence,
                suggested_topics=suggested_topics
            )
        else:
            # Fallback to local responses if API fails
            logger.warning(f"DeepSeek API failed ({response.status_code}), using fallback responses")
            fallback_response, suggested_topics = get_fallback_response(chat_data.message, chat_data.context)
            
            return DeepSeekResponse(
                response=fallback_response,
                confidence=0.8,
                suggested_topics=suggested_topics
            )
        
    except requests.exceptions.Timeout:
        logger.error("DeepSeek API request timeout")
        fallback_response, suggested_topics = get_fallback_response(chat_data.message, chat_data.context)
        return DeepSeekResponse(
            response=fallback_response,
            confidence=0.8,
            suggested_topics=suggested_topics
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"DeepSeek API request failed: {str(e)}")
        fallback_response, suggested_topics = get_fallback_response(chat_data.message, chat_data.context)
        return DeepSeekResponse(
            response=fallback_response,
            confidence=0.8,
            suggested_topics=suggested_topics
        )
    except Exception as e:
        logger.error(f"Unexpected error in chatbot: {str(e)}")
        fallback_response, suggested_topics = get_fallback_response(chat_data.message, chat_data.context)
        return DeepSeekResponse(
            response=fallback_response,
            confidence=0.8,
            suggested_topics=suggested_topics
        )

def extract_suggested_topics(response: str) -> list[str]:
    """Extract suggested topics from the AI response"""
    # Simple keyword extraction - you can make this more sophisticated
    math_keywords = [
        "gauss", "lu decomposition", "jacobi", "gauss-seidel", 
        "determinant", "eigenvalue", "interpolation", "convergence",
        "matrix", "linear system", "iteration", "error analysis",
        "elimination", "decomposition", "method", "algorithm"
    ]
    
    suggested = []
    response_lower = response.lower()
    
    for keyword in math_keywords:
        if keyword in response_lower:
            suggested.append(keyword.replace("-", " ").title())
    
    return suggested[:3]  # Return top 3 suggestions

@router.get("/health")
async def health_check():
    """Health check endpoint for the chatbot service"""
    return {"status": "healthy", "service": "DeepSeek Math Tutor (with fallback)"}
