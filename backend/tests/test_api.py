"""
API integration tests for Trades and Rules endpoints.

对应 spec:
- backend-api 6.3: CRUD API 端点集成测试
- backend-api 6.4: 规则库 API 集成测试
- backend-api 6.6: 查询过滤 AND 逻辑
- backend-api 6.7: 分页限制
"""

import pytest
from httpx import AsyncClient

from tests.conftest import make_trade_data

pytestmark = pytest.mark.asyncio(loop_scope="session")


# ── CRUD API Tests (6.3) ────────────────────────────────────────

class TestTradesAPI:

    async def test_create_trade(self, client: AsyncClient):
        resp = await client.post("/api/trades", json=make_trade_data())
        assert resp.status_code == 201
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["stock_code"] == "000001"
        assert body["data"]["pnl_amount"] is not None

    async def test_get_trade_by_id(self, client: AsyncClient):
        # Create
        create_resp = await client.post("/api/trades", json=make_trade_data())
        trade_id = create_resp.json()["data"]["id"]

        # Get
        resp = await client.get(f"/api/trades/{trade_id}")
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == trade_id

    async def test_get_trade_not_found(self, client: AsyncClient):
        resp = await client.get("/api/trades/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404

    async def test_list_trades(self, client: AsyncClient):
        resp = await client.get("/api/trades")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert "data" in body
        assert "pagination" in body

    async def test_list_trades_with_pagination(self, client: AsyncClient):
        resp = await client.get("/api/trades", params={"page_size": "2"})
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) <= 2

    async def test_update_trade(self, client: AsyncClient):
        # Create
        create_resp = await client.post("/api/trades", json=make_trade_data())
        trade = create_resp.json()["data"]

        # Update
        resp = await client.put(
            f"/api/trades/{trade['id']}",
            json={"version": trade["version"], "exit_price": 15.50},
        )
        assert resp.status_code == 200
        updated = resp.json()["data"]
        assert updated["exit_price"] == 15.50
        assert updated["version"] == trade["version"] + 1

    async def test_update_optimistic_lock_conflict(self, client: AsyncClient):
        create_resp = await client.post("/api/trades", json=make_trade_data())
        trade = create_resp.json()["data"]

        # Update once
        await client.put(
            f"/api/trades/{trade['id']}",
            json={"version": trade["version"], "exit_price": 15.50},
        )
        # Update again with old version
        resp = await client.put(
            f"/api/trades/{trade['id']}",
            json={"version": trade["version"], "exit_price": 16.00},
        )
        assert resp.status_code == 409

    async def test_soft_delete_and_restore(self, client: AsyncClient):
        create_resp = await client.post("/api/trades", json=make_trade_data())
        trade_id = create_resp.json()["data"]["id"]

        # Delete
        del_resp = await client.delete(f"/api/trades/{trade_id}")
        assert del_resp.status_code == 204

        # Verify not found
        get_resp = await client.get(f"/api/trades/{trade_id}")
        assert get_resp.status_code == 404

        # Restore
        restore_resp = await client.post(f"/api/trades/{trade_id}/restore")
        assert restore_resp.status_code == 200

    async def test_create_validation_error(self, client: AsyncClient):
        """Missing required field → 400/422"""
        resp = await client.post("/api/trades", json={"stock_code": "000001"})
        assert resp.status_code in (400, 422)

    async def test_bulk_create(self, client: AsyncClient):
        trades = [make_trade_data(stock_code=f"BULK{i:02d}") for i in range(3)]
        resp = await client.post("/api/trades/bulk", json={"trades": trades})
        assert resp.status_code == 201
        body = resp.json()["data"]
        assert body["success_count"] == 3
        assert body["failure_count"] == 0


# ── Rules API Tests (6.4) ───────────────────────────────────────

class TestRulesAPI:

    async def test_rules_summary(self, client: AsyncClient):
        resp = await client.get("/api/rules/summary")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]
        assert "total_trades" in data
        assert "permanent_exclusions_count" in data

    async def test_exclusions_list(self, client: AsyncClient):
        resp = await client.get("/api/rules/exclusions")
        assert resp.status_code == 200

    async def test_correct_behaviors_list(self, client: AsyncClient):
        resp = await client.get("/api/rules/correct-behaviors")
        assert resp.status_code == 200

    async def test_environment_mismatches_list(self, client: AsyncClient):
        resp = await client.get("/api/rules/environment-mismatches")
        assert resp.status_code == 200


# ── Health Check ─────────────────────────────────────────────────

class TestHealthAPI:

    async def test_health_endpoint(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
