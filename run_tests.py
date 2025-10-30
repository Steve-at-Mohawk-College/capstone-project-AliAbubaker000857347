# #!/usr/bin/env python3
# """
# Enhanced test runner with coverage reporting
# """

# import subprocess
# import sys
# import os
# import json
# from datetime import datetime

# def run_tests_with_coverage():
#     """Run tests with coverage reporting"""
#     print("🚀 Starting Pet Care Management Tests with Coverage...")
    
#     # Set test environment variables
#     env = os.environ.copy()
#     env['PYTHONPATH'] = os.getcwd()
    
#     # Create test reports directory
#     os.makedirs('test-reports', exist_ok=True)
    
#     # Run tests with coverage
#     print("\n📊 Running Tests with Coverage...")
#     result = subprocess.run([
#         'pytest', 
#         'tests/', 
#         '-v',
#         '--cov=./models',
#         '--cov=./config', 
#         '--cov-report=html:test-reports/coverage',
#         '--cov-report=xml:test-reports/coverage.xml',
#         '--cov-report=term-missing',
#         '--junit-xml=test-reports/test-results.xml',
#         '--tb=short'
#     ], env=env, capture_output=True, text=True)
    
#     # Generate coverage report
#     print("\n" + "="*60)
#     print("📋 COVERAGE REPORT")
#     print("="*60)
    
#     # Print test output
#     print(result.stdout)
#     if result.stderr:
#         print("STDERR:", result.stderr)
    
#     # Parse and display coverage summary
#     coverage_summary = parse_coverage_summary(result.stdout)
#     print_coverage_goals(coverage_summary)
    
#     # Overall result
#     if result.returncode == 0:
#         print("\n🎉 ALL TESTS PASSED!")
#         print(f"📁 Coverage report: file://{os.path.abspath('test-reports/coverage/index.html')}")
#         return 0
#     else:
#         print("\n💥 SOME TESTS FAILED!")
#         return 1

# def parse_coverage_summary(output):
#     """Parse coverage summary from pytest output"""
#     coverage_data = {
#         'database_operations': 0,
#         'validation_logic': 0,
#         'error_handling': 0,
#         'authorization': 0,
#         'overall': 0
#     }
    
#     # This is a simplified parser - you might want to use coverage.py API
#     for line in output.split('\n'):
#         if 'TOTAL' in line and '%' in line:
#             try:
#                 # Extract percentage from line like "TOTAL 1234 234 56 89%"
#                 parts = line.split()
#                 for part in parts:
#                     if part.endswith('%'):
#                         coverage_data['overall'] = float(part[:-1])
#                         break
#             except (ValueError, IndexError):
#                 pass
    
#     return coverage_data

# def print_coverage_goals(coverage_data):
#     """Print coverage goals vs actual results"""
#     goals = {
#         'database_operations': 90,
#         'validation_logic': 95,
#         'error_handling': 85,
#         'authorization': 100,
#         'overall': 80
#     }
    
#     print("\n🎯 COVERAGE GOALS vs ACTUAL")
#     print("="*40)
    
#     for category, goal in goals.items():
#         actual = coverage_data.get(category, 0)
#         status = "✅" if actual >= goal else "❌"
#         print(f"{category:20} | Goal: {goal:3}% | Actual: {actual:5.1f}% {status}")
    
#     # Check if all goals are met
#     all_met = all(coverage_data.get(cat, 0) >= goal for cat, goal in goals.items())
#     if all_met:
#         print("\n🎉 ALL COVERAGE GOALS ACHIEVED!")
#     else:
#         print("\n📈 SOME COVERAGE GOALS NOT MET - CONSIDER ADDING MORE TESTS")

# if __name__ == "__main__":
#     sys.exit(run_tests_with_coverage())



#!/usr/bin/env python3
"""
Simple test runner
"""

import subprocess
import sys
import os

def main():
    print("🚀 Starting Pet Care Management Tests...")
    
    # Set environment
    env = os.environ.copy()
    env['PYTHONPATH'] = os.getcwd()
    
    # Run basic tests
    print("\n📊 Running Basic Tests...")
    
    # Use python -m pytest instead of just pytest
    result = subprocess.run([
        'python', '-m', 'pytest', 'tests/', '-v'
    ], env=env, capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    if result.returncode == 0:
        print("🎉 BASIC TESTS PASSED!")
        return 0
    else:
        print("💥 TESTS FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())