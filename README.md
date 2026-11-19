# NestWell.BT — Trusted Long-Term Childcare Booking Platform in Bhutan

NestWell.BT connects families across Bhutan (Thimphu, Paro, Phuentsholing, Punakha, Gelephu, Bumthang, Samdrup Jongkhar, and beyond) with verified, trustworthy caretakers and nannies for stable, long-term childcare commitments (minimum 6 calendar months).

## Architecture Overview
- **Frontend (`client/`)**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, TanStack Query, React Hook Form + Zod, Framer Motion, Lucide React.
- **Backend (`server/`)**: Node.js, Express, TypeScript, MySQL 8 (`mysql2/promise` with ACID transactions), JWT Access + HttpOnly Refresh Token rotation, Multer secure file uploads, Helmet, Rate Limiting.
- **Database (`server/src/database/`)**: Relational schema (`schema.sql`) and realistic Bhutanese seed data (`seed.sql`).

## Core Business Rules Implemented
1. **Six-Month Minimum Contract Rule**: Enforced at UI date/duration selection, Zod validation, Express API service layer, and MySQL `CHECK (duration_months >= 6)` constraint.
2. **Separated Billing Cadence**: Contract duration (6–24 months) is decoupled from payment schedule (`MONTHLY_INSTALLMENT` or `QUARTERLY_MILESTONE`), supported by an extensible Bhutan Payment Gateway adapter (`RMA / BOBL / BDBL` ready).
3. **Strict Verification Workflow**: Caretakers remain unverified (`PENDING`) until an Administrator reviews their uploaded Citizenship/ID document and approves their profile.
4. **Overlap Prevention**: Transactional date-overlap locks prevent double-booking a caretaker across overlapping contract windows.
5. **Zero-Flash Light & Dark Mode**: OS preference detection, persistent `localStorage` state, and pre-paint inline theme script.

## Quick Start

### 1. Database Setup
```bash
mysql -u root -p < server/src/database/schema.sql
mysql -u root -p < server/src/database/seed.sql
```

### 2. Backend Setup
```bash
cd server
cp .env.example .env
# Update DB_PASSWORD and JWT secrets in .env
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

## Demo Seed Accounts (Password for all: `NestWell@2026`)
- **Admin**: `admin@nestwell.bt`
- **Parent**: `tashi.dorji@example.bt`
- **Verified Caretaker**: `dechen.wangmo@example.bt`
- **Pending Caretaker**: `sonam.choden@example.bt`
