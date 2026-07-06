# 📊 PlanFlow - Real-time Kanban & Scrum Project Manager

PlanFlow is a production-grade, highly collaborative project management application that simulates a robust Kanban and Scrum workspace. It features instant real-time synchronization, visual WIP limit warnings, interactive burn-down charts, and granular role-based permissions (RBAC).

Built as a professional portfolio demonstration using **React (TypeScript)**, **Django (REST Framework + Channels)**, **SQLite**, and **Redis/InMemory Channels**.

---

## 🎯 Key Capabilities

- 🔄 **Real-time Collaboration**: Board updates, card dragging, and collaborator presence (mouse pointers and card views) sync instantly over WebSockets.
- 📉 **Sprint Metrics**: Automated Scrum metrics with a dynamic **Burn-down Chart** and historical **Team Velocity** comparisons powered by Recharts.
- ⚡ **Lexorank Order System**: Sequential string sorting on drag-and-drop actions, making card re-ranking extremely fast without bulk database rewrites.
- 🛡️ **Role-Based Access Control (RBAC)**: Enforced roles (`ADMIN`, `MEMBER`, `VIEWER`) across API endpoints and WebSockets (read more in [ROLES_AND_PRIVILEGES.md](backend/ROLES_AND_PRIVILEGES.md)).
- 🚀 **SQLite Tuning**: Configured SQLite for database portability, enabling write-ahead logging (WAL) and foreign keys for portfolio usability.
- 🤖 **CI/CD Integration**: Preconfigured GitHub Actions pipeline (.github/workflows/ci.yml) validating linting, formatting, and unit tests on push.

---

## 📦 Project Directory Structure

```
project-manager/
├── .github/workflows/ci.yml       # CI/CD Automated Workflow
├── backend/                       # Python Django Backend
│   ├── apps/                      # Django App Modules
│   │   ├── users/                 # Custom Auth & JWT viewsets
│   │   ├── projects/              # Projects, Organizations & RBAC Permissions
│   │   ├── boards/                # Board columns, WIP Limits & Lexorank calculations
│   │   ├── tasks/                 # Task models, soft deletes, comments & audit histories
│   │   ├── sprints/               # Sprints & dynamic burn-down calculations
│   │   └── realtime/              # WebSocket Consumers & Channel layer routers
│   ├── utils/                     # Lexorank sequencing calculations
│   └── core/                      # Settings, ASGI/WSGI routers
└── frontend/                      # React TypeScript Frontend
    ├── src/
    │   ├── components/            # UI components (Button, Modal, Input)
    │   ├── features/              # Feature modules (auth, projects, boards, sprints)
    │   ├── store/                 # Zustand Global stores (auth, board, WS)
    │   └── services/              # API Client & endpoint configurations
```

---

## 🛠️ Quick Start

### 1. Run the Backend (Django)

Make sure you have Python 3.10+ installed.

```bash
# Navigate to backend
cd backend

# Create & activate virtual environment (Windows)
py -m venv venv
.\venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Create database and apply migrations
python manage.py migrate

# Seed the database with rich, realistic project data
python manage.py seed_data

# Start ASGI dev server (Daphne runs on port 8000)
python manage.py runserver
```

*Note: The seed script creates realistic projects, sprints, tasks, comments, and task logs. You can log in using these mock users (password: `password123`):*
- `alex_pm` (Admin / Project Manager)
- `sarah_dev` (Member / Developer)
- `elon_viewer` (Viewer / Stakeholder)

### 2. Run the Frontend (React + Vite)

Ensure Node.js 18+ is installed.

```bash
# Navigate to frontend
cd frontend

# Install package dependencies
npm install

# Run the local development server (runs on http://localhost:5173)
npm run dev
```

---

## 🔍 Verification & Unit Tests

To execute the Python unit test suite:
```bash
cd backend
python manage.py test
```

To run a production-ready build check for the frontend:
```bash
cd frontend
npm run build
```
