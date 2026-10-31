"""
app/db/init_db.py - Shim pointing to database/init_db.py
"""
import runpy

if __name__ == "__main__":
    runpy.run_module("database.init_db", run_name="__main__")
else:
    from database.init_db import *  # noqa: F401, F403
