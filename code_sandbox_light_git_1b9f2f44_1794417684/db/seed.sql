-- ============================================================================
-- EcoRanking · Datos de prueba (ejecutar DESPUÉS de db/schema.sql)
-- Reproduce los mismos usuarios, salones y eventos que usa la demo actual.
-- Las contraseñas se guardan con bcrypt (pgcrypto), no en texto plano:
--   admin → Admin2025!   |   directores → Profe2025   |   estudiantes → Eco2025
-- ============================================================================

BEGIN;

-- 1. Institución -------------------------------------------------------------
INSERT INTO instituciones (id, nombre, codigo_dane, municipio) VALUES
  (1, 'Colegio EcoRanking Demo', '100000000001', 'Bogotá');

-- 2. Periodo activo ----------------------------------------------------------
INSERT INTO periodos_competencia (id, institucion_id, nombre, fecha_inicio, fecha_fin, estado) VALUES
  (1, 1, 'Periodo 3 - 2025', '2025-08-01', '2025-11-30', 'activo');

-- 3. Materiales reciclables y su puntaje -------------------------------------
INSERT INTO materiales_reciclables (id, nombre, codigo_modelo, puntos_base) VALUES
  (1, 'Plástico PET', 'plastic_pet', 10),
  (2, 'Aluminio',     'aluminum',    15),
  (3, 'Cartón',       'cardboard',   10),
  (4, 'Papel',        'paper',        5),
  (5, 'Vidrio',       'glass',       12);

-- 4. Salones (categoría A/B se calcula sola según el grado) ------------------
INSERT INTO salones (id, institucion_id, grado, nombre) VALUES
  (1, 1,  3, '3A'),
  (2, 1,  4, '4A'),
  (3, 1,  4, '4B'),
  (4, 1,  5, '5A'),
  (5, 1,  7, '7A'),
  (6, 1,  7, '7B'),
  (7, 1,  9, '9A'),
  (8, 1, 11, '11A');

-- 5. Usuarios ----------------------------------------------------------------
INSERT INTO usuarios (id, institucion_id, nombre, email, password_hash, rol, salon_id) VALUES
  -- administrador
  ( 1, 1, 'Carlos Mendoza',     'admin@ecoranking.edu',       crypt('Admin2025!', gen_salt('bf', 12)), 'administrador', NULL),
  -- directores de grupo
  ( 2, 1, 'Prof. Luisa Torres', 'luisa.torres@eco.edu',       crypt('Profe2025',  gen_salt('bf', 12)), 'director', NULL),
  ( 3, 1, 'Prof. Mario Ríos',   'mario.rios@eco.edu',         crypt('Profe2025',  gen_salt('bf', 12)), 'director', NULL),
  ( 4, 1, 'Prof. Sandra Gómez', 'sandra.gomez@eco.edu',       crypt('Profe2025',  gen_salt('bf', 12)), 'director', NULL),
  ( 5, 1, 'Prof. Julián Pérez', 'julian.perez@eco.edu',       crypt('Profe2025',  gen_salt('bf', 12)), 'director', NULL),
  -- estudiantes 4A
  ( 6, 1, 'Sofía Ramírez',      'sofia.ramirez@eco.edu',      crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 2),
  ( 7, 1, 'Miguel Herrera',     'miguel.herrera@eco.edu',     crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 2),
  ( 8, 1, 'Valentina Cruz',     'valentina.cruz@eco.edu',     crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 2),
  ( 9, 1, 'Juan Morales',       'juan.morales@eco.edu',       crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 2),
  (10, 1, 'Camila Vargas',      'camila.vargas@eco.edu',      crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 2),
  -- estudiantes 4B
  (11, 1, 'Andrés López',       'andres.lopez@eco.edu',       crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 3),
  (12, 1, 'Laura Sánchez',      'laura.sanchez@eco.edu',      crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 3),
  -- estudiantes 7A
  (13, 1, 'Diego Castro',       'diego.castro@eco.edu',       crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 5),
  (14, 1, 'Isabella Rojas',     'isabella.rojas@eco.edu',     crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 5),
  -- estudiante 7B
  (15, 1, 'Sebastián Flores',   'sebastian.flores@eco.edu',   crypt('Eco2025', gen_salt('bf', 12)), 'estudiante', 6);

-- Directores asignados a su salón
UPDATE salones SET director_id = 2 WHERE id = 2;  -- 4A  ← Luisa
UPDATE salones SET director_id = 3 WHERE id = 3;  -- 4B  ← Mario
UPDATE salones SET director_id = 4 WHERE id = 5;  -- 7A  ← Sandra
UPDATE salones SET director_id = 5 WHERE id = 6;  -- 7B  ← Julián

-- 6. Contenedores inteligentes (uno por salón; el 8 está en mantenimiento) ---
-- api_key_hash = sha256 hex de la clave del dispositivo (clave demo: 'dev-key-eco-00X')
INSERT INTO contenedores (id, institucion_id, codigo, ubicacion, salon_id, modelo_hardware, firmware_version, estado, ultima_conexion, api_key_hash) VALUES
  (1, 1, 'ECO-001', 'Pasillo 1, junto a 4A',        2, 'Raspberry Pi 4B 4GB', '1.0.3', 'activo',        now(),                         encode(digest('dev-key-eco-001','sha256'),'hex')),
  (2, 1, 'ECO-002', 'Pasillo 1, junto a 4B',        3, 'Raspberry Pi 4B 4GB', '1.0.3', 'activo',        now(),                         encode(digest('dev-key-eco-002','sha256'),'hex')),
  (3, 1, 'ECO-003', 'Pasillo 2, junto a 7A',        5, 'Raspberry Pi 4B 4GB', '1.0.3', 'activo',        now(),                         encode(digest('dev-key-eco-003','sha256'),'hex')),
  (4, 1, 'ECO-004', 'Patio central (5A)',           4, 'Raspberry Pi 4B 4GB', '1.0.2', 'activo',        now(),                         encode(digest('dev-key-eco-004','sha256'),'hex')),
  (5, 1, 'ECO-005', 'Entrada primaria (3A)',        1, 'Raspberry Pi 4B 4GB', '1.0.2', 'activo',        now(),                         encode(digest('dev-key-eco-005','sha256'),'hex')),
  (6, 1, 'ECO-006', 'Pasillo 2, junto a 7B',        6, 'Raspberry Pi 4B 4GB', '1.0.3', 'activo',        now(),                         encode(digest('dev-key-eco-006','sha256'),'hex')),
  (7, 1, 'ECO-007', 'Cafetería (9A)',               7, 'Raspberry Pi 4B 4GB', '1.0.1', 'offline',       now() - interval '2 days',     encode(digest('dev-key-eco-007','sha256'),'hex')),
  (8, 1, 'ECO-008', 'Bloque bachillerato (11A)',    8, 'Raspberry Pi 4B 4GB', '1.0.3', 'mantenimiento', now() - interval '1 day',      encode(digest('dev-key-eco-008','sha256'),'hex'));

-- 7. Eventos de reciclaje con estudiante identificado (4A, 4B, 7A) -----------
-- Los puntos se toman de materiales_reciclables.puntos_base
INSERT INTO eventos_reciclaje
  (contenedor_id, salon_id, periodo_id, estudiante_id, material_id, ocurrido_en, confianza_camara, sensor_confirmado, estado, puntos)
SELECT v.cont, v.salon, 1, v.est, v.mat, v.ts::timestamptz, v.conf, TRUE, 'valido', m.puntos_base
FROM (VALUES
  -- 4A (contenedor 1, salón 2)
  (1, 2,  6, 1, '2025-09-15 08:30-05', 92.40),   -- Sofía  · PET
  (1, 2,  7, 2, '2025-09-15 09:15-05', 95.10),   -- Miguel · Aluminio
  (1, 2,  8, 3, '2025-09-15 10:00-05', 89.70),   -- Valentina · Cartón
  (1, 2,  6, 1, '2025-09-16 08:45-05', 93.00),   -- Sofía  · PET
  (1, 2,  9, 4, '2025-09-16 09:30-05', 88.20),   -- Juan   · Papel
  (1, 2, 10, 2, '2025-09-17 14:00-05', 96.30),   -- Camila · Aluminio
  (1, 2,  6, 1, '2025-09-18 08:00-05', 91.80),   -- Sofía  · PET
  (1, 2, 10, 4, '2025-09-19 09:00-05', 87.50),   -- Camila · Papel
  (1, 2,  9, 3, '2025-09-19 11:15-05', 90.60),   -- Juan   · Cartón
  (1, 2,  7, 2, '2025-09-20 08:30-05', 94.90),   -- Miguel · Aluminio
  -- 4B (contenedor 2, salón 3)
  (2, 3, 11, 1, '2025-09-15 09:00-05', 92.00),   -- Andrés · PET
  (2, 3, 12, 4, '2025-09-15 10:30-05', 86.40),   -- Laura  · Papel
  -- 7A (contenedor 3, salón 5)
  (3, 5, 13, 2, '2025-09-15 11:00-05', 95.00),   -- Diego    · Aluminio
  (3, 5, 14, 3, '2025-09-15 12:00-05', 90.10)    -- Isabella · Cartón
) AS v(cont, salon, est, mat, ts, conf)
JOIN materiales_reciclables m ON m.id = v.mat;

-- 8. Volumen para que los demás salones tengan puntaje visible ---------------
--    (sin estudiante identificado → los puntos van al salón del contenedor)
--    5A = 180 · 3A = 75 · 7B = 130 · 9A = 60 · 11A = 175
INSERT INTO eventos_reciclaje
  (contenedor_id, salon_id, periodo_id, estudiante_id, material_id, ocurrido_en, confianza_camara, sensor_confirmado, estado, puntos)
SELECT c.cont, c.salon, 1, NULL, c.mat,
       TIMESTAMPTZ '2025-09-16 07:30-05' + g * interval '2 hours',
       88 + (g % 10), TRUE, 'valido', m.puntos_base
FROM (VALUES
  (4, 4, 2, 12),   -- 5A  · 12 × aluminio (15)  = 180
  (5, 1, 4, 15),   -- 3A  · 15 × papel    (5)   =  75
  (6, 6, 1, 13),   -- 7B  · 13 × PET      (10)  = 130
  (7, 7, 5,  5),   -- 9A  ·  5 × vidrio   (12)  =  60
  (8, 8, 2, 10),   -- 11A · 10 × aluminio (15)  = 150
  (8, 8, 4,  5)    -- 11A ·  5 × papel    (5)   =  25  → 175
) AS c(cont, salon, mat, n)
CROSS JOIN LATERAL generate_series(1, c.n) AS g
JOIN materiales_reciclables m ON m.id = c.mat;

-- 9. Eventos NO válidos (no suman puntos; sirven para el monitor/incidencias) -
INSERT INTO eventos_reciclaje
  (contenedor_id, salon_id, periodo_id, estudiante_id, material_id, ocurrido_en, confianza_camara, sensor_confirmado, estado, puntos, motivo_rechazo) VALUES
  (1, 2, 1, NULL, 1,    '2025-09-21 08:10-05', 91.00, FALSE, 'cancelado',   0, 'La cámara detectó PET pero el sensor no confirmó el depósito'),
  (2, 3, 1, NULL, NULL, '2025-09-21 09:05-05', 41.50, TRUE,  'rechazado',   0, 'Objeto no clasificable como material reciclable'),
  (3, 5, 1, NULL, 2,    '2025-09-21 11:00-05', 62.30, TRUE,  'en_revision', 0, 'Confianza de la cámara bajo el umbral (75%): revisión manual pendiente'),
  (1, 2, 1, NULL, 1,    '2025-09-21 08:10-05', 91.00, TRUE,  'duplicado',   0, 'Evento repetido dentro del umbral de 3 segundos');

-- 10. Ajustes del administrador (penalización y bonificación) ----------------
INSERT INTO ajustes_puntos (periodo_id, salon_id, estudiante_id, tipo, puntos, motivo, registrado_por, created_at) VALUES
  (1, 2, 7, 'penalizacion', -10, 'Penalización: depositar basura no reciclable',                1, '2025-09-17 11:00-05'),
  (1, 2, 8, 'bonificacion',  20, 'Bonificación: campaña especial semana del medio ambiente',   1, '2025-09-18 10:30-05');

INSERT INTO log_auditoria (usuario_id, accion, entidad, entidad_id, datos_nuevos, ip) VALUES
  (1, 'AJUSTE_PUNTOS', 'ajustes_puntos', '1', '{"tipo":"penalizacion","puntos":-10,"salon":"4A"}', '127.0.0.1'),
  (1, 'AJUSTE_PUNTOS', 'ajustes_puntos', '2', '{"tipo":"bonificacion","puntos":20,"salon":"4A"}',  '127.0.0.1');

-- 11. Reajustar secuencias (porque insertamos ids explícitos) ----------------
SELECT setval(pg_get_serial_sequence('instituciones',          'id'), (SELECT MAX(id) FROM instituciones));
SELECT setval(pg_get_serial_sequence('periodos_competencia',   'id'), (SELECT MAX(id) FROM periodos_competencia));
SELECT setval(pg_get_serial_sequence('materiales_reciclables', 'id'), (SELECT MAX(id) FROM materiales_reciclables));
SELECT setval(pg_get_serial_sequence('salones',                'id'), (SELECT MAX(id) FROM salones));
SELECT setval(pg_get_serial_sequence('usuarios',               'id'), (SELECT MAX(id) FROM usuarios));
SELECT setval(pg_get_serial_sequence('contenedores',           'id'), (SELECT MAX(id) FROM contenedores));

COMMIT;

-- Comprobación rápida (debe dar 4A=115, 4B=15, 7A=25, 5A=180, 3A=75, 7B=130, 9A=60, 11A=175):
-- SELECT salon, categoria, total_puntos, posicion FROM v_ranking_salones WHERE periodo_id = 1 ORDER BY categoria, posicion;
