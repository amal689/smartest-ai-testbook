import unittest

from fastapi.testclient import TestClient
from smartest_ai_testbook.web_server.app import app


class WebServerTests(unittest.TestCase):
    def test_test_case_preparation_and_build(self):
        with TestClient(app) as client:
            suite = client.post("/test-suite")
            self.assertEqual(suite.status_code, 201)
            self.assertEqual(suite.json()["tests"], [])

            prepared = client.post("/test-case/prepare", json={"prompt": "Hello"})
            reference = prepared.json()["reference_id"]
            self.assertEqual(client.post("/test-case/build", json={"reference_id": reference}).json()["prompt"], "Hello")
            updated = client.post("/test-case/prepare", json={"reference_id": reference, "variables": {"name": "Ada"}})
            self.assertEqual(updated.json()["reference_id"], reference)
            built = client.post("/test-case/build", json={"reference_id": reference})
            self.assertEqual(built.json()["variables"], {"name": "Ada"})
            self.assertEqual(client.post("/test-case/build", json={"reference_id": "missing"}).status_code, 404)
            empty = client.post("/test-case/prepare", json={}).json()["reference_id"]
            self.assertEqual(client.post("/test-case/build", json={"reference_id": empty}).status_code, 422)

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
