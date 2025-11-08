from fastapi import FastAPI, HTTPException, Depends, status, Response, File, UploadFile, Form, Request
from pydantic import BaseModel
from typing import Optional
import re
from fastapi.staticfiles import StaticFiles
from typing import List
from models import User, Module, Lesson, Exercise, Quiz, QuizQuestion, QuizAttemptRequest, QuizAttemptResponse, UserLessonProgress, QuizSubmittedAnswer
from database import db_manager
import logging
from fastapi.middleware.cors import CORSMiddleware
import json
import hashlib
import secrets
from pydantic import BaseModel
import matplotlib
import os
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import numpy as np
import io
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

app = FastAPI()

# --- Import et inclusion des routers ---
from matrix_router import router as matrix_router
from routes.calendar_routes import router as calendar_router
from routes.dashboard_routes import router as dashboard_router
from chatbot_router import router as chatbot_router
from huggingface_router import router as huggingface_router

# Import and include the new document router
from document_router import router as document_router

app.include_router(matrix_router)
app.include_router(calendar_router)
app.include_router(dashboard_router)
app.include_router(chatbot_router, prefix="/api/chatbot", tags=["chatbot"])
app.include_router(huggingface_router, prefix="/api/huggingface", tags=["huggingface"])
app.include_router(document_router, prefix="/api", tags=["documents"])

# Mount static files directory for videos
app.mount("/media", StaticFiles(directory="media"), name="media")

# Enable CORS for frontend domainet ycommuniquiou /accepter les rrequetttes https
# List of allowed origins (update with your frontend URL in production)
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://192.168.1.16:8080",
    "http://192.168.1.16:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=600,  # cache preflight request for 10 minutes
)

db_manager.create_tables()

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{salt}${hash_obj.hexdigest()}"

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        salt, hash_value = hashed_password.split('$')
        hash_obj = hashlib.sha256((password + salt).encode())
        return hash_obj.hexdigest() == hash_value
    except:
        return False

@app.on_event("shutdown")
def shutdown_event():
    db_manager.close()

@app.post("/users", response_model=User)
def create_user(user: User):
    try:
        # Check if user already exists
        check_query = "SELECT * FROM utilisateur WHERE email = ?"
        existing_user = db_manager.execute_query(check_query, (user.email,))
        if existing_user:
            raise HTTPException(status_code=400, detail="Un utilisateur avec cet email existe déjà")
        
        # Hash the password
        if not user.password:
            raise HTTPException(status_code=400, detail="Password is required")
        hashed_password = hash_password(user.password)
        
        query = """
            INSERT INTO utilisateur (nom, email, mot_de_passe, role)
            VALUES (?, ?, ?, ?)
        """
        db_manager.execute_query(query, (user.name, user.email, hashed_password, user.role))
        # Fetch the created user
        get_query = "SELECT * FROM utilisateur WHERE email = ?"
        result = db_manager.execute_query(get_query, (user.email,))
        if result:
            row = result[0]
            return User(id=row['id_utilisateur'], name=row['nom'], email=row['email'], role=row['role'])
        else:
            raise HTTPException(status_code=500, detail="User creation failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=400, detail=str(e))

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/auth/login")
def login_user(login_data: LoginRequest):
    try:
        # First check if user exists, regardless of active status
        query = "SELECT * FROM utilisateur WHERE email = ?"
        result = db_manager.execute_query(query, (login_data.email,))
        
        if not result:
            raise HTTPException(status_code=401, detail="Aucun compte trouvé avec cet email")
        
        user = result[0]
        
        # Check if user is active
        if user.get('actif') != 1:
            # If user exists but is inactive, activate them
            activate_query = "UPDATE utilisateur SET actif = 1 WHERE id_utilisateur = ?"
            db_manager.execute_query(activate_query, (user['id_utilisateur'],))
            
        # Verify password
        if not verify_password(login_data.password, user['mot_de_passe']):
            raise HTTPException(status_code=401, detail="Mot de passe incorrect")
        
        # Update last login
        update_query = "UPDATE utilisateur SET derniere_connexion = CURRENT_TIMESTAMP WHERE id_utilisateur = ?"
        db_manager.execute_query(update_query, (user['id_utilisateur'],))
        
        return User(id=user['id_utilisateur'], name=user['nom'], email=user['email'], role=user['role'])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la connexion")

@app.get("/users", response_model=List[User])
def get_users():
    query = "SELECT * FROM utilisateur WHERE actif = 1"
    result = db_manager.execute_query(query)
    return [User(id=row['id_utilisateur'], name=row['nom'], email=row['email'], role=row['role']) for row in result]

@app.get("/users/{user_id}", response_model=User)
def get_user(user_id: int):
    query = "SELECT * FROM utilisateur WHERE id_utilisateur = ? AND actif = 1"
    result = db_manager.execute_query(query, (user_id,))
    if result:
        row = result[0]
        return User(id=row['id_utilisateur'], name=row['nom'], email=row['email'], role=row['role'])
    else:
        raise HTTPException(status_code=404, detail="User not found")

@app.put("/users/{user_id}", response_model=User)
def update_user(user_id: int, user: User):
    query = "UPDATE utilisateur SET nom = ?, email = ?, role = ? WHERE id_utilisateur = ?"
    db_manager.execute_query(query, (user.name, user.email, user.role, user_id))
    # Fetch updated user
    get_query = "SELECT * FROM utilisateur WHERE id_utilisateur = ?"
    result = db_manager.execute_query(get_query, (user_id,))
    if result:
        row = result[0]
        return User(id=row['id_utilisateur'], name=row['nom'], email=row['email'], role=row['role'])
    else:
        raise HTTPException(status_code=404, detail="User not found")

@app.delete("/users/{user_id}")
def delete_user(user_id: int):
    query = "UPDATE utilisateur SET actif = 0 WHERE id_utilisateur = ?"
    db_manager.execute_query(query, (user_id,))
    return {"message": "User deleted"}

# --- Module CRUD ---
@app.post("/modules", response_model=Module)
def create_module(module: Module):
    query = """
        INSERT INTO module (titre, type, description, contenu, id_enseignant, categorie, niveau, duree, objectifs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    db_manager.execute_query(query, (module.titre, module.type, module.description, module.contenu, module.id_enseignant, json.dumps(module.categorie), module.niveau, module.duree, json.dumps(module.objectifs)))
    get_query = "SELECT * FROM module WHERE titre = ? AND id_enseignant = ? ORDER BY id_module DESC LIMIT 1"
    result = db_manager.execute_query(get_query, (module.titre, module.id_enseignant))
    if result:
        row = result[0]
        return Module(id=row['id_module'], titre=row['titre'], type=row['type'], description=row['description'], contenu=row['contenu'], id_enseignant=row['id_enseignant'], categorie=json.loads(row['categorie']), niveau=row['niveau'], duree=row['duree'], objectifs=json.loads(row['objectifs']))
    else:
        raise HTTPException(status_code=500, detail="Module creation failed")

def parse_module_row(row):
    """Helper function to parse a module row with proper null handling"""
    # Handle categorie as string (don't parse JSON)
    categorie = row.get('categorie')
    if categorie and isinstance(categorie, str) and categorie.startswith('['):
        try:
            categorie = json.loads(categorie)
            # Convert list to string if it's a list
            if isinstance(categorie, list):
                categorie = ', '.join(str(item) for item in categorie)
        except json.JSONDecodeError:
            pass  # Keep as is if not valid JSON
    
    # Handle objectifs as string (don't parse JSON)
    objectifs = row.get('objectifs')
    if objectifs and isinstance(objectifs, str) and objectifs.startswith('['):
        try:
            objectifs = json.loads(objectifs)
            # Ensure it's a list of strings
            if isinstance(objectifs, list):
                objectifs = [str(item) for item in objectifs]
            else:
                objectifs = [str(objectifs)]
        except json.JSONDecodeError:
            objectifs = [objectifs] if objectifs else []
    
    return Module(
        id=row['id_module'],
        titre=row['titre'],
        type=row['type'],
        description=row['description'],
        contenu=row['contenu'],
        id_enseignant=row['id_enseignant'],
        categorie=categorie if categorie is not None else "",
        niveau=row['niveau'],
        duree=row['duree'],
        objectifs=objectifs if objectifs is not None else []
    )

@app.get("/modules", response_model=List[dict])
def get_modules():
    query = """
    SELECT m.*, u.nom as enseignant_nom
    FROM module m
    LEFT JOIN utilisateur u ON m.id_enseignant = u.id_utilisateur
    WHERE m.actif = 1
    """
    result = db_manager.execute_query(query)
    modules = []
    for row in result:
        module = parse_module_row(row)
        module_dict = module.dict()
        module_dict['enseignant_nom'] = row.get('enseignant_nom')
        modules.append(module_dict)
    return modules

@app.get("/modules/{module_id}", response_model=Module)
def get_module(module_id: int):
    query = "SELECT * FROM module WHERE id_module = ? AND actif = 1"
    result = db_manager.execute_query(query, (module_id,))
    if result:
        return parse_module_row(result[0])
    else:
        raise HTTPException(status_code=404, detail="Module not found")

@app.put("/modules/{module_id}", response_model=Module)
def update_module(module_id: int, module: Module):
    query = "UPDATE module SET titre = ?, type = ?, description = ?, contenu = ?, id_enseignant = ?, categorie = ?, niveau = ?, duree = ?, objectifs = ? WHERE id_module = ?"
    db_manager.execute_query(query, (module.titre, module.type, module.description, module.contenu, module.id_enseignant, json.dumps(module.categorie), module.niveau, module.duree, json.dumps(module.objectifs), module_id))
    get_query = "SELECT * FROM module WHERE id_module = ?"
    result = db_manager.execute_query(get_query, (module_id,))
    if result:
        row = result[0]
        return Module(id=row['id_module'], titre=row['titre'], type=row['type'], description=row['description'], contenu=row['contenu'], id_enseignant=row['id_enseignant'], categorie=json.loads(row['categorie']), niveau=row['niveau'], duree=row['duree'], objectifs=json.loads(row['objectifs']))
    else:
        raise HTTPException(status_code=404, detail="Module not found")

@app.delete("/modules/{module_id}")
def delete_module(module_id: int):
    query = "UPDATE module SET actif = 0 WHERE id_module = ?"
    db_manager.execute_query(query, (module_id,))
    return {"message": "Module deleted"}

# --- Lesson CRUD ---
@app.post("/lessons", response_model=Lesson)
def create_lesson(lesson: Lesson):
    query = """
        INSERT INTO lecon (titre, description, duree, niveau, contenu, id_module, id_enseignant, ordre)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """
    db_manager.execute_query(query, (lesson.titre, lesson.description, lesson.duree, lesson.niveau, lesson.contenu, lesson.id_module, lesson.id_enseignant, lesson.ordre))
    get_query = "SELECT * FROM lecon WHERE titre = ? AND id_module = ? AND id_enseignant = ? ORDER BY id_lecon DESC LIMIT 1"
    result = db_manager.execute_query(get_query, (lesson.titre, lesson.id_module, lesson.id_enseignant))
    if result:
        row = result[0]
        return Lesson(id=row['id_lecon'], titre=row['titre'], description=row['description'], duree=row['duree'], niveau=row['niveau'], contenu=row['contenu'], id_module=row['id_module'], id_enseignant=row['id_enseignant'], ordre=row['ordre'])
    else:
        raise HTTPException(status_code=500, detail="Lesson creation failed")

@app.get("/lessons", response_model=List[Lesson])
def get_lessons():
    query = "SELECT * FROM lecon WHERE actif = 1"
    result = db_manager.execute_query(query)
    return [Lesson(id=row['id_lecon'], titre=row['titre'], description=row['description'], duree=row['duree'], niveau=row['niveau'], contenu=row['contenu'], id_module=row['id_module'], id_enseignant=row['id_enseignant'], ordre=row['ordre']) for row in result]

@app.get("/lessons/{lesson_id}", response_model=Lesson)
def get_lesson(lesson_id: int):
    query = "SELECT * FROM lecon WHERE id_lecon = ? AND actif = 1"
    result = db_manager.execute_query(query, (lesson_id,))
    if result:
        row = result[0]
        return Lesson(id=row['id_lecon'], titre=row['titre'], description=row['description'], duree=row['duree'], niveau=row['niveau'], contenu=row['contenu'], id_module=row['id_module'], id_enseignant=row['id_enseignant'], ordre=row['ordre'])
    else:
        raise HTTPException(status_code=404, detail="Lesson not found")

@app.put("/lessons/{lesson_id}", response_model=Lesson)
def update_lesson(lesson_id: int, lesson: Lesson):
    query = "UPDATE lecon SET titre = ?, description = ?, duree = ?, niveau = ?, contenu = ?, id_module = ?, id_enseignant = ?, ordre = ? WHERE id_lecon = ?"
    db_manager.execute_query(query, (lesson.titre, lesson.description, lesson.duree, lesson.niveau, lesson.contenu, lesson.id_module, lesson.id_enseignant, lesson.ordre, lesson_id))
    get_query = "SELECT * FROM lecon WHERE id_lecon = ?"
    result = db_manager.execute_query(get_query, (lesson_id,))
    if result:
        row = result[0]
        return Lesson(id=row['id_lecon'], titre=row['titre'], description=row['description'], duree=row['duree'], niveau=row['niveau'], contenu=row['contenu'], id_module=row['id_module'], id_enseignant=row['id_enseignant'], ordre=row['ordre'])
    else:
        raise HTTPException(status_code=404, detail="Lesson not found")

@app.delete("/lessons/{lesson_id}")
def delete_lesson(lesson_id: int):
    query = "UPDATE lecon SET actif = 0 WHERE id_lecon = ?"
    db_manager.execute_query(query, (lesson_id,))
    return {"message": "Lesson deleted"}

@app.get("/lessons/module/{module_id}", response_model=List[Lesson])
def get_lessons_by_module(module_id: int, user_id: Optional[int] = None):
    query = """
        SELECT l.*, 
               CASE WHEN ulp.completed = 1 THEN 1 ELSE 0 END AS completed_status
        FROM lecon l
        LEFT JOIN user_lesson_progress ulp ON l.id_lecon = ulp.lesson_id AND ulp.user_id = ?
        WHERE l.id_module = ? AND l.actif = 1
        ORDER BY l.ordre ASC
    """
    params = (user_id, module_id)
    result = db_manager.execute_query(query, params)
    
    lessons_data = []
    for row in result:
        is_completed = bool(row['completed_status']) if row['completed_status'] is not None else False
        lessons_data.append(Lesson(
            id=row['id_lecon'],
            titre=row['titre'],
            description=row['description'],
            duree=row['duree'],
            niveau=row['niveau'],
            contenu=row['contenu'],
            id_module=row['id_module'],
            id_enseignant=row['id_enseignant'],
            ordre=row['ordre'],
            completed=is_completed  # Add this field
        ))
    return lessons_data

# --- Exercise CRUD ---
@app.post("/exercises", response_model=Exercise)
def create_exercise(exercise: Exercise):
    query = """
        INSERT INTO exercice (question, solution, feedback, points, id_module, id_lecon, id_enseignant, tp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """
    db_manager.execute_query(query, (
        exercise.question, exercise.solution, exercise.feedback, exercise.points,
        exercise.id_module, exercise.id_lecon, exercise.id_enseignant, exercise.tp
    ))
    get_query = "SELECT * FROM exercice WHERE question = ? AND id_enseignant = ? ORDER BY id_exercice DESC LIMIT 1"
    result = db_manager.execute_query(get_query, (exercise.question, exercise.id_enseignant))
    if result:
        row = result[0]
        return Exercise(
            id=row['id_exercice'], question=row['question'], solution=row['solution'],
            feedback=row['feedback'], points=row['points'],
            id_module=row['id_module'], id_lecon=row['id_lecon'], id_enseignant=row['id_enseignant'],
            tp=row.get('tp')
        )
    else:
        raise HTTPException(status_code=500, detail="Exercise creation failed")

@app.get("/exercises", response_model=List[Exercise])
def get_exercises():
    query = "SELECT * FROM exercice WHERE actif = 1"
    result = db_manager.execute_query(query)
    return [Exercise(
        id=row['id_exercice'], question=row['question'], solution=row['solution'],
        feedback=row['feedback'], points=row['points'],
        id_module=row['id_module'], id_lecon=row['id_lecon'], id_enseignant=row['id_enseignant'],
        tp=row.get('tp')
    ) for row in result]

@app.get("/exercises/filter", response_model=List[Exercise])
def get_exercises_by_chapter_tp(chapter: str = None, tp: str = None):
    query = "SELECT * FROM exercice WHERE actif = 1"
    params = []
    if chapter:
        query += " AND (question LIKE ? OR description LIKE ? OR instructions LIKE ?)"
        params.extend([f"%{chapter}%", f"%{chapter}%", f"%{chapter}%"])
    if tp:
        query += " AND tp = ?"
        params.append(tp)
    result = db_manager.execute_query(query, tuple(params))
    return [Exercise(
        id=row['id_exercice'], question=row['question'], solution=row['solution'],
        feedback=row['feedback'], points=row['points'],
        id_module=row['id_module'], id_lecon=row['id_lecon'], id_enseignant=row['id_enseignant'],
        tp=row.get('tp')
    ) for row in result]

@app.get("/exercises/{exercise_id}", response_model=Exercise)
def get_exercise(exercise_id: int):
    query = "SELECT * FROM exercice WHERE id_exercice = ? AND actif = 1"
    result = db_manager.execute_query(query, (exercise_id,))
    if result:
        row = result[0]
        return Exercise(
            id=row['id_exercice'], question=row['question'], solution=row['solution'],
            feedback=row['feedback'], points=row['points'],
            id_module=row['id_module'], id_lecon=row['id_lecon'], id_enseignant=row['id_enseignant'],
            tp=row.get('tp')
        )
    else:
        raise HTTPException(status_code=404, detail="Exercise not found")

@app.put("/exercises/{exercise_id}", response_model=Exercise)
def update_exercise(exercise_id: int, exercise: Exercise):
    query = "UPDATE exercice SET question = ?, solution = ?, feedback = ?, points = ?, id_module = ?, id_lecon = ?, id_enseignant = ?, tp = ? WHERE id_exercice = ?"
    db_manager.execute_query(query, (
        exercise.question, exercise.solution, exercise.feedback, exercise.points,
        exercise.id_module, exercise.id_lecon, exercise.id_enseignant, exercise.tp, exercise_id
    ))
    get_query = "SELECT * FROM exercice WHERE id_exercice = ?"
    result = db_manager.execute_query(get_query, (exercise_id,))
    if result:
        row = result[0]
        return Exercise(
            id=row['id_exercice'], question=row['question'], solution=row['solution'],
            feedback=row['feedback'], points=row['points'],
            id_module=row['id_module'], id_lecon=row['id_lecon'], id_enseignant=row['id_enseignant'],
            tp=row.get('tp')
        )
    else:
        raise HTTPException(status_code=404, detail="Exercise not found")

@app.delete("/exercises/{exercise_id}")
def delete_exercise(exercise_id: int):
    query = "UPDATE exercice SET actif = 0 WHERE id_exercice = ?"
    db_manager.execute_query(query, (exercise_id,))
    return {"message": "Exercise deleted"}

@app.get("/exercises/lesson/{lesson_id}", response_model=List[Exercise])
def get_exercises_by_lesson(lesson_id: int):
    query = "SELECT * FROM exercice WHERE id_lecon = ? AND actif = 1"
    result = db_manager.execute_query(query, (lesson_id,))
    return [Exercise(
        id=row['id_exercice'], question=row['question'], solution=row['solution'],
        feedback=row['feedback'], points=row['points'],
        id_module=row['id_module'], id_lecon=row['id_lecon'], id_enseignant=row['id_enseignant'],
        tp=row.get('tp')
    ) for row in result]

# --- Quiz CRUD ---
@app.post("/quizzes", response_model=Quiz)
def create_quiz(quiz: Quiz):
    query = """
        INSERT INTO quiz (titre, id_module, questions, reponses, reponse_correcte, auteur)
        VALUES (?, ?, ?, ?, ?, ?)
    """
    db_manager.execute_query(query, (quiz.titre, quiz.id_module, json.dumps(quiz.questions), json.dumps([]), json.dumps([]), "System")) # Assuming questions, reponses, reponse_correcte as JSON strings
    get_query = "SELECT * FROM quiz WHERE titre = ? AND id_module = ? ORDER BY id_quiz DESC LIMIT 1"
    result = db_manager.execute_query(get_query, (quiz.titre, quiz.id_module))
    if not result:
        raise HTTPException(status_code=500, detail="Quiz creation failed")
    quiz_id = result[0]['id_quiz']
    
    # Insert questions into quiz_question table if provided in the Quiz object
    if quiz.questions:
        for q in quiz.questions:
            db_manager.execute_query(
                "INSERT INTO quiz_question (id_quiz, enonce, choix, bonnes_reponses) VALUES (?, ?, ?, ?)",
                (quiz_id, q.enonce, json.dumps(q.choix), json.dumps(q.bonnes_reponses))
            )
    return get_quiz(quiz_id)

@app.get("/quizzes", response_model=List[Quiz])
def get_quizzes():
    query = "SELECT * FROM quiz WHERE actif = 1"
    result = db_manager.execute_query(query)
    quizzes = []
    for row in result:
        quiz_id = row['id_quiz']
        questions_raw = db_manager.execute_query("SELECT * FROM quiz_question WHERE id_quiz = ?", (quiz_id,))
        questions = [QuizQuestion(id=q['id_question'], enonce=q['enonce'], choix=json.loads(q['choix']), bonnes_reponses=json.loads(q['bonnes_reponses'])) for q in questions_raw]
        quizzes.append(Quiz(id=row['id_quiz'], titre=row['titre'], id_module=row['id_module'], questions=questions))
    return quizzes

@app.get("/quizzes/{quiz_id}", response_model=Quiz)
def get_quiz(quiz_id: int):
    query = "SELECT * FROM quiz WHERE id_quiz = ? AND actif = 1"
    result = db_manager.execute_query(query, (quiz_id,))
    if not result:
        raise HTTPException(status_code=404, detail="Quiz not found")
    row = result[0]
    questions_raw = db_manager.execute_query("SELECT * FROM quiz_question WHERE id_quiz = ?", (quiz_id,))
    questions = [QuizQuestion(id=q['id_question'], enonce=q['enonce'], choix=json.loads(q['choix']), bonnes_reponses=json.loads(q['bonnes_reponses'])) for q in questions_raw]
    return Quiz(id=row['id_quiz'], titre=row['titre'], id_module=row['id_module'], questions=questions)

@app.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int):
    db_manager.execute_query("UPDATE quiz SET actif = 0 WHERE id_quiz = ?", (quiz_id,))
    return {"message": "Quiz deleted"}

@app.get("/quizzes/module/{id_module}", response_model=List[Quiz])
def get_quizzes_by_module(id_module: int):
    query = "SELECT * FROM quiz WHERE id_module = ?"
    result = db_manager.execute_query(query, (id_module,))
    quizzes = []
    for row in result:
        quiz_id = row['id_quiz']
        questions_raw = db_manager.execute_query("SELECT * FROM quiz_question WHERE id_quiz = ?", (quiz_id,))
        questions = [QuizQuestion(id=q['id_question'], enonce=q['enonce'], choix=json.loads(q['choix']), bonnes_reponses=json.loads(q['bonnes_reponses'])) for q in questions_raw]
        quizzes.append(Quiz(id=row['id_quiz'], titre=row['titre'], id_module=row['id_module'], questions=questions))
    return quizzes

@app.post("/quizzes/submit", response_model=QuizAttemptResponse)
def submit_quiz_attempt(attempt: QuizAttemptRequest):
    try:
        # No need to fetch quiz details by quiz_id anymore, as we directly store attempt details
        
        # Calculate score and passed status from the submitted attempt data
        score = attempt.score
        total_questions = attempt.total_questions
        passed = score >= 50.0  # 50% passing threshold

        # Save the quiz attempt to the database
        insert_query = """
            INSERT INTO score_quiz (id_utilisateur, module_title, lesson_title, score, total_questions, answers, passed, date_passage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        db_manager.execute_query(
            insert_query,
            (
                attempt.user_id,
                attempt.module_title,
                attempt.lesson_title,
                attempt.score,
                attempt.total_questions,
                json.dumps([ans.dict() for ans in attempt.answers]), # Store answers as JSON string
                passed,
                attempt.completed_at
            )
        )
        
        # Determine if remedial questions should be shown (if score is less than 50%)
        show_remedial = not passed
        message = "Quiz completed successfully!"
        if show_remedial:
            message = "You didn't pass the quiz. Would you like to try some remedial questions?"

        return QuizAttemptResponse(
            score=score,
            passed=passed,
            show_remedial=show_remedial,
            message=message
        )
    except Exception as e:
        logger.error(f"Error submitting quiz attempt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error submitting quiz attempt: {str(e)}")

@app.get("/quizzes/results/{user_id}", response_model=List[dict])
def get_user_quiz_results(user_id: int):
    """
    Get all quiz results for a specific user.
    """
    query = """
        SELECT id_score, id_utilisateur, id_quiz, module_title, lesson_title, score, total_questions, answers, passed, date_passage
        FROM score_quiz
        WHERE id_utilisateur = ?
        ORDER BY date_passage DESC
    """
    results = db_manager.execute_query(query, (user_id,))
    
    parsed_results = []
    for row in results:
        parsed_results.append({
            'id_score': row['id_score'],
            'user_id': row['id_utilisateur'],
            'quiz_id': row['id_quiz'],
            'module_title': row['module_title'],
            'lesson_title': row['lesson_title'],
            'score': row['score'],
            'total_questions': row['total_questions'],
            'answers': json.loads(row['answers']) if row['answers'] else [],
            'passed': bool(row['passed']),
            'completed_at': row['date_passage']
        })
    return parsed_results

@app.get("/quizzes/user/{user_id}/module/{module_id}", response_model=List[dict])
def get_user_quiz_progress(user_id: int, module_id: int):
    """
    Get user's quiz progress for a specific module.
    Returns a list of quizzes with their completion status and scores.
    """
    # Get all quizzes for the module (from score_quiz table for user's attempts)
    quizzes_query = """
        SELECT sq.id_score, sq.module_title, sq.lesson_title, sq.score, sq.passed, sq.date_passage, sq.total_questions, sq.answers
        FROM score_quiz sq
        WHERE sq.id_utilisateur = ? AND sq.module_title = (SELECT titre FROM module WHERE id_module = ?)
        ORDER BY sq.date_passage DESC
    """
    # To filter by module_title, we need to get the module title from the module_id
    module_title_query = "SELECT titre FROM module WHERE id_module = ?"
    module_title_result = db_manager.execute_query(module_title_query, (module_id,))
    if not module_title_result:
        raise HTTPException(status_code=404, detail="Module not found")
    module_title_str = module_title_result[0]['titre']

    result = db_manager.execute_query(quizzes_query, (user_id, module_title_str))
    
    # Format the response
    quizzes = []
    for row in result:
        quizzes.append({
            'module_title': row['module_title'],
            'lesson_title': row['lesson_title'],
            'score': row['score'],
            'total': row['total_questions'],
            'passed': bool(row['passed']) if row['passed'] is not None else False,
            'completed_at': row['date_passage'],
            'answers': json.loads(row['answers']) if row['answers'] else []
        })
    
    return quizzes

# --- Lesson Completion ---
class CompleteLessonRequest(BaseModel):
    user_id: int
    module_id: int

@app.post("/lessons/{lesson_id}/complete")
async def complete_lesson(lesson_id: int, request: CompleteLessonRequest):
    try:
        logger.info(f"Attempting to mark lesson {lesson_id} as complete for user {request.user_id} in module {request.module_id}")
        insert_or_update_query = """
            INSERT INTO user_lesson_progress (user_id, lesson_id, module_id, completed)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(user_id, lesson_id) DO UPDATE SET
            completed = 1, completion_date = CURRENT_TIMESTAMP
            WHERE user_id = ? AND lesson_id = ?
        """
        execution_result = db_manager.execute_query(
            insert_or_update_query,
            (request.user_id, lesson_id, request.module_id, request.user_id, lesson_id)
        )
        logger.info(f"Lesson completion query executed. Result: {execution_result}")
        
        return {"status": "success", "message": "Leçon marquée comme terminée"}
        
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de la progression: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint pour récupérer les leçons déverrouillées par utilisateur et module
@app.get("/users/{user_id}/unlocked-lessons/{module_id}")
async def get_unlocked_lessons(user_id: int, module_id: int):
    try:
        cursor = db_manager.connection.cursor()
        
        # Récupérer les leçons déverrouillées
        cursor.execute(
            """
            SELECT l.* 
            FROM lecon l
            JOIN unlocked_lessons ul ON l.id_lecon = ul.lesson_id
            WHERE ul.user_id = ? AND ul.module_id = ?
            ORDER BY l.ordre, l.id_lecon
            """,
            (user_id, module_id)
        )
        
        unlocked_lessons = cursor.fetchall()
        
        # Récupérer également la première leçon si aucune n'est déverrouillée
        if not unlocked_lessons:
            cursor.execute(
                """
                SELECT * FROM lecon 
                WHERE id_module = ? 
                ORDER BY ordre, id_lecon 
                LIMIT 1
                """,
                (module_id,)
            )
            first_lesson = cursor.fetchone()
            if first_lesson:
                # Déverrouiller automatiquement la première leçon
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO unlocked_lessons (user_id, module_id, lesson_id)
                    VALUES (?, ?, ?)
                    """,
                    (user_id, module_id, first_lesson['id_lecon'])
                )
                db_manager.connection.commit()
                unlocked_lessons = [first_lesson]
        
        return [dict(lesson) for lesson in unlocked_lessons]
        
    except Exception as e:
        print(f"Erreur lors de la récupération des leçons déverrouillées: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Video Progress Tracking ---
@app.post("/progress/video")
def track_video_progress(progress_data: dict):
    """
    Track video watching progress for a user.
    Expected data: user_id, lesson_id, progress_percentage (0-100)
    """
    try:
        user_id = progress_data.get('user_id')
        lesson_id = progress_data.get('lesson_id')
        progress_percentage = progress_data.get('progress_percentage')
        
        if not all([user_id, lesson_id, progress_percentage is not None]):
            raise HTTPException(status_code=400, detail="Missing required fields: user_id, lesson_id, progress_percentage")
        
        # Check if progress entry already exists
        check_query = """
            SELECT * FROM progression_etudiant
            WHERE id_etudiant = ? AND id_lecon = ?
        """
        existing = db_manager.execute_query(check_query, (user_id, lesson_id))
        
        if existing:
            # Update existing progress
            update_query = """
                UPDATE progression_etudiant
                SET score = ?, temps_passe = ?
                WHERE id_etudiant = ? AND id_lecon = ?
            """
            db_manager.execute_query(update_query, (progress_percentage, 0, user_id, lesson_id))
        else:
            # Create new progress entry
            insert_query = """
                INSERT INTO progression_etudiant
                (id_etudiant, id_lecon, statut, score, temps_passe)
                VALUES (?, ?, 'en_cours', ?, 0)
            """
            db_manager.execute_query(insert_query, (user_id, lesson_id, progress_percentage))
        
        return {"message": "Video progress tracked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error tracking video progress: {str(e)}")

@app.get("/progress/module/{user_id}/{module_id}")
def get_module_progress(user_id: int, module_id: int):
    """
    Calculate overall module progress based on video watching (70%) and quiz scores (30%).
    Progress is calculated as:
    - 70%: Average progress of watching Manim videos by the user
    - 30%: Average quiz scores for the module
    """
    try:
        # Get total number of lessons in the module
        total_lessons_query = """
            SELECT COUNT(*) as total_lessons
            FROM lecon 
            WHERE id_module = ? 
        """
        total_lessons_result = db_manager.execute_query(total_lessons_query, (module_id,))
        total_lessons = total_lessons_result[0]['total_lessons'] if total_lessons_result else 0
        
        # Get number of lessons completed by the user
        completed_lessons_query = """
            SELECT COUNT(*) as completed_lessons_count
            FROM user_lesson_progress
            WHERE user_id = ? AND module_id = ? AND completed = 1
        """
        completed_lessons_result = db_manager.execute_query(completed_lessons_query, (user_id, module_id))
        completed_lessons_count = completed_lessons_result[0]['completed_lessons_count'] if completed_lessons_result else 0

        # Calculate lesson completion percentage (80% weight)
        lesson_completion_percentage = (completed_lessons_count / total_lessons) * 100 if total_lessons > 0 else 0
        
        # Get user's quiz scores for this module (20% weight)
        # Use the score_quiz table with module_title and lesson_title
        quiz_scores_query = """
            SELECT AVG(sq.score) as avg_score
            FROM score_quiz sq
            WHERE sq.id_utilisateur = ? 
            AND sq.module_title = (SELECT titre FROM module WHERE id_module = ?)
        """
        module_title_query = "SELECT titre FROM module WHERE id_module = ?"
        module_title_result = db_manager.execute_query(module_title_query, (module_id,))
        module_title_str = module_title_result[0]['titre'] if module_title_result else None

        avg_quiz_score = 0
        if module_title_str:
            quiz_scores_result = db_manager.execute_query(quiz_scores_query, (user_id, module_title_str))
            avg_quiz_score = quiz_scores_result[0]['avg_score'] if quiz_scores_result and quiz_scores_result[0]['avg_score'] else 0
        
        # Calculate overall progress (80% lesson completion + 20% quizzes)
        overall_progress = (lesson_completion_percentage * 0.8) + (avg_quiz_score * 0.2)
        
        return {
            "overall_progress": overall_progress,
            "video_progress": lesson_completion_percentage, # Re-purposing for overall lesson completion
            "quiz_score": avg_quiz_score,
            "total_videos": total_lessons, # Re-purposing for total lessons
            "watched_videos": completed_lessons_count, # Re-purposing for completed lessons
            "total_quizzes": 0 # This field might become irrelevant or need re-evaluation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating module progress: {str(e)}")

class PlotRequest(BaseModel):
    code: str

@app.post("/plot")
def plot_python_code(request: PlotRequest):
    # Redirect stdout/stderr to capture errors
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()
    try:
        # Prepare a restricted namespace
        allowed_builtins = {'__builtins__': {}}
        safe_globals = {
            "plt": plt,
            "np": np,
        }
        # Execute the code
        exec(request.code, {**allowed_builtins, **safe_globals})
        # Save the plot to a buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        return Response(content=buf.read(), media_type="image/png")
    except Exception as e:
        error_output = sys.stdout.getvalue() + sys.stderr.getvalue() + str(e)
        return Response(content=f"Error in code execution:\n{error_output}", media_type="text/plain", status_code=400)
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

# --- Mode Examen : chapitres et exercices démo ---
@app.get("/chapters/")
async def get_chapters():
    return ["Algèbre linéaire", "Analyse", "Probabilités", "Statistiques"]

# Servir les fichiers statiques (vidéos)
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "media")), name="static")

# Pydantic models for the new endpoint
class LinearSystemRequest(BaseModel):
    eq1: str
    eq2: str
    user_id: Optional[int] = None

class Solution(BaseModel):
    x: float
    y: float

class LinearSystemResponse(BaseModel):
    solution: Optional[Solution]
    solution_type: str  # 'unique', 'none', 'infinite', 'invalid'
    coeffs1: Optional[dict]
    coeffs2: Optional[dict]

def parse_equation(eq: str) -> Optional[dict]:
    try:
        eq = eq.replace(' ', '').lower()

        # Order of checks is important: specific (x=c) before general (y=mx+b)

        # Case 1: x = c (vertical line)
        match = re.match(r'x=(-?\d+\.?\d*)', eq)
        if match:
            return {"m": float('inf'), "b": float(match.group(1))} # Using 'b' for x-intercept for simplicity

        # Case 2: y = mx + b (general form)
        # This regex handles: y=mx+b, y=mx, y=x+b, y=x, y=b
        pattern = r'y=((-?\d*\.?\d*)x)?(([+-]\d+\.?\d*))?|y=x'
        match = re.match(pattern, eq)
        if match:
            m = 1.0
            b = 0.0

            # Full y=x case
            if eq == 'y=x':
                return {"m": 1.0, "b": 0.0}

            # Extract m
            if match.group(2) is not None:
                m_str = match.group(2)
                if m_str == '-': m = -1.0
                elif m_str == '' or m_str == '+': m = 1.0
                else: m = float(m_str)
            elif 'x' not in eq: # No 'x' term means m=0
                m = 0.0

            # Extract b
            if match.group(3) is not None:
                b = float(match.group(3))
            
            return {"m": m, "b": b}

    except Exception as e:
        logger.error(f"Error parsing equation '{eq}': {e}")
    
    return None

@app.post("/api/solve-linear-system", response_model=LinearSystemResponse)
async def solve_linear_system(request: LinearSystemRequest):
    # Parse the equations
    coeffs1 = parse_equation(request.eq1)
    coeffs2 = parse_equation(request.eq2)

    # Check if equations are valid
    if not coeffs1 or not coeffs2:
        return {
            "solution": None, 
            "solution_type": "invalid", 
            "coeffs1": coeffs1, 
            "coeffs2": coeffs2
        }

    try:
        m1, b1 = coeffs1['m'], coeffs1['b']
        m2, b2 = coeffs2['m'], coeffs2['b']
        
        # Handle vertical lines (infinite slope)
        if m1 == float('inf') or m2 == float('inf'):
            # If both are vertical lines
            if m1 == float('inf') and m2 == float('inf'):
                # If they have the same x-intercept, they're the same line
                if abs(b1 - b2) < 1e-9:
                    return {"solution": None, "solution_type": "infinite", "coeffs1": coeffs1, "coeffs2": coeffs2}
                else:
                    return {"solution": None, "solution_type": "none", "coeffs1": coeffs1, "coeffs2": coeffs2}
            # If only one is vertical
            elif m1 == float('inf'):
                x = b1  # x-intercept for vertical line
                y = m2 * x + b2
                return {
                    "solution": {"x": x, "y": y},
                    "solution_type": "unique",
                    "coeffs1": coeffs1,
                    "coeffs2": coeffs2
                }
            else:  # m2 is vertical
                x = b2  # x-intercept for vertical line
                y = m1 * x + b1
                return {
                    "solution": {"x": x, "y": y},
                    "solution_type": "unique",
                    "coeffs1": coeffs1,
                    "coeffs2": coeffs2
                }

        # Check if lines are parallel
        if abs(m1 - m2) < 1e-9:
            # Check if lines are coincident (same line)
            if abs(b1 - b2) < 1e-9:
                return {"solution": None, "solution_type": "infinite", "coeffs1": coeffs1, "coeffs2": coeffs2}
            else:
                return {"solution": None, "solution_type": "none", "coeffs1": coeffs1, "coeffs2": coeffs2}
        
        # Calculate the intersection point for non-parallel lines
        try:
            x = (b2 - b1) / (m1 - m2)
            y = m1 * x + b1
            
            # Verify the solution works for both equations (handle floating point errors)
            y2 = m2 * x + b2
            if abs(y - y2) > 1e-9:
                logger.warning(f"Solution verification failed: y1={y}, y2={y2}")
                
            response = {
                "solution": {"x": x, "y": y},
                "solution_type": "unique",
                "coeffs1": coeffs1,
                "coeffs2": coeffs2
            }
        except ZeroDivisionError:
            # This should theoretically never happen since we already checked for parallel lines
            return {
                "solution": None,
                "solution_type": "error",
                "message": "Unexpected error: Division by zero",
                "coeffs1": coeffs1,
                "coeffs2": coeffs2
            }
        except Exception as e:
            logger.error(f"Error calculating solution: {str(e)}")
            return {
                "solution": None,
                "solution_type": "error",
                "message": f"Error calculating solution: {str(e)}",
                "coeffs1": coeffs1,
                "coeffs2": coeffs2
            }

        # Sauvegarde dans l'historique si user_id est fourni
        if request.user_id and response["solution_type"] != 'invalid':
            try:
                db_manager.execute_query(
                    """
                    INSERT INTO linear_system_history 
                    (id_utilisateur, equation1, equation2, solution_type, solution_x, solution_y) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        request.user_id,
                        request.eq1,
                        request.eq2,
                        response['solution_type'],
                        response['solution']['x'] if response.get('solution') else None,
                        response['solution']['y'] if response.get('solution') else None,
                    )
                )
            except Exception as e:
                logger.error(f"Échec de la sauvegarde de l'historique: {e}")
                # Ne pas échouer la requête à cause de l'échec de sauvegarde de l'historique

        return response

    except ZeroDivisionError:
        return {
            "solution": None,
            "solution_type": "error",
            "message": "Division par zéro détectée dans le calcul de la solution",
            "coeffs1": coeffs1,
            "coeffs2": coeffs2
        }
    except Exception as e:
        logger.error(f"Erreur lors de la résolution du système: {str(e)}")
        return {
            "solution": None,
            "solution_type": "error",
            "message": f"Erreur lors de la résolution du système: {str(e)}",
            "coeffs1": coeffs1,
            "coeffs2": coeffs2
        }

    return response


@app.get("/api/history/linear-system/{user_id}")
def get_user_history(user_id: int):
    try:
        history = db_manager.execute_query("SELECT * FROM linear_system_history WHERE id_utilisateur = ? ORDER BY timestamp DESC", (user_id,))
        return history
    except Exception as e:
        logger.error(f"Error fetching history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@app.delete("/api/history/linear-system/{user_id}")
def delete_user_history(user_id: int):
    try:
        db_manager.execute_query("DELETE FROM linear_system_history WHERE id_utilisateur = ?", (user_id,))
        return {"message": "History cleared successfully"}
    except Exception as e:
        logger.error(f"Error deleting history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear history")


@app.get("/api/manim-videos")
def get_manim_videos():
    videos_dir = "media/videos"
    video_data = []
    if not os.path.isdir(videos_dir):
        raise HTTPException(status_code=404, detail="Videos directory not found")

    categories = sorted([d for d in os.listdir(videos_dir) if os.path.isdir(os.path.join(videos_dir, d))])

    for category in categories:
        category_path = os.path.join(videos_dir, category)
        videos = []
        # We only look in the 1080p60 subdirectory for final videos
        specific_path = os.path.join(category_path, "1080p60")
        if os.path.isdir(specific_path):
            for filename in sorted(os.listdir(specific_path)):
                if filename.endswith(".mp4"):
                    # Construct the URL path
                    url_path = f"/media/videos/{category}/1080p60/{filename}".replace('\\', '/')
                    videos.append({"name": filename, "url": url_path})
        
        if videos:
            video_data.append({"category": category, "videos": videos})
    
    return video_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)