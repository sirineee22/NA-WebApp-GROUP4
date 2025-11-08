import os
from typing import Optional

class Config:
    """Configuration class for the application"""
    
    # API Configuration
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/v1/chat/completions"
    
    # Hugging Face API Configuration
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")
    HUGGINGFACE_API_URL: str = "https://api-inference.huggingface.co/models"
    
    # Model Selection
    PREFERRED_MODEL: str = os.getenv("PREFERRED_MODEL", "huggingface")  # "huggingface", "deepseek", "fallback"
    
    # Backend Configuration
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "./instance/database.db")
    
    # CORS Configuration
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://192.168.1.16:8080",
        "http://192.168.1.16:3000"
    ]
    
    @classmethod
    def validate_config(cls) -> bool:
        """Validate that required configuration is present"""
        print("🔧 API Configuration Status:")
        
        # Check DeepSeek
        if cls.DEEPSEEK_API_KEY and cls.DEEPSEEK_API_KEY.startswith("sk-"):
            print("   ✅ DeepSeek API: Configured")
        else:
            print("   ⚠️  DeepSeek API: Not configured")
        
        # Check Hugging Face
        if cls.HUGGINGFACE_API_KEY and cls.HUGGINGFACE_API_KEY.startswith("hf_"):
            print("   ✅ Hugging Face API: Configured")
        else:
            print("   ⚠️  Hugging Face API: Not configured")
        
        # Check if at least one API is available
        if (cls.DEEPSEEK_API_KEY and cls.DEEPSEEK_API_KEY.startswith("sk-")) or \
           (cls.HUGGINGFACE_API_KEY and cls.HUGGINGFACE_API_KEY.startswith("hf_")):
            print("✅ At least one API is configured!")
            return True
        else:
            print("❌ No APIs configured! Using fallback mode only.")
            return False

# Global config instance
config = Config()
