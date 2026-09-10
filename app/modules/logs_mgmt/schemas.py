from typing import Optional
from pydantic import BaseModel

class LogFilterParams(BaseModel):
    q: Optional[str] = None
    status: Optional[str] = None
    date_filter: Optional[str] = "today"
    page: int = 1
    limit: int = 50
