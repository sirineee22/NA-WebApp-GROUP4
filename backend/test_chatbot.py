#!/usr/bin/env python3
"""
Test script for the Math Tutor Chatbot
This script tests the DeepSeek API connection
"""

import requests
import json
from config import config

def test_deepseek_api():
    """Test the DeepSeek API connection"""
    print("🧪 Testing DeepSeek API Connection...")
    print(f"API Key: {config.DEEPSEEK_API_KEY[:10]}...{config.DEEPSEEK_API_KEY[-4:]}")
    print()
    
    try:
        url = "https://api.deepseek.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {config.DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Test with a simple math question
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system", 
                    "content": "You are a math tutor. Keep responses brief for testing."
                },
                {
                    "role": "user", 
                    "content": "What is 2 + 2?"
                }
            ],
            "max_tokens": 100,
            "temperature": 0.3
        }
        
        print("📤 Sending test request...")
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            print("✅ API connection successful!")
            print(f"🤖 AI Response: {ai_response}")
            return True
        else:
            print(f"❌ API test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API: {str(e)}")
        return False

def test_chatbot_endpoint():
    """Test the local chatbot endpoint"""
    print("\n🔍 Testing Local Chatbot Endpoint...")
    
    try:
        # Test the health endpoint
        health_response = requests.get("http://localhost:8000/api/chatbot/health", timeout=5)
        
        if health_response.status_code == 200:
            print("✅ Chatbot health endpoint working!")
            health_data = health_response.json()
            print(f"   Status: {health_data.get('status')}")
            print(f"   Service: {health_data.get('service')}")
            return True
        else:
            print(f"❌ Health endpoint failed: {health_response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to local backend")
        print("   Make sure your backend is running: python main.py")
        return False
    except Exception as e:
        print(f"❌ Error testing local endpoint: {str(e)}")
        return False

def main():
    """Main test function"""
    print("=" * 60)
    print("🤖 MATH TUTOR CHATBOT - CONNECTION TEST")
    print("=" * 60)
    print()
    
    # Test 1: DeepSeek API
    api_working = test_deepseek_api()
    
    print()
    
    # Test 2: Local backend (if running)
    local_working = test_chatbot_endpoint()
    
    print()
    print("=" * 60)
    
    if api_working and local_working:
        print("🎉 ALL TESTS PASSED!")
        print("   Your chatbot is ready to use!")
        print("\n📋 Next steps:")
        print("1. Start your frontend: npm run dev")
        print("2. Look for the floating chat button")
        print("3. Ask your first math question!")
    elif api_working:
        print("⚠️  PARTIAL SUCCESS")
        print("   ✅ DeepSeek API is working")
        print("   ❌ Local backend not running")
        print("\n📋 To fix:")
        print("1. Start your backend: python main.py")
        print("2. Then start frontend: npm run dev")
    else:
        print("❌ TESTS FAILED")
        print("   ❌ DeepSeek API connection failed")
        print("\n🔧 Troubleshooting:")
        print("1. Check your internet connection")
        print("2. Verify your API key is correct")
        print("3. Check if DeepSeek service is available")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
