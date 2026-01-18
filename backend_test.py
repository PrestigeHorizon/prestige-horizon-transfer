#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class PrestigeHorizonAPITester:
    def __init__(self, base_url="https://transfer-fusion.preview.prestigeagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_transfer_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code} - {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        self.run_test("Health Check", "GET", "api/health", 200)
        self.run_test("Root Endpoint", "GET", "api/", 200)

    def test_admin_creation(self):
        """Test admin user creation"""
        print("\n🔍 Testing Admin Creation...")
        self.run_test("Create Admin User", "POST", "api/admin/create-admin", 200)

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "email": f"testuser{timestamp}@test.com",
            "password": "testpass123",
            "full_name": f"Test User {timestamp}",
            "phone": f"+226 70 00 {timestamp[:2]} {timestamp[2:4]}",
            "country": "Burkina Faso"
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "api/auth/register", 
            200, 
            test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔍 Testing Admin Login...")
        
        admin_credentials = {
            "email": "admin@prestigehorizon.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            admin_credentials
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_user_login(self):
        """Test user login with registered user"""
        print("\n🔍 Testing User Login...")
        
        # Use same credentials as registration
        timestamp = datetime.now().strftime('%H%M%S')
        login_data = {
            "email": f"testuser{timestamp}@test.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "api/auth/login",
            200,
            login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        print("\n🔍 Testing Auth Me...")
        self.run_test("Get Current User", "GET", "api/auth/me", 200)

    def test_providers(self):
        """Test provider endpoints"""
        print("\n🔍 Testing Provider Endpoints...")
        
        # Get all providers
        success, providers = self.run_test("Get Providers", "GET", "api/providers", 200)
        
        if success and providers:
            # Test fee calculation for first provider
            provider = providers[0]['provider']
            self.run_test(
                "Calculate Transfer Fee",
                "GET",
                f"api/providers/{provider}/calculate?amount=10000",
                200
            )

    def test_transfer_creation(self):
        """Test transfer creation"""
        print("\n🔍 Testing Transfer Creation...")
        
        transfer_data = {
            "provider": "western_union",
            "amount": 50000,
            "currency": "XOF",
            "receiver_name": "John Doe",
            "receiver_phone": "+226 70 12 34 56",
            "receiver_country": "Burkina Faso",
            "notes": "Test transfer"
        }
        
        success, response = self.run_test(
            "Create Transfer",
            "POST",
            "api/transfers",
            201,
            transfer_data
        )
        
        if success and 'id' in response:
            self.created_transfer_id = response['id']
            return True
        return False

    def test_transfer_operations(self):
        """Test transfer-related operations"""
        print("\n🔍 Testing Transfer Operations...")
        
        # Get user transfers
        self.run_test("Get User Transfers", "GET", "api/transfers", 200)
        
        # Get specific transfer if we created one
        if self.created_transfer_id:
            self.run_test(
                "Get Transfer Details",
                "GET",
                f"api/transfers/{self.created_transfer_id}",
                200
            )

    def test_admin_operations(self):
        """Test admin operations"""
        print("\n🔍 Testing Admin Operations...")
        
        if not self.admin_token:
            print("❌ No admin token available, skipping admin tests")
            return
        
        # Temporarily switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Test admin endpoints
        self.run_test("Get Admin Stats", "GET", "api/admin/stats", 200)
        self.run_test("Get All Transfers (Admin)", "GET", "api/admin/transfers", 200)
        
        # Test transfer update if we have a transfer
        if self.created_transfer_id:
            update_data = {
                "status": "processing",
                "tracking_number": "TEST123456",
                "admin_notes": "Test update from API test"
            }
            
            self.run_test(
                "Update Transfer Status",
                "PUT",
                f"api/admin/transfers/{self.created_transfer_id}",
                200,
                update_data
            )
        
        # Restore original token
        self.token = original_token

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Prestige Horizon API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        
        # Test sequence
        self.test_health_check()
        self.test_admin_creation()
        
        # User flow
        if self.test_user_registration():
            self.test_auth_me()
            self.test_providers()
            if self.test_transfer_creation():
                self.test_transfer_operations()
        
        # Admin flow
        if self.test_admin_login():
            self.test_admin_operations()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Return results
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": self.tests_passed/self.tests_run*100 if self.tests_run > 0 else 0,
            "test_results": self.test_results,
            "created_transfer_id": self.created_transfer_id
        }

def main():
    """Main test execution"""
    tester = PrestigeHorizonAPITester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Exit with appropriate code
    return 0 if results["success_rate"] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())