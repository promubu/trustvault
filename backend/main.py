"""
Main application entry point for Vercel Serverless Functions and ASGI runners.
Exposes the FastAPI instance 'app' defined in app.main.
"""
from app.main import app

__all__ = ["app"]
