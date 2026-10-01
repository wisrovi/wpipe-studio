from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_CANVAS_IR = {
    "nodes": [
        {
            "id": "node_1",
            "type": "default",
            "position": {"x": 0, "y": 0},
            "data": {
                "label": "HttpRequest",
                "node_type": "step",
                "namespace": "wpipe_steps.connectivity.http_request",
                "func_name": "HttpRequest",
                "origin": "catalog",
                "contract": {"reads": ["url"], "writes": ["response"]}
            }
        },
        {
            "id": "node_2",
            "type": "default",
            "position": {"x": 150, "y": 0},
            "data": {
                "label": "WafFilter",
                "node_type": "step",
                "namespace": "wpipe_steps.security.waf",
                "func_name": "WafFilterStep",
                "origin": "catalog",
                "contract": {"reads": ["response"], "writes": ["clean_response"]}
            }
        }
    ],
    "edges": [
        {
            "id": "edge_1",
            "source": "node_1",
            "target": "node_2"
        }
    ],
    "viewport": {"x": 0, "y": 0, "zoom": 1}
}


def test_validate_pipeline_endpoint():
    response = client.post("/api/v1/pipeline/validate", json=SAMPLE_CANVAS_IR)
    assert response.status_code == 200
    res = response.json()
    assert res["valid"] is True
    assert res["nodes_count"] == 2
    assert res["edges_count"] == 1


def test_transform_pipeline_endpoint():
    response = client.post("/api/v1/pipeline/transform", json=SAMPLE_CANVAS_IR)
    assert response.status_code == 200
    target_ir = response.json()
    assert target_ir["project_name"] == "wpipe_microservice"
    paths = [f["path"] for f in target_ir["files"]]
    assert "app/pipelines.py" in paths
    assert "Dockerfile" in paths


def test_dry_run_pipeline_endpoint():
    response = client.post("/api/v1/pipeline/dry-run", json=SAMPLE_CANVAS_IR)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "PASSED"
    assert res["gates"]["dry_run_pipeline"] is True


def test_generate_microservice_zip_endpoint():
    response = client.post("/api/v1/pipeline/generate", json=SAMPLE_CANVAS_IR)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert len(response.content) > 0
