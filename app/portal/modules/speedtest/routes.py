import os
from fastapi import APIRouter, Request, Response, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.portal.core.security import get_current_customer_optional
from app.portal.services.customer_service import PortalCustomerService

router = APIRouter(prefix="/speedtest", tags=["Portal Speedtest"])


def _generate_speedtest_bytes(total_bytes: int):
    chunk_size = 65536  # 64 KB
    sent = 0
    while sent < total_bytes:
        size = min(chunk_size, total_bytes - sent)
        yield os.urandom(size)
        sent += size


@router.get("/ping")
def speedtest_ping():
    """Endpoint Ping RTT super ringan untuk menghitung latensi & jitter riil."""
    return Response(
        content="pong",
        media_type="text/plain",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    )


@router.get("/download")
def speedtest_download(bytes: int = 15728640):
    """Endpoint Download mengalirkan bytes acak (incompressible) untuk mengukur throughput riil."""
    safe_size = max(1048576, min(bytes, 52428800))  # 1MB - 50MB
    headers = {
        "Content-Type": "application/octet-stream",
        "Content-Length": str(safe_size),
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache"
    }
    return StreamingResponse(_generate_speedtest_bytes(safe_size), headers=headers)


@router.post("/upload")
async def speedtest_upload(request: Request):
    """Endpoint Upload menerima binary payload dan menghitung throughput upload riil."""
    total_bytes = 0
    async for chunk in request.stream():
        total_bytes += len(chunk)
    return Response(
        content=f'{{"ok":true,"received_bytes":{total_bytes}}}',
        media_type="application/json",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    )


@router.post("/save")
async def speedtest_save_result(request: Request, db: Session = Depends(get_portal_db)):
    """Simpan hasil speed test pelanggan ke database agar persisten."""
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Unauthorized"})

    id_pelanggan = cust.get("id_pelanggan")
    try:
        body = await request.json()
        download = body.get("download")
        upload = body.get("upload")
        ping = body.get("ping")
        jitter = body.get("jitter")
        pel = PortalCustomerService.save_speedtest_results(
            db=db,
            id_pelanggan=id_pelanggan,
            download=download,
            upload=upload,
            ping=ping,
            jitter=jitter
        )
        if not pel:
            return JSONResponse(status_code=404, content={"ok": False, "message": "Pelanggan tidak ditemukan"})
        db.commit()
        db.refresh(pel)

        return {
            "ok": True,
            "message": "Hasil pengujian berhasil disimpan",
            "data": {
                "download": float(pel.last_speed_download) if pel.last_speed_download is not None else None,
                "upload": float(pel.last_speed_upload) if pel.last_speed_upload is not None else None,
                "ping": pel.last_speed_ping,
                "jitter": pel.last_speed_jitter,
                "tested_at": pel.last_speed_test_at.strftime("%Y-%m-%d %H:%M:%S") if pel.last_speed_test_at else None
            }
        }
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"ok": False, "message": str(e)})

