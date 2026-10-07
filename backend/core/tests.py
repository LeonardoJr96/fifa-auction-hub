from unittest.mock import patch

from django.db import DatabaseError
from django.test import SimpleTestCase


class HealthCheckTests(SimpleTestCase):
    @patch("core.health.connection")
    def test_returns_ok_when_database_is_available(self, database_connection):
        response = self.client.get("/api/v1/system/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "database": "ok"})
        database_connection.cursor.return_value.__enter__.return_value.execute.assert_called_once_with("SELECT 1")

    @patch("core.health.connection")
    def test_returns_service_unavailable_when_database_is_unavailable(self, database_connection):
        database_connection.cursor.side_effect = DatabaseError
        response = self.client.get("/api/v1/system/health/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json(),
            {"status": "unavailable", "database": "unavailable"},
        )
