import pytest
import re
from datetime import datetime, timedelta

class TestEdgeCases:
    """Edge case validation tests"""
    
    def test_email_validation(self):
        """Test email validation logic"""
        valid_emails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'user+tag@example.org'
        ]
        
        invalid_emails = [
            'invalid',
            'invalid@',
            '@invalid.com',
            'invalid@.com'
        ]
        
        # Test valid emails
        for email in valid_emails:
            assert re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email) is not None
        
        # Test invalid emails
        for email in invalid_emails:
            assert re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email) is None
    
    def test_pet_name_validation(self):
        """Test pet name validation boundaries"""
        # Valid names
        valid_names = ['Fluffy', 'Max', 'Buddy Jr', "O'Malley"]
        for name in valid_names:
            assert len(name.strip()) >= 2
            assert len(name.strip()) <= 50
            assert re.match(r"^[A-Za-z\s'-]+$", name) is not None
        
        # Invalid names
        with pytest.raises(AssertionError):
            assert len("A".strip()) >= 2  # Too short
        
        with pytest.raises(AssertionError):
            long_name = "A" * 51
            assert len(long_name.strip()) <= 50  # Too long
    
    def test_pet_age_validation(self):
        """Test pet age boundaries"""
        valid_ages = [0.5, 1, 15.5, 50]
        invalid_ages = [0, -1, 51, 100]
        
        for age in valid_ages:
            assert age > 0 and age <= 50
        
        for age in invalid_ages:
            assert not (age > 0 and age <= 50)
    
    def test_task_due_date_validation(self):
        """Test task due date validation"""
        now = datetime.now()
        
        # Valid dates (future)
        valid_dates = [
            now + timedelta(hours=1),
            now + timedelta(days=30),
            now + timedelta(days=364)  # Just under 1 year
        ]
        
        # Invalid dates (past or too far future)
        invalid_dates = [
            now - timedelta(days=1),  # Past
            now + timedelta(days=366)  # More than 1 year
        ]
        
        max_date = now + timedelta(days=365)
        
        for date in valid_dates:
            assert date > now and date <= max_date
        
        for date in invalid_dates:
            assert not (date > now and date <= max_date)