"""
Tamrakar Commerce — Order Processing Pipeline
Runs every 15 min. Handles:
  1. Stale pending_payment orders → cancel after 30 min
  2. COD confirmed → alert store (stub: log + future webhook)
  3. Payout settlement summary — daily at 22:00 NPT
  4. Demand flow anomaly detection — daily at 06:00 NPT
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

import requests
from airflow.decorators import dag, task
from airflow.timetables.simple import DeltaTimetable

log = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("TAMRAKAR_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("TAMRAKAR_SUPABASE_SERVICE_KEY", "")

def _headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

def _get(path, params=None):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=_headers(), params=params, timeout=15)
    r.raise_for_status()
    return r.json()

def _patch(path, match, body):
    params = {k: f"eq.{v}" for k, v in match.items()}
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/{path}", headers=_headers(), params=params, json=body, timeout=15)
    r.raise_for_status()
    return r.json()


# ── DAG 1: Order housekeeping — every 15 min ──────────────────────────────────
@dag(
    dag_id="tamrakar_order_housekeeping",
    schedule=timedelta(minutes=15),
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["tamrakar", "commerce", "orders"],
    default_args={"retries": 2, "retry_delay": timedelta(minutes=2)},
    doc_md="""
    **Order housekeeping** — runs every 15 min.
    - Cancels stale `pending_payment` orders older than 30 min (eSewa abandoned)
    - Logs newly confirmed COD orders for store notification
    """,
)
def order_housekeeping():

    @task
    def cancel_stale_esewa() -> dict:
        """Cancel eSewa orders stuck in pending_payment > 30 min."""
        rows = _get(
            "orders",
            {
                "select": "id,total_amount,created_at",
                "order_status": "eq.pending_payment",
                "payment_method": "eq.esewa",
                "created_at": "lte.now()-interval '30 minutes'",
                "limit": "100",
            },
        )
        cancelled = []
        for o in rows:
            _patch("orders", {"id": o["id"]}, {"order_status": "cancelled", "payment_status": "failed"})
            cancelled.append(o["id"])
            log.info("Cancelled stale eSewa order %s (NPR %s)", o["id"][:8], o["total_amount"])
        return {"cancelled": len(cancelled), "ids": cancelled}

    @task
    def alert_new_cod_orders() -> dict:
        """Log confirmed COD orders placed in last 15 min (hook for store webhook)."""
        rows = _get(
            "orders",
            {
                "select": "id,total_amount,contact_info,shipping_address,created_at",
                "order_status": "eq.confirmed",
                "payment_method": "eq.cod",
                "created_at": "gte.now()-interval '15 minutes'",
                "limit": "50",
            },
        )
        for o in rows:
            contact = o.get("contact_info", {})
            shipping = o.get("shipping_address", {})
            log.info(
                "NEW COD ORDER %s | NPR %s | %s %s | %s",
                o["id"][:8],
                o["total_amount"],
                contact.get("name", ""),
                contact.get("phone", ""),
                shipping.get("city", ""),
            )
            # TODO: POST to store webhook / send SMS via Sparrow
        return {"new_cod": len(rows)}

    cancel_stale_esewa() >> alert_new_cod_orders()


order_housekeeping()


# ── DAG 2: Payout settlement summary — daily 22:00 NPT (16:15 UTC) ────────────
@dag(
    dag_id="tamrakar_payout_settlement",
    schedule="15 16 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["tamrakar", "commerce", "payouts"],
    default_args={"retries": 1, "retry_delay": timedelta(minutes=5)},
    doc_md="""
    **Daily payout summary** at 22:00 NPT.
    Summarises pending payouts per store and logs settlement report.
    """,
)
def payout_settlement():

    @task
    def summarise_pending_payouts() -> dict:
        rows = _get(
            "store_payouts",
            {
                "select": "store_id,net_amount,commission_total",
                "status": "eq.pending",
                "limit": "500",
            },
        )
        by_store: dict = {}
        for p in rows:
            sid = p["store_id"]
            if sid not in by_store:
                by_store[sid] = {"store_id": sid, "net": 0.0, "commission": 0.0, "count": 0}
            by_store[sid]["net"] += float(p["net_amount"])
            by_store[sid]["commission"] += float(p["commission_total"])
            by_store[sid]["count"] += 1

        total_net = sum(v["net"] for v in by_store.values())
        total_commission = sum(v["commission"] for v in by_store.values())

        log.info("=== DAILY PAYOUT SUMMARY ===")
        log.info("Stores with pending payouts: %d", len(by_store))
        log.info("Total net to stores: NPR %.2f", total_net)
        log.info("Total platform commission: NPR %.2f", total_commission)
        for s in sorted(by_store.values(), key=lambda x: x["net"], reverse=True):
            log.info("  Store %s: NPR %.2f net (%d payouts)", s["store_id"][:8], s["net"], s["count"])

        return {
            "stores": len(by_store),
            "total_net": total_net,
            "total_commission": total_commission,
            "details": list(by_store.values()),
        }

    @task
    def check_overdue_payouts(summary: dict) -> dict:
        """Flag payouts pending > 3 days."""
        rows = _get(
            "store_payouts",
            {
                "select": "id,store_id,net_amount,created_at",
                "status": "eq.pending",
                "created_at": "lte.now()-interval '3 days'",
                "limit": "100",
            },
        )
        if rows:
            log.warning("OVERDUE PAYOUTS: %d payouts pending > 3 days!", len(rows))
            for p in rows:
                log.warning("  Payout %s — Store %s — NPR %s — since %s",
                    p["id"][:8], p["store_id"][:8], p["net_amount"], p["created_at"][:10])
        return {"overdue": len(rows)}

    summary = summarise_pending_payouts()
    check_overdue_payouts(summary)


payout_settlement()


# ── DAG 3: Demand flow anomaly detection — daily 06:00 NPT (00:15 UTC) ────────
@dag(
    dag_id="tamrakar_demand_flow_analysis",
    schedule="15 0 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["tamrakar", "commerce", "analytics"],
    default_args={"retries": 1, "retry_delay": timedelta(minutes=5)},
    doc_md="""
    **Daily demand flow analysis** at 06:00 NPT.
    Options-flow style: separates real purchases (≥1000 NPR) from lottery noise (<1000 NPR).
    Flags anomalies: products with >2x yesterday's real-order volume.
    """,
)
def demand_flow_analysis():

    LOTTERY_THRESHOLD = 1000  # NPR — same as plugin API

    @task
    def fetch_order_items_today() -> list:
        return _get(
            "order_items",
            {
                "select": "product_id,product_name,quantity,total_price,orders(total_amount,order_status,payment_method,created_at)",
                "orders.created_at": "gte.now()-interval '24 hours'",
                "limit": "2000",
            },
        )

    @task
    def fetch_order_items_yesterday() -> list:
        return _get(
            "order_items",
            {
                "select": "product_id,product_name,quantity,total_price,orders(total_amount,created_at)",
                "orders.created_at": "gte.now()-interval '48 hours'",
                "orders.created_at2": "lte.now()-interval '24 hours'",
                "limit": "2000",
            },
        )

    @task
    def analyse_demand(today_items: list, yesterday_items: list) -> dict:
        """
        Real vs lottery separation — mirrors options-flow-analyzer methodology:
        - Real order: order total >= LOTTERY_THRESHOLD
        - Lottery order: cheap/low-value, treat as noise
        - Anomaly: today real_orders > 2x yesterday real_orders for same SKU
        """
        def _bucket(items):
            flow: dict = {}
            for item in items:
                order = item.get("orders") or {}
                pid = item.get("product_id") or "unknown"
                name = item.get("product_name", pid)
                order_total = float(order.get("total_amount", 0))
                qty = int(item.get("quantity", 1))

                if pid not in flow:
                    flow[pid] = {"name": name, "real": 0, "lottery": 0, "real_qty": 0}

                if order_total >= LOTTERY_THRESHOLD:
                    flow[pid]["real"] += 1
                    flow[pid]["real_qty"] += qty
                else:
                    flow[pid]["lottery"] += 1
            return flow

        today = _bucket(today_items)
        yesterday = _bucket(yesterday_items)

        anomalies = []
        report_lines = []

        for pid, td in sorted(today.items(), key=lambda x: x[1]["real"], reverse=True):
            yd = yesterday.get(pid, {"real": 0, "lottery": 0})
            total = td["real"] + td["lottery"]
            lottery_pct = round(td["lottery"] / max(total, 1) * 100, 1)
            ratio = td["real"] / max(yd["real"], 1)
            sentiment = (
                "STRONG_DEMAND" if td["real"] >= 5 and ratio >= 2
                else "HEALTHY" if td["real"] >= 2
                else "LOTTERY_NOISE" if lottery_pct >= 70
                else "LOW"
            )

            line = (
                f"{td['name'][:30]:<30} | Real: {td['real']:>3} | "
                f"Lottery: {td['lottery']:>3} ({lottery_pct}%) | "
                f"vs Yesterday: {yd['real']:>3} ({ratio:.1f}x) | {sentiment}"
            )
            report_lines.append(line)

            if ratio >= 2 and td["real"] >= 3:
                anomalies.append({
                    "product_id": pid,
                    "name": td["name"],
                    "today_real": td["real"],
                    "yesterday_real": yd["real"],
                    "ratio": round(ratio, 1),
                    "lottery_pct": lottery_pct,
                })

        log.info("=== DEMAND FLOW ANALYSIS (last 24h) ===")
        log.info("Lottery threshold: NPR %d", LOTTERY_THRESHOLD)
        log.info("Total SKUs active: %d", len(today))
        for line in report_lines[:20]:
            log.info(line)

        if anomalies:
            log.warning("=== DEMAND ANOMALIES ===")
            for a in anomalies:
                log.warning(
                    "ANOMALY: %s — %dx real orders vs yesterday (%d today / %d yesterday) | Lottery: %s%%",
                    a["name"], a["ratio"], a["today_real"], a["yesterday_real"], a["lottery_pct"],
                )

        return {"skus_active": len(today), "anomalies": len(anomalies), "anomaly_detail": anomalies}

    today = fetch_order_items_today()
    yesterday = fetch_order_items_yesterday()
    analyse_demand(today, yesterday)


demand_flow_analysis()
