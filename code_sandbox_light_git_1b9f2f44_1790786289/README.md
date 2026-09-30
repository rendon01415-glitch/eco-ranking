# ♻️ EcoRanking — Prompt Maestro de Desarrollo

> Propuesta técnica integral para el desarrollo de la plataforma gamificada de reciclaje escolar EcoRanking, con contenedores inteligentes IoT, rankings por categoría y panel administrativo completo.

## 📌 Descripción

Este repositorio contiene el **Prompt Maestro Completo** del proyecto **EcoRanking**, presentado como un documento web interactivo, estructurado y navegable. Fue elaborado actuando como un equipo senior completo (arquitecto de software, desarrollador full-stack, analista de negocio, diseñador UX/UI, ingeniero de datos, QA y technical writer).

## 🚀 Funcionalidades del Documento

- ✅ 17 secciones técnicas completas y expandibles/colapsables
- ✅ Navegación sticky con resaltado de sección activa
- ✅ Índice lateral (TOC) con acceso directo a cada sección
- ✅ Modelo de datos completo con entidades y campos
- ✅ Catálogo de pantallas del sistema
- ✅ Flujo funcional paso a paso (10 pasos + flujos alternos)
- ✅ Endpoints de API documentados con métodos HTTP / WebSocket
- ✅ Stack tecnológico justificado por capa
- ✅ Estructura de carpetas profesional del proyecto
- ✅ Plan de implementación en 6 fases (14 semanas)
- ✅ Estrategia de pruebas con ejemplos de código
- ✅ Variables de entorno de ejemplo
- ✅ Instrucciones de instalación con Docker
- ✅ Riesgos, supuestos y decisiones técnicas
- ✅ Explicación final extensa para perfiles técnicos y no técnicos
- ✅ Diseño responsive mobile-first
- ✅ Identidad visual ecológica (verde + teal + ámbar)

## 📂 Estructura del Proyecto Web

```
ecoranking-prompt/
├── index.html          # Documento principal con todas las secciones
├── css/
│   └── style.css       # Estilos completos (variables, componentes, responsive)
└── README.md           # Este archivo
```

## 🛠️ Stack Propuesto en el Prompt

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | Next.js 14 + React | SSR + SPA, TypeScript, Tailwind |
| Backend API | FastAPI (Python 3.12) | Async, OpenAPI automático, Pydantic |
| Base de Datos | PostgreSQL 16 | Relacional, ACID, robusto |
| Caché / Colas | Redis 7 | Ranking cacheado, Redis Streams IoT |
| IoT / Protocolo | MQTT + Mosquitto | Estándar IoT, baja latencia |
| Hardware | Raspberry Pi 4 + TFLite | IA embebida, GPIO, Python |
| Almacenamiento | MinIO (S3) | Imágenes de evidencia |
| Despliegue | Docker + Docker Compose | Reproducible, portable |
| Monitoreo | Loguru + Sentry | Logs estructurados + errores prod |

## 📋 Secciones del Prompt Maestro

1. **Visión General del Proyecto**
2. **Objetivo de Negocio** (Categoría A: grados 1–5, Categoría B: grados 6–11)
3. **Usuarios, Roles y Permisos** (5 roles con matriz de permisos)
4. **Análisis de Imágenes y Diseño Visual** (identidad ecológica + paleta)
5. **Pantallas y Flujo Funcional** (14 pantallas + flujo de 10 pasos)
6. **Arquitectura Propuesta** (Monolito Modular + Módulo IoT separado)
7. **Stack Tecnológico por Capa** (15 componentes justificados)
8. **Modelo de Datos** (8 entidades principales con campos completos)
9. **Funcionalidades** (esenciales, secundarias, futuras)
10. **Requisitos No Funcionales** (seguridad, rendimiento, escalabilidad)
11. **Estructura de Carpetas** (backend, frontend, iot-service, device-agent, infra)
12. **Endpoints de la API** (30+ endpoints REST + WebSocket)
13. **Plan de Implementación** (6 fases, 14 semanas)
14. **Estrategia de Pruebas** (Pytest + Vitest + Locust)
15. **Documentación** (técnica, funcional, API automática)
16. **Instrucciones de Instalación** (Docker Compose + variables de entorno)
17. **Riesgos, Supuestos y Decisiones Técnicas**
18. **Explicación Final Completa** (para perfiles técnicos y no técnicos)

## 🎯 Proyecto EcoRanking — Contexto Rápido

**EcoRanking** es una plataforma para colegios que convierte el reciclaje en una competencia gamificada:

- Contenedores inteligentes validan depósitos con **cámara + sensor**
- Cada depósito válido suma **puntos al salón** vinculado
- Competencia dividida en **Categoría A (grados 1–5)** y **Categoría B (grados 6–11)**
- El salón con más puntos gana una **salida pedagógica**
- Panel administrativo web con **rankings en tiempo real**

## 📄 Licencia

Documento de propuesta técnica elaborado para el proyecto EcoRanking.
