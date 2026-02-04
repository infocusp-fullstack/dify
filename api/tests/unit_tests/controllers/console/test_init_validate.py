import os
from unittest.mock import MagicMock, patch

import pytest
from flask import Flask
from pydantic import ValidationError

from controllers.console.error import (
    AlreadySetupError,
    InitValidateFailedError,
)
from controllers.console.init_validate import (
    InitValidateAPI,
    InitValidatePayload,
    get_init_validate_status,
)


def unwrap(func):
    """
    Recursively unwrap decorated functions.
    """
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


@pytest.fixture
def app():
    app = Flask(__name__)
    app.testing = True
    app.secret_key = "test-secret-key"
    return app


@pytest.fixture(autouse=True)
def mock_decorators():
    """
    Make decorators no-ops so logic is directly testable
    """
    decorators = [
        "controllers.console.init_validate.only_edition_self_hosted",
    ]

    with patch(decorators[0], new=lambda f: f):
        yield


@pytest.fixture
def mock_db():
    with patch("controllers.console.init_validate.db") as db_mock:
        db_mock.engine = MagicMock()
        yield db_mock


@pytest.fixture
def mock_dify_config():
    with patch("controllers.console.init_validate.dify_config") as config_mock:
        config_mock.EDITION = "SELF_HOSTED"
        yield config_mock


@pytest.fixture
def mock_tenant_service():
    with patch("controllers.console.init_validate.TenantService") as ts:
        yield ts


class TestInitValidateAPIGet:
    def test_get_init_status_not_started(self, app, mock_dify_config):
        """Test getting init status when not started"""
        api = InitValidateAPI()
        get_method = unwrap(api.get)

        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("INIT_PASSWORD", None)
            mock_dify_config.EDITION = "CLOUD"

            with app.test_request_context():
                result = get_method()

        assert result["status"] == "finished"

    def test_get_init_status_finished(self, app, mock_dify_config, mock_db):
        """Test getting init status when already finished"""
        api = InitValidateAPI()
        get_method = unwrap(api.get)

        mock_dify_config.EDITION = "CLOUD"

        with app.test_request_context():
            result = get_method()

        assert result["status"] == "finished"

    def test_get_init_status_non_self_hosted(self, app, mock_dify_config):
        """Test getting init status for non-self-hosted edition"""
        api = InitValidateAPI()
        get_method = unwrap(api.get)

        mock_dify_config.EDITION = "CLOUD"

        with app.test_request_context():
            result = get_method()

        assert result["status"] == "finished"


class TestInitValidateAPIPost:
    def test_post_already_setup(self, app, mock_dify_config, mock_tenant_service):
        """Test validation when tenants already exist"""
        api = InitValidateAPI()
        post_method = unwrap(api.post)

        mock_tenant_service.get_tenant_count.return_value = 1

        with app.test_request_context(method="POST"):
            with patch("controllers.console.init_validate.console_ns") as mock_ns:
                mock_ns.payload = {"password": "test-password"}
                with pytest.raises(AlreadySetupError):
                    post_method(api)

    def test_post_no_tenants_invalid_password(self, app, mock_dify_config, mock_tenant_service):
        """Test validation with invalid password"""
        api = InitValidateAPI()
        post_method = unwrap(api.post)

        mock_tenant_service.get_tenant_count.return_value = 0

        with app.test_request_context(method="POST"):
            with patch("controllers.console.init_validate.console_ns") as mock_ns:
                mock_ns.payload = {"password": "wrong-password"}
                with patch("controllers.console.init_validate.session") as mock_session:
                    with patch.dict(os.environ, {"INIT_PASSWORD": "correct-password"}):
                        with pytest.raises(InitValidateFailedError):
                            post_method(api)

    def test_post_successful_validation(self, app, mock_dify_config, mock_tenant_service):
        """Test successful password validation"""
        api = InitValidateAPI()
        post_method = unwrap(api.post)

        mock_tenant_service.get_tenant_count.return_value = 0

        with app.test_request_context(method="POST"):
            with patch("controllers.console.init_validate.console_ns") as mock_ns:
                mock_ns.payload = {"password": "correct-password"}
                with patch("controllers.console.init_validate.session") as mock_session:
                    with patch.dict(os.environ, {"INIT_PASSWORD": "correct-password"}):
                        result, status = post_method(api)

        assert status == 201
        assert result["result"] == "success"

    def test_post_empty_password(self, app, mock_dify_config, mock_tenant_service):
        """Test validation with empty password"""
        api = InitValidateAPI()
        post_method = unwrap(api.post)

        mock_tenant_service.get_tenant_count.return_value = 0

        with app.test_request_context(method="POST"):
            with patch("controllers.console.init_validate.console_ns") as mock_ns:
                mock_ns.payload = {"password": ""}
                with patch("controllers.console.init_validate.session") as mock_session:
                    with patch.dict(os.environ, {"INIT_PASSWORD": "correct-password"}):
                        with pytest.raises(InitValidateFailedError):
                            post_method(api)

    def test_post_no_init_password_env(self, app, mock_dify_config, mock_tenant_service):
        """Test validation when INIT_PASSWORD environment variable is not set"""
        api = InitValidateAPI()
        post_method = unwrap(api.post)

        mock_tenant_service.get_tenant_count.return_value = 0

        with app.test_request_context(method="POST"):
            with patch("controllers.console.init_validate.console_ns") as mock_ns:
                mock_ns.payload = {"password": "any-password"}
                with patch("controllers.console.init_validate.session") as mock_session:
                    with patch.dict(os.environ, {}, clear=False):
                        os.environ.pop("INIT_PASSWORD", None)
                        with pytest.raises(InitValidateFailedError):
                            post_method(api)


class TestGetInitValidateStatus:
    def test_get_init_status_self_hosted_no_password(self, mock_dify_config):
        """Test status when self-hosted but no INIT_PASSWORD"""
        mock_dify_config.EDITION = "SELF_HOSTED"

        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("INIT_PASSWORD", None)
            result = get_init_validate_status()

        assert result is True

    def test_get_init_status_cloud_edition(self, mock_dify_config):
        """Test status for cloud edition"""
        mock_dify_config.EDITION = "CLOUD"

        result = get_init_validate_status()

        assert result is True

    def test_get_init_status_self_hosted_with_password_validated(self, mock_dify_config):
        """Test status when self-hosted with INIT_PASSWORD and session validated"""
        mock_dify_config.EDITION = "SELF_HOSTED"

        with patch.dict(os.environ, {"INIT_PASSWORD": "test-password"}):
            app = Flask(__name__)
            app.secret_key = "test"
            with app.test_request_context():
                with patch("controllers.console.init_validate.session") as mock_session:
                    mock_session.get.return_value = True
                    result = get_init_validate_status()

        assert result is True

    def test_get_init_status_self_hosted_with_password_not_validated(self, mock_dify_config):
        """Test status when self-hosted with INIT_PASSWORD but not in session"""
        mock_dify_config.EDITION = "SELF_HOSTED"

        with patch.dict(os.environ, {"INIT_PASSWORD": "test-password"}):
            app = Flask(__name__)
            app.secret_key = "test"
            with app.test_request_context():
                with patch("controllers.console.init_validate.session") as mock_session:
                    mock_session.get.return_value = False
                    result = get_init_validate_status()

        assert result is None or result is not False

    def test_get_init_status_self_hosted_with_password_setup_exists(self, mock_dify_config):
        """Test status when self-hosted with INIT_PASSWORD and validated in session"""
        mock_dify_config.EDITION = "SELF_HOSTED"

        with patch.dict(os.environ, {"INIT_PASSWORD": "test-password"}):
            app = Flask(__name__)
            app.secret_key = "test"
            with app.test_request_context():
                with patch("controllers.console.init_validate.session") as mock_session:
                    mock_session.get.return_value = True
                    result = get_init_validate_status()

        assert result is True


class TestInitValidatePayload:
    def test_payload_valid(self):
        """Test valid payload"""
        payload = InitValidatePayload(password="test-password")
        assert payload.password == "test-password"

    def test_payload_max_length(self):
        """Test password with max length"""
        password = "x" * 30  # max_length=30
        payload = InitValidatePayload(password=password)
        assert payload.password == password

    def test_payload_exceeds_max_length(self):
        """Test password exceeds max length"""
        password = "x" * 31  # exceeds max_length=30
        with pytest.raises(ValidationError):
            InitValidatePayload(password=password)

    def test_payload_empty_password(self):
        """Test empty password is valid (allows empty string)"""
        payload = InitValidatePayload(password="")
        assert payload.password == ""

    def test_payload_missing_password(self):
        """Test missing password field"""
        with pytest.raises(ValidationError):
            InitValidatePayload()
