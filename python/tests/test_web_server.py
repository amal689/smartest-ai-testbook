import unittest

from fastapi.testclient import TestClient
from web_server.app import app


class WebServerTests(unittest.TestCase):
    def test_health_and_browser_origin_policy(self):
        with TestClient(app) as client:
            health = client.get("/health", headers={"Origin": "http://localhost:3000"})
            self.assertEqual(health.status_code, 200)
            self.assertEqual(health.json(), {"status": "ok"})
            self.assertEqual(health.headers["Access-Control-Allow-Origin"], "http://localhost:3000")
            denied = client.get("/health", headers={"Origin": "https://other.example"})
            self.assertEqual(denied.status_code, 200)
            self.assertNotIn("Access-Control-Allow-Origin", denied.headers)
            preflight = client.options("/health", headers={
                "Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET",
            })
            self.assertTrue(preflight.is_success)
            self.assertIn("GET", preflight.headers["Access-Control-Allow-Methods"])
