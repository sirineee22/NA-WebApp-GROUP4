# 🚨 URGENT: Start Your Backend Server!

## ❌ Current Problem
Your frontend is getting **404 errors** because the backend server is not running!

## ✅ Quick Fix (3 steps)

### Step 1: Open Terminal/Command Prompt
```bash
cd NA-WebApp-GROUP4/backend
```

### Step 2: Start the Backend Server
```bash
python main.py
```

### Step 3: Verify It's Running
You should see:
```
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## 🔧 Alternative Commands

### If `python` doesn't work, try:
```bash
python3 main.py
```

### If you have uvicorn installed:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Windows PowerShell:
```bash
.\start_server.ps1
```

### Windows Command Prompt:
```bash
start_server.bat
```

## 🧪 Test the Backend

Once running, test with:
```bash
python test_linear_system.py
```

Expected output:
```
✅ Success!
   Solution type: unique
   Solution: x = 1.0000, y = 3.0000
```

## 🌐 Check Backend Status

Open in browser: `http://localhost:8000/docs`

You should see the FastAPI documentation page.

## 🚫 Common Issues

### Port 8000 already in use:
```bash
python main.py --port 8001
```
Then update frontend to use port 8001.

### Python not found:
Install Python from https://python.org

### Missing packages:
```bash
pip install -r requirements.txt
```

## 🎯 What Happens After Starting Backend

1. ✅ **404 errors disappear**
2. ✅ **"Solve System" button works**
3. ✅ **Shows solution: x = 1, y = 3**
4. ✅ **Graph displays intersection point**
5. ✅ **No more "Failed to solve system"**

## 💡 Pro Tip
Keep the backend terminal open while using the frontend. The server needs to stay running!
