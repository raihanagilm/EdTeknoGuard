# EdTeknoGuard - Production image
# Base: Python 3.10-slim (ringan & stabil untuk FastAPI + TiDB/PyMySQL)
FROM python:3.10-slim

# - PYTHONDONTWRITEBYTECODE: cegah file .pyc dalam image
# - PYTHONUNBUFFERED: log langsung keluar (docker logs)
# - TZ: zona waktu Waktu Indonesia Barat (WIB)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Jakarta

WORKDIR /app

# Atur zona waktu OS ke Asia/Jakarta (WIB)
RUN apt-get update && apt-get install -y --no-install-recommends tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# Salin & install dependensi lebih dulu untuk memanfaatkan layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Jalankan sebagai user non-root (best practice keamanan)
RUN addgroup --system app && adduser --system --ingroup app app

# Salin kode aplikasi (pemilik: app)
COPY --chown=app:app app ./app
COPY --chown=app:app templates ./templates
COPY --chown=app:app static ./static
COPY --chown=app:app portal_pelanggan ./portal_pelanggan

# Folder runtime untuk scan_state.json (untuk hasil volume mount docker-compose)
RUN mkdir -p /app/data && chown -R app:app /app

USER app

EXPOSE 8000

# Healthcheck: cek root path aplikasi
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/login', timeout=5).status==200 else 1)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]