#!/usr/bin/env python3
"""
Test script for the linear system solver API endpoint
"""

import requests
import json

def test_linear_system_api():
    """Test the linear system solver API endpoint"""
    
    # Test data
    test_cases = [
        {
            "name": "Simple intersection",
            "eq1": "y = 2x + 1",
            "eq2": "y = -x + 4"
        },
        {
            "name": "Parallel lines",
            "eq1": "y = 2x + 1",
            "eq2": "y = 2x + 3"
        },
        {
            "name": "Same line",
            "eq1": "y = 2x + 1",
            "eq2": "y = 2x + 1"
        }
    ]
    
    base_url = "http://localhost:8000"
    
    for test_case in test_cases:
        print(f"\n--- Testing: {test_case['name']} ---")
        
        try:
            response = requests.post(
                f"{base_url}/api/solve-linear-system",
                json={
                    "eq1": test_case["eq1"],
                    "eq2": test_case["eq2"],
                    "user_id": None
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Success!")
                print(f"   Solution type: {result['solution_type']}")
                if result['solution']:
                    print(f"   Solution: x = {result['solution']['x']:.4f}, y = {result['solution']['y']:.4f}")
                print(f"   Response: {json.dumps(result, indent=2)}")
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ Connection error: Make sure the backend server is running on http://localhost:8000")
            break
        except Exception as e:
            print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    print("Testing Linear System Solver API...")
    test_linear_system_api()
