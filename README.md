# Split It Up

Split It Up is a full-stack expense tracking and bill-splitting application. It allows users to track shared expenses, automatically calculate simplified debts (who owes whom), and interact with an AI assistant to categorize expenses or ask questions about their financial status.

The repository is structured as a monorepo containing:
- **Backend**: A robust REST API built with modern Python web technologies (FastAPI, SQLAlchemy, asyncpg).
- **Frontend**: A sleek React SPA (Single Page Application) built with Vite (located in the `/frontend` directory).

## Features

- **User Authentication**: Secure JWT-based authentication for user accounts (with email verification and password reset flows).
- **Group Management**: Create groups, add friends, and track shared expenses within groups.
- **Expense Tracking**: Add, edit, delete, and comment on shared expenses. Supports multiple split methods (EQUAL, EXACT, PERCENTAGE, SHARE).
- **Balance Simplification**: Automatically calculate the minimum number of transactions needed to settle debts (Debt Simplification).
- **AI Integration**: AI-powered expense categorization and a conversational AI assistant for querying your balance using Google Gemini.
- **Receipt Parsing**: Mock OCR scanning for receipt uploads.
- **Real-time Activity (WS)**: WebSockets support for real-time notifications when expenses are added.

## Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: PostgreSQL (via `asyncpg` async driver)
- **ORM**: SQLAlchemy 2.0 (Async)
- **Migrations**: Alembic
- **AI Integration**: Google Generative AI (Gemini 1.5)
- **Code Quality**: Black, isort, autoflake, pytest

### Frontend
- **Framework**: React.js with Vite
- **Routing**: React Router
- **Build Tool**: npm

## Local Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm (for frontend)
- PostgreSQL database running locally or remotely

### 2. Backend Installation
Clone the repository and set up the Python virtual environment:
```bash
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the root directory. This configures the backend (`core.config`):
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/split_it_up
SECRET_KEY=your_super_secret_jwt_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### 4. Database Migrations
Run Alembic to apply the latest database schemas:
```bash
alembic upgrade head
```

### 5. Running the Backend Server
Start the FastAPI development server:
```bash
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`. 
Interactive Swagger UI documentation is available at `http://localhost:8000/docs`.

### 6. Running the Frontend
In a new terminal window, navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
The frontend will typically be available at `http://localhost:5173`.

## Core API Endpoints

Access the full interactive API documentation at `http://localhost:8000/docs`.

**Authentication (`/auth`)**
- `POST /auth/register` & `POST /auth/login`
- `GET /auth/verify` & password reset endpoints

**Users & Friends (`/users`)**
- `GET /users/me`: Current user details
- `POST /users/friends/{friend_id}`: Add a friend

**Groups (`/groups`)**
- `POST /groups`: Create group
- `POST /groups/{group_id}/members/{user_id}`: Add member
- `GET /groups/{group_id}/export/csv`: Export expenses to CSV

**Expenses & Activity (`/expenses`, `/activity`)**
- `POST /expenses`: Create expense with split calculations
- `GET /expenses`: List expenses
- `POST /expenses/{expense_id}/comments`: Comment on an expense
- `GET /activity`: View recent activity logs

**Balances & Settlements (`/balances`)**
- `GET /balances/simplify`: Get simplified debt transactions
- `POST /balances/settle`: Record a payment

**AI & Uploads (`/ai`, `/uploads`)**
- `POST /ai/categorize`: Predict expense category
- `POST /ai/chat`: Chat with your financial assistant
- `POST /uploads/scan`: Mock receipt scanner

**WebSockets (`/ws`)**
- `WS /ws/{user_id}`: Real-time event stream

## Deployment

This app is configured for full-stack deployment on [Render](https://render.com). 
A `render.yaml` file is included, which provisions two services:
1. **split-it-up-api**: The FastAPI backend (Python Web Service)
2. **split-it-up-web**: The React frontend (Static Site built with Vite, utilizing SPA rewrites)