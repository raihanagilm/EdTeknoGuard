"""
app/db/models.py - Backward Compatibility Shim pointing to app.models.models
"""
from app.models.models import *  # noqa: F401, F403
