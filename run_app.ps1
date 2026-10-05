Write-Host "=====================================================================" -ForegroundColor Green
Write-Host " OR-Quest: IE 214 Introductory Operations Research Gamified Hub" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "Starting application server on http://localhost:8000 ..." -ForegroundColor Yellow

Start-Process "http://localhost:8000"
python -m uvicorn app.backend.server:app --host 127.0.0.1 --port 8000 --reload
