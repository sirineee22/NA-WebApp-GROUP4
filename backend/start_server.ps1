Write-Host "Starting Linear System Solver Backend Server..." -ForegroundColor Green
Write-Host ""
Write-Host "Make sure you have Python and the required packages installed." -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    python main.py
} catch {
    Write-Host "Error starting server. Make sure Python is installed and in your PATH." -ForegroundColor Red
    Write-Host "You can also try: python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"
