FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 TZ=America/Sao_Paulo
WORKDIR /app

COPY requirements.txt .
# "scrapling install" baixa o Chromium e as bibliotecas do sistema usadas pelo StealthyFetcher (último recurso).
RUN pip install --no-cache-dir -r requirements.txt \
 && scrapling install \
 && rm -rf /var/lib/apt/lists/*

COPY instagram.py .

CMD ["python", "instagram.py"]
