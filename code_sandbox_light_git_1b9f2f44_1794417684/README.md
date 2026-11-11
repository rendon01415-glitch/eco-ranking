# ♻️ EcoRanking — Sistema de Reciclaje Escolar Gamificado

Plataforma web con sistema de cuentas por roles que permite gestionar el programa de reciclaje escolar gamificado con contenedores inteligentes.

## 🚀 Acceso a la aplicación

Abre **`ecoranking.html`** en tu navegador o directamente desde el servidor.

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
ecoranking.html   ← App principal (abrir este)
app.css           ← Estilos completos
app.js            ← Lógica de la aplicación
index.html        ← Redirección automática
README.md         ← Este archivo
```

## 🗄️ Diseño de base de datos relacional (PostgreSQL / MySQL)

Carpeta `db/` — diseño para migrar a un backend real (la app actual NO lo usa todavía):

- `db/schema.sql` — tablas, FK, constraints, índices y vistas de ranking (PostgreSQL 14+)
- `db/seed.sql` — datos de prueba equivalentes a la demo actual (contraseñas con bcrypt)
- `db/API.md` — endpoints y consultas SQL que necesitaría `app.js`, y notas para MySQL

> Estado actual: la persistencia real de la demo es la Table API de la plataforma
> (`usuarios`, `salones`, `puntos`). Las contraseñas de la demo están en texto plano y el login
> se valida en el navegador: sirve para prototipo, no para producción.

## ⚙️ Tablas de datos (API)

- **`usuarios`**: Cuentas del sistema con roles y salones asignados
- **`salones`**: Información de cada salón con totales
- **`puntos`**: Todos los eventos: reciclajes, penalizaciones y bonificaciones
