import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, project_id: str, ws: WebSocket):
        await ws.accept()
        if project_id not in self._rooms:
            self._rooms[project_id] = []
        self._rooms[project_id].append(ws)

    def disconnect(self, project_id: str, ws: WebSocket):
        if project_id in self._rooms:
            self._rooms[project_id] = [w for w in self._rooms[project_id] if w != ws]
            if not self._rooms[project_id]:
                del self._rooms[project_id]

    async def broadcast(self, project_id: str, message: dict[str, Any], exclude: WebSocket | None = None):
        if project_id not in self._rooms:
            return
        data = json.dumps(message, ensure_ascii=False)
        for ws in self._rooms[project_id]:
            if ws != exclude:
                try:
                    await ws.send_text(data)
                except Exception:
                    pass

    def get_online_count(self, project_id: str) -> int:
        return len(self._rooms.get(project_id, []))


manager = ConnectionManager()
