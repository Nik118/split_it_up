# Split It Up (Backend API)

A robust backend API for tracking expenses, splitting bills, and managing group balances. Built with modern Python web technologies.

## Features

- **User Authentication**: Secure JWT-based authentication for user accounts.
- **Group Management**: Create groups, invite members, and track shared expenses.
- **Expense Tracking**: Add, edit, and delete shared expenses.
- **Balance Calculation**: Automatically calculate who owes who within a group to settle debts efficiently.
- **Receipt Parsing (AI)**: AI-powered receipt scanning and parsing for quick expense entry.
- **Real-time Activity (WS)**: WebSockets support for real-time notifications and activity feeds.

## Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: PostgreSQL (with `asyncpg`)
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **AI Integration**: Google Generative AI (Gemini)
- **Formatting**: Black & isort

## Local Setup

### 1. Prerequisites
- Python 3.10+
- PostgreSQL database

### 2. Installation
Clone the repository and install the dependencies:
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the root directory based on the configuration required in `core.config`:
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

### 5. Running the Server
Start the FastAPI development server:
```bash
uvicorn main:app --reload
```
The API will be available at `http://127.0.0.1:8000`. 
Interactive Swagger UI documentation is available at `http://127.0.0.1:8000/docs`.

## API Endpoints

Once the server is running, access the interactive API documentation at `http://127.0.0.1:8000/docs`.

**Core Endpoints:**
- `GET /`: Root endpoint.
- `GET /health`: Uptime monitoring endpoint.
- `POST /auth/register`: Register a new user.
- `POST /auth/login`: Authenticate and get JWT token.

**Application Endpoints:**
- `GET /users/me`: Get current authenticated user details.
- `POST /groups/`: Create a new expense group.
- `POST /expenses/`: Add a new shared expense.
- `GET /balances/{group_id}`: Get calculated balances for a group.
- `POST /ai/parse-receipt`: Upload and parse a receipt using Gemini AI.
- `WS /ws/activity`: Real-time WebSocket connection for group activity.

## Deployment

This app is configured for deployment on platforms like Render. A `render.yaml` file is included for infrastructure-as-code deployment, and a `/health` endpoint is available for uptime monitoring.