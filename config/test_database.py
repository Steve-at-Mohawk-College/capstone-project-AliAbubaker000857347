import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

class TestDatabase:
    """Isolated test database management"""
    
    def __init__(self):
        self.connection = None
        self.test_db_name = os.getenv('TEST_DB_NAME', 'petcare_test')
        self._ensure_test_database()
        self.connect()
    
    def _ensure_test_database(self):
        """Create test database if it doesn't exist"""
        try:
            # Connect without specifying database
            temp_conn = mysql.connector.connect(
                host=os.getenv('TEST_DB_HOST', 'localhost'),
                user=os.getenv('TEST_DB_USER', 'root'),
                password=os.getenv('TEST_DB_PASSWORD', ''),
                port=os.getenv('TEST_DB_PORT', '3306')
            )
            cursor = temp_conn.cursor()
            
            # Create test database
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.test_db_name}")
            print(f"✅ Test database '{self.test_db_name}' ensured")
            
            cursor.close()
            temp_conn.close()
            
        except Error as e:
            print(f"❌ Failed to create test database: {e}")
            raise
    
    def connect(self):
        """Connect to the test database"""
        try:
            self.connection = mysql.connector.connect(
                host=os.getenv('TEST_DB_HOST', 'localhost'),
                user=os.getenv('TEST_DB_USER', 'root'),
                password=os.getenv('TEST_DB_PASSWORD', ''),
                database=self.test_db_name,
                port=os.getenv('TEST_DB_PORT', '3306'),
                autocommit=False  # Use transactions for rollback
            )
            print("✅ Connected to test database")
        except Error as e:
            print(f"❌ Test database connection failed: {e}")
            raise
    
    def initialize_schema(self):
        """Initialize the database schema for testing"""
        try:
            cursor = self.connection.cursor()
            
            # Read and execute schema file
            with open('database/schema.sql', 'r') as f:
                schema_sql = f.read()
            
            # Split by semicolon and execute each statement
            for statement in schema_sql.split(';'):
                if statement.strip():
                    cursor.execute(statement)
            
            self.connection.commit()
            cursor.close()
            print("✅ Test database schema initialized")
            
        except Error as e:
            self.connection.rollback()
            print(f"❌ Failed to initialize schema: {e}")
            raise
    
    def cleanup_database(self):
        """Clean all test data (truncate all tables)"""
        try:
            cursor = self.connection.cursor()
            
            # Disable foreign key checks
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # Get all tables
            cursor.execute("SHOW TABLES")
            tables = [row[0] for row in cursor.fetchall()]
            
            # Truncate all tables
            for table in tables:
                cursor.execute(f"TRUNCATE TABLE {table}")
                print(f"✅ Cleared table: {table}")
            
            # Re-enable foreign key checks
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            
            self.connection.commit()
            cursor.close()
            print("✅ Test database cleaned up")
            
        except Error as e:
            self.connection.rollback()
            print(f"❌ Failed to clean database: {e}")
            raise
    
    def query(self, sql, params=None):
        """Execute query and return results"""
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(sql, params or ())
            if sql.strip().upper().startswith('SELECT'):
                return cursor.fetchall()
            else:
                return cursor
        finally:
            cursor.close()
    
    def query_one(self, sql, params=None):
        """Execute query and return single result"""
        results = self.query(sql, params)
        return results[0] if results else None
    
    def close(self):
        """Close database connection"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("✅ Test database connection closed")