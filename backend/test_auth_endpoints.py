import httpx
import time

def test_endpoints():
    base_url = "http://127.0.0.1:8000/api/v1"
    
    # Wait for server to be fully ready
    time.sleep(2)
    
    print("1. Testing Health Check...")
    r = httpx.get("http://127.0.0.1:8000/")
    print("Health response:", r.json())
    
    print("\n2. Testing Signup...")
    email = f"testuser_{int(time.time())}@example.com"
    signup_data = {
        "email": email,
        "password": "testpassword123"
    }
    r = httpx.post(f"{base_url}/auth/signup", json=signup_data)
    print("Signup status:", r.status_code)
    signup_res = r.json()
    print("Signup response:", signup_res)
    
    if r.status_code != 200:
        print("Signup failed!")
        return
        
    token = signup_res["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n3. Testing Onboarding Wizard...")
    onboarding_data = {
        "full_name": "Rohan Sharma",
        "employment_status": "Salaried",
        "annual_salary": 850000.0,
        "financial_objectives": ["Wealth Creation", "Learning Basics"],
        "risk_appetite": "Moderate",
        "starting_capital": 5000000.0 # 50 Lakhs
    }
    r = httpx.post(f"{base_url}/profile/onboarding", json=onboarding_data, headers=headers)
    print("Onboarding status:", r.status_code)
    print("Onboarding response:", r.json())
    
    print("\n4. Testing Profile retrieval...")
    r = httpx.get(f"{base_url}/profile/me", headers=headers)
    print("Get Profile status:", r.status_code)
    print("Profile:", r.json())

if __name__ == "__main__":
    test_endpoints()
