"""
Test script for Election System API
Run this after starting the backend server with: uvicorn main:app --reload --port 8000
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def print_response(title: str, response):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"📌 {title}")
    print(f"{'='*60}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(f"Status: {response.status_code}")
    print()


def test_flow():
    print("\n🚀 Starting Election System API Test Flow\n")
    
    # 0. Health Check
    print("[Step 0] Health Check...")
    res = requests.get(f"{BASE_URL}/")
    print_response("Health Check", res)
    
    # 1. Start an election (Admin)
    print("\n[Step 1] Admin: Starting election for CSE Section A...")
    res = requests.post(f"{BASE_URL}/admin/elections/create?branch=CSE&section=A&duration_minutes=15")
    print_response("Create Election", res)
    election_id = res.json().get("id")
    
    # 2. Student Login - Request OTP
    print("\n[Step 2] Student: Requesting OTP...")
    test_usn = "4NI22CS001"
    res = requests.post(f"{BASE_URL}/auth/login", json={"usn": test_usn})
    print_response("Request OTP", res)
    print(f"⚠️  Check backend console for OTP (mock email mode)")
    
    # 3. Get OTP from user (manual step)
    print("\n" + "="*60)
    otp = input(f"Enter OTP for {test_usn} (check backend console): ").strip()
    print("="*60)
    
    # 4. Verify OTP
    print("\n[Step 3] Student: Verifying OTP...")
    res = requests.post(f"{BASE_URL}/auth/verify", json={"usn": test_usn, "otp": otp})
    print_response("Verify OTP & Get Token", res)
    
    if res.status_code != 200:
        print("❌ Login failed. Exiting test.")
        return
    
    token = res.json()["access_token"]
    user = res.json()["user"]
    print(f"✅ Logged in as: {user['name']} ({user['usn']})")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 5. Get Active Election
    print("\n[Step 4] Student: Fetching active election...")
    res = requests.get(
        f"{BASE_URL}/elections/active?branch=CSE&section=A",
        headers=headers
    )
    print_response("Get Active Election", res)
    
    election = res.json().get("election")
    candidates = res.json().get("candidates", [])
    
    if not election:
        print("⚠️  No active election found. Skipping vote test.")
    elif not candidates:
        print("⚠️  No candidates found. Run: python add_candidates.py")
    else:
        # 6. Cast Vote
        print("\n[Step 5] Student: Casting vote...")
        candidate_id = candidates[0]["id"]
        candidate_name = candidates[0]["name"]
        print(f"Voting for: {candidate_name}")
        
        res = requests.post(
            f"{BASE_URL}/vote",
            json={"election_id": election["id"], "candidate_id": candidate_id},
            headers=headers
        )
        print_response("Cast Vote", res)
        
        if res.status_code == 200:
            print("✅ Vote cast successfully!")
        else:
            print(f"⚠️  Vote failed: {res.json().get('detail', 'Unknown error')}")
    
    # 7. Admin: Get Results
    print("\n[Step 6] Admin: Fetching election results...")
    # Use admin token (in real scenario, login as admin)
    res = requests.get(f"{BASE_URL}/admin/results/{election_id}", headers=headers)
    print_response("Get Election Results", res)
    
    # Summary
    print("\n" + "="*60)
    print("✅ TEST FLOW COMPLETED")
    print("="*60)
    print("\n📋 Summary:")
    print(f"  • Election ID: {election_id}")
    print(f"  • Test USN: {test_usn}")
    print(f"  • User: {user['name']}")
    print(f"  • Token: {token[:50]}...")
    print("\n💡 Next steps:")
    print("  • Try logging in with another student")
    print("  • Check that the same student cannot vote twice")
    print("  • View results in admin dashboard")
    print("="*60 + "\n")


if __name__ == "__main__":
    try:
        test_flow()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to backend server")
        print("   Make sure the backend is running: uvicorn main:app --reload --port 8000\n")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}\n")
