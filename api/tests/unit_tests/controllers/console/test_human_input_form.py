import json
from unittest.mock import MagicMock, patch

import pytest
from flask import Response

import controllers.console.human_input_form as console_module
from controllers.web.error import InvalidArgumentError, NotFoundError
from models.enums import CreatorUserRole
from models.human_input import RecipientType
from models.model import AppMode


def unwrap(func):
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


class TestJsonifyFormDefinition:
    def test_jsonify_form_definition(self):
        form = MagicMock()
        form.get_definition.return_value.model_dump.return_value = {"a": 1}
        form.expiration_time.timestamp.return_value = 123

        resp = console_module._jsonify_form_definition(form)

        assert isinstance(resp, Response)
        payload = json.loads(resp.data.decode())
        assert payload["a"] == 1
        assert payload["expiration_time"] == 123


class TestConsoleHumanInputFormApiGet:
    def test_get_success(self):
        api = console_module.ConsoleHumanInputFormApi()
        method = unwrap(api.get)

        form = MagicMock()
        form.tenant_id = "t1"
        form.get_definition.return_value.model_dump.return_value = {"a": 1}
        form.expiration_time.timestamp.return_value = 123

        with patch.object(
            console_module, "HumanInputService"
        ) as svc, patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(MagicMock(), "t1"),
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ):
            svc.return_value.get_form_definition_by_token_for_console.return_value = form
            resp = method(api, "token")

        assert isinstance(resp, Response)

    def test_get_not_found(self):
        api = console_module.ConsoleHumanInputFormApi()
        method = unwrap(api.get)

        with patch.object(
            console_module, "HumanInputService"
        ) as svc, patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ):
            svc.return_value.get_form_definition_by_token_for_console.return_value = None
            with pytest.raises(NotFoundError):
                method(api, "token")


class TestConsoleHumanInputFormApiPost:
    def test_post_success(self):
        api = console_module.ConsoleHumanInputFormApi()
        method = unwrap(api.post)

        form = MagicMock()
        form.tenant_id = "t1"
        form.recipient_type = RecipientType.CONSOLE

        user = MagicMock()
        user.id = "u1"

        with patch.object(
            console_module.reqparse, "RequestParser"
        ) as parser_cls, patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(user, "t1"),
        ), patch.object(
            console_module, "HumanInputService"
        ) as svc, patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ):
            parser = parser_cls.return_value
            parser.parse_args.return_value = {
                "inputs": {"x": 1},
                "action": "Approve",
            }
            svc.return_value.get_form_by_token.return_value = form

            resp = method(api, "token")

        assert resp.json == {}

    def test_post_invalid_recipient(self):
        api = console_module.ConsoleHumanInputFormApi()
        method = unwrap(api.post)

        form = MagicMock()
        form.tenant_id = "t1"
        form.recipient_type = RecipientType.EMAIL_EXTERNAL

        with patch.object(
            console_module.reqparse, "RequestParser"
        ) as parser_cls, patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(MagicMock(), "t1"),
        ), patch.object(
            console_module, "HumanInputService"
        ) as svc, patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ):
            parser_cls.return_value.parse_args.return_value = {
                "inputs": {},
                "action": "A",
            }
            svc.return_value.get_form_by_token.return_value = form

            with pytest.raises(NotFoundError):
                method(api, "token")


class TestConsoleWorkflowEventsApi:
    def test_get_finished_workflow(self):
        api = console_module.ConsoleWorkflowEventsApi()
        method = unwrap(api.get)

        workflow_run = MagicMock()
        workflow_run.id = "w1"
        workflow_run.tenant_id = "t1"
        workflow_run.created_by = "u1"
        workflow_run.created_by_role = CreatorUserRole.ACCOUNT
        workflow_run.finished_at = "done"

        user = MagicMock()
        user.id = "u1"

        with patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(user, "t1"),
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ), patch.object(
            console_module.DifyAPIRepositoryFactory,
            "create_api_workflow_run_repository",
        ) as repo_factory, patch.object(
            console_module.WorkflowResponseConverter,
            "workflow_run_result_to_finish_response",
        ) as converter:
            repo = repo_factory.return_value
            repo.get_workflow_run_by_id_and_tenant_id.return_value = workflow_run

            response_obj = MagicMock()
            response_obj.event.value = "finished"
            response_obj.model_dump.return_value = {"x": 1}
            converter.return_value = response_obj

            resp = method(api, "w1")

        assert isinstance(resp, Response)
        assert resp.mimetype == "text/event-stream"

    def test_get_unfinished_workflow_invalid_mode(self):
        api = console_module.ConsoleWorkflowEventsApi()
        method = unwrap(api.get)

        workflow_run = MagicMock()
        workflow_run.id = "w1"
        workflow_run.tenant_id = "t1"
        workflow_run.app_id = "a1"
        workflow_run.created_by = "u1"
        workflow_run.created_by_role = CreatorUserRole.ACCOUNT
        workflow_run.finished_at = None

        user = MagicMock()
        user.id = "u1"

        app = MagicMock()
        app.mode = "invalid"

        with patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(user, "t1"),
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ), patch.object(
            console_module.DifyAPIRepositoryFactory,
            "create_api_workflow_run_repository",
        ) as repo_factory, patch.object(
            console_module,
            "_retrieve_app_for_workflow_run",
            return_value=app,
        ):
            repo = repo_factory.return_value
            repo.get_workflow_run_by_id_and_tenant_id.return_value = workflow_run

            with pytest.raises(InvalidArgumentError):
                method(api, "w1")


class TestConsoleHumanInputFormApiGetWithTenantMismatch:
    """Test get with tenant mismatch (line 50 coverage)."""

    def test_get_tenant_mismatch(self):
        api = console_module.ConsoleHumanInputFormApi()
        method = unwrap(api.get)

        form = MagicMock()
        form.tenant_id = "t1"

        with patch.object(
            console_module, "HumanInputService"
        ) as svc, patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(MagicMock(), "t2"),  # Different tenant
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ):
            svc.return_value.get_form_definition_by_token_for_console.return_value = form
            with pytest.raises(NotFoundError):
                method(api, "token")


class TestConsoleHumanInputFormApiPostNotFound:
    """Test post with form not found (line 95 coverage)."""

    def test_post_form_not_found(self):
        api = console_module.ConsoleHumanInputFormApi()
        method = unwrap(api.post)

        with patch.object(
            console_module.reqparse, "RequestParser"
        ) as parser_cls, patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(MagicMock(), "t1"),
        ), patch.object(
            console_module, "HumanInputService"
        ) as svc, patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ):
            parser = parser_cls.return_value
            parser.parse_args.return_value = {
                "inputs": {"x": 1},
                "action": "Approve",
            }
            svc.return_value.get_form_by_token.return_value = None
            with pytest.raises(NotFoundError):
                method(api, "token")


class TestConsoleHumanInputFormApiPostTenantMismatch:
    """Test post with tenant mismatch."""

    def test_post_tenant_mismatch(self):
        api = console_module.ConsoleHumanInputFormApi()
        method = unwrap(api.post)

        form = MagicMock()
        form.tenant_id = "t1"
        form.recipient_type = RecipientType.CONSOLE

        with patch.object(
            console_module.reqparse, "RequestParser"
        ) as parser_cls, patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(MagicMock(), "t2"),  # Different tenant
        ), patch.object(
            console_module, "HumanInputService"
        ) as svc, patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ):
            parser = parser_cls.return_value
            parser.parse_args.return_value = {
                "inputs": {"x": 1},
                "action": "Approve",
            }
            svc.return_value.get_form_by_token.return_value = form
            with pytest.raises(NotFoundError):
                method(api, "token")


class TestConsoleWorkflowEventsApiValidations:
    """Test workflow events API validations (lines 140-146 coverage)."""

    def test_get_workflow_not_found(self):
        api = console_module.ConsoleWorkflowEventsApi()
        method = unwrap(api.get)

        user = MagicMock()
        user.id = "u1"

        with patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(user, "t1"),
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ), patch.object(
            console_module.DifyAPIRepositoryFactory,
            "create_api_workflow_run_repository",
        ) as repo_factory:
            repo = repo_factory.return_value
            repo.get_workflow_run_by_id_and_tenant_id.return_value = None
            with pytest.raises(NotFoundError):
                method(api, "w1")

    def test_get_workflow_not_created_by_account(self):
        api = console_module.ConsoleWorkflowEventsApi()
        method = unwrap(api.get)

        workflow_run = MagicMock()
        workflow_run.id = "w1"
        workflow_run.tenant_id = "t1"
        workflow_run.created_by_role = CreatorUserRole.END_USER  # Not ACCOUNT

        user = MagicMock()
        user.id = "u1"

        with patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(user, "t1"),
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ), patch.object(
            console_module.DifyAPIRepositoryFactory,
            "create_api_workflow_run_repository",
        ) as repo_factory:
            repo = repo_factory.return_value
            repo.get_workflow_run_by_id_and_tenant_id.return_value = workflow_run
            with pytest.raises(NotFoundError):
                method(api, "w1")

    def test_get_workflow_not_created_by_current_user(self):
        api = console_module.ConsoleWorkflowEventsApi()
        method = unwrap(api.get)

        workflow_run = MagicMock()
        workflow_run.id = "w1"
        workflow_run.tenant_id = "t1"
        workflow_run.created_by_role = CreatorUserRole.ACCOUNT
        workflow_run.created_by = "u2"  # Different user

        user = MagicMock()
        user.id = "u1"

        with patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(user, "t1"),
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ), patch.object(
            console_module.DifyAPIRepositoryFactory,
            "create_api_workflow_run_repository",
        ) as repo_factory:
            repo = repo_factory.return_value
            repo.get_workflow_run_by_id_and_tenant_id.return_value = workflow_run
            with pytest.raises(NotFoundError):
                method(api, "w1")


class TestConsoleWorkflowEventsApiAdvancedChat:
    """Test workflow events API with ADVANCED_CHAT mode (line 163 coverage)."""

    def test_get_unfinished_workflow_advanced_chat(self):
        api = console_module.ConsoleWorkflowEventsApi()
        method = unwrap(api.get)

        workflow_run = MagicMock()
        workflow_run.id = "w1"
        workflow_run.tenant_id = "t1"
        workflow_run.app_id = "a1"
        workflow_run.created_by = "u1"
        workflow_run.created_by_role = CreatorUserRole.ACCOUNT
        workflow_run.finished_at = None

        user = MagicMock()
        user.id = "u1"

        app = MagicMock()
        app.mode = AppMode.ADVANCED_CHAT

        with patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(user, "t1"),
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ), patch.object(
            console_module,
            "request",
            MagicMock(args={"include_state_snapshot": "false"}),
        ), patch.object(
            console_module.DifyAPIRepositoryFactory,
            "create_api_workflow_run_repository",
        ) as repo_factory, patch.object(
            console_module,
            "_retrieve_app_for_workflow_run",
            return_value=app,
        ), patch.object(
            console_module.AdvancedChatAppGenerator,
            "convert_to_event_stream",
            return_value=iter([]),
        ) as generator_mock, patch.object(
            console_module.MessageGenerator,
            "retrieve_events",
            return_value=iter([]),
        ):
            repo = repo_factory.return_value
            repo.get_workflow_run_by_id_and_tenant_id.return_value = workflow_run

            resp = method(api, "w1")

        assert isinstance(resp, Response)
        assert resp.mimetype == "text/event-stream"


class TestConsoleWorkflowEventsApiWithStateSnapshot:
    """Test workflow events API with state snapshot (line 176 coverage)."""

    def test_get_unfinished_workflow_with_state_snapshot(self):
        api = console_module.ConsoleWorkflowEventsApi()
        method = unwrap(api.get)

        workflow_run = MagicMock()
        workflow_run.id = "w1"
        workflow_run.tenant_id = "t1"
        workflow_run.app_id = "a1"
        workflow_run.created_by = "u1"
        workflow_run.created_by_role = CreatorUserRole.ACCOUNT
        workflow_run.finished_at = None

        user = MagicMock()
        user.id = "u1"

        app = MagicMock()
        app.mode = AppMode.WORKFLOW

        with patch.object(
            console_module,
            "current_account_with_tenant",
            return_value=(user, "t1"),
        ), patch.object(
            console_module,
            "db",
            MagicMock(engine=MagicMock()),
        ), patch.object(
            console_module,
            "request",
            MagicMock(args={"include_state_snapshot": "true"}),  # Include snapshot
        ), patch.object(
            console_module.DifyAPIRepositoryFactory,
            "create_api_workflow_run_repository",
        ) as repo_factory, patch.object(
            console_module,
            "_retrieve_app_for_workflow_run",
            return_value=app,
        ), patch.object(
            console_module.WorkflowAppGenerator,
            "convert_to_event_stream",
            return_value=iter([]),
        ), patch.object(
            console_module,
            "build_workflow_event_stream",
            return_value=iter([]),
        ):
            repo = repo_factory.return_value
            repo.get_workflow_run_by_id_and_tenant_id.return_value = workflow_run

            resp = method(api, "w1")

        assert isinstance(resp, Response)
        assert resp.mimetype == "text/event-stream"


class TestRetrieveAppForWorkflowRun:
    """Test _retrieve_app_for_workflow_run function (line 212 coverage)."""

    def test_retrieve_app_not_found(self):
        """Test that AssertionError is raised when app is not found (line 212)."""
        from sqlalchemy.orm import Session

        workflow_run = MagicMock()
        workflow_run.id = "w1"
        workflow_run.app_id = "a1"
        workflow_run.tenant_id = "t1"

        # Mock session that returns None when querying
        session = MagicMock(spec=Session)
        session.scalars.return_value.first.return_value = None

        with pytest.raises(AssertionError, match="App not found for WorkflowRun"):
            console_module._retrieve_app_for_workflow_run(session, workflow_run)
