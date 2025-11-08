#!/usr/bin/env python3
"""
Setup script for the Math Tutor Chatbot
This script helps you configure the DeepSeek API integration
"""

import os
import sys
import requests
from pathlib import Path

def print_banner():
    """Print a nice banner for the setup"""
    print("=" * 60)
    print("🤖 MATH TUTOR CHATBOT SETUP")
    print("=" * 60)
    print()

def get_deepseek_api_key():
    """Get DeepSeek API key from user input"""
    print("🔑 STEP 1: Get Your DeepSeek API Key")
    print("   Visit: https://platform.deepseek.com/")
    print("   Sign up for a free account")
    print("   Navigate to API Keys section")
    print("   Create a new API key")
    print()
    
    api_key = input("Enter your DeepSeek API key: ").strip()
    
    if not api_key:
        print("❌ API key cannot be empty!")
        return None
    
    if api_key == "your_free_api_key_here":
        print("❌ Please enter your actual API key, not the placeholder!")
        return None
    
    return api_key

def test_api_key(api_key: str) -> bool:
    """Test if the API key works"""
    print("\n🧪 STEP 2: Testing API Key...")
    
    try:
        url = "https://api.deepseek.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "deepseek-math",
            "messages": [
                {"role": "user", "content": "Hello! Can you help me with math?"}
            ],
            "max_tokens": 50
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            print("✅ API key is valid and working!")
            return True
        else:
            print(f"❌ API test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API: {str(e)}")
        return False

def create_env_file(api_key: str):
    """Create .env file with the API key"""
    print("\n📝 STEP 3: Creating Environment File...")
    
    env_content = f"""# DeepSeek API Configuration
DEEPSEEK_API_KEY={api_key}

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Database Configuration
DATABASE_URL=./instance/database.db
"""
    
    env_path = Path(".env")
    
    try:
        with open(env_path, "w") as f:
            f.write(env_content)
        print(f"✅ Created {env_path}")
    except Exception as e:
        print(f"❌ Error creating .env file: {str(e)}")
        return False
    
    return True

def update_config_file(api_key: str):
    """Update config.py with the API key"""
    print("\n⚙️  STEP 4: Updating Configuration...")
    
    config_path = Path("config.py")
    
    try:
        with open(config_path, "r") as f:
            content = f.read()
        
        # Replace the placeholder with actual API key
        updated_content = content.replace(
            'DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "your_free_api_key_here")',
            f'DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "{api_key}")'
        )
        
        with open(config_path, "w") as f:
            f.write(updated_content)
        
        print("✅ Updated config.py")
        return True
        
    except Exception as e:
        print(f"❌ Error updating config.py: {str(e)}")
        return False

def print_next_steps():
    """Print next steps for the user"""
    print("\n🎉 SETUP COMPLETE!")
    print("=" * 60)
    print("\n📋 Next Steps:")
    print("1. Start your backend server:")
    print("   cd backend")
    print("   python main.py")
    print("\n2. Start your frontend:")
    print("   npm run dev")
    print("\n3. Test the chatbot:")
    print("   - Look for the floating chat button (bottom-right)")
    print("   - Click it to open the Math Tutor AI")
    print("   - Ask a math question like:")
    print("     'Comment résoudre un système linéaire avec Gauss?'")
    print("\n4. Example questions to try:")
    print("   - 'Explique-moi la décomposition LU'")
    print("   - 'Quelle est la différence entre Jacobi et Gauss-Seidel?'")
    print("   - 'Comment calculer le déterminant d'une matrice?'")
    print("\n🔧 Troubleshooting:")
    print("   - Check backend logs for API errors")
    print("   - Verify your API key is correct")
    print("   - Make sure DeepSeek service is available")
    print("\n📚 Learn More:")
    print("   - DeepSeek API docs: https://platform.deepseek.com/docs")
    print("   - Your project: Check the README.md")

def main():
    """Main setup function"""
    print_banner()
    
    # Check if running from backend directory
    if not Path("main.py").exists():
        print("❌ Please run this script from the backend directory!")
        print("   cd backend")
        print("   python setup_chatbot.py")
        sys.exit(1)
    
    # Get API key
    api_key = get_deepseek_api_key()
    if not api_key:
        print("\n❌ Setup failed. Please try again.")
        sys.exit(1)
    
    # Test API key
    if not test_api_key(api_key):
        print("\n❌ API key test failed. Please check your key and try again.")
        sys.exit(1)
    
    # Create .env file
    if not create_env_file(api_key):
        print("\n❌ Failed to create environment file.")
        sys.exit(1)
    
    # Update config.py
    if not update_config_file(api_key):
        print("\n❌ Failed to update configuration.")
        sys.exit(1)
    
    # Print next steps
    print_next_steps()

if __name__ == "__main__":
    main()
