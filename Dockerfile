FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY uv.lock /app/uv.lock
COPY src /app/src

RUN python -m pip install --upgrade pip && \
    python -m pip install .

EXPOSE 8000

ENV PORT=8000

CMD ["python", "-m", "uvicorn", "opentlu.server:app", "--host", "0.0.0.0", "--port", "8000"]

