#!/usr/bin/env python3
"""
Backend API Testing for Video Uploader
Tests the updated formData approach for file uploads
"""

import requests
import json
import os
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://upload-master-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_api_connectivity():
    """Test basic API connectivity"""
    print("=" * 60)
    print("Testing API Connectivity")
    print("=" * 60)
    
    try:
        # Test GET /api/history endpoint
        response = requests.get(f"{API_BASE}/history", timeout=30)
        
        print(f"GET /api/history")
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response Data: {json.dumps(data, indent=2)}")
                
                # Verify response structure
                if 'history' in data:
                    print("✅ Response has correct structure with 'history' field")
                    if isinstance(data['history'], list):
                        print("✅ History field is an array")
                        print(f"History count: {len(data['history'])}")
                        return True, "API connectivity successful"
                    else:
                        print("❌ History field is not an array")
                        return False, "History field is not an array"
                else:
                    print("❌ Response missing 'history' field")
                    return False, "Response missing 'history' field"
                    
            except json.JSONDecodeError as e:
                print(f"❌ Invalid JSON response: {e}")
                print(f"Raw response: {response.text}")
                return False, f"Invalid JSON response: {e}"
        else:
            print(f"❌ API request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False, f"API request failed with status {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False, f"Network error: {e}"
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, f"Unexpected error: {e}"

def test_mongodb_connectivity():
    """Test MongoDB connectivity through API"""
    print("\n" + "=" * 60)
    print("Testing MongoDB Connectivity")
    print("=" * 60)
    
    try:
        # The /api/history endpoint requires MongoDB connection
        response = requests.get(f"{API_BASE}/history", timeout=30)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'history' in data and isinstance(data['history'], list):
                    print("✅ MongoDB connection successful - API can query database")
                    return True, "MongoDB connection working"
                else:
                    print("❌ MongoDB connection issue - invalid response structure")
                    return False, "Invalid response structure from database"
            except json.JSONDecodeError:
                print("❌ MongoDB connection issue - invalid JSON response")
                return False, "Invalid JSON response from database"
        elif response.status_code == 500:
            print("❌ MongoDB connection failed - server error")
            print(f"Response: {response.text}")
            return False, "Database connection error (500)"
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False, f"Unexpected status code: {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error testing MongoDB: {e}")
        return False, f"Network error: {e}"
    except Exception as e:
        print(f"❌ Unexpected error testing MongoDB: {e}")
        return False, f"Unexpected error: {e}"

def test_error_handling():
    """Test API error handling for non-existent endpoints"""
    print("\n" + "=" * 60)
    print("Testing API Error Handling")
    print("=" * 60)
    
    try:
        # Test non-existent endpoint
        response = requests.get(f"{API_BASE}/nonexistent", timeout=30)
        
        print(f"GET /api/nonexistent")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 404:
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                if 'error' in data:
                    print("✅ Proper error handling for non-existent endpoints")
                    return True, "Error handling working"
                else:
                    print("❌ Error response missing 'error' field")
                    return False, "Error response missing 'error' field"
            except json.JSONDecodeError:
                print("❌ Invalid JSON in error response")
                return False, "Invalid JSON in error response"
        else:
            print(f"❌ Expected 404, got {response.status_code}")
            return False, f"Expected 404, got {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error testing error handling: {e}")
        return False, f"Network error: {e}"
    except Exception as e:
        print(f"❌ Unexpected error testing error handling: {e}")
        return False, f"Unexpected error: {e}"

def test_upload_endpoint_no_file():
    """Test POST /api/upload without file - Should return error"""
    print("\n" + "=" * 60)
    print("Testing POST /api/upload without file")
    print("=" * 60)
    
    try:
        url = f"{API_BASE}/upload"
        print(f"Making POST request to: {url}")
        print("Sending multipart form data without file")
        
        # Send POST request with multipart form data but no file
        # This ensures proper Content-Type for formData() to work
        data = {'services': 'filemoon'}  # Include services to test file validation specifically
        response = requests.post(url, data=data, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Check for proper error message
            if 'error' in data and 'No file uploaded' in data['error']:
                print("✅ Upload endpoint properly validates file presence")
                return True, "File validation working correctly"
            else:
                print("❌ Expected 'No file uploaded' error message")
                return False, "Missing proper file validation error"
        else:
            print(f"❌ Expected status 400, got {response.status_code}")
            print(f"Response: {response.text}")
            return False, f"Expected 400, got {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed with error: {e}")
        return False, f"Network error: {e}"
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON response: {e}")
        return False, f"Invalid JSON: {e}"
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, f"Unexpected error: {e}"

def test_upload_endpoint_no_services():
    """Test POST /api/upload with file but no services - Should return error"""
    print("\n" + "=" * 60)
    print("Testing POST /api/upload with empty services")
    print("=" * 60)
    
    try:
        url = f"{API_BASE}/upload"
        print(f"Making POST request to: {url}")
        print("Sending form data with dummy file but no services")
        
        # Create a dummy file for testing
        files = {'file': ('test.txt', 'dummy content', 'text/plain')}
        data = {'services': ''}  # Empty services
        
        response = requests.post(url, files=files, data=data, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            response_data = response.json()
            print(f"Response Data: {json.dumps(response_data, indent=2)}")
            
            # Check for proper error message
            if 'error' in response_data and 'No service selected' in response_data['error']:
                print("✅ Upload endpoint properly validates service selection")
                return True, "Service validation working correctly"
            else:
                print("❌ Expected 'No service selected' error message")
                return False, "Missing proper service validation error"
        else:
            print(f"❌ Expected status 400, got {response.status_code}")
            print(f"Response: {response.text}")
            return False, f"Expected 400, got {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed with error: {e}")
        return False, f"Network error: {e}"
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON response: {e}")
        return False, f"Invalid JSON: {e}"
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, f"Unexpected error: {e}"

def test_upload_endpoint_availability():
    """Test if upload endpoint is available and accepts POST requests"""
    print("\n" + "=" * 60)
    print("Testing POST /api/upload endpoint availability")
    print("=" * 60)
    
    try:
        url = f"{API_BASE}/upload"
        print(f"Making POST request to: {url}")
        
        # Send POST request to check if endpoint exists
        response = requests.post(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        # We expect either 400 (validation error) or 500, but not 404
        if response.status_code in [400, 500]:
            print("✅ Upload endpoint is available and accepts POST requests")
            return True, "Upload endpoint available"
        elif response.status_code == 404:
            print("❌ Upload endpoint not found (404)")
            return False, "Upload endpoint not found"
        else:
            print(f"⚠️  Unexpected status code {response.status_code}")
            print(f"Response: {response.text}")
            return True, f"Endpoint available (status: {response.status_code})"
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed with error: {e}")
        return False, f"Network error: {e}"
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, f"Unexpected error: {e}"

def run_all_tests():
    """Run all backend tests for updated formData approach"""
    print("Starting Backend API Tests - Updated FormData Approach")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    results = {}
    
    # Test 1: History endpoint (should work as before)
    success, message = test_api_connectivity()
    results['history_endpoint'] = {'success': success, 'message': message}
    
    # Test 2: Upload endpoint availability
    success, message = test_upload_endpoint_availability()
    results['upload_availability'] = {'success': success, 'message': message}
    
    # Test 3: Upload without file validation
    success, message = test_upload_endpoint_no_file()
    results['file_validation'] = {'success': success, 'message': message}
    
    # Test 4: Upload without services validation
    success, message = test_upload_endpoint_no_services()
    results['service_validation'] = {'success': success, 'message': message}
    
    # Test 5: MongoDB connectivity
    success, message = test_mongodb_connectivity()
    results['mongodb_connectivity'] = {'success': success, 'message': message}
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY - UPDATED FORMDATA APPROACH")
    print("=" * 60)
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results.values() if r['success'])
    
    for test_name, result in results.items():
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"{test_name}: {status} - {result['message']}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All backend tests passed!")
        return True
    else:
        print("⚠️  Some backend tests failed")
        return False

if __name__ == "__main__":
    run_all_tests()