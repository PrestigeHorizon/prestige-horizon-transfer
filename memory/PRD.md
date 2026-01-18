# Prestige Horizon Transfer App - PRD

## Original Problem Statement
Build a money transfer app for Prestige Horizon Inc. that allows customers to initiate transfers using Western Union, MoneyGram, Ria, MTN Mobile Money, or Moov Mobile Money. The company has business partnerships with these providers.

## User Personas
1. **Customers**: Users who need to send money locally and internationally (primarily in Burkina Faso region)
2. **Admins**: Company staff who process and manage transfer requests

## Core Requirements (Static)
- User registration and authentication (JWT-based)
- Multi-provider transfer request system (Western Union, MoneyGram, Ria, MTN, Moov)
- Transfer fee calculation per provider
- Transfer tracking with status updates
- Admin dashboard for managing requests
- Premium black & gold branding matching company logo

## What's Been Implemented (January 18, 2025)
### Backend (FastAPI + MongoDB)
- ✅ User authentication (register, login, JWT tokens)
- ✅ Provider information with fee structures
- ✅ Transfer CRUD operations
- ✅ Admin endpoints (stats, transfer management, status updates)
- ✅ Fee calculation per provider

### Frontend (React + Tailwind + Shadcn/UI)
- ✅ Landing page with hero, features, provider badges
- ✅ Login and Registration pages
- ✅ User Dashboard with stats and recent transfers
- ✅ New Transfer (3-step wizard: provider → receiver → confirm)
- ✅ Transfer History with search and filters
- ✅ Transfer Details with tracking info
- ✅ Admin Dashboard with stats and transfer management
- ✅ Profile page
- ✅ Dark theme with gold accents matching logo

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (Important)
- Email notifications on transfer status changes
- Real-time exchange rate integration
- Receipt/PDF generation for completed transfers
- Password reset functionality

### P2 (Nice to Have)
- SMS notifications via Twilio
- Multi-language support (French)
- Transfer scheduling
- Recurring transfers
- Analytics dashboard

## Admin Credentials
- Email: admin@prestigehorizon.com
- Password: admin123

## Next Tasks
1. Add email notifications for transfer status changes
2. Implement password reset flow
3. Add French language support
4. Generate PDF receipts
