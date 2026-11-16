# ♻️ EcoRanking — Sistema de Reciclaje Escolar Gamificado

Plataforma web con sistema de cuentas por roles que permite gestionar el programa de reciclaje escolar gamificado con contenedores inteligentes.

## 🚀 Cómo ejecutarlo

Requiere solo **Python 3.9+** (sin instalar nada más).

```bash
python3 server.py            # abre http://127.0.0.1:8000
```

La primera vez crea y llena las dos bases de datos automáticamente. Ya no basta con abrir
`ecoranking.html` con doble clic: la app necesita el servidor para leer y guardar datos.

Para volver a los datos de prueba originales: `python3 db/init_db.py --reset`

## 👤 Usuarios de prueba

| Nombre | Email | Contraseña | Rol |
|--------|-------|-----------|-----|
| Carlos Mendoza | admin@ecoranking.edu | Admin2025! | 🛡️ Administrador |
| Prof. Luisa Torres | luisa.torres@eco.edu | Profe2025 | 📚 Director Salón 4A |
| Prof. Mario Ríos | mario.rios@eco.edu | Profe2025 | 📚 Director Salón 4B |
| Prof. Sandra Gómez | sandra.gomez@eco.edu | Profe2025 | 📚 Director Salón 7A |
| Prof. Julián Pérez | julian.perez@eco.edu | Profe2025 | 📚 Director Salón 7B |
| Sofía Ramírez | sofia.ramirez@eco.edu | Eco2025 | 🎒 Estudiante Salón 4A |
| Miguel Herrera | miguel.herrera@eco.edu | Eco2025 | 🎒 Estudiante Salón 4A |
| Valentina Cruz | valentina.cruz@eco.edu | Eco2025 | 🎒 Estudiante Salón 4A |
| Juan Morales | juan.morales@eco.edu | Eco2025 | 🎒 Estudiante Salón 4A |
| Camila Vargas | camila.vargas@eco.edu | Eco2025 | 🎒 Estudiante Salón 4A |
| Diego Castro | diego.castro@eco.edu | Eco2025 | 🎒 Estudiante Salón 7A |
| Isabella Rojas | isabella.rojas@eco.edu | Eco2025 | 🎒 Estudiante Salón 7A |

## 🔐 Permisos por rol

### 🛡️ Administrador
- Dashboard global con KPIs y Top 3 por categoría
- Rankings completos de todos los salones (Categoría A y B)
- Tabla de todos los salones con puntos en tiempo real
- **Gestión de puntos: aplicar penalizaciones y bonificaciones** a estudiantes o salones
- Historial completo de todos los eventos del sistema
- Lista de todos los usuarios del sistema

### 📚 Director de Grupo
- Vista completa del **propio salón**: ranking de estudiantes con puntos, reciclajes y penalizaciones
- Ranking general de **todos los salones** del colegio (Categoría A y B)
- Historial de todos los eventos del salón

### 🎒 Estudiante
- **Solo ve sus propios puntos** y posición en el salón
- Ranking de su categoría (A: grados 1-5 / B: grados 6-11)
- Historial personal de eventos

## 🏆 Categorías de competencia
- **Categoría A**: Grados 1° al 5° (Primaria)
- **Categoría B**: Grados 6° al 11° (Bachillerato)

## 📁 Archivos del proyecto

```
server.py                  ← Servidor + API (lee/escribe las dos bases)
ecoranking.html            ← App principal
app.js / app.css           ← Lógica y estilos
index.html                 ← Redirección automática
db/
  directivos_schema.sql    ← Tablas de directivos y salones
  estudiantes_schema.sql   ← Tablas de estudiantes y puntaje
  init_db.py               ← Crea y siembra ambas bases
  directivos.db            ← BD de directivos (SQLite)
  estudiantes.db           ← BD de estudiantes (SQLite)
  schema.sql / seed.sql    ← Diseño PostgreSQL original (para una migración futura)
```

## 🗄️ Bases de datos (SQLite, una por cada parte)

| Base | Tablas | Qué guarda |
|---|---|---|
| `db/directivos.db` | `directivos`, `salones` | Administrador, directores de grupo, salones y qué director lleva cada uno |
| `db/estudiantes.db` | `estudiantes`, `puntos` | Cuentas de estudiantes y su puntaje (reciclajes, penalizaciones, bonificaciones) |

- El puntaje **no es un contador editable**: se calcula sumando la tabla `puntos`, así cada punto queda trazado.
- La categoría A/B se deriva sola del grado (1–5 = A, 6–11 = B).
- Las contraseñas se guardan con hash PBKDF2-SHA256; la API nunca las devuelve.
- `estudiantes.salon_id` apunta al salón en la otra base. SQLite no permite claves foráneas entre archivos, así que **el servidor valida esa relación** (por ejemplo, no deja ajustar a un estudiante en un salón que no es el suyo).
- Los directivos ven los puntos de los grupos porque el servidor combina ambas bases al responder.

## 🔒 Seguridad básica incluida

- Login validado en el servidor; la sesión usa un token que expira a las 8 horas.
- Solo el **administrador** puede penalizar o bonificar (el servidor lo exige, no solo la interfaz).
- Los archivos `.db` y el código del servidor no se sirven por la web.
- Es un servidor pensado para uso local o de prueba. Antes de publicarlo en internet hace falta HTTPS, límite de intentos de login y que cada rol solo reciba los datos que le corresponden (hoy cualquier sesión puede leer las tablas completas).
