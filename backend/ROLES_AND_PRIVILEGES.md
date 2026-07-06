# Roles de Usuario y Privilegios

Este documento detalla el diseño de control de acceso basado en roles (RBAC - Role-Based Access Control) que implementamos a nivel de base de datos y de API en el sistema de Kanban/Scrum.

---

## 👥 Tabla de Roles y Permisos

| Permiso / Acción | Administrador (`ADMIN`) | Miembro / Colaborador (`MEMBER`) | Espectador (`VIEWER`) |
| :--- | :---: | :---: | :---: |
| **Configuración de Proyecto** (Editar nombre, clave, tipo) | ✅ | ❌ | ❌ |
| **Gestión de Miembros** (Invitar, cambiar roles, remover) | ✅ | ❌ | ❌ |
| **Configuración de Columnas** (Crear, ordenar, cambiar límites WIP) | ✅ | ❌ | ❌ |
| **Control de Sprints** (Crear, iniciar, completar) | ✅ | ❌ | ❌ |
| **Crear y Modificar Tareas** (Crear, editar descripción, puntos, prioridad) | ✅ | ✅ | ❌ |
| **Asignar Tareas** (Asignarse a sí mismo o a otros) | ✅ | ✅ | ❌ |
| **Mover Tarjetas** (Arrastrar y soltar entre columnas) | ✅ | ✅ | ❌ |
| **Comentar en Tarjetas** (Añadir comentarios a hilos) | ✅ | ✅ | ❌ |
| **Ver Tablero y Tareas** (Acceso de lectura a todo) | ✅ | ✅ | ✅ |
| **Ver Métricas y Gráficos** (Burn-down, velocidad) | ✅ | ✅ | ✅ |

---

## 🛠️ Detalles de Implementación Técnica (DRF & Channels)

1. **REST API Permisos (`backend/apps/projects/permissions.py`)**:
   - Implementaremos un permiso personalizado de Django REST Framework llamado `IsProjectMember`.
   - Este permiso validará si el usuario autenticado pertenece a la tabla `ProjectMember` del proyecto en cuestión.
   - Acciones de escritura destructiva (ej. `PATCH/PUT` de proyectos, columnas o sprints) se validarán verificando que `role == 'ADMIN'`.
   - Acciones de escritura normales (ej. crear tareas, moverlas) se permitirán si el rol es `ADMIN` o `MEMBER`.
   - Si el rol es `VIEWER`, la API rechazará cualquier petición que no sea `GET` (Safe Methods).

2. **WebSocket Autorización (`backend/apps/realtime/consumers.py`)**:
   - Durante la negociación del apretón de manos (handshake) del WebSocket, extraeremos el `token` JWT desde la consulta URL (query string).
   - Validaremos el usuario y buscaremos si es miembro del proyecto/tablero al que se intenta conectar.
   - Si el usuario tiene rol de `VIEWER` y envía un mensaje WebSocket del tipo `task_move` o `presence_update`, el WebSocket responderá con un evento de error `PERMISSION_DENIED` y no retransmitirá la acción al grupo de WebSockets.
