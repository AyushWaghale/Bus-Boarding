# Deployment Guide - Bus Boarding Sequence Generator

This guide explains how to deploy the full-stack Bus Boarding Sequence Generator application (Express backend + Vite React frontend).

---

## 🌐 Architecture Overview
- **Backend API**: Node.js / Express running on a port (e.g., hosted on Render or Railway).
- **Frontend App**: Vite React (hosted on Vercel, Netlify, or Render).

---

## ⚡ Option 1: Vercel (Frontend) + Render (Backend) — *Recommended & Free*

### Part 1: Deploy the Backend on Render
Render is a cloud platform that makes it easy to host backend APIs for free.

1. Go to [Render.com](https://render.com) and log in with your GitHub account.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository (`Bus-Boarding`).
4. Configure the Web Service settings:
   - **Name**: `bus-boarding-backend` (or any custom name)
   - **Root Directory**: `backend` (This points to the backend folder)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
5. Click **Create Web Service**. 
6. Render will build and deploy the backend. Once active, copy the live URL (e.g., `https://bus-boarding-backend.onrender.com`).

---

### Part 2: Deploy the Frontend on Vercel
Vercel is the easiest and fastest way to deploy React Vite applications.

1. Go to [Vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **Add New...** and select **Project**.
3. Import your GitHub repository (`Bus-Boarding`).
4. In the Project configuration:
   - **Framework Preset**: Select **Vite**.
   - **Root Directory**: Set this to `frontend`.
   - **Environment Variables**: Expand this section and add the backend API address:
     - **Key**: `VITE_API_URL`
     - **Value**: `https://your-backend-url.onrender.com/api` (Use the URL copied from Render in Part 1)
5. Click **Deploy**.
6. Vercel will build and deploy your frontend in seconds.

---

## ⚡ Option 2: Monorepo Deployment on Railway — *Super Simple*
Railway lets you host both services in a single workspace.

1. Sign up on [Railway.app](https://railway.app) and connect your GitHub.
2. Click **New Project** -> **Deploy from GitHub repo** and select `Bus-Boarding`.
3. Railway will auto-detect the folders. You can deploy them as two separate services:
   - **Service 1 (Backend)**:
     - Set root directory to `backend`
     - Start command: `npm start`
   - **Service 2 (Frontend)**:
     - Set root directory to `frontend`
     - Build command: `npm run build`
     - Env variable: `VITE_API_URL` = `<your-backend-service-url>/api`

---

## 🛠️ Local Environment Variable Setup
During local development, the frontend automatically falls back to `http://localhost:5000/api`. If you want to configure it explicitly:
1. Create a `frontend/.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
2. When deploying to production (Vercel/Netlify), set `VITE_API_URL` in the hosting dashboard to point to your live backend endpoint.
