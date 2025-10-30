# Pet Care Management - Testing Documentation

## Overview

This document describes the testing strategy for the Pet Care Management application, including database tests and edge case testing.

## Test Structure

### 1. Database Tests (`test_database.py`)

**Purpose**: Verify database operations work correctly with valid data.

**Test Cases**:
- User creation and retrieval
- Pet management (create, read, update)
- Task scheduling and completion
- Notification system
- Data relationships and joins

### 2. Edge Case Tests (`test_edge_cases.py`)

**Purpose**: Validate application behavior with invalid, boundary, and exceptional data.

**Test Categories**:

#### User Model Edge Cases
- Duplicate email/username prevention
- Invalid email formats
- Password strength validation

#### Pet Model Edge Cases
- Name validation (length, characters)
- Age boundaries (0-50 years)
- Weight boundaries (0.1-200 kg)
- Invalid gender values

#### Task Model Edge Cases
- Due date validation (past dates, far future)
- Title validation (empty, too long, invalid chars)
- Description length limits
- Invalid task types and priorities

#### Authorization Edge Cases
- User access control (prevent accessing other users' data)
- Ownership verification

#### Performance Edge Cases
- Large dataset handling
- Query performance benchmarks

## Running Tests

### Prerequisites
- Python 3.8+
- pytest
- MySQL test database
- Environment variables set in `.env.test`

### Quick Start
```bash
# Install dependencies
pip install pytest mysql-connector-python python-dotenv

# Run all tests
python run_tests.py

# Run specific test files
pytest test_database.py -v
pytest test_edge_cases.py -v

# Run with coverage
pytest --cov=. --cov-report=html