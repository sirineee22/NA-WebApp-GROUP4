# Linear System Solver - Simplified Version

## Overview
This is a simplified version of the Linear System Solver that uses the backend API instead of complex frontend logic. The component now focuses on user input and displays results from the robust backend solver.

## Features
- **Simple Input**: Enter equations in formats like `y = 2x + 1` or `2x + 3y = 6`
- **Backend Processing**: All mathematical calculations are handled by the FastAPI backend
- **Visual Graph**: Simple SVG-based visualization showing the lines and intersection point
- **Multiple Solution Types**: Handles unique solutions, infinite solutions, and no solutions
- **Error Handling**: Clear error messages for invalid inputs

## How to Use

### 1. Start the Backend Server
```bash
cd NA-WebApp-GROUP4/backend
python main.py
```
The server will run on `http://localhost:8000`

### 2. Test the API (Optional)
```bash
cd NA-WebApp-GROUP4/backend
python test_linear_system.py
```

### 3. Use the Frontend
- Navigate to the Linear System Solver page
- Enter your equations (e.g., `y = 2x + 1`, `y = -x + 4`)
- Click "Solve System"
- View the solution and graph

## Supported Equation Formats

### Slope-Intercept Form
- `y = 2x + 1`
- `y = -3x - 5`
- `y = x` (slope 1, y-intercept 0)
- `y = 5` (horizontal line)

### Standard Form
- `2x + 3y = 6`
- `-x + y = 2`
- `x + y = 0`

## Backend API Endpoint

**POST** `/api/solve-linear-system`

**Request Body:**
```json
{
  "eq1": "y = 2x + 1",
  "eq2": "y = -x + 4",
  "user_id": null
}
```

**Response:**
```json
{
  "solution": {
    "x": 1.0,
    "y": 3.0
  },
  "solution_type": "unique",
  "coeffs1": {"m": 2, "b": 1},
  "coeffs2": {"m": -1, "b": 4}
}
```

## Solution Types

- **`unique`**: One intersection point
- **`infinite`**: Lines are the same (dependent equations)
- **`none`**: Lines are parallel but different (inconsistent)
- **`invalid`**: Invalid equation format

## Graph Visualization

The component includes a simple SVG-based graph that shows:
- Grid lines and axes
- The two input equations as colored lines
- The solution point (if unique solution exists)
- Scale markers for easy reading

## Benefits of This Approach

1. **Separation of Concerns**: Frontend handles UI, backend handles math
2. **Maintainability**: Easier to debug and modify
3. **Reliability**: Backend math is more robust than frontend calculations
4. **Performance**: No heavy JavaScript libraries to load
5. **Scalability**: Can easily add more mathematical features to the backend

## Troubleshooting

### "Failed to solve system" Error
- Make sure the backend server is running on port 8000
- Check that the equations are in valid format
- Verify network connectivity between frontend and backend

### Graph Not Showing
- The graph is rendered using SVG, so it should work in all modern browsers
- Check browser console for any JavaScript errors

### Invalid Equation Format
- Use the supported formats listed above
- Avoid complex mathematical expressions
- Make sure equations are linear (no x², sin(x), etc.)

## Future Enhancements

- Support for more equation formats
- 3D visualization for systems with 3 variables
- Step-by-step solution display
- Export solutions to PDF
- Save favorite equations
- Share solutions with other users
