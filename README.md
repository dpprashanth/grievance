# Employee Grievance System

This application allows employees to submit and manage grievances based on their hierarchy (L1, L2, L3).

## Prerequisites
- Python 3.8+
- MySQL Server
- MySQL Workbench

## Setup Steps (Windows)


### 1. Install MySQL and Create Database
1. Install MySQL Server from [MySQL Downloads](https://dev.mysql.com/downloads/installer/). Use root password `DefaultPassword!`
2. Install MySQL workbench from [MySQL Downloads](https://dev.mysql.com/downloads/workbench/)
3. Open MySQL Workbench
4. Run the SQL script from `backend/init_db.sql` to initialize the database

### 2. Configure MySQL Credentials
- If your MySQL username or password is different, update the connection string in `backend/main.py`:
  ```python
  SQLALCHEMY_DATABASE_URL = "mysql+pymysql://<username>:<password>@localhost:3306/grievance_db"
  ```

### 3. Install Python and Dependencies
1. Down and install python from [Python Downloads](https://www.python.org/downloads/)
1. Open PowerShell and navigate to the backend folder:
   ```powershell
   cd backend
   ```
2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

### 4. Run the FastAPI Backend
1. Start the backend server:
   ```powershell
   python -m uvicorn main:app --reload
   ```

### 5. Run the Frontend
1. Open PowerShell and navigate to the frontend folder:
   ```powershell
   cd ..\frontend
   ```
2. Run a simple web server using python:
   ```powershell
   python -m http.server 8080
   ```
3. Open [http://localhost:8080](http://localhost:8080) in your browser.

## Usage
- **L1 Employees:** Submit grievances.
- **L2 Employees:** View and acknowledge grievances.
- **L3 Employees:** View escalated grievances.
- The `init_db.sql` file creates 6 users emp1, emp2 ... emp6, all having the same password `defaultpassword`.
- There are two users in each level of the hierarchy
   - emp1 and emp2 are L1. They have the option to see grievances and submit a new one  
   - emp3 and emp4 are L2. They have the option to see and acknowledge grievances  
   - emp5 and emp6 are L3. They see escalated grievances

## Notes
- Ensure MySQL server is running before starting the backend.
- The backend runs on `http://localhost:8000` by default.
- Update CORS settings in `main.py` if accessing from a different frontend URL.
