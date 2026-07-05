@echo off
title ExamGenie - Services Launcher
echo =======================================================
echo           ExamGenie AI Study Assistant
echo =======================================================
echo.

echo Launching Python FastAPI RAG Service...
start "ExamGenie - Python AI Service" cmd /k "cd backend\python && echo Activating virtual environment... && if exist venv (call venv\Scripts\activate && uvicorn main:app --reload --port 8000) else (echo Warning: Virtual environment 'venv' not found! Create one first.)"

echo Launching Node.js Express API Gateway...
start "ExamGenie - Express Gateway" cmd /k "cd backend\express && echo Starting Express gateway... && npm run dev"

echo Launching Next.js Student Portal...
start "ExamGenie - Next.js Frontend" cmd /k "cd frontend && echo Starting Next.js development server... && npm run dev"

echo.
echo =======================================================
echo All services triggered in separate terminal windows!
echo Please make sure your .env configurations are set up.
echo =======================================================
pause





