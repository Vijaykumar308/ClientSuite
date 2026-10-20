# ClientSuite Music — Master Implementation Plan & Task Tracker

> **Product:** ClientSuite Music (Multi-Tenant B2B SaaS for Music Directors & Studios)  
> **Tech Stack:** React (TypeScript + Vite), Node.js (Express + TypeScript), PostgreSQL (Prisma ORM)  
> **Deployment Target:** Localhost (Development) ➔ AWS EC2 (Production Ready)  
> **Based on:** `ClientSuite_Music_PRD.md`

---

## 📊 Project Roadmap Overview

```
Phase 0: Architecture Setup & Monorepo Foundation
   │
Phase 1: Database Schema & Multi-Tenant Data Layer (Prisma + PostgreSQL)
   │
Phase 2: Authentication & Authorization (Platform Admin, Tenant, Client)
   │
Phase 3: Tenant Workspace & Client Management System
   │
Phase 4: Project Management & Workflow Engine
   │
Phase 5: Audio Engine (Upload, Private Storage & Server-Side Previews)
   │
Phase 6: Client Portal & Player Experience (Feedback & Approvals)
   │
Phase 7: Payment Engine & Direct Settlement (Webhooks & Receipts)
   │
Phase 8: White-Label Branding Engine & Customization
   │
Phase 9: Platform Admin Dashboard & Global Analytics
   │
Phase 10: Production Readiness, Security Hardening & EC2 Deployment
```

---

## 📌 Phase 0: Architecture Setup & Monorepo Foundation

- [x] **TASK-0.1: Monorepo & Directory Scaffolding**
  - Initialize clean workspace structure (`client/`, `server/`, `shared/` if needed).
  - Setup root `package.json` with scripts (`npm run dev`, `npm run build`, `npm run test`).
  - Configure `.gitignore` for node modules, environment files, build artifacts, and audio storage.

- [x] **TASK-0.2: Backend Express + TypeScript Initialization**
  - Setup `server/` with `tsconfig.json`, `package.json`, and directory structure (`src/config`, `src/controllers`, `src/middlewares`, `src/routes`, `src/services`, `src/utils`).
  - Configure development live-reload (`tsx` or `ts-node-dev`).
  - Setup global middleware: `cors`, `helmet`, `express.json()`, `morgan` logger, centralized error handling.
  - Setup `.env.example` with standard config keys (Port, DB URL, JWT secrets, storage paths).

- [x] **TASK-0.3: Frontend React + Vite + TypeScript Initialization**
  - Scaffold `client/` using Vite with React + TypeScript template.
  - Setup modern design system and CSS tokens (responsive layout, dark/sleek theme, typography).
  - Setup client folder structure (`src/api`, `src/components`, `src/hooks`, `src/pages`, `src/types`, `src/context`).
  - Configure Axios/Fetch API client with interceptors for auth tokens and error handling.

- [ ] **TASK-0.4: Audio Processing Toolchain Setup**
  - Verify and configure `ffmpeg` / `fluent-ffmpeg` wrapper on the server for audio metadata extraction and preview trimming.
  - Setup local private uploads folder with isolation structure (`/uploads/tenants/:tenantId/projects/:projectId/`).

---

## 🗄️ Phase 1: Database Schema & Multi-Tenant Data Layer (PostgreSQL + Prisma)

- [ ] **TASK-1.1: Prisma Initialization & Connection**
  - Initialize Prisma in `server/prisma/schema.prisma`.
  - Connect to local PostgreSQL database and test connection.

- [ ] **TASK-1.2: Core Multi-Tenant Models Definition**
  - Define `PlatformAdmin` (email, password_hash, role, audit logs).
  - Define `Tenant` (id, name, slug, status: `ACTIVE`, `TRIAL`, `SUSPENDED`, `CANCELLED`, plan, createdAt).
  - Define `User` / `TenantMembership` (id, tenantId, email, passwordHash, role: `TENANT_ADMIN`, `TEAM_MEMBER`).
  - Define `TenantBranding` (tenantId, businessName, logoUrl, brandColor, themeMode, customDomain).

- [ ] **TASK-1.3: CRM & Project Models Definition**
  - Define `Client` (id, tenantId, name, email, phone, company, status, notes).
  - Define `Project` (id, tenantId, clientId, name, description, status, price, currency, paymentStatus, deliveryStatus, dueDate).
  - Define `ProjectAsset` (id, tenantId, projectId, versionNumber, originalPath, previewPath, durationSeconds, fileSize, mimeType, status).
  - Define `ProjectFeedback` (id, tenantId, projectId, assetId, authorRole, authorName, comment, timestamp).
  - Define `ProjectApproval` (id, tenantId, projectId, approvedBy, approvedAt, clientIp).

- [ ] **TASK-1.4: Payment, Audit & Notification Models**
  - Define `TenantPaymentGateway` (tenantId, provider, publicKey, encryptedSecretRef, isLive, currency).
  - Define `PaymentTransaction` (id, tenantId, projectId, amount, currency, status, gatewayTxId, rawWebhookData, paidAt).
  - Define `AuditLog` (id, tenantId, actorId, actorType, action, metadata, ipAddress, createdAt).
  - Define `Notification` (id, tenantId, recipientEmail, type, title, body, isRead, sentAt).

- [ ] **TASK-1.5: Migrations & Seed Scripts**
  - Create initial migration (`prisma migrate dev`).
  - Write seed script (`prisma/seed.ts`) to populate:
    - 1 Platform Admin (`admin@clientsuite.local`)
    - 2 Sample Tenants (Music Director studios)
    - Sample Clients, Projects, and Assets for rapid testing.

---

## 🔐 Phase 2: Authentication & Authorization Engine

- [ ] **TASK-2.1: Multi-Role Auth Architecture**
  - Implement JWT authentication with refresh token strategy.
  - Create separate auth contexts/guards:
    1. `PlatformAdminGuard`: SaaS owner routes (`/api/admin/*`).
    2. `TenantAuthGuard`: Music Director & staff routes (`/api/tenant/*`).
    3. `ClientAccessGuard`: Private token / PIN / Magic link for client portal (`/api/portal/*`).

- [ ] **TASK-2.2: Tenant Isolation Middleware (Strict Data Wall)**
  - Implement automated tenant boundary enforcement in Express requests (`req.tenantId`).
  - Prisma query extension or service-level guard to ensure every DB query strictly filters by `tenantId`.
  - Prevent IDOR (Insecure Direct Object References) across tenants.

- [ ] **TASK-2.3: Frontend Auth State & Routing**
  - Setup React Router with protected route wrappers (`RequireAdmin`, `RequireTenant`, `RequireClient`).
  - Auth context and persistent session handling with token refresh.
  - Login screens: Platform Admin login, Tenant Director login, Client secure link entry.

---

## 👥 Phase 3: Tenant Workspace & Client CRM

- [ ] **TASK-3.1: Tenant Onboarding & Workspace Dashboard**
  - Tenant signup and onboarding wizard.
  - Workspace dashboard overview (active projects counter, pending approvals, recent payments, storage usage).

- [ ] **TASK-3.2: Client Management Backend (CRUD & Search)**
  - REST endpoints for Clients: `POST /api/tenant/clients`, `GET /api/tenant/clients`, `GET /api/tenant/clients/:id`, `PUT /api/tenant/clients/:id`, `DELETE /api/tenant/clients/:id` (archive/restore).
  - Search, filter by status (`LEAD`, `ACTIVE`, `COMPLETED`, `ARCHIVED`), and pagination.

- [ ] **TASK-3.3: Client Management Frontend UI**
  - Clean client list table with search bar, status badges, and quick actions.
  - Client detail drawer/page showing client info, linked projects, and total revenue earned.
  - "New Client" modal with validation.

- [ ] **TASK-3.4: Client Private Access Links & Invitations**
  - Generate secure, cryptographically random, revocable access tokens for clients to access their projects.
  - Email notification trigger for client invitation.

---

## 🎵 Phase 4: Project Management & Workflow Engine

- [ ] **TASK-4.1: Project CRUD & State Machine Backend**
  - Project endpoints: Create, Read, Update, Status update, Delete.
  - Formal status transitions: `DRAFT` ➔ `PREVIEW_SHARED` ➔ `CHANGES_REQUESTED` ➔ `APPROVED` ➔ `AWAITING_PAYMENT` ➔ `PAID` ➔ `DELIVERED` ➔ `COMPLETED`.
  - Audited status changes with activity log.

- [ ] **TASK-4.2: Project Dashboard & Kanban / List View**
  - Project listing page with dual view (Kanban status board + searchable data table).
  - Filter by client, status, due date, and payment status.
  - Quick status changer and project metrics summary.

- [ ] **TASK-4.3: Project Detail Workspace**
  - Project header (status badge, client link, price & payment badge, delivery button).
  - Version history timeline (Audio v1, v2, v3...).
  - Client notes vs Internal private notes tabs.

---

## 🎧 Phase 5: Audio Engine (Upload, Private Storage & Preview Trimming)

- [ ] **TASK-5.1: Secure Audio Upload Handler**
  - File upload endpoint with `multer` supporting `.wav`, `.mp3`, `.aac`, `.flac`.
  - File validation (MIME type verification, file size limits e.g., 200MB).
  - Store full-length master file in isolated private storage directory (never public web root).

- [ ] **TASK-5.2: Server-Side Preview Generator (FFmpeg Pipeline)**
  - Background audio processing service:
    - Extract duration, bitrate, sample rate, waveform peaks data (for visual wave rendering).
    - Generate a clean preview clip (default: 10–15s configurable) from the start or designated cue point.
    - Save preview file separately (`preview_<assetId>.mp3`).
  - Non-blocking job execution with status updates (`PROCESSING` ➔ `READY` ➔ `FAILED`).

- [ ] **TASK-5.3: Controlled Audio Streaming API**
  - Protected endpoint for streaming preview audio (`GET /api/portal/projects/:token/preview/:assetId`).
  - HTTP Range header support for smooth seeking in browsers.
  - Security check: Never reveal original master file path or stream original audio to unauthorized clients.

- [ ] **TASK-5.4: Audio Versioning & Replacement**
  - Ability for music director to upload revisions (v1, v2, v3) with changelog notes.
  - Set active version for client review.

---

## 💻 Phase 6: Client Portal & Audio Player Experience

- [ ] **TASK-6.1: White-Labeled Client Portal Layout**
  - Public-facing responsive portal view accessible via secure project link (`/portal/:projectToken`).
  - Dynamic branding injection (tenant logo, brand colors, studio name, favicon).
  - Clean, distraction-free, premium client UI.

- [ ] **TASK-6.2: Custom Waveform Audio Player**
  - Interactive audio player with custom waveform visualization (using Wavesurfer.js or lightweight HTML5 Canvas).
  - Visual indicator showing preview limit (e.g. "15-second Preview Mode").
  - Play, pause, seek, volume controls, time elapsed/remaining.

- [ ] **TASK-6.3: Client Feedback & Revisions System**
  - Timestamped comment box (e.g., "At 0:08, add more bass").
  - Feedback thread between client and music director.
  - Direct "Request Changes" button with feedback submission.

- [ ] **TASK-6.4: One-Click Approval Workflow**
  - "Approve Track" action with confirmation modal.
  - Capture approval timestamp, client name, and IP address for records.
  - Automatically moves project status to `APPROVED` / `AWAITING_PAYMENT`.

- [ ] **TASK-6.5: Final Deliverable Download Center**
  - Secure unlock mechanism: Only unlocked if `paymentStatus == 'PAID'` (or if tenant enabled "Bypass payment for download").
  - Single-use, time-limited signed download link for master uncompressed audio (`.wav` / `.zip`).

---

## 💳 Phase 7: Payment Engine & Direct Settlement

- [ ] **TASK-7.1: Tenant Payment Gateway Configuration**
  - Tenant settings page to connect payment provider (Stripe Connect / Razorpay / PayPal).
  - Encrypted credential reference storage in database.
  - Currency selection (USD, EUR, INR, GBP, etc.) and invoice prefix settings.

- [ ] **TASK-7.2: Client Checkout Flow**
  - Checkout summary in Client Portal (itemized project fees, balance due).
  - Hosted / Embedded checkout session integration.
  - Clear pending/processing state handling.

- [ ] **TASK-7.3: Webhook Verification & Transaction Reconciliation**
  - Secure webhook endpoint for gateway callbacks (`/api/webhooks/payments/:provider`).
  - Webhook cryptographic signature verification.
  - Idempotent transaction processing (prevent duplicate entries).
  - Auto-update project payment status (`PAID`) and auto-unlock final delivery.

- [ ] **TASK-7.4: Receipts & Financial History**
  - Printable / downloadable payment receipt for client.
  - Tenant transaction log (gross amount, gateway fee, net amount, date, client reference).

---

## 🎨 Phase 8: White-Label Branding Engine

- [ ] **TASK-8.1: Branding Settings Backend**
  - Endpoints to update workspace branding: `PUT /api/tenant/branding`.
  - Image upload for logo and favicon with image optimization/resizing.

- [ ] **TASK-8.2: Theme Customizer UI**
  - Live preview customizer in Tenant Settings:
    - Primary brand color picker with accessible contrast checks.
    - Dark mode / Light mode toggle for client portal.
    - Custom studio footer and contact details.

- [ ] **TASK-8.3: Dynamic Client Portal Theme Injection**
  - CSS variable injection on the client portal based on tenant settings.
  - Clean fallback to default ClientSuite design if no custom branding provided.

---

## 👑 Phase 9: Platform Admin Dashboard (SaaS Owner)

- [ ] **TASK-9.1: Platform Metrics & KPI Engine**
  - Aggregate metrics endpoint: Total tenants, active tenants, total projects, storage consumed, new signups this month.
  - Database aggregation queries optimized for fast dashboard load.

- [ ] **TASK-9.2: Tenant Management & Lifecycle Controls**
  - Tenant list with search, filter (Active, Trial, Suspended), and sort.
  - Action menu: View workspace details, Suspend tenant, Reactivate tenant, Extend trial.
  - Audit logging of all platform admin actions.

- [ ] **TASK-9.3: Global Platform Configuration**
  - Global default preview duration (e.g. 15s max).
  - Global storage quotas and allowed audio formats.

---

## 🚀 Phase 10: Production Readiness, Security Hardening & EC2 Deployment

- [ ] **TASK-10.1: Security Hardening**
  - Rate limiting on auth endpoints and audio stream routes (`express-rate-limit`).
  - Input validation and sanitization (`zod` schemas for every request body).
  - Audit log verification for sensitive operations.

- [ ] **TASK-10.2: Production Build & Asset Optimization**
  - TypeScript compilation check (`tsc --noEmit`).
  - Vite production build optimization (code splitting, tree shaking).
  - Gzip / Brotli compression middleware.

- [ ] **TASK-10.3: AWS EC2 Deployment Setup**
  - Production `ecosystem.config.js` for PM2 process manager (with cluster mode and auto-restart).
  - Nginx reverse-proxy configuration template (SSL with Let's Encrypt, HTTP to HTTPS redirect, static frontend serving, `/api` proxying).
  - EC2 provisioning and deployment guide script (`deploy.sh`).
  - Automated PostgreSQL backup script (`pg_dump` to S3 or local cron).

---

## 📝 Current Progress & Next Immediate Task

- **Current Status:** Blueprint approved, PRD analyzed, implementation plan created.
- **Next Step:** Begin **Phase 0 (TASK-0.1 & TASK-0.2)** — Monorepo directory scaffolding and Express + TypeScript backend foundation.
