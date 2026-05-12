# Development

> **Note:** นี่คือ template มาตรฐาน ให้ปรับรายละเอียดตาม project ที่นำไปใช้

---

## Role Overview
Development team รับผิดชอบการพัฒนาระบบตาม requirement และ design ที่ได้รับ ครอบคลุมตั้งแต่ Frontend, Backend, Mobile จนถึง Infrastructure

---

## Key Responsibilities
- พัฒนา feature ตาม User Story และ Acceptance Criteria
- ออกแบบ system architecture และ database schema
- เขียน unit test และ integration test
- ทำ code review และรักษา code quality
- ร่วมกับ DevOps ในการ deploy และ monitor ระบบ

---

## Key Deliverables
- Source Code (พร้อม version control)
- Technical Design Document (TDD)
- API Documentation
- Database Schema / ERD
- Unit & Integration Test
- Deployment Runbook

---

## Tools & Standards
- **Version Control:** Git, GitHub, GitLab, Bitbucket
- **CI/CD:** GitHub Actions, Jenkins, Azure DevOps
- **Containerization:** Docker, Kubernetes
- **Code Quality:** SonarQube, ESLint, Prettier
- **API:** RESTful, GraphQL, OpenAPI (Swagger)
- **Standard:** SOLID Principles, Clean Code, 12-Factor App

---

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), React, Vanilla CSS (Premium UI) |
| Backend | Next.js Server Actions, Node.js |
| Database | Supabase (PostgreSQL), Transactional RPC Functions |
| Cloud / Infrastructure | Supabase Cloud, GitHub (Version Control) |
| Other | Bcrypt (PIN Hashing), Resend (Email), Lucide React (Icons) |

---

## Project-Specific Details
| Item | Detail |
|------|--------|
| Project Name | DOWA IT System (ระบบจัดการงานไอที Dowa) |
| Architecture Pattern | Unified Next.js Monolith (Server Actions Driven) |
| Branching Strategy | Trunk-based (Fast Iteration & Integration) |
| Coding Convention | Zero-Trust Security, Full Audit Trail, Server-side PIN Check |
| Performance Requirement | Responsive UI, Image Compression (<150kb), Real-time Dashboard |
