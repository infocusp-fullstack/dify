from datetime import datetime
from unittest.mock import MagicMock, patch

import httpx
import pytest
from flask import Flask

from controllers.common.errors import (
    FileTooLargeError,
    RemoteFileUploadError,
    UnsupportedFileTypeError,
)
from controllers.console.remote_files import (
    RemoteFileInfoApi,
    RemoteFileUploadApi,
    RemoteFileUploadPayload,
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
        "controllers.console.remote_files.console_ns.route",
        "controllers.console.remote_files.console_ns.response",
        "controllers.console.remote_files.console_ns.expect",
    ]

    with patch.multiple(
        "controllers.console.remote_files.console_ns",
        route=lambda *args, **kwargs: lambda cls: cls,
        response=lambda *args, **kwargs: lambda func: func,
        expect=lambda *args, **kwargs: lambda func: func,
    ):
        yield


@pytest.fixture
def mock_ssrf_proxy():
    with patch("controllers.console.remote_files.ssrf_proxy") as proxy_mock:
        yield proxy_mock


@pytest.fixture
def mock_current_account():
    with patch("controllers.console.remote_files.current_account_with_tenant") as mock_fn:
        mock_fn.return_value = ("test_user", "test_tenant")
        yield mock_fn


@pytest.fixture
def mock_file_service():
    with patch("controllers.console.remote_files.FileService") as mock_fs:
        yield mock_fs


@pytest.fixture
def mock_helpers():
    with patch("controllers.console.remote_files.helpers") as mock_h:
        yield mock_h


@pytest.fixture
def mock_file_helpers():
    with patch("controllers.console.remote_files.file_helpers") as mock_fh:
        yield mock_fh


@pytest.fixture
def mock_db():
    with patch("controllers.console.remote_files.db") as mock_d:
        yield mock_d


class TestRemoteFileInfoApiGet:
    def test_get_file_info_with_head_success(self, app, mock_ssrf_proxy):
        """Test getting file info when HEAD request succeeds"""
        api = RemoteFileInfoApi()
        get_method = unwrap(api.get)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {
            "Content-Type": "application/pdf",
            "Content-Length": "1024",
        }
        mock_ssrf_proxy.head.return_value = mock_response

        with app.test_request_context():
            result = get_method("http://example.com/file.pdf")

        assert result["file_type"] == "application/pdf"
        assert result["file_length"] == 1024
        mock_ssrf_proxy.head.assert_called_once_with("http://example.com/file.pdf")
        mock_ssrf_proxy.get.assert_not_called()

    def test_get_file_info_head_fails_fallback_to_get(self, app, mock_ssrf_proxy):
        """Test getting file info when HEAD fails, fallback to GET"""
        api = RemoteFileInfoApi()
        get_method = unwrap(api.get)

        head_response = MagicMock()
        head_response.status_code = 405
        mock_ssrf_proxy.head.return_value = head_response

        get_response = MagicMock()
        get_response.status_code = 200
        get_response.headers = {
            "Content-Type": "image/png",
            "Content-Length": "2048",
        }
        mock_ssrf_proxy.get.return_value = get_response

        with app.test_request_context():
            result = get_method("http://example.com/image.png")

        assert result["file_type"] == "image/png"
        assert result["file_length"] == 2048
        mock_ssrf_proxy.head.assert_called_once()
        mock_ssrf_proxy.get.assert_called_once_with("http://example.com/image.png", timeout=3)

    def test_get_file_info_missing_content_type(self, app, mock_ssrf_proxy):
        """Test getting file info when Content-Type header is missing"""
        api = RemoteFileInfoApi()
        get_method = unwrap(api.get)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Length": "512"}  # No Content-Type
        mock_ssrf_proxy.head.return_value = mock_response

        with app.test_request_context():
            result = get_method("http://example.com/unknown")

        assert result["file_type"] == "application/octet-stream"
        assert result["file_length"] == 512

    def test_get_file_info_missing_content_length(self, app, mock_ssrf_proxy):
        """Test getting file info when Content-Length header is missing"""
        api = RemoteFileInfoApi()
        get_method = unwrap(api.get)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "text/plain"}
        mock_ssrf_proxy.head.return_value = mock_response

        with app.test_request_context():
            result = get_method("http://example.com/file.txt")

        assert result["file_type"] == "text/plain"
        assert result["file_length"] == 0

    def test_get_file_info_url_encoding(self, app, mock_ssrf_proxy):
        """Test that URL is properly decoded"""
        api = RemoteFileInfoApi()
        get_method = unwrap(api.get)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {
            "Content-Type": "application/json",
            "Content-Length": "256",
        }
        mock_ssrf_proxy.head.return_value = mock_response

        encoded_url = "http://example.com/file%20with%20spaces.json"

        with app.test_request_context():
            result = get_method(encoded_url)

        called_url = mock_ssrf_proxy.head.call_args[0][0]
        assert called_url == "http://example.com/file with spaces.json"
        assert result["file_length"] == 256

    def test_get_file_info_request_fails(self, app, mock_ssrf_proxy):
        """Test error handling when both HEAD and GET fail"""
        api = RemoteFileInfoApi()
        get_method = unwrap(api.get)

        head_response = MagicMock()
        head_response.status_code = 404
        mock_ssrf_proxy.head.return_value = head_response

        get_response = MagicMock()
        get_response.status_code = 404
        get_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "404 Not Found",
            request=MagicMock(),
            response=MagicMock(),
        )
        mock_ssrf_proxy.get.return_value = get_response

        with app.test_request_context():
            with pytest.raises(httpx.HTTPStatusError):
                get_method("http://example.com/notfound")


class TestRemoteFileUploadApiPost:
    def test_post_upload_success_with_head(
        self,
        app,
        mock_ssrf_proxy,
        mock_current_account,
        mock_file_service,
        mock_helpers,
        mock_file_helpers,
        mock_db,
    ):
        """Test successful file upload when HEAD request succeeds"""
        api = RemoteFileUploadApi()
        post_method = unwrap(api.post)

        head_response = MagicMock()
        head_response.status_code = 200
        head_response.request.method = "HEAD"
        head_response.headers = {"Content-Type": "application/pdf"}
        mock_ssrf_proxy.head.return_value = head_response

        file_info = MagicMock()
        file_info.extension = "pdf"
        file_info.size = 1024
        file_info.filename = "document.pdf"
        file_info.mimetype = "application/pdf"
        mock_helpers.guess_file_info_from_response.return_value = file_info

        mock_file_service.is_file_size_within_limit.return_value = True
        mock_upload_file = MagicMock()
        mock_upload_file.id = "file_123"
        mock_upload_file.name = "document.pdf"
        mock_upload_file.size = 1024
        mock_upload_file.extension = "pdf"
        mock_upload_file.mime_type = "application/pdf"
        mock_upload_file.created_by = "test_user"
        mock_upload_file.created_at = datetime(2024, 1, 1, 12, 0, 0)
        mock_file_service.return_value.upload_file.return_value = mock_upload_file

        mock_file_helpers.get_signed_file_url.return_value = "https://example.com/signed/file_123"

        with app.test_request_context():
            with patch("controllers.console.remote_files.console_ns") as mock_ns:
                mock_ns.payload = {"url": "http://example.com/document.pdf"}
                result, status_code = post_method()

        assert status_code == 201
        assert result["id"] == "file_123"
        assert result["name"] == "document.pdf"
        assert result["size"] == 1024
        assert result["url"] == "https://example.com/signed/file_123"

    def test_post_upload_head_fails_fallback_to_get(
        self,
        app,
        mock_ssrf_proxy,
        mock_current_account,
        mock_file_service,
        mock_helpers,
        mock_file_helpers,
        mock_db,
    ):
        """Test upload when HEAD fails, fallback to GET"""
        api = RemoteFileUploadApi()
        post_method = unwrap(api.post)

        head_response = MagicMock()
        head_response.status_code = 405
        mock_ssrf_proxy.head.return_value = head_response

        get_response = MagicMock()
        get_response.status_code = 200
        get_response.request.method = "GET"
        get_response.headers = {"Content-Type": "text/plain"}
        get_response.content = b"file content"
        mock_ssrf_proxy.get.return_value = get_response

        file_info = MagicMock()
        file_info.extension = "txt"
        file_info.size = 512
        file_info.filename = "document.txt"
        file_info.mimetype = "text/plain"
        mock_helpers.guess_file_info_from_response.return_value = file_info

        mock_file_service.is_file_size_within_limit.return_value = True
        mock_upload_file = MagicMock()
        mock_upload_file.id = "file_456"
        mock_upload_file.name = "document.txt"
        mock_upload_file.size = 512
        mock_upload_file.extension = "txt"
        mock_upload_file.mime_type = "text/plain"
        mock_upload_file.created_by = "test_user"
        mock_upload_file.created_at = datetime(2024, 1, 1, 12, 0, 0)
        mock_file_service.return_value.upload_file.return_value = mock_upload_file

        mock_file_helpers.get_signed_file_url.return_value = "https://example.com/signed/file_456"

        with app.test_request_context():
            with patch("controllers.console.remote_files.console_ns") as mock_ns:
                mock_ns.payload = {"url": "http://example.com/document.txt"}
                result, status_code = post_method()

        assert status_code == 201
        assert result["id"] == "file_456"
        mock_ssrf_proxy.get.assert_called_with(url="http://example.com/document.txt", timeout=3, follow_redirects=True)

    def test_post_upload_both_requests_fail(self, app, mock_ssrf_proxy, mock_current_account, mock_file_service):
        """Test error when both HEAD and GET fail"""
        api = RemoteFileUploadApi()
        post_method = unwrap(api.post)

        head_response = MagicMock()
        head_response.status_code = 503
        mock_ssrf_proxy.head.return_value = head_response

        get_response = MagicMock()
        get_response.status_code = 503
        get_response.text = "Service Unavailable"
        mock_ssrf_proxy.get.return_value = get_response

        with app.test_request_context():
            with patch("controllers.console.remote_files.console_ns") as mock_ns:
                mock_ns.payload = {"url": "http://example.com/file.pdf"}
                with pytest.raises(RemoteFileUploadError) as exc_info:
                    post_method()

        assert "Failed to fetch file from" in str(exc_info.value)

    def test_post_upload_request_error(self, app, mock_ssrf_proxy, mock_current_account, mock_file_service):
        """Test error handling when httpx.RequestError occurs"""
        api = RemoteFileUploadApi()
        post_method = unwrap(api.post)

        mock_ssrf_proxy.head.side_effect = httpx.RequestError("Connection failed")

        with app.test_request_context():
            with patch("controllers.console.remote_files.console_ns") as mock_ns:
                mock_ns.payload = {"url": "http://example.com/file.pdf"}
                with pytest.raises(RemoteFileUploadError) as exc_info:
                    post_method()

        assert "Connection failed" in str(exc_info.value)

    def test_post_upload_file_too_large(
        self,
        app,
        mock_ssrf_proxy,
        mock_current_account,
        mock_file_service,
        mock_helpers,
        mock_db,
    ):
        """Test error when file size exceeds limit"""
        api = RemoteFileUploadApi()
        post_method = unwrap(api.post)

        head_response = MagicMock()
        head_response.status_code = 200
        head_response.request.method = "HEAD"
        mock_ssrf_proxy.head.return_value = head_response

        file_info = MagicMock()
        file_info.extension = "pdf"
        file_info.size = 999999999
        file_info.filename = "huge_file.pdf"
        mock_helpers.guess_file_info_from_response.return_value = file_info

        mock_file_service.is_file_size_within_limit.return_value = False

        with app.test_request_context():
            with patch("controllers.console.remote_files.console_ns") as mock_ns:
                mock_ns.payload = {"url": "http://example.com/huge.pdf"}
                with pytest.raises(FileTooLargeError):
                    post_method()

    def test_post_upload_unsupported_file_type(
        self,
        app,
        mock_ssrf_proxy,
        mock_current_account,
        mock_file_service,
        mock_helpers,
        mock_db,
    ):
        """Test error when file type is not supported"""
        api = RemoteFileUploadApi()
        post_method = unwrap(api.post)

        head_response = MagicMock()
        head_response.status_code = 200
        head_response.request.method = "HEAD"
        head_response.headers = {"Content-Type": "application/x-executable"}
        head_response.content = b"binary content"
        mock_ssrf_proxy.head.return_value = head_response

        file_info = MagicMock()
        file_info.extension = "exe"
        file_info.size = 512
        file_info.filename = "malicious.exe"
        file_info.mimetype = "application/x-executable"
        mock_helpers.guess_file_info_from_response.return_value = file_info

        mock_file_service.is_file_size_within_limit.return_value = True
        mock_file_service.return_value.upload_file.side_effect = __import__(
            "services.errors.file", fromlist=["UnsupportedFileTypeError"]
        ).UnsupportedFileTypeError()

        with app.test_request_context():
            with patch("controllers.console.remote_files.console_ns") as mock_ns:
                mock_ns.payload = {"url": "http://example.com/malicious.exe"}
                with pytest.raises(UnsupportedFileTypeError):
                    post_method()

    def test_post_upload_file_service_too_large_error(
        self,
        app,
        mock_ssrf_proxy,
        mock_current_account,
        mock_file_service,
        mock_helpers,
        mock_db,
    ):
        """Test error when FileService raises FileTooLargeError"""
        api = RemoteFileUploadApi()
        post_method = unwrap(api.post)

        head_response = MagicMock()
        head_response.status_code = 200
        head_response.request.method = "HEAD"
        head_response.content = b"file content"
        mock_ssrf_proxy.head.return_value = head_response

        file_info = MagicMock()
        file_info.extension = "pdf"
        file_info.size = 1024
        file_info.filename = "document.pdf"
        file_info.mimetype = "application/pdf"
        mock_helpers.guess_file_info_from_response.return_value = file_info

        mock_file_service.is_file_size_within_limit.return_value = True
        file_too_large_error = __import__("services.errors.file", fromlist=["FileTooLargeError"]).FileTooLargeError(
            "File exceeds maximum size"
        )
        mock_file_service.return_value.upload_file.side_effect = file_too_large_error

        with app.test_request_context():
            with patch("controllers.console.remote_files.console_ns") as mock_ns:
                mock_ns.payload = {"url": "http://example.com/document.pdf"}
                with pytest.raises(FileTooLargeError):
                    post_method()


class TestRemoteFileUploadPayload:
    def test_payload_valid(self):
        """Test valid payload"""
        payload = RemoteFileUploadPayload(url="http://example.com/file.pdf")
        assert payload.url == "http://example.com/file.pdf"

    def test_payload_missing_url(self):
        """Test payload missing required url field"""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            RemoteFileUploadPayload()

    def test_payload_various_urls(self):
        """Test payload with various URL formats"""
        test_urls = [
            "http://example.com/file.pdf",
            "https://example.com/path/to/file.zip",
            "http://example.com/file%20with%20spaces.txt",
            "https://cdn.example.com/assets/image.png?token=abc123",
        ]

        for url in test_urls:
            payload = RemoteFileUploadPayload(url=url)
            assert payload.url == url
