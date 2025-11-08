#!/usr/bin/env python3
"""
Simple test to verify backend is working
"""

import requests
import json

def test_backend():
    """Test basic backend connectivity"""
    
    base_url = "http://localhost:8000"
    
    print("Testing backend connectivity...")
    
    # Test 1: Basic endpoint
    try:
        response = requests.get(f"{base_url}/api/chapters/")
        print(f"✅ Chapters endpoint: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Chapters endpoint failed: {e}")
    
    # Test 2: Linear system solver
    try:
        response = requests.post(
            f"{base_url}/api/solve-linear-system",
            json={
                "eq1": "y = 2x + 10",
                "eq2": "y = -20x + 30",
                "user_id": None
            },
            headers={"Content-Type": "application/json"}
        )
        print(f"✅ Linear system solver: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   Solution: {result}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Linear system solver failed: {e}")
    
    # Test 3: Check if server is running
    try:
        response = requests.get(f"{base_url}/docs")
        print(f"✅ FastAPI docs: {response.status_code}")
    except Exception as e:
        print(f"❌ FastAPI docs failed: {e}")

if __name__ == "__main__":
    test_backend()
