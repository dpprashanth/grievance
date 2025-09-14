
from config import ESCALATION_THRESHOLD_DAYS

from fastapi import FastAPI, Depends, HTTPException
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Enum, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
import enum
from pydantic import BaseModel

# In-memory session store (for demo purposes only)
logged_in_users = {}

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:DefaultPassword!@localhost:3306/grievance_db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class HierarchyLevel(enum.Enum):
    L1 = "L1"
    L2 = "L2"
    L3 = "L3"

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    hierarchy = Column(Enum(HierarchyLevel), nullable=False)
    username = Column(String(20), nullable=False, unique=True)
    password = Column(String(50), nullable=False)
    grievances = relationship(
        "Grievance",
        back_populates="submitter",
        foreign_keys="Grievance.submitter_id"
    )

class GrievanceStatus(enum.Enum):
    submitted = "submitted"
    acknowledged = "acknowledged"
    escalated = "escalated"

class Grievance(Base):
    __tablename__ = "grievances"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), nullable=False)
    status = Column(Enum(GrievanceStatus), default=GrievanceStatus.submitted)
    submitter_id = Column(Integer, ForeignKey("employees.id"))
    submitter = relationship(
        "Employee",
        back_populates="grievances",
        foreign_keys=[submitter_id]
    )
    acknowledged_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(String(25), nullable=False)  # Store as ISO string for simplicity


# Utility function to get readable grievance status
def get_grievance_status(grievance, db):
    if grievance.status == GrievanceStatus.acknowledged:
        emp = None
        if grievance.acknowledged_by:
            emp = db.query(Employee).filter(Employee.id == grievance.acknowledged_by).first()
        if emp:
            return f"Acknowledged by {emp.name}"
        else:
            return "Acknowledged"
    elif grievance.status == GrievanceStatus.escalated:
        return "Escalated"
    else:
        # Check if escalation is needed
        try:
            created_dt = datetime.strptime(grievance.created_at[:19], "%Y-%m-%dT%H:%M:%S")
            if (datetime.now() - created_dt).days > ESCALATION_THRESHOLD_DAYS:
                return "Escalated"
        except Exception:
            pass
        return "Submitted"
# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic model for grievance submission
class GrievanceCreate(BaseModel):
    description: str
    submitter_id: int

# Pydantic model for login
class LoginRequest(BaseModel):
    username: str
    password: str

# Pydantic model for login response
class LoginResponse(BaseModel):
    id: int
    name: str
    hierarchy: str
    username: str

# Pydantic model for acknowledge request
class AcknowledgeRequest(BaseModel):
    l2_id: int

@app.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Employee).filter(Employee.username == request.username).first()
    if not user or user.password != request.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    # Simulate session by storing user id
    logged_in_users[user.username] = user.id
    return LoginResponse(id=user.id, name=user.name, hierarchy=user.hierarchy.value, username=user.username)

@app.post("/grievance")
def submit_grievance(grievance: GrievanceCreate, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == grievance.submitter_id).first()
    if not employee or employee.hierarchy != HierarchyLevel.L1:
        raise HTTPException(status_code=403, detail="Only L1 employees can submit grievances.")
    from datetime import datetime
    new_grievance = Grievance(
        description=grievance.description,
        submitter_id=grievance.submitter_id,
        created_at=datetime.now().isoformat()
    )
    db.add(new_grievance)
    db.commit()
    db.refresh(new_grievance)
    return {"id": new_grievance.id, "description": new_grievance.description}

# Endpoint for L1 to get their own grievances
@app.get("/grievances/l1/{employee_id}")
def get_l1_grievances(employee_id: int, db: Session = Depends(get_db)):
    grievances = db.query(Grievance).filter(Grievance.submitter_id == employee_id).all()
    return [
        {
            "id": g.id,
            "summary": g.description,
            "created_at": g.created_at,
            "status": get_grievance_status(g, db)
        }
        for g in grievances
    ]

# Endpoint for L2/L3 to get all grievances with filtering
@app.get("/grievances/all")
def get_all_grievances(show_acknowledged: bool = None, acknowledged_by: int = None, db: Session = Depends(get_db)):
    query = db.query(Grievance)
    if acknowledged_by is not None:
        query = query.filter(Grievance.acknowledged_by == acknowledged_by)
    grievances = query.all()
    result = []
    for g in grievances:
        status = get_grievance_status(g, db)
        if show_acknowledged is not None:
            if show_acknowledged and not status.startswith("Acknowledged"):
                continue
            if not show_acknowledged and status.startswith("Acknowledged"):
                continue
        acknowledged_by_name = None
        if g.acknowledged_by:
            emp = db.query(Employee).filter(Employee.id == g.acknowledged_by).first()
            acknowledged_by_name = emp.name if emp else None
        result.append({
            "id": g.id,
            "summary": g.description,
            "created_at": g.created_at,
            "status": status,
            "acknowledged_by": acknowledged_by_name
        })
    return result

@app.get("/grievances/l3")
def get_l3_grievances(db: Session = Depends(get_db)):
    now = datetime.now()
    grievances = db.query(Grievance).all()
    result = []
    for g in grievances:
        try:
            created_dt = datetime.strptime(g.created_at[:19], "%Y-%m-%dT%H:%M:%S")
        except Exception:
            continue
        emp = db.query(Employee).filter(Employee.id == g.acknowledged_by).first() if g.acknowledged_by else None
        is_acknowledged_by_l3 = (
            g.status == GrievanceStatus.acknowledged and emp and emp.hierarchy == HierarchyLevel.L3
        )
        is_escalated = (
            (g.status == GrievanceStatus.escalated or (g.status == GrievanceStatus.submitted and (now - created_dt).days > ESCALATION_THRESHOLD_DAYS and not g.acknowledged_by))
        )
        if is_acknowledged_by_l3:
            status = f"Acknowledged by {emp.name}" if emp else "Acknowledged"
        elif is_escalated:
            status = "Escalated"
        else:
            continue
        acknowledged_by_name = emp.name if emp else None
        result.append({
            "id": g.id,
            "summary": g.description,
            "created_at": g.created_at,
            "status": status,
            "acknowledged_by": acknowledged_by_name
        })
    return result

@app.post("/grievance/{grievance_id}/acknowledge")
def acknowledge_grievance(grievance_id: int, req: AcknowledgeRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == req.l2_id).first()
    if not employee or employee.hierarchy not in [HierarchyLevel.L2, HierarchyLevel.L3]:
        raise HTTPException(status_code=403, detail="Only L2 or L3 employees can acknowledge grievances.")
    grievance = db.query(Grievance).filter(Grievance.id == grievance_id).first()
    # Allow L3 to acknowledge escalated grievances
    if not grievance or (grievance.status != GrievanceStatus.submitted and grievance.status != GrievanceStatus.escalated):
        raise HTTPException(status_code=404, detail="Grievance not found or already processed.")
    grievance.status = GrievanceStatus.acknowledged
    grievance.acknowledged_by = req.l2_id
    db.commit()
    return {"message": "Grievance acknowledged."}


