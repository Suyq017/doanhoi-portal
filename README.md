# Student Union Activity Management & Q&A System

A full-stack platform for managing student-union activities, participation, fees, documents, permissions, and an AI-powered Q&A assistant.

This project was developed for the Student Union at Ho Chi Minh City University of Technology (HCMUT). It combines an administrative portal for staff with student-facing workflows in one system.

## What this project demonstrates

- Modular NestJS backend with PostgreSQL and TypeORM
- React and TypeScript frontend with reusable feature modules
- Role-based access control (RBAC) and permission-aware UI
- Student-union activity management, registration, approval, scoring, and reporting
- Document and template processing workflows
- PayOS payment integration
- AWS S3 file storage
- Retrieval-augmented generation (RAG) chatbot for system Q&A
- Docker-based local development and GitLab CI/CD
- Monitoring and load-testing workflows

## Main features

| Area | Capabilities |
| --- | --- |
| Authentication | JWT authentication, session handling, and protected routes |
| Users and organizations | User import/export, classes, departments, organizations, and memberships |
| Permissions | Role and permission management with granular module actions |
| Activities | Create activities, configure limits, manage participants, approve registrations, and score results |
| Templates | Upload, manage, and process Word document templates |
| Payments | Configure fee campaigns and process payments with PayOS |
| Reports | Student activity reports and administrative summaries |
| Q&A assistant | RAG-based answers over system and activity data |

## Technology stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query  
**Backend:** NestJS, TypeScript, TypeORM, PostgreSQL, Swagger  
**Infrastructure:** Docker Compose, Nginx, GitLab CI/CD, Prometheus, Grafana  
**Integrations:** Google OAuth, PayOS, AWS S3, Gemini/Ollama-based chatbot workflows

## Repository structure

```text
backend/      NestJS API, database entities, migrations, and integrations
frontend/     React application and shared UI components
docker/       Database and service initialization
load-test/    k6 performance tests
docs/         Curated architecture, feature, deployment, and testing documentation
report/       Thesis report and selected product screenshots/diagrams
```

## Getting started

### Prerequisites

- Node.js 18 or newer
- Docker Desktop
- npm

### Install dependencies

```bash
npm run install:all
```

### Configure environment variables

Copy the relevant example files and provide local values. Never commit real credentials, API keys, OAuth secrets, database passwords, or deployment keys.

### Start the local database and application

```bash
npm run docker:up
npm run dev
```

The default local services are:

- Frontend: `http://localhost:9100`
- Backend API: `http://localhost:9200`
- Swagger API documentation: `http://localhost:9200/api`

### Build

```bash
npm run build
```

## Documentation

- [Architecture and system design](docs/architecture/)
- [Feature documentation](docs/features/)
- [Architecture diagrams](docs/diagrams/)
- [Testing and API setup](docs/testing/)
- [Thesis report and screenshots](report/LuanVan/)

Historical implementation notes and internal planning documents are retained locally for project traceability, but are excluded from the public repository.

## Project context

This repository is intended as a technical portfolio project. The implementation and documentation reflect a real academic software project with multiple contributors and an emphasis on maintainability, modular design, deployment, observability, and testing.

## License

Developed for academic and demonstration purposes at HCMUT.
