#!/usr/bin/env python3
"""
Test script for Hugging Face API integration
"""

import requests
import json
import os
from config import config

def test_huggingface_api():
    """Test the Hugging Face API endpoint"""
    
    print("🧪 Testing Hugging Face API Integration")
    print("=" * 50)
    
    # Check configuration
    print(f"🔧 Configuration:")
    print(f"   Hugging Face API Key: {'✅ Configured' if config.HUGGINGFACE_API_KEY.startswith('hf_') else '❌ Not configured'}")
    print(f"   API URL: {config.HUGGINGFACE_API_URL}")
    print()
    
    # Test local endpoint
    print("🌐 Testing local endpoint...")
    try:
        response = requests.post(
            "http://localhost:8000/api/huggingface/chat",
            headers={"Content-Type": "application/json"},
            json={
                "message": "Bonjour ! Peux-tu m'expliquer la méthode de Gauss ?",
                "user_id": 1,
                "context": "Gauss Elimination Method",
                "lesson_id": None
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Response received:")
            print(f"   Model used: {data.get('model_used', 'Unknown')}")
            print(f"   Confidence: {data.get('confidence', 0)}")
            print(f"   Suggested topics: {data.get('suggested_topics', [])}")
            print(f"   Response length: {len(data.get('response', ''))} characters")
            print()
            print("📝 Response preview:")
            response_text = data.get('response', '')[:200]
            print(f"   {response_text}...")
            
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure your backend is running on http://localhost:8000")
    except requests.exceptions.Timeout:
        print("❌ Timeout: The request took too long (Hugging Face models can be slow)")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
    
    print()
    print("🔍 Health Check:")
    try:
        health_response = requests.get("http://localhost:8000/api/huggingface/health")
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"   Status: {health_data.get('status', 'Unknown')}")
            print(f"   Service: {health_data.get('service', 'Unknown')}")
        else:
            print(f"   ❌ Health check failed: HTTP {health_response.status_code}")
    except Exception as e:
        print(f"   ❌ Health check error: {str(e)}")

def test_direct_huggingface():
    """Test direct Hugging Face API call"""
    
    if not config.HUGGINGFACE_API_KEY.startswith('hf_'):
        print("❌ Hugging Face API key not configured")
        return
    
    print("\n🚀 Testing Direct Hugging Face API...")
    print("=" * 50)
    
    # Test with a simple model
    model = "microsoft/DialoGPT-medium"
    
    try:
        headers = {
            "Authorization": f"Bearer {config.HUGGINGFACE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": "Hello! Can you explain the Gauss elimination method?",
            "parameters": {
                "max_new_tokens": 100,
                "temperature": 0.7
            }
        }
        
        print(f"📡 Testing model: {model}")
        response = requests.post(
            f"{config.HUGGINGFACE_API_URL}/{model}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Direct API call successful!")
            print(f"   Response type: {type(result)}")
            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get("generated_text", "")
                print(f"   Generated text: {generated_text[:100]}...")
            else:
                print(f"   Raw response: {str(result)[:100]}...")
        else:
            print(f"❌ Direct API call failed: HTTP {response.status_code}")
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Direct API call error: {str(e)}")

if __name__ == "__main__":
    print("🤖 Hugging Face Chatbot Test Suite")
    print("=" * 50)
    
    # Validate configuration
    config.validate_config()
    print()
    
    # Test local endpoint
    test_huggingface_api()
    
    # Test direct API
    test_direct_huggingface()
    
    print("\n" + "=" * 50)
    print("🏁 Testing complete!")
    print("\n💡 Next steps:")
    print("   1. Make sure your backend is running")
    print("   2. Test the chatbot in your web app")
    print("   3. Check the logs for any errors")
