#!/bin/bash
# Локальный запуск на Mac: подгружает .env и стартует сервер + сайт
# Сайт: http://localhost:5173  (порт 5000 на Mac занят AirPlay)
cd "$(dirname "$0")"
set -a; source .env; set +a
export PORT=5173
exec bash start.sh
