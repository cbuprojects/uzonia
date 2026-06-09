#!/bin/bash

echo "Starting backend on port 8739.."
(
    source .venv/bin/activate
    cd backend
    gunicorn main:app \
        -k uvicorn.workers.UvicornWorker \
        --workers 4 \
        --bind 0.0.0.0:8739
) &

echo "Starting frontend on port 4837..."
(
    cd frontend
    npm run dev -- --host 0.0.0.0 --port 4837
) &

echo "Both Backend and Frontend started!"
wait