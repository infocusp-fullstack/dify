---
name: backend-unit-testing
description: Comprehensive guide for writing backend unit tests following Dify project standards and Python best practices. Use when writing unit tests for backend APIs, services, utilities, decorators, or business logic.
---

# Backend Unit Testing Guide

This skill provides comprehensive guidelines for writing high-quality backend unit tests following the patterns established in the Dify codebase and Python testing best practices.

## When to Use This Skill

- Writing unit tests for new backend features
- Adding test coverage for existing code
- Refactoring or improving existing tests
- Testing APIs, services, utilities, or business logic
- Implementing security-critical functionality that requires thorough testing

## Core Testing Principles

### 1. **AAA Pattern (Arrange-Act-Assert)**

Structure every test with three distinct phases:

```python
def test_user_authentication_with_valid_credentials(self):
    """Test that valid credentials authenticate successfully"""
    # Arrange - Set up test data and mocks
    valid_username = "testuser@example.com"
    valid_password = "SecurePass123"
    mock_user = MagicMock(id="user-123", email=valid_username)
    
    # Act - Execute the code under test
    with patch("auth.repository.find_user") as mock_find:
        mock_find.return_value = mock_user
        result = authenticate_user(valid_username, valid_password)
    
    # Assert - Verify the outcome
    assert result.is_authenticated is True
    assert result.user_id == "user-123"
    mock_find.assert_called_once_with(email=valid_username)
```

### 2. **Class-Based Test Organization**

Group related tests using classes for better organization and shared fixtures:

```python
class TestAuthenticationDecorator:
    """Test suite for authentication decorator"""
    
    def test_should_allow_access_with_valid_token(self, app):
        """Test that valid token allows access"""
        # ... test implementation
    
    def test_should_return_401_when_token_missing(self, app):
        """Test that missing token returns 401"""
        # ... test implementation
    
    def test_should_return_403_when_token_expired(self, app):
        """Test that expired token returns 403"""
        # ... test implementation
```

**Naming Convention:**
- Test class: `Test<ComponentName>` (e.g., `TestAuthenticationDecorator`)
- Test method: `test_should_<expected_behavior>_when_<condition>` (e.g., `test_should_return_404_when_resource_not_found`)

### 3. **Descriptive Test Names and Docstrings**

Every test MUST have:
- A clear, behavior-describing name
- A docstring explaining what the test verifies

```python
def test_should_encrypt_and_decrypt_consistently(self):
    """Test that encryption and decryption are consistent
    
    Ensures that a token encrypted with a tenant's public key
    can be successfully decrypted back to the original value.
    """
    # ... test implementation
```

### 4. **Comprehensive Mocking**

Mock external dependencies to ensure unit tests are isolated and fast:

```python
@patch('models.engine.db.session.query')
@patch('libs.rsa.encrypt')
def test_successful_encryption(self, mock_encrypt, mock_query):
    """Test successful token encryption"""
    # Setup mock tenant
    mock_tenant = MagicMock()
    mock_tenant.encrypt_public_key = "mock_public_key"
    mock_query.return_value.where.return_value.first.return_value = mock_tenant
    mock_encrypt.return_value = b"encrypted_data"
    
    result = encrypt_token("tenant-123", "test_token")
    
    assert result == base64.b64encode(b"encrypted_data").decode()
    mock_encrypt.assert_called_with("test_token", "mock_public_key")
```

**Key Principles:**
- Mock at module boundaries (database, external APIs, file system)
- Use `@patch` decorator for patching imports
- Verify mock calls with assertions (`assert_called_once_with`, `assert_called_with`)
- Reset mocks between tests (use fixtures in conftest.py)

### 5. **Parametrized Testing**

Use `@pytest.mark.parametrize` for testing multiple scenarios with similar logic:

```python
@pytest.mark.parametrize(
    ("token", "expected"),
    [
        ("", ""),  # Empty token
        ("1234567", "*" * 20),  # Short token (<8 chars)
        ("12345678", "*" * 20),  # Boundary case (8 chars)
        ("123456789abcdef", "123456" + "*" * 12 + "ef"),  # Long token
        ("abc!@#$%^&*()def", "abc!@#" + "*" * 12 + "ef"),  # Special chars
    ],
)
def test_obfuscation_logic(self, token, expected):
    """Test core obfuscation logic for various token lengths"""
    assert obfuscated_token(token) == expected
```

### 6. **Test Both Happy Path and Error Cases**

Always test:
- ✅ **Success scenarios** (happy path)
- ❌ **Failure scenarios** (error handling)
- ⚠️ **Edge cases** (empty inputs, boundary conditions, special characters)

```python
class TestDecryptToken:
    def test_successful_decryption(self, mock_decrypt):
        """Test successful token decryption"""
        # ... happy path
    
    def test_invalid_base64(self):
        """Test handling of invalid base64 input"""
        with pytest.raises(binascii.Error):
            decrypt_token("tenant-123", "invalid_base64!!!")
    
    def test_tenant_not_found(self, mock_query):
        """Test error when tenant doesn't exist"""
        mock_query.return_value.where.return_value.first.return_value = None
        
        with pytest.raises(ValueError) as exc_info:
            encrypt_token("invalid-tenant", "test_token")
        
        assert "Tenant with id invalid-tenant not found" in str(exc_info.value)
```

### 7. **Flask Test Context for Web Components**

Use Flask's test request context for testing routes, decorators, and request-dependent code:

```python
def test_should_allow_when_inner_api_enabled_and_valid_key(self, app: Flask):
    """Test that valid API key allows access when INNER_API is enabled"""
    
    @billing_inner_api_only
    def protected_view():
        return "success"
    
    with app.test_request_context(headers={"X-Inner-Api-Key": "valid_key"}):
        with patch.object(dify_config, "INNER_API", True):
            with patch.object(dify_config, "INNER_API_KEY", "valid_key"):
                result = protected_view()
    
    assert result == "success"
```

### 8. **Pydantic Model Validation Testing**

For Pydantic models, test both valid and invalid inputs:

```python
class TestInnerMailPayload:
    """Test InnerMailPayload Pydantic model"""
    
    def test_valid_payload_with_all_fields(self):
        """Test valid payload with all fields passes validation"""
        data = {
            "to": ["test@example.com"],
            "subject": "Test Subject",
            "body": "Test Body",
            "substitutions": {"key": "value"},
        }
        payload = InnerMailPayload.model_validate(data)
        assert payload.to == ["test@example.com"]
        assert payload.subject == "Test Subject"
    
    def test_empty_to_list_fails_validation(self):
        """Test that empty 'to' list fails validation due to min_length=1"""
        data = {
            "to": [],
            "subject": "Test Subject",
            "body": "Test Body",
        }
        with pytest.raises(ValidationError):
            InnerMailPayload.model_validate(data)
```

### 9. **Security-Focused Testing**

For security-critical code, create dedicated test classes:

```python
class TestSecurity:
    """Critical security tests for encryption system"""
    
    def test_cross_tenant_isolation(self, mock_encrypt, mock_query):
        """Ensure tokens encrypted for one tenant cannot be used by another"""
        # ... test implementation
    
    def test_tampered_ciphertext_rejection(self, mock_decrypt):
        """Detect and reject tampered ciphertext"""
        # ... test implementation
    
    def test_encryption_randomness(self, mock_encrypt, mock_query):
        """Ensure same plaintext produces different ciphertext"""
        # ... test implementation
```

## Test File Structure

```
api/tests/unit_tests/
├── conftest.py              # Shared fixtures and configuration
├── controllers/             # Controller/API tests
│   ├── inner_api/
│   │   ├── test_auth_wraps.py
│   │   └── test_mail.py
│   └── console/
│       └── test_admin.py
├── core/                    # Core business logic tests
│   ├── helper/
│   │   └── test_encrypter.py
│   └── mcp/
│       └── test_mcp_client.py
└── models/                  # Model tests
    └── test_user.py
```

## Common Fixtures (conftest.py)

The project provides these common fixtures:

```python
@pytest.fixture
def app() -> Flask:
    """Provides cached Flask application instance"""
    return CACHED_APP

# Automatically applied to all tests:
# - `_provide_app_context`: Provides Flask app context
# - `_patch_redis_clients`: Patches Redis clients with MagicMock
# - `reset_redis_mock`: Resets Redis mock before each test
# - `reset_secret_key`: Resets SECRET_KEY configuration
```

## Testing Workflow

### Step 1: Identify What to Test

- Public functions and methods
- API endpoints and their decorators
- Error handling and validation logic
- Edge cases and boundary conditions
- Security-critical code paths

### Step 2: Create Test File

```python
"""
Unit tests for <module_name>
"""

from unittest.mock import MagicMock, patch

import pytest
from flask import Flask
from werkzeug.exceptions import HTTPException

from <module_path> import <functions_to_test>


class Test<ComponentName>:
    """Test suite for <component_name>"""
    
    def test_should_<expected_behavior>_when_<condition>(self):
        """Test description"""
        # Arrange
        # ... setup
        
        # Act
        # ... execute
        
        # Assert
        # ... verify
```

### Step 3: Write Tests

1. **Start with happy path** - Test the expected successful behavior
2. **Add error cases** - Test validation failures and exceptions
3. **Cover edge cases** - Test boundary conditions and special inputs
4. **Add security tests** - For security-critical components

### Step 4: Run Tests

```bash
# Run all tests in a file
pytest api/tests/unit_tests/path/to/test_file.py

# Run specific test class
pytest api/tests/unit_tests/path/to/test_file.py::TestClassName

# Run specific test
pytest api/tests/unit_tests/path/to/test_file.py::TestClassName::test_method_name

# Run with verbose output
pytest -v api/tests/unit_tests/path/to/test_file.py

# Run with coverage
pytest --cov=<module_name> api/tests/unit_tests/path/to/test_file.py
```

## Best Practices Checklist

Before submitting tests, verify:

- [ ] **AAA pattern** used in all tests
- [ ] **Descriptive names** following `test_should_<expected>_when_<condition>` convention
- [ ] **Docstrings** present for all test methods
- [ ] **Happy path tested** for all public methods
- [ ] **Error cases tested** for validation and exceptions
- [ ] **Edge cases covered** (empty inputs, nulls, boundaries)
- [ ] **Mocks verified** with assertion methods
- [ ] **No hardcoded values** - use variables with descriptive names
- [ ] **Tests are isolated** - no dependencies on other tests or external state
- [ ] **Security implications tested** for authentication/authorization/encryption code

## Common Patterns

### Testing Decorators

```python
def test_decorator_behavior(self, app: Flask):
    """Test decorator allows/denies access correctly"""
    
    @decorator_to_test
    def protected_view(**kwargs):
        return kwargs.get("expected_value", "fallback")
    
    with app.test_request_context(headers={"Header": "Value"}):
        result = protected_view()
    
    assert result == expected_value
```

### Testing Context Managers

```python
def test_context_manager_cleanup(self):
    """Test context manager properly cleans up resources"""
    client = ClientClass(config="test")
    
    with patch.object(client, "cleanup") as mock_cleanup:
        with client:
            assert client._initialized is True
        
        mock_cleanup.assert_called_once()
        assert client._initialized is False
```

### Testing Async Code (if applicable)

```python
@pytest.mark.asyncio
async def test_async_operation(self):
    """Test async operation completes successfully"""
    result = await async_function()
    assert result.status == "success"
```

## Additional Resources

For more testing patterns and examples, refer to:

- [test_auth_wraps.py](file:///home/dev/Documents/repos/github.com/langgenius/dify/api/tests/unit_tests/controllers/inner_api/test_auth_wraps.py) - Decorator testing patterns
- [test_encrypter.py](file:///home/dev/Documents/repos/github.com/langgenius/dify/api/tests/unit_tests/core/helper/test_encrypter.py) - Security testing patterns
- [test_mcp_client.py](file:///home/dev/Documents/repos/github.com/langgenius/dify/api/tests/unit_tests/core/mcp/test_mcp_client.py) - Client and context manager testing
- [test_dify_config.py](file:///home/dev/Documents/repos/github.com/langgenius/dify/api/tests/unit_tests/configs/test_dify_config.py) - Configuration and parametrized testing
- [conftest.py](file:///home/dev/Documents/repos/github.com/langgenius/dify/api/tests/unit_tests/conftest.py) - Shared fixtures and test configuration

---

**Remember:** Good tests are:
- **Fast** - Run in milliseconds
- **Isolated** - No external dependencies
- **Repeatable** - Same result every time
- **Self-validating** - Pass/fail without manual inspection
- **Timely** - Written with or before the code
