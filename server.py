#!/usr/bin/env python3
"""EcoRanking · servidor local (solo biblioteca estándar de Python 3.9+).

    python3 server.py                 # http://127.0.0.1:8000
    python3 server.py --port 8080 --host 0.0.0.0

Sirve la app y expone la API que usa app.js, leyendo de DOS bases de datos:
    db/directivos.db   → administradores, directores y salones
    db/estudiantes.db  → estudiantes y su puntaje
"""
import argparse
import json
import mimetypes
import os
import secrets
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "db"))
import init_db  # noqa: E402

STATIC = {  # lista blanca: las .db y el código del servidor nunca se sirven
    "/": "ecoranking.html", "/ecoranking.html": "ecoranking.html", "/index.html": "index.html",
    "/app.js": "app.js", "/app.css": "app.css", "/css/style.css": "css/style.css",
}
SESSION_TTL = 8 * 3600
SESSIONS = {}  # token → {id, rol, exp}


def db_dir():
    return sqlite3.connect(init_db.DIRECTIVOS_DB)


def db_est():
    con = sqlite3.connect(init_db.ESTUDIANTES_DB)
    con.execute("PRAGMA foreign_keys = ON")
    return con


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Lecturas (combinan las dos bases en Python) ──────────────────────────────
def salones_map():
    con = db_dir()
    try:
        rows = con.execute(
            "SELECT s.id, s.nombre, s.grado, s.categoria, s.activo, d.nombre "
            "FROM salones s LEFT JOIN directivos d ON d.id = s.director_id ORDER BY s.grado, s.nombre"
        ).fetchall()
    finally:
        con.close()
    return {r[0]: dict(id=r[0], nombre=r[1], grado=r[2], categoria=r[3],
                       activo=bool(r[4]), director_nombre=r[5] or "") for r in rows}


def get_salones():
    sal = salones_map()
    con = db_est()
    try:
        cnt = dict(con.execute(
            "SELECT salon_id, COUNT(*) FROM puntos WHERE tipo='reciclaje' GROUP BY salon_id"))
    finally:
        con.close()
    return [{**s, "total_eventos": cnt.get(s["id"], 0)} for s in sal.values()]


def get_usuarios():
    sal = salones_map()
    out = []
    con = db_dir()
    try:
        rows = con.execute(
            "SELECT d.id, d.nombre, d.email, d.rol, d.activo, s.id "
            "FROM directivos d LEFT JOIN salones s ON s.director_id = d.id").fetchall()
    finally:
        con.close()
    for i, nombre, email, rol, activo, sid in rows:
        s = sal.get(sid, {})
        out.append(dict(id=i, nombre=nombre, email=email, rol=rol, activo=bool(activo),
                        salon=s.get("nombre", ""), grado=s.get("grado", ""),
                        categoria=s.get("categoria", "")))
    con = db_est()
    try:
        rows = con.execute("SELECT id, nombre, email, activo, salon_id FROM estudiantes").fetchall()
    finally:
        con.close()
    for i, nombre, email, activo, sid in rows:
        s = sal.get(sid, {})
        out.append(dict(id=i, nombre=nombre, email=email, rol="estudiante", activo=bool(activo),
                        salon=s.get("nombre", ""), grado=s.get("grado", ""),
                        categoria=s.get("categoria", "")))
    return out


def get_puntos():
    sal = salones_map()
    con = db_est()
    try:
        rows = con.execute(
            "SELECT p.id, p.tipo, p.salon_id, p.estudiante_id, e.nombre, p.material, p.puntos,"
            " p.descripcion, p.registrado_por, p.fecha "
            "FROM puntos p LEFT JOIN estudiantes e ON e.id = p.estudiante_id").fetchall()
    finally:
        con.close()
    return [_punto(r, sal) for r in rows]


def _punto(r, sal):
    pid, tipo, sid, eid, enombre, mat, pts, desc, por, fecha = r
    s = sal.get(sid, {})
    return dict(id=pid, tipo=tipo, salon_id=sid, salon_nombre=s.get("nombre", ""),
                grado=s.get("grado", ""), estudiante_id=eid or "",
                estudiante_nombre=enombre or f"Salón {s.get('nombre', '')} (colectivo)",
                material=mat, puntos=pts, descripcion=desc, registrado_por=por, fecha=fecha)


# ── Escritura: penalizar / bonificar (solo administrador) ────────────────────
def crear_ajuste(body, admin_id):
    tipo = body.get("tipo")
    if tipo not in ("penalizacion", "bonificacion"):
        raise ValueError("Tipo de ajuste inválido")
    try:
        pts = abs(int(body.get("puntos")))
    except (TypeError, ValueError):
        raise ValueError("Puntos inválidos")
    if pts == 0 or pts > 10_000:
        raise ValueError("Puntos fuera de rango")
    motivo = str(body.get("descripcion") or "").strip()
    if not motivo:
        raise ValueError("El motivo es obligatorio")
    sal = salones_map()
    salon = sal.get(str(body.get("salon_id")))
    if not salon:
        raise ValueError("Salón no existe")
    est_id = str(body.get("estudiante_id") or "") or None
    con = db_est()
    try:
        if est_id:
            row = con.execute("SELECT salon_id FROM estudiantes WHERE id=? AND activo=1",
                              (est_id,)).fetchone()
            if not row or row[0] != salon["id"]:
                raise ValueError("El estudiante no pertenece a ese salón")
        pid = "adj-" + uuid.uuid4().hex[:12]
        fecha = now_iso()
        signed = -pts if tipo == "penalizacion" else pts
        con.execute(
            "INSERT INTO puntos (id, tipo, salon_id, estudiante_id, material, puntos,"
            " descripcion, registrado_por, fecha) VALUES (?,?,?,?,?,?,?,?,?)",
            (pid, tipo, salon["id"], est_id, "-", signed, motivo[:300], admin_id, fecha))
        con.commit()
        row = con.execute(
            "SELECT p.id, p.tipo, p.salon_id, p.estudiante_id, e.nombre, p.material, p.puntos,"
            " p.descripcion, p.registrado_por, p.fecha FROM puntos p"
            " LEFT JOIN estudiantes e ON e.id = p.estudiante_id WHERE p.id=?", (pid,)).fetchone()
    finally:
        con.close()
    return _punto(row, sal)


# ── Login ────────────────────────────────────────────────────────────────────
def login(email, password):
    email = (email or "").strip()
    for opener, table, rol_fixed in ((db_dir, "directivos", None), (db_est, "estudiantes", "estudiante")):
        con = opener()
        try:
            cols = "id, nombre, email, password_hash" + (", rol" if rol_fixed is None else "")
            row = con.execute(f"SELECT {cols} FROM {table} WHERE email=? AND activo=1",
                              (email,)).fetchone()
            if row and init_db.verify_password(password or "", row[3]):
                con.execute(f"UPDATE {table} SET ultimo_login=? WHERE id=?", (now_iso(), row[0]))
                con.commit()
                rol = rol_fixed or row[4]
                token = secrets.token_urlsafe(32)
                SESSIONS[token] = dict(id=row[0], rol=rol, exp=time.time() + SESSION_TTL)
                user = next((u for u in get_usuarios() if u["id"] == row[0]), None)
                return token, user
        finally:
            con.close()
    # mismo costo de cómputo si el email no existe (evita revelar cuentas por tiempo)
    init_db.verify_password(password or "", init_db.hash_password("x"))
    return None, None


class Handler(BaseHTTPRequestHandler):
    server_version = "EcoRanking/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _json(self, code, payload):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _session(self):
        auth = self.headers.get("Authorization", "")
        s = SESSIONS.get(auth[7:]) if auth.startswith("Bearer ") else None
        if s and s["exp"] > time.time():
            return s
        return None

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 100_000:
            raise ValueError("Cuerpo demasiado grande")
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith("/tables/"):
            if not self._session():
                return self._json(401, {"error": "Sesión requerida"})
            table = path[len("/tables/"):].strip("/")
            fn = {"usuarios": get_usuarios, "salones": get_salones, "puntos": get_puntos}.get(table)
            if not fn:
                return self._json(404, {"error": "Tabla no existe"})
            data = fn()
            return self._json(200, {"data": data, "total": len(data)})
        rel = STATIC.get(path)
        if not rel:
            return self._json(404, {"error": "No encontrado"})
        full = os.path.join(ROOT, rel)
        with open(full, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", (mimetypes.guess_type(full)[0] or "text/plain") + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            body = self._body()
        except (ValueError, json.JSONDecodeError):
            return self._json(400, {"error": "JSON inválido"})
        if path == "/api/login":
            token, user = login(body.get("email"), body.get("password"))
            if not token:
                return self._json(401, {"error": "Email o contraseña incorrectos"})
            return self._json(200, {"token": token, "user": user})
        if path == "/tables/puntos":
            s = self._session()
            if not s:
                return self._json(401, {"error": "Sesión requerida"})
            if s["rol"] != "administrador":
                return self._json(403, {"error": "Solo el administrador puede ajustar puntos"})
            try:
                return self._json(201, crear_ajuste(body, s["id"]))
            except ValueError as e:
                return self._json(400, {"error": str(e)})
        return self._json(404, {"error": "No encontrado"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    a = ap.parse_args()
    init_db.init()  # crea y siembra las bases si no existen
    print(f"EcoRanking en http://{a.host}:{a.port}  (Ctrl+C para detener)")
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
