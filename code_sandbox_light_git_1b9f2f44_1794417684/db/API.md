# EcoRanking · Endpoints y consultas clave

> Un navegador **no puede** conectarse directamente a PostgreSQL/MySQL. `app.js` debe hablar con una
> API (backend) que ejecute estas consultas. Los parámetros `$1, $2…` son *prepared statements*
> (nunca concatenar strings → evita SQL injection).
>
> **Regla de oro de autorización:** el backend toma el `usuario_id` y el `rol` del **token (JWT)**,
> jamás de parámetros enviados por el cliente. Así un estudiante no puede pedir los puntos de otro
> y un director no puede ver otro salón.

Periodo activo (se reutiliza en casi todo):

```sql
SELECT id FROM periodos_competencia
WHERE institucion_id = $1 AND estado = 'activo';
```

## Resumen de endpoints

| Método | Ruta | Rol | Para qué la usa `app.js` |
|---|---|---|---|
| POST | `/api/auth/login` | público | Iniciar sesión |
| GET  | `/api/me/resumen` | estudiante | Hero: puntos, posición, reciclajes, penalizaciones |
| GET  | `/api/me/companeros` | estudiante | Posición en su salón (nombres + puntos) |
| GET  | `/api/me/movimientos` | estudiante | Mi historial |
| GET  | `/api/ranking/salones?categoria=A\|B` | todos | Ranking por categoría (sin datos personales) |
| GET  | `/api/mi-salon` | director | Tarjetas del salón |
| GET  | `/api/mi-salon/estudiantes` | director | Tabla de estudiantes con puntos |
| GET  | `/api/mi-salon/movimientos` | director | Historial del salón |
| GET  | `/api/admin/kpis` | admin | Dashboard |
| GET  | `/api/admin/salones` | admin | Gestión de salones |
| GET  | `/api/admin/usuarios` | admin | Gestión de usuarios |
| GET  | `/api/admin/movimientos` | admin | Historial global |
| POST | `/api/admin/ajustes` | admin | Penalizar / bonificar |
| POST | `/api/admin/periodos/:id/cerrar` | admin | Cierre y ganadores |
| GET  | `/api/admin/contenedores` | admin | Monitor de dispositivos |
| POST | `/api/iot/eventos` | dispositivo (API key) | Registrar un depósito |
| POST | `/api/iot/heartbeat` | dispositivo (API key) | Latido de conectividad |

---

## 1. Autenticación

`POST /api/auth/login` · body `{ "email": "...", "password": "..." }`

```sql
SELECT id, nombre, rol, salon_id, password_hash
FROM usuarios
WHERE email = $1 AND activo;          -- email es CITEXT: ya ignora mayúsculas
```
El backend compara con bcrypt (`bcrypt.compare(password, password_hash)`), responde con un JWT
(15 min) y registra:

```sql
UPDATE usuarios SET ultimo_login = now() WHERE id = $1;
INSERT INTO log_auditoria (usuario_id, accion, entidad, entidad_id, ip)
VALUES ($1, 'LOGIN', 'usuarios', $1::text, $2);
```

Alternativa 100 % SQL (útil solo en pruebas): `SELECT id FROM usuarios WHERE email=$1 AND password_hash = crypt($2, password_hash);`

## 2. Estudiante (solo ve lo suyo)

**Resumen** `GET /api/me/resumen` — usa `usuario_id` del token:

```sql
SELECT total_puntos, reciclajes, penalizaciones, posicion_salon
FROM v_puntos_estudiante
WHERE estudiante_id = $1 AND periodo_id = $2;
```

**Compañeros de salón** `GET /api/me/companeros`:

```sql
SELECT estudiante_id, nombre, total_puntos, posicion_salon
FROM v_puntos_estudiante
WHERE salon_id = (SELECT salon_id FROM usuarios WHERE id = $1)
  AND periodo_id = $2
ORDER BY posicion_salon, nombre
LIMIT 6;
```

**Mi historial** `GET /api/me/movimientos`:

```sql
SELECT tipo, descripcion, fecha, puntos
FROM v_movimientos_puntos
WHERE estudiante_id = $1 AND periodo_id = $2
ORDER BY fecha DESC;
```

## 3. Ranking de salones (todos los roles)

`GET /api/ranking/salones?categoria=A` — para un estudiante el backend **fuerza** su propia categoría.

```sql
SELECT salon_id, salon, grado, categoria, total_puntos, depositos, posicion
FROM v_ranking_salones
WHERE periodo_id = $1
  AND ($2::char(1) IS NULL OR categoria = $2)
ORDER BY categoria, posicion, salon;
```

## 4. Director de grupo

El salón se resuelve por `salones.director_id = usuario del token` (nunca por parámetro):

**Resumen** `GET /api/mi-salon`:

```sql
SELECT s.id, s.nombre, s.grado, s.categoria,
       r.total_puntos, r.depositos, r.posicion,
       (SELECT COUNT(*) FROM usuarios u WHERE u.salon_id = s.id AND u.rol = 'estudiante' AND u.activo) AS estudiantes
FROM salones s
JOIN v_ranking_salones r ON r.salon_id = s.id AND r.periodo_id = $2
WHERE s.director_id = $1;
```

**Estudiantes** `GET /api/mi-salon/estudiantes`:

```sql
SELECT v.estudiante_id, v.nombre, v.total_puntos, v.reciclajes, v.penalizaciones, v.posicion_salon
FROM v_puntos_estudiante v
JOIN salones s ON s.id = v.salon_id
WHERE s.director_id = $1 AND v.periodo_id = $2
ORDER BY v.posicion_salon, v.nombre;
```

**Historial del salón** `GET /api/mi-salon/movimientos`:

```sql
SELECT m.tipo, m.fecha, m.descripcion, m.puntos, u.nombre AS estudiante
FROM v_movimientos_puntos m
JOIN salones s       ON s.id = m.salon_id
LEFT JOIN usuarios u ON u.id = m.estudiante_id
WHERE s.director_id = $1 AND m.periodo_id = $2
ORDER BY m.fecha DESC;
```

## 5. Administrador

**KPIs del dashboard** `GET /api/admin/kpis`:

```sql
SELECT
  (SELECT COALESCE(SUM(puntos),0) FROM v_movimientos_puntos WHERE periodo_id=$1 AND puntos>0) AS puntos_otorgados,
  (SELECT COUNT(*) FROM eventos_reciclaje WHERE periodo_id=$1 AND estado='valido')            AS depositos_validos,
  (SELECT COUNT(*) FROM eventos_reciclaje WHERE periodo_id=$1 AND estado IN ('rechazado','cancelado','en_revision')) AS eventos_con_incidencia,
  (SELECT COUNT(*) FROM ajustes_puntos   WHERE periodo_id=$1 AND tipo='penalizacion')         AS penalizaciones,
  (SELECT COUNT(*) FROM ajustes_puntos   WHERE periodo_id=$1 AND tipo='bonificacion')         AS bonificaciones,
  (SELECT COUNT(*) FROM salones WHERE activo)                                                 AS salones_activos;
```

**Aplicar penalización / bonificación** `POST /api/admin/ajustes`
body `{ tipo, salon_id, estudiante_id|null, puntos (positivo), motivo }` — en **una transacción**.
El backend pone el signo según `tipo` y valida que el estudiante pertenezca a ese salón:

```sql
BEGIN;

-- validación: si viene estudiante, debe ser de ese salón
SELECT 1 FROM usuarios WHERE id = $3 AND salon_id = $2 AND rol = 'estudiante';

INSERT INTO ajustes_puntos (periodo_id, salon_id, estudiante_id, tipo, puntos, motivo, registrado_por)
VALUES ($1, $2, $3, $4, $5, $6, $7)         -- $5 ya con signo: -10 penalización / +20 bonificación
RETURNING id;

INSERT INTO log_auditoria (usuario_id, accion, entidad, entidad_id, datos_nuevos, ip)
VALUES ($7, 'AJUSTE_PUNTOS', 'ajustes_puntos', $8::text, $9::jsonb, $10);

COMMIT;
```

**Historial global** `GET /api/admin/movimientos?salon_id=&tipo=&desde=&hasta=`:

```sql
SELECT m.ref, m.tipo, m.fecha, m.descripcion, m.puntos,
       s.nombre AS salon, u.nombre AS estudiante, a.nombre AS registrado_por
FROM v_movimientos_puntos m
JOIN salones s        ON s.id = m.salon_id
LEFT JOIN usuarios u  ON u.id = m.estudiante_id
LEFT JOIN usuarios a  ON a.id = m.registrado_por
WHERE m.periodo_id = $1
  AND ($2::bigint IS NULL OR m.salon_id = $2)
  AND ($3::text   IS NULL OR m.tipo = $3)
ORDER BY m.fecha DESC
LIMIT 100 OFFSET $4;
```

**Salones** `GET /api/admin/salones`:

```sql
SELECT s.id, s.nombre, s.grado, s.categoria, d.nombre AS director,
       r.total_puntos, r.depositos, r.posicion
FROM salones s
LEFT JOIN usuarios d ON d.id = s.director_id
LEFT JOIN v_ranking_salones r ON r.salon_id = s.id AND r.periodo_id = $1
ORDER BY s.grado, s.nombre;
```

**Usuarios** `GET /api/admin/usuarios` (**nunca** devolver `password_hash`):

```sql
SELECT u.id, u.nombre, u.email, u.rol, s.nombre AS salon, s.grado, s.categoria,
       COALESCE(v.total_puntos, 0) AS puntos
FROM usuarios u
LEFT JOIN salones s ON s.id = u.salon_id
LEFT JOIN v_puntos_estudiante v ON v.estudiante_id = u.id AND v.periodo_id = $1
ORDER BY u.rol, u.nombre;
```

**Cierre de periodo y ganadores** `POST /api/admin/periodos/:id/cerrar`:

```sql
BEGIN;
UPDATE periodos_competencia SET estado = 'cerrado' WHERE id = $1 AND estado = 'activo';

-- ganadores (si hay empate en el 1.º lugar se devuelven todos los empatados)
SELECT categoria, salon, total_puntos
FROM v_ranking_salones
WHERE periodo_id = $1 AND posicion = 1;

INSERT INTO log_auditoria (usuario_id, accion, entidad, entidad_id, ip)
VALUES ($2, 'CIERRE_PERIODO', 'periodos_competencia', $1::text, $3);
COMMIT;
```

**Monitor de contenedores** `GET /api/admin/contenedores`:

```sql
SELECT c.codigo, c.ubicacion, s.nombre AS salon, c.estado, c.ultima_conexion,
       (c.ultima_conexion < now() - interval '5 minutes') AS sin_señal,
       (SELECT COUNT(*) FROM eventos_reciclaje e
         WHERE e.contenedor_id = c.id AND e.estado = 'valido' AND e.periodo_id = $1) AS depositos
FROM contenedores c
JOIN salones s ON s.id = c.salon_id
ORDER BY c.codigo;
```

## 6. Contenedor inteligente (IoT)

Autenticación: cabecera `X-Device-Code: ECO-001` + `X-Device-Key: <clave>`.

**Registrar evento** `POST /api/iot/eventos`
body `{ uid_evento, material (codigo_modelo), confianza, sensor_confirmado, ocurrido_en, estudiante_id? }`.
Es **idempotente**: si el dispositivo reintenta tras un corte de red, no se suman puntos dos veces.
El estado lo decide el servidor (el dispositivo no puede "regalar" puntos):

```sql
WITH c AS (
  SELECT id, salon_id, institucion_id FROM contenedores
  WHERE codigo = $1 AND api_key_hash = encode(digest($2, 'sha256'), 'hex') AND estado = 'activo'
),
p AS (
  SELECT id FROM periodos_competencia
  WHERE institucion_id = (SELECT institucion_id FROM c) AND estado = 'activo'
),
calc AS (
  SELECT c.id AS contenedor_id, c.salon_id, p.id AS periodo_id, m.id AS material_id, m.puntos_base,
         CASE WHEN NOT $6::boolean   THEN 'cancelado'      -- cámara sí, sensor no
              WHEN m.id IS NULL      THEN 'rechazado'      -- sensor sí, material no válido
              WHEN $5::numeric < 75  THEN 'en_revision'    -- confianza baja
              ELSE 'valido' END AS estado
  FROM c CROSS JOIN p
  LEFT JOIN materiales_reciclables m ON m.codigo_modelo = $3 AND m.activo
)
INSERT INTO eventos_reciclaje
  (uid_evento, contenedor_id, salon_id, periodo_id, estudiante_id, material_id,
   ocurrido_en, confianza_camara, sensor_confirmado, estado, puntos, motivo_rechazo)
SELECT $4::uuid, contenedor_id, salon_id, periodo_id, $8::bigint,
       CASE WHEN estado IN ('valido','en_revision') THEN material_id END,
       $7::timestamptz, $5::numeric, $6::boolean, estado,
       CASE WHEN estado = 'valido' THEN puntos_base ELSE 0 END,
       CASE estado WHEN 'cancelado'   THEN 'Sensor no confirmó el depósito'
                   WHEN 'rechazado'   THEN 'Material no reciclable o no reconocido'
                   WHEN 'en_revision' THEN 'Confianza de cámara bajo el umbral' END
FROM calc
ON CONFLICT (contenedor_id, uid_evento) DO NOTHING
RETURNING id, estado, puntos;     -- 0 filas = evento repetido → responder 200 "duplicado"
```

> Nota: el CHECK de la tabla obliga a que `valido` tenga `sensor_confirmado = true`, material y
> puntos > 0. Aunque el backend tuviera un bug, la base **rechaza** puntos sin cámara + sensor.

**Heartbeat** `POST /api/iot/heartbeat`:

```sql
UPDATE contenedores
SET ultima_conexion = now(), firmware_version = COALESCE($3, firmware_version),
    estado = CASE WHEN estado = 'offline' THEN 'activo' ELSE estado END
WHERE codigo = $1 AND api_key_hash = encode(digest($2, 'sha256'), 'hex');
```

Job periódico (cada minuto) para marcar dispositivos caídos:

```sql
UPDATE contenedores SET estado = 'offline'
WHERE estado = 'activo' AND ultima_conexion < now() - interval '5 minutes';
```

---

## Correspondencia con la app actual (Table API)

| Hoy en `app.js` (`tables/…`) | Modelo SQL |
|---|---|
| `usuarios` (con `password` en texto plano) | `usuarios` (`password_hash` bcrypt) |
| `salones` (con `total_puntos` estático) | `salones` + vista `v_ranking_salones` (total calculado) |
| `puntos` (`tipo` = reciclaje / penalizacion / bonificacion) | `eventos_reciclaje` + `ajustes_puntos` → vista `v_movimientos_puntos` |
| — | `periodos_competencia`, `materiales_reciclables`, `contenedores`, `log_auditoria` |

## Notas de adaptación a MySQL 8

- `GENERATED BY DEFAULT AS IDENTITY` → `BIGINT AUTO_INCREMENT`.
- `CITEXT` → `VARCHAR` con collation `utf8mb4_0900_ai_ci` (ya es case-insensitive).
- Índices parciales (`WHERE …`) no existen: usar columna generada + `UNIQUE`, o validar en backend.
- `gen_random_uuid()` → `UUID()`; `crypt/digest` → hashear en el backend (`bcrypt`, `SHA2(x,256)`).
- `RANK() OVER` y columnas generadas `STORED` sí están soportados (8.0+).
