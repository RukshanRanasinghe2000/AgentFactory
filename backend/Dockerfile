FROM python:3.10-slim

RUN useradd -m -u 10001 appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER 10001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
