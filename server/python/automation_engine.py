"""
Arcadia Automation Engine - Motor de Automacao
Servico FastAPI que gerencia scheduler, event bus, workflow execution,
e fornece compute para o modulo de automacoes.

Porta padrao: 8005
"""

import os
import json
import time
import re
import threading
import hashlib
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from enum import Enum

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    import psycopg2
    import psycopg2.extras
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

app = FastAPI(
    title="Arcadia Automation Engine",
    description="Motor de Automacao - Scheduler, Event Bus, Workflow Executor",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("APP_URL", "http://localhost:5000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get("DATABASE_URL", "")


class EventType(str, Enum):
    RECORD_CREATED = "record.created"
    RECORD_UPDATED = "record.updated"
    RECORD_DELETED = "record.deleted"
    SCHEDULE_FIRED = "schedule.fired"
    WEBHOOK_RECEIVED = "webhook.received"
    THRESHOLD_REACHED = "threshold.reached"
    AGENT_COMPLETED = "agent.completed"
    MANUAL_TRIGGER = "manual.trigger"
    SYSTEM_EVENT = "system.event"


class WorkflowStepType(str, Enum):
    CONDITION = "condition"
    ACTION = "action"
    DELAY = "delay"
    LOOP = "loop"
    PARALLEL = "parallel"
    SQL_QUERY = "query"
    HTTP_REQUEST = "http"
    TRANSFORM = "transform"
    NOTIFY = "notify"
    SUB_WORKFLOW = "sub_workflow"
    SPLIT_BATCH = "split_batch"
    MERGE = "merge"
    ERROR_HANDLER = "error_handler"
    RETRY = "retry"
    SEND_EMAIL = "send_email"
    SEND_WHATSAPP = "send_whatsapp"
    UPDATE_RECORD = "update_record"
    CREATE_RECORD = "create_record"
    MANUS_TASK = "manus_task"


class CrmEventType(str, Enum):
    CONTACT_CREATED = "crm.contact.created"
    CONTACT_UPDATED = "crm.contact.updated"
    DEAL_CREATED = "crm.deal.created"
    DEAL_STAGE_CHANGED = "crm.deal.stage_changed"
    DEAL_WON = "crm.deal.won"
    DEAL_LOST = "crm.deal.lost"
    TICKET_CREATED = "crm.ticket.created"
    TICKET_RESOLVED = "crm.ticket.resolved"
    FORM_SUBMITTED = "crm.form.submitted"
    MESSAGE_RECEIVED = "crm.message.received"
    CONVERSATION_CLOSED = "crm.conversation.closed"
    CAMPAIGN_SENT = "crm.campaign.sent"
    CSAT_RECEIVED = "crm.csat.received"
    SLA_BREACHED = "crm.sla.breached"
    PROTOCOL_CREATED = "crm.protocol.created"


class CronExpression:
    def __init__(self, expr: str):
        self.expr = expr.strip()
        self.parts = self.expr.split()
        if len(self.parts) != 5:
            raise ValueError(f"Cron expression deve ter 5 partes: {expr}")

    def _match_part(self, part: str, value: int, max_val: int) -> bool:
        if part == "*":
            return True
        for item in part.split(","):
            if "/" in item:
                base, step = item.split("/")
                base_val = 0 if base == "*" else int(base)
                step_val = int(step)
                if (value - base_val) % step_val == 0 and value >= base_val:
                    return True
            elif "-" in item:
                low, high = item.split("-")
                if int(low) <= value <= int(high):
                    return True
            else:
                if int(item) == value:
                    return True
        return False

    def matches(self, dt: datetime) -> bool:
        return (
            self._match_part(self.parts[0], dt.minute, 59) and
            self._match_part(self.parts[1], dt.hour, 23) and
            self._match_part(self.parts[2], dt.day, 31) and
            self._match_part(self.parts[3], dt.month, 12) and
            self._match_part(self.parts[4], dt.weekday(), 6)
        )

    def next_run(self, from_dt: datetime = None) -> datetime:
        dt = from_dt or datetime.now()
        dt = dt.replace(second=0, microsecond=0) + timedelta(minutes=1)
        for _ in range(525960):
            if self.matches(dt):
                return dt
            dt += timedelta(minutes=1)
        return dt


class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Dict]] = defaultdict(list)
        self._event_history: List[Dict] = []
        self._max_history = 500

    def subscribe(self, event_type: str, handler_id: str, config: Dict = None):
        self._subscribers[event_type].append({
            "handler_id": handler_id,
            "config": config or {},
            "subscribed_at": datetime.now().isoformat(),
        })

    def unsubscribe(self, event_type: str, handler_id: str):
        self._subscribers[event_type] = [
            s for s in self._subscribers[event_type] if s["handler_id"] != handler_id
        ]

    def emit(self, event_type: str, payload: Dict = None) -> List[str]:
        event = {
            "type": event_type,
            "payload": payload or {},
            "timestamp": datetime.now().isoformat(),
            "id": hashlib.sha256(f"{event_type}:{time.time()}".encode()).hexdigest()[:16],
        }
        self._event_history.append(event)
        if len(self._event_history) > self._max_history:
            self._event_history = self._event_history[-self._max_history:]

        triggered = []
        for sub in self._subscribers.get(event_type, []):
            triggered.append(sub["handler_id"])
        for sub in self._subscribers.get("*", []):
            triggered.append(sub["handler_id"])
        return triggered

    def get_subscribers(self, event_type: str = None) -> Dict:
        if event_type:
            return {event_type: self._subscribers.get(event_type, [])}
        return dict(self._subscribers)

    def get_history(self, limit: int = 50, event_type: str = None) -> List[Dict]:
        history = self._event_history
        if event_type:
            history = [e for e in history if e["type"] == event_type]
        return history[-limit:]

    def stats(self) -> Dict:
        return {
            "total_event_types": len(self._subscribers),
            "total_subscribers": sum(len(v) for v in self._subscribers.values()),
            "history_size": len(self._event_history),
            "event_types": list(self._subscribers.keys()),
        }


class SchedulerEntry(BaseModel):
    id: str
    name: str
    cron: str
    automation_id: Optional[int] = None
    action: str = "trigger"
    config: Optional[Dict] = None
    is_active: bool = True
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    run_count: int = 0


class Scheduler:
    def __init__(self):
        self._entries: Dict[str, SchedulerEntry] = {}
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._check_interval = 30

    def add(self, entry: SchedulerEntry):
        try:
            cron = CronExpression(entry.cron)
            entry.next_run = cron.next_run().isoformat()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        self._entries[entry.id] = entry

    def remove(self, entry_id: str):
        self._entries.pop(entry_id, None)

    def get(self, entry_id: str) -> Optional[SchedulerEntry]:
        return self._entries.get(entry_id)

    def list_all(self) -> List[SchedulerEntry]:
        return list(self._entries.values())

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _run_loop(self):
        while self._running:
            now = datetime.now()
            for entry_id, entry in list(self._entries.items()):
                if not entry.is_active:
                    continue
                try:
                    cron = CronExpression(entry.cron)
                    if cron.matches(now):
                        entry.last_run = now.isoformat()
                        entry.run_count += 1
                        entry.next_run = cron.next_run(now).isoformat()
                        event_bus.emit(EventType.SCHEDULE_FIRED, {
                            "scheduler_id": entry.id,
                            "automation_id": entry.automation_id,
                            "name": entry.name,
                        })
                except Exception as e:
                    print(f"[Scheduler] Error checking {entry_id}: {e}")
            time.sleep(self._check_interval)

    def stats(self) -> Dict:
        active = sum(1 for e in self._entries.values() if e.is_active)
        return {
            "total_entries": len(self._entries),
            "active_entries": active,
            "is_running": self._running,
            "check_interval_seconds": self._check_interval,
        }


class WorkflowStep(BaseModel):
    id: str
    type: str
    config: Dict = {}
    on_success: Optional[str] = None
    on_failure: Optional[str] = None
    retry_count: int = 0
    retry_delay_seconds: int = 5
    error_branch: Optional[str] = None


class WorkflowDefinition(BaseModel):
    id: str
    name: str
    steps: List[WorkflowStep]
    trigger: Optional[str] = None
    variables: Optional[Dict] = None
    error_handler: Optional[str] = None
    max_execution_time: int = 300


class WorkflowExecution(BaseModel):
    workflow_id: str
    trigger_data: Optional[Dict] = None
    variables: Optional[Dict] = None


class XosAutomationTrigger(BaseModel):
    event_type: str
    tenant_id: Optional[int] = None
    payload: Dict = {}


class WorkflowExecutor:
    def __init__(self):
        self._workflows: Dict[str, WorkflowDefinition] = {}
        self._executions: List[Dict] = []
        self._max_executions = 200

    def register(self, workflow: WorkflowDefinition):
        self._workflows[workflow.id] = workflow

    def unregister(self, workflow_id: str):
        self._workflows.pop(workflow_id, None)

    def get(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        return self._workflows.get(workflow_id)

    def list_all(self) -> List[WorkflowDefinition]:
        return list(self._workflows.values())

    def execute(self, workflow_id: str, trigger_data: Dict = None, variables: Dict = None) -> Dict:
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' nao encontrado")

        exec_id = hashlib.sha256(f"{workflow_id}:{time.time()}".encode()).hexdigest()[:16]
        execution = {
            "id": exec_id,
            "workflow_id": workflow_id,
            "workflow_name": workflow.name,
            "status": "running",
            "started_at": datetime.now().isoformat(),
            "completed_at": None,
            "steps_completed": 0,
            "steps_total": len(workflow.steps),
            "results": [],
            "error": None,
            "variables": {**(workflow.variables or {}), **(variables or {}), **(trigger_data or {})},
        }

        # Build step index for branching
        step_map = {s.id: s for s in workflow.steps}
        step_queue = list(workflow.steps)

        try:
            i = 0
            while i < len(step_queue):
                step = step_queue[i]
                step_result, step_status = self._execute_step_with_retry(step, execution["variables"])

                execution["results"].append({
                    "step_id": step.id,
                    "type": step.type,
                    "status": step_status,
                    "result": step_result,
                    "executed_at": datetime.now().isoformat(),
                })
                execution["steps_completed"] += 1

                if isinstance(step_result, dict):
                    execution["variables"].update(step_result.get("output", {}))

                # Handle branching on condition results
                if step_status == "error" and step.error_branch and step.error_branch in step_map:
                    # Jump to error branch
                    step_queue = step_queue[:i+1] + [step_map[step.error_branch]] + step_queue[i+1:]
                elif step.type == WorkflowStepType.CONDITION:
                    condition_result = step_result.get("result", False) if isinstance(step_result, dict) else False
                    next_id = step.on_success if condition_result else step.on_failure
                    if next_id and next_id in step_map:
                        # Insert branch step next
                        step_queue = step_queue[:i+1] + [step_map[next_id]] + step_queue[i+1:]

                i += 1

            execution["status"] = "completed"
            execution["completed_at"] = datetime.now().isoformat()
        except Exception as e:
            execution["status"] = "error"
            execution["error"] = str(e)
            execution["completed_at"] = datetime.now().isoformat()

        self._executions.append(execution)
        if len(self._executions) > self._max_executions:
            self._executions = self._executions[-self._max_executions:]

        return execution

    def _execute_step_with_retry(self, step: WorkflowStep, variables: Dict):
        """Execute step with retry logic. Returns (result, status)."""
        max_attempts = max(1, step.retry_count + 1)
        last_error = None
        for attempt in range(max_attempts):
            try:
                result = self._execute_step(step, variables)
                if isinstance(result, dict) and "error" in result and max_attempts > 1:
                    last_error = result["error"]
                    if attempt < max_attempts - 1:
                        time.sleep(min(step.retry_delay_seconds * (attempt + 1), 60))
                    continue
                return result, "completed"
            except Exception as e:
                last_error = str(e)
                if attempt < max_attempts - 1:
                    time.sleep(min(step.retry_delay_seconds * (attempt + 1), 60))
        return {"error": last_error, "attempts": max_attempts}, "error"

    def _execute_step(self, step: WorkflowStep, variables: Dict) -> Any:
        stype = step.type
        if stype == WorkflowStepType.CONDITION:
            return self._exec_condition(step.config, variables)
        elif stype == WorkflowStepType.ACTION:
            return self._exec_action(step.config, variables)
        elif stype == WorkflowStepType.DELAY:
            delay_seconds = step.config.get("seconds", 1)
            time.sleep(min(delay_seconds, 300))
            return {"delayed": delay_seconds}
        elif stype == WorkflowStepType.SQL_QUERY:
            return self._exec_query(step.config, variables)
        elif stype == WorkflowStepType.HTTP_REQUEST:
            return self._exec_http(step.config, variables)
        elif stype == WorkflowStepType.TRANSFORM:
            return self._exec_transform(step.config, variables)
        elif stype == WorkflowStepType.NOTIFY:
            return self._exec_notify(step.config, variables)
        elif stype == WorkflowStepType.SUB_WORKFLOW:
            return self._exec_sub_workflow(step.config, variables)
        elif stype == WorkflowStepType.SPLIT_BATCH:
            return self._exec_split_batch(step.config, variables)
        elif stype == WorkflowStepType.SEND_EMAIL:
            return self._exec_send_email(step.config, variables)
        elif stype == WorkflowStepType.SEND_WHATSAPP:
            return self._exec_send_whatsapp(step.config, variables)
        elif stype == WorkflowStepType.UPDATE_RECORD:
            return self._exec_update_record(step.config, variables)
        elif stype == WorkflowStepType.CREATE_RECORD:
            return self._exec_create_record(step.config, variables)
        elif stype == WorkflowStepType.MANUS_TASK:
            return self._exec_manus_task(step.config, variables)
        elif stype == WorkflowStepType.LOOP:
            return self._exec_loop(step.config, variables)
        else:
            return {"type": stype, "status": "executed"}

    def _exec_condition(self, config: Dict, variables: Dict) -> Dict:
        field = config.get("field", "")
        operator = config.get("operator", "==")
        value = config.get("value")
        actual = variables.get(field)
        ops = {
            "==": lambda a, b: a == b,
            "!=": lambda a, b: a != b,
            ">": lambda a, b: float(a) > float(b),
            "<": lambda a, b: float(a) < float(b),
            ">=": lambda a, b: float(a) >= float(b),
            "<=": lambda a, b: float(a) <= float(b),
            "contains": lambda a, b: str(b) in str(a),
            "exists": lambda a, b: a is not None,
        }
        op_fn = ops.get(operator, ops["=="])
        try:
            result = op_fn(actual, value)
        except:
            result = False
        return {"condition": True, "result": result, "field": field, "operator": operator}

    def _exec_action(self, config: Dict, variables: Dict) -> Dict:
        action_type = config.get("type", "log")
        if action_type == "log":
            return {"action": "log", "message": config.get("message", "")}
        elif action_type == "set_variable":
            key = config.get("key", "")
            val = config.get("value", "")
            return {"action": "set_variable", "output": {key: val}}
        elif action_type == "emit_event":
            event_type = config.get("event_type", "custom.event")
            event_bus.emit(event_type, config.get("payload", {}))
            return {"action": "emit_event", "event_type": event_type}
        return {"action": action_type, "status": "executed"}

    def _exec_query(self, config: Dict, variables: Dict) -> Dict:
        if not HAS_PSYCOPG2 or not DATABASE_URL:
            return {"error": "Database nao disponivel"}
        sql = config.get("sql", "")
        if not sql.strip().upper().startswith("SELECT"):
            return {"error": "Somente SELECT permitido"}
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.set_session(readonly=True, autocommit=True)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(f"SET statement_timeout = '10000';")
            cur.execute(sql)
            rows = cur.fetchall()
            conn.close()
            data = [dict(r) for r in rows[:100]]
            return {"query": "executed", "row_count": len(data), "output": {"query_result": data}}
        except Exception as e:
            return {"error": f"Query falhou: {str(e)}"}

    def _exec_http(self, config: Dict, variables: Dict) -> Dict:
        import urllib.request
        url = config.get("url", "")
        method = config.get("method", "GET").upper()
        if not url:
            return {"error": "URL nao informada"}
        try:
            req = urllib.request.Request(url, method=method)
            req.add_header("Content-Type", "application/json")
            if config.get("body"):
                body = json.dumps(config["body"]).encode()
                req.data = body
            with urllib.request.urlopen(req, timeout=10) as resp:
                return {"status": resp.status, "output": {"http_response": resp.read().decode()[:5000]}}
        except Exception as e:
            return {"error": f"HTTP falhou: {str(e)}"}

    def _exec_transform(self, config: Dict, variables: Dict) -> Dict:
        operation = config.get("operation", "map")
        source = config.get("source", "")
        data = variables.get(source, [])
        if operation == "count":
            return {"output": {"count": len(data) if isinstance(data, list) else 1}}
        elif operation == "sum" and isinstance(data, list):
            field = config.get("field", "")
            total = sum(float(item.get(field, 0)) for item in data if isinstance(item, dict))
            return {"output": {"sum": total}}
        elif operation == "filter" and isinstance(data, list):
            field = config.get("field", "")
            value = config.get("value")
            filtered = [item for item in data if isinstance(item, dict) and item.get(field) == value]
            return {"output": {"filtered": filtered}}
        elif operation == "map" and isinstance(data, list):
            field = config.get("field", "")
            mapped = [item.get(field) for item in data if isinstance(item, dict)]
            return {"output": {"mapped": mapped}}
        elif operation == "sort" and isinstance(data, list):
            field = config.get("field", "")
            reverse = config.get("reverse", False)
            sorted_data = sorted(data, key=lambda x: x.get(field, 0) if isinstance(x, dict) else 0, reverse=reverse)
            return {"output": {"sorted": sorted_data}}
        elif operation == "unique" and isinstance(data, list):
            field = config.get("field", "")
            seen = set()
            unique = []
            for item in data:
                key = item.get(field) if isinstance(item, dict) else item
                if key not in seen:
                    seen.add(key)
                    unique.append(item)
            return {"output": {"unique": unique}}
        return {"output": {}}

    def _exec_notify(self, config: Dict, variables: Dict) -> Dict:
        message = self._interpolate(config.get("message", ""), variables)
        channel = config.get("channel", "system")
        # Emit as system event so Node.js can handle delivery
        event_bus.emit("system.notification", {
            "message": message,
            "channel": channel,
            "title": config.get("title", "Automação"),
            "level": config.get("level", "info"),
        })
        return {"notified": True, "message": message, "channel": channel}

    def _exec_sub_workflow(self, config: Dict, variables: Dict) -> Dict:
        sub_id = config.get("workflow_id", "")
        if not sub_id or sub_id not in self._workflows:
            return {"error": f"Sub-workflow '{sub_id}' nao encontrado"}
        # Pass current variables merged with config overrides
        sub_vars = {**variables, **config.get("variables", {})}
        result = self.execute(sub_id, variables=sub_vars)
        return {"output": {"sub_workflow_result": result.get("status"), "sub_workflow_vars": result.get("variables", {})}}

    def _exec_split_batch(self, config: Dict, variables: Dict) -> Dict:
        source = config.get("source", "")
        batch_size = config.get("batch_size", 10)
        data = variables.get(source, [])
        if not isinstance(data, list):
            return {"error": f"Source '{source}' nao e uma lista"}
        batches = [data[i:i+batch_size] for i in range(0, len(data), batch_size)]
        return {"output": {"batches": batches, "batch_count": len(batches), "total_items": len(data)}}

    def _exec_loop(self, config: Dict, variables: Dict) -> Dict:
        source = config.get("source", "")
        max_iterations = min(config.get("max_iterations", 100), 1000)
        data = variables.get(source, [])
        if not isinstance(data, list):
            return {"error": f"Source '{source}' nao e uma lista"}
        results = []
        for i, item in enumerate(data[:max_iterations]):
            results.append({"index": i, "item": item})
        return {"output": {"loop_results": results, "iterations": len(results)}}

    def _exec_send_email(self, config: Dict, variables: Dict) -> Dict:
        to = self._interpolate(config.get("to", ""), variables)
        subject = self._interpolate(config.get("subject", ""), variables)
        body = self._interpolate(config.get("body", ""), variables)
        # Emit event for Node.js email service to handle
        event_bus.emit("system.send_email", {"to": to, "subject": subject, "body": body})
        return {"output": {"email_queued": True, "to": to, "subject": subject}}

    def _exec_send_whatsapp(self, config: Dict, variables: Dict) -> Dict:
        to = self._interpolate(config.get("to", ""), variables)
        message = self._interpolate(config.get("message", ""), variables)
        # Emit event for Node.js WhatsApp service to handle
        event_bus.emit("system.send_whatsapp", {"to": to, "message": message, "channel_id": config.get("channel_id")})
        return {"output": {"whatsapp_queued": True, "to": to}}

    def _exec_update_record(self, config: Dict, variables: Dict) -> Dict:
        if not HAS_PSYCOPG2 or not DATABASE_URL:
            return {"error": "Database nao disponivel"}
        table = config.get("table", "")
        record_id = config.get("id") or variables.get("id")
        fields = config.get("fields", {})
        if not table or not record_id or not fields:
            return {"error": "table, id e fields sao obrigatorios"}
        # Resolve interpolated values
        resolved = {k: self._interpolate(str(v), variables) for k, v in fields.items()}
        set_clauses = ", ".join([f"{k} = %s" for k in resolved.keys()])
        values = list(resolved.values()) + [record_id]
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            cur.execute(f"UPDATE {table} SET {set_clauses}, updated_at = NOW() WHERE id = %s RETURNING id", values)
            conn.commit()
            conn.close()
            return {"output": {"updated": True, "table": table, "id": record_id}}
        except Exception as e:
            return {"error": f"Update falhou: {str(e)}"}

    def _exec_create_record(self, config: Dict, variables: Dict) -> Dict:
        if not HAS_PSYCOPG2 or not DATABASE_URL:
            return {"error": "Database nao disponivel"}
        table = config.get("table", "")
        fields = config.get("fields", {})
        if not table or not fields:
            return {"error": "table e fields sao obrigatorios"}
        resolved = {k: self._interpolate(str(v), variables) for k, v in fields.items()}
        cols = ", ".join(resolved.keys())
        placeholders = ", ".join(["%s"] * len(resolved))
        values = list(resolved.values())
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            cur.execute(f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) RETURNING id", values)
            new_id = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return {"output": {"created": True, "table": table, "new_id": new_id}}
        except Exception as e:
            return {"error": f"Insert falhou: {str(e)}"}

    def _exec_manus_task(self, config: Dict, variables: Dict) -> Dict:
        prompt = self._interpolate(config.get("prompt", ""), variables)
        # Emit event — Node.js Manus service will handle execution
        event_bus.emit("system.manus_task", {
            "prompt": prompt,
            "user_id": config.get("user_id") or variables.get("user_id"),
            "automation_context": variables,
        })
        return {"output": {"manus_task_queued": True, "prompt": prompt[:200]}}

    def _interpolate(self, template: str, variables: Dict) -> str:
        """Replace {{variable}} placeholders with values from variables dict."""
        import re
        def replace(match):
            key = match.group(1).strip()
            val = variables.get(key, match.group(0))
            return str(val) if val is not None else ""
        return re.sub(r"\{\{(.+?)\}\}", replace, template)

    def get_executions(self, workflow_id: str = None, limit: int = 50) -> List[Dict]:
        execs = self._executions
        if workflow_id:
            execs = [e for e in execs if e["workflow_id"] == workflow_id]
        return execs[-limit:]

    def stats(self) -> Dict:
        total = len(self._executions)
        completed = sum(1 for e in self._executions if e["status"] == "completed")
        errors = sum(1 for e in self._executions if e["status"] == "error")
        return {
            "total_workflows": len(self._workflows),
            "total_executions": total,
            "completed": completed,
            "errors": errors,
            "success_rate": round(completed / total * 100, 1) if total > 0 else 0,
        }


event_bus = EventBus()
scheduler = Scheduler()
workflow_executor = WorkflowExecutor()


# ==================== ENDPOINTS ====================

@app.get("/health")
async def health_check():
    db_ok = False
    if HAS_PSYCOPG2 and DATABASE_URL:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.close()
            db_ok = True
        except:
            pass
    return {
        "status": "ok",
        "service": "automation-engine",
        "version": "1.0.0",
        "database": "connected" if db_ok else "disconnected",
        "scheduler": scheduler.stats(),
        "event_bus": event_bus.stats(),
        "workflows": workflow_executor.stats(),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/version")
async def version():
    return {
        "name": "Arcadia Automation Engine",
        "version": "2.0.0",
        "capabilities": [
            "scheduler", "event_bus", "workflow_executor", "cron",
            "http_actions", "sql_queries", "sub_workflows", "loop",
            "split_batch", "retry", "error_branch", "send_email",
            "send_whatsapp", "update_record", "create_record",
            "manus_task", "crm_events", "variable_interpolation",
        ],
    }


@app.get("/metrics")
async def metrics():
    return {
        "scheduler": scheduler.stats(),
        "event_bus": event_bus.stats(),
        "workflows": workflow_executor.stats(),
    }


# --- Scheduler endpoints ---

@app.get("/scheduler/entries")
async def list_scheduler_entries():
    return {"entries": [e.dict() for e in scheduler.list_all()]}


@app.post("/scheduler/entries")
async def add_scheduler_entry(entry: SchedulerEntry):
    scheduler.add(entry)
    return {"success": True, "entry": entry.dict()}


@app.delete("/scheduler/entries/{entry_id}")
async def remove_scheduler_entry(entry_id: str):
    scheduler.remove(entry_id)
    return {"success": True}


@app.post("/scheduler/start")
async def start_scheduler():
    scheduler.start()
    return {"success": True, "message": "Scheduler iniciado"}


@app.post("/scheduler/stop")
async def stop_scheduler():
    scheduler.stop()
    return {"success": True, "message": "Scheduler parado"}


@app.get("/scheduler/stats")
async def scheduler_stats():
    return scheduler.stats()


# --- Event Bus endpoints ---

@app.post("/events/emit")
async def emit_event(event_type: str, payload: Dict = None):
    triggered = event_bus.emit(event_type, payload or {})
    return {"success": True, "event_type": event_type, "triggered_handlers": triggered}


@app.post("/events/subscribe")
async def subscribe_event(event_type: str, handler_id: str, config: Dict = None):
    event_bus.subscribe(event_type, handler_id, config)
    return {"success": True, "event_type": event_type, "handler_id": handler_id}


@app.post("/events/unsubscribe")
async def unsubscribe_event(event_type: str, handler_id: str):
    event_bus.unsubscribe(event_type, handler_id)
    return {"success": True}


@app.get("/events/subscribers")
async def list_subscribers(event_type: Optional[str] = None):
    return event_bus.get_subscribers(event_type)


@app.get("/events/history")
async def event_history(limit: int = 50, event_type: Optional[str] = None):
    return {"events": event_bus.get_history(limit, event_type)}


@app.get("/events/stats")
async def event_stats():
    return event_bus.stats()


@app.get("/events/types")
async def event_types():
    return {
        "types": [e.value for e in EventType],
        "crm_types": [e.value for e in CrmEventType],
    }


# --- XOS CRM Automation trigger ---

@app.post("/xos/trigger")
async def trigger_xos_automation(trigger: XosAutomationTrigger, background_tasks: BackgroundTasks):
    """
    Receives CRM events (contact_created, deal_stage_changed, etc.)
    and emits them to the event bus so active xos_automations can react.
    Also calls the Node.js XOS webhook so database-persisted automations execute.
    """
    full_payload = {"tenant_id": trigger.tenant_id, **trigger.payload}
    triggered = event_bus.emit(trigger.event_type, full_payload)

    # Also emit to generic record.created for wildcard listeners
    if trigger.event_type.startswith("crm."):
        event_bus.emit(EventType.RECORD_CREATED, {
            "entity_type": trigger.event_type.replace("crm.", ""),
            **full_payload,
        })

    # Forward to Node.js XOS automations engine (fire DB-persisted automations)
    background_tasks.add_task(_call_xos_webhook, trigger.event_type, full_payload)

    return {
        "success": True,
        "event_type": trigger.event_type,
        "triggered_handlers": triggered,
        "timestamp": datetime.now().isoformat(),
    }


async def _call_xos_webhook(event_type: str, payload: Dict):
    """Non-blocking call to Node.js to fire DB-persisted XOS automations."""
    import urllib.request
    node_port = os.environ.get("PORT", "5000")
    url = f"http://localhost:{node_port}/api/xos/automations/webhook/crm-event"
    try:
        body = json.dumps({"event_type": event_type, "payload": payload}).encode()
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("X-Internal-Call", "automation-engine")
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"[XOS Webhook] Nao foi possivel notificar Node.js: {e}")


@app.get("/xos/event-types")
async def xos_event_types():
    return {"crm_event_types": [e.value for e in CrmEventType]}


@app.post("/cron/validate")
async def validate_cron_post(body: Dict):
    expression = body.get("expression", "")
    try:
        cron = CronExpression(expression)
        next_runs = []
        dt = datetime.now()
        for _ in range(5):
            dt = cron.next_run(dt)
            next_runs.append(dt.isoformat())
            dt += timedelta(minutes=1)
        return {"valid": True, "expression": expression, "next_runs": next_runs}
    except ValueError as e:
        return {"valid": False, "expression": expression, "error": str(e)}


# --- Workflow endpoints ---

@app.post("/workflows/register")
async def register_workflow(workflow: WorkflowDefinition):
    workflow_executor.register(workflow)
    return {"success": True, "workflow_id": workflow.id}


@app.delete("/workflows/{workflow_id}")
async def unregister_workflow(workflow_id: str):
    workflow_executor.unregister(workflow_id)
    return {"success": True}


@app.get("/workflows")
async def list_workflows():
    return {"workflows": [w.dict() for w in workflow_executor.list_all()]}


@app.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    w = workflow_executor.get(workflow_id)
    if not w:
        raise HTTPException(status_code=404, detail="Workflow nao encontrado")
    return w.dict()


@app.post("/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, execution: WorkflowExecution = None):
    trigger_data = execution.trigger_data if execution else None
    variables = execution.variables if execution else None
    result = workflow_executor.execute(workflow_id, trigger_data, variables)
    return result


@app.get("/workflows/{workflow_id}/executions")
async def workflow_executions(workflow_id: str, limit: int = 50):
    return {"executions": workflow_executor.get_executions(workflow_id, limit)}


@app.get("/executions")
async def all_executions(limit: int = 50):
    return {"executions": workflow_executor.get_executions(limit=limit)}


@app.get("/workflows/stats")
async def workflow_stats_endpoint():
    return workflow_executor.stats()


# --- Cron helper ---

@app.post("/cron/validate")
async def validate_cron(expression: str):
    try:
        cron = CronExpression(expression)
        next_runs = []
        dt = datetime.now()
        for _ in range(5):
            dt = cron.next_run(dt)
            next_runs.append(dt.isoformat())
            dt += timedelta(minutes=1)
        return {"valid": True, "expression": expression, "next_runs": next_runs}
    except ValueError as e:
        return {"valid": False, "expression": expression, "error": str(e)}


@app.on_event("startup")
async def startup():
    scheduler.start()
    print("[Automation Engine] Scheduler iniciado automaticamente")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AUTOMATION_PORT", os.environ.get("AUTOMATION_ENGINE_PORT", "8005")))
    print(f"[Automation Engine] Iniciando na porta {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
