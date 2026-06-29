"""
Tamrakar Commerce Airflow 3 Plugin
- FastAPI endpoints: order stats, demand flow, payout queue
- Nav link in Airflow UI (Browse > Commerce)
- No Flask/appbuilder — Airflow 3 only
"""
from __future__ import annotations

import asyncio
import os
import threading
import time
from pathlib import Path

import requests
from airflow.plugins_manager import AirflowPlugin
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent

# ── Supabase config ────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("TAMRAKAR_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("TAMRAKAR_SUPABASE_SERVICE_KEY", "")

def _supa_headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

def _supa_get(path: str, params: dict | None = None):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=_supa_headers(), params=params, timeout=10)
    r.raise_for_status()
    return r.json()

def _supa_patch(path: str, match: dict, body: dict):
    params = {k: f"eq.{v}" for k, v in match.items()}
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/{path}", headers=_supa_headers(), params=params, json=body, timeout=10)
    r.raise_for_status()
    return r.json()

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="Tamrakar Commerce Plugin")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")


@app.get("/ui", response_class=FileResponse)
async def serve_ui():
    return FileResponse(BASE_DIR / "static" / "index.html")


# ── Order stats ───────────────────────────────────────────────────────────────
@app.get("/api/orders/stats")
async def order_stats():
    """Counts by status for last 30 days."""
    def _fetch():
        rows = _supa_get(
            "orders",
            {
                "select": "order_status,payment_method,total_amount",
                "created_at": "gte.now()-interval '30 days'",
            },
        )
        stats: dict = {}
        revenue = 0.0
        by_payment: dict = {}
        for r in rows:
            s = r.get("order_status", "unknown")
            stats[s] = stats.get(s, 0) + 1
            revenue += float(r.get("total_amount", 0))
            pm = r.get("payment_method", "unknown")
            by_payment[pm] = by_payment.get(pm, 0) + 1
        return {
            "total": len(rows),
            "revenue_npr": revenue,
            "by_status": stats,
            "by_payment": by_payment,
        }
    return await asyncio.to_thread(_fetch)


# ── Pending COD orders ─────────────────────────────────────────────────────────
@app.get("/api/orders/pending-cod")
async def pending_cod():
    def _fetch():
        return _supa_get(
            "orders",
            {
                "select": "id,created_at,total_amount,contact_info,shipping_address",
                "order_status": "eq.confirmed",
                "payment_method": "eq.cod",
                "order": "created_at.asc",
                "limit": "50",
            },
        )
    return await asyncio.to_thread(_fetch)


# ── Payout queue ──────────────────────────────────────────────────────────────
@app.get("/api/payouts/pending")
async def pending_payouts():
    def _fetch():
        return _supa_get(
            "store_payouts",
            {
                "select": "id,store_id,net_amount,commission_total,created_at",
                "status": "eq.pending",
                "order": "created_at.asc",
                "limit": "100",
            },
        )
    return await asyncio.to_thread(_fetch)


@app.post("/api/payouts/{payout_id}/mark-paid")
async def mark_payout_paid(payout_id: str):
    def _update():
        return _supa_patch(
            "store_payouts",
            {"id": payout_id},
            {"status": "paid", "paid_at": "now()"},
        )
    await asyncio.to_thread(_update)
    return {"payout_id": payout_id, "status": "paid"}


# ── Demand flow analysis (options-flow style) ─────────────────────────────────
# "Real" purchase: total_amount >= 1000 NPR (meaningful spend)
# "Lottery" purchase: total_amount < 1000 NPR (low-value, possibly test/noise)
# Mirrors real/lottery call separation from options-flow-analyzer skill

@app.get("/api/demand/flow")
async def demand_flow():
    """
    Per-product purchase flow with real vs lottery separation.
    Real order: total_amount >= 1000 NPR
    Lottery order: total_amount < 1000 NPR (noise threshold)
    Anomaly: product volume > 2 std-dev above 30-day baseline
    """
    def _fetch():
        items = _supa_get(
            "order_items",
            {
                "select": "product_id,product_name,quantity,total_price,orders(total_amount,order_status,created_at)",
                "orders.created_at": "gte.now()-interval '30 days'",
                "limit": "1000",
            },
        )

        LOTTERY_THRESHOLD = 1000  # NPR

        flow: dict = {}
        for item in items:
            order = item.get("orders") or {}
            pid = item.get("product_id") or "unknown"
            name = item.get("product_name", pid)
            order_total = float(order.get("total_amount", 0))
            qty = int(item.get("quantity", 1))
            item_total = float(item.get("total_price", 0))

            if pid not in flow:
                flow[pid] = {
                    "product_id": pid,
                    "name": name,
                    "real_orders": 0,
                    "lottery_orders": 0,
                    "real_qty": 0,
                    "lottery_qty": 0,
                    "real_revenue": 0.0,
                    "lottery_revenue": 0.0,
                }

            bucket = flow[pid]
            if order_total >= LOTTERY_THRESHOLD:
                bucket["real_orders"] += 1
                bucket["real_qty"] += qty
                bucket["real_revenue"] += item_total
            else:
                bucket["lottery_orders"] += 1
                bucket["lottery_qty"] += qty
                bucket["lottery_revenue"] += item_total

        result = []
        for pid, d in flow.items():
            total_orders = d["real_orders"] + d["lottery_orders"]
            if total_orders == 0:
                continue
            lottery_pct = round(d["lottery_orders"] / total_orders * 100, 1)
            real_ratio = d["real_orders"] / max(d["lottery_orders"], 1)
            sentiment = (
                "STRONG_DEMAND" if real_ratio >= 3
                else "HEALTHY" if real_ratio >= 1.5
                else "MIXED" if real_ratio >= 0.8
                else "LOTTERY_NOISE"
            )
            result.append({
                **d,
                "total_orders": total_orders,
                "lottery_pct": lottery_pct,
                "real_demand_ratio": round(real_ratio, 2),
                "sentiment": sentiment,
            })

        result.sort(key=lambda x: x["real_orders"], reverse=True)
        return {"items": result, "total_skus": len(result)}

    return await asyncio.to_thread(_fetch)


# ── Payment funnel ────────────────────────────────────────────────────────────
@app.get("/api/demand/funnel")
async def payment_funnel():
    """COD vs eSewa conversion + drop-off analysis."""
    def _fetch():
        orders = _supa_get(
            "orders",
            {
                "select": "payment_method,order_status,payment_status,total_amount",
                "created_at": "gte.now()-interval '30 days'",
                "limit": "500",
            },
        )
        funnel: dict = {}
        for o in orders:
            pm = o.get("payment_method", "unknown")
            ps = o.get("payment_status", "pending")
            os_ = o.get("order_status", "pending")
            amt = float(o.get("total_amount", 0))
            key = pm
            if key not in funnel:
                funnel[key] = {"method": pm, "placed": 0, "paid": 0, "completed": 0, "revenue": 0.0}
            funnel[key]["placed"] += 1
            funnel[key]["revenue"] += amt
            if ps == "paid":
                funnel[key]["paid"] += 1
            if os_ in ("completed", "delivered"):
                funnel[key]["completed"] += 1

        result = []
        for d in funnel.values():
            placed = d["placed"]
            d["conversion_rate"] = round(d["paid"] / placed * 100, 1) if placed else 0
            d["completion_rate"] = round(d["completed"] / placed * 100, 1) if placed else 0
            result.append(d)
        return result

    return await asyncio.to_thread(_fetch)


# ── Plugin registration ────────────────────────────────────────────────────────
class TamrakarCommercePlugin(AirflowPlugin):
    name = "tamrakar_commerce"

    fastapi_apps = [
        {
            "app": app,
            "url_prefix": "/tamrakar-commerce",
            "name": "Tamrakar Commerce",
        }
    ]

    external_views = [
        {
            "name": "Commerce Dashboard",
            "href": "tamrakar-commerce/ui",   # no leading slash
            "destination": "nav",
            "category": "browse",
            "url_route": "tamrakar-commerce",
            "icon": "/tamrakar-commerce/assets/icon.svg",
        }
    ]
