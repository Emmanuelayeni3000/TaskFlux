# TaskFlux Backend

TaskFlux backend is a TypeScript Express service using Prisma ORM (SQLite) for persistence and JWT authentication.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Generate the Prisma client and apply migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

The API listens on `http://localhost:5000` by default.

## Available Scripts

- `npm run dev` – start the API with hot-reload (ts-node-dev)
- `npm run build` – compile TypeScript to JavaScript in `dist`
- `npm start` – run the compiled server
- `npm run prisma:migrate` – shorthand for `prisma migrate dev`
- `npm run prisma:generate` – regenerate the Prisma client
- `npm run prisma:studio` – open Prisma Studio UI
- Swagger UI available at `http://localhost:5000/docs`

## Environment Variables

| Variable | Description |
| --- | --- |
| `PORT` | API port (defaults to 5000) |
| `DATABASE_URL` | Prisma connection string (SQLite by default) |
| `JWT_SECRET` | Secret used to sign JWT access tokens |
| `CORS_ORIGIN` | Comma-separated list of allowed origins |

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new account |
| `POST` | `/api/auth/login` | Authenticate and receive a JWT token |
| `GET` | `/api/tasks` | List tasks for the authenticated user |
| `POST` | `/api/tasks` | Create a new task |
| `PUT` | `/api/tasks/:id` | Update an existing task |
| `DELETE` | `/api/tasks/:id` | Remove a task |

All task routes require an `Authorization: Bearer <token>` header using the JWT issued by the authentication endpoints.
