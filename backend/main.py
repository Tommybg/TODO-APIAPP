from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel 
from typing import List, Dict, Optional
from datetime import date, datetime, timedelta
# New database imports
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

app = FastAPI() 

# Allow CORS for specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React app's address
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],  # All methods we're using
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Credentials"
    ],
    expose_headers=["*"],  # Allows the browser to see all headers
)

# Db creation 
SQLALCHEMY_DATABASE_URL = "sqlite:///./todos.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database model
class TaskModel(Base):
    __tablename__ = "tasks"
    task_id = Column(Integer, primary_key=True, index=True)
    task = Column(String)
    completed = Column(Boolean, default=False)
    due_date = Column(Date)
    priority = Column(String)
    duration = Column(Integer)

# Create database tables
Base.metadata.create_all(bind=engine)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic model 
class Task(BaseModel):
    task_id: Optional[int] = None
    task: Optional[str] = None
    completed: Optional[bool] = None
    due_date: Optional[date] = None
    priority: Optional[str] = None
    duration: Optional[int] = None 

# Get method for the tasks list (All todo´s)
@app.get("/tasks/")
def get_tasks(db: Session = Depends(get_db)):
    # Query all tasks from the database table
    return db.query(TaskModel).all()  

# Post method to create tasks into the todo list 
@app.post("/tasks/", status_code=201)
def create_task(task: Task, db: Session = Depends(get_db)):
    # Create a new TaskModel instance from the incoming task data
    db_task = TaskModel(**task.dict(exclude={'task_id'}))
    # Add to database
    db.add(db_task)
    # Save changes
    db.commit()
    # Refresh to get the new ID
    db.refresh(db_task)
    return db_task

# Path variable for each specific task using task_id index 
@app.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    # Query task by ID
    task = db.query(TaskModel).filter(TaskModel.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# Path variable to completed tasks in to-do list 

# Put method (Updating individual tasks)
@app.put("/tasks/{task_id}/")
def update_task(task_id: int, task_update: Task, db: Session = Depends(get_db)):
    # Find the task to update
    task = db.query(TaskModel).filter(TaskModel.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update only the provided fields
    for key, value in task_update.dict(exclude_unset=True).items():
        setattr(task, key, value)
    
    # Save changes
    db.commit()
    return task

@app.get("/tasks/completed/")
def get_completed_tasks(db: Session = Depends(get_db)):
    return db.query(TaskModel).filter(TaskModel.completed == True).all()

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    # Find the task to delete
    task = db.query(TaskModel).filter(TaskModel.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Delete the task
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}

# Put/Patch method (Updating individual tasks)
@app.patch("/tasks/{task_id}/")
def patch_task(task_id: int, task_update: Task, db: Session = Depends(get_db)):
    # First, find the existing task in the database
    task = db.query(TaskModel).filter(TaskModel.task_id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Filter out None values and update only provided fields
    update_data = {k: v for k, v in task_update.dict(exclude_unset=True).items() 
                  if v is not None}
    
    # Update the task attributes
    for key, value in update_data.items():
        setattr(task, key, value)
    
    # Commit changes to the database
    try:
        db.commit()
        # Refresh the task instance to ensure we have the latest data
        db.refresh(task)
        return task
    except Exception as e:
        db.rollback()  # Rollback in case of errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )
       
