# 🚀 Quick Start - Linear System Solver

## ✅ What's Working Now
- **Frontend**: React component with **JSXGraph** visualization (professional mathematical library)
- **Backend**: FastAPI with robust 2x2 linear system solver
- **Database**: SQLite with history tracking
- **CORS**: Configured for frontend-backend communication

## 🎯 Get It Running in 3 Steps

### Step 1: Start the Backend Server
```bash
cd NA-WebApp-GROUP4/backend
python main.py
```
**Expected Output:**
```
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Test the API (Optional)
```bash
cd NA-WebApp-GROUP4/backend
python test_linear_system.py
```
**Expected Output:**
```
✅ Success!
   Solution type: unique
   Solution: x = 1.0000, y = 3.0000
```

### Step 3: Use the Frontend
- Navigate to the Linear System Solver page
- Enter equations (e.g., `y = 2x + 1`, `y = -x + 4`)
- Click "Solve System"
- See the solution and **JSXGraph visualization**!

## 📊 What the System Solves

### Supported Formats
- `y = 2x + 1` (slope-intercept)
- `2x + 3y = 6` (standard form)
- `y = x` (simple form)
- `y = 5` (horizontal line)

### Solution Types
- **`unique`**: One intersection point
- **`infinite`**: Lines are the same (dependent equations)
- **`none`**: Lines are parallel (inconsistent)
- **`invalid`**: Bad format

## 🎨 Features
- **JSXGraph**: Professional mathematical visualization library
- **Interactive Controls**: Zoom, pan, zoom with mouse and keyboard
- **Real-time Updates**: Graph updates as you type equations
- **Solution Display**: Clear x, y coordinates
- **Error Handling**: Helpful error messages
- **History Tracking**: Saves solutions (when user_id provided)

## 🔧 Troubleshooting

### "Failed to solve system" Error
- **Backend not running**: Start with `python main.py`
- **Wrong port**: Check if port 8000 is available
- **CORS issues**: Backend is configured for localhost:3000/5173

### Graph Not Loading
- **JSXGraph CDN**: Already included in index.html
- **Browser console**: Check for JavaScript errors
- **Network**: Ensure access to cdn.jsdelivr.net

### Database Issues
- **Tables missing**: Run `python main.py` (creates tables automatically)
- **Permission errors**: Check file permissions in backend folder

## 🚀 Next Steps
1. **Test with different equations**
2. **Add user authentication** (set user_id in requests)
3. **Extend to 3x3 systems**
4. **Add step-by-step solutions**

## 💡 Pro Tips
- **JSXGraph Features**: Zoom with Ctrl+Scroll, pan with Shift+Click
- **Equations update automatically** in the graph
- **Backend handles all complex math calculations**
- **Professional mathematical visualization** with JSXGraph
