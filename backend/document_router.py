from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional
import os
import shutil
from datetime import datetime
from models import Document, User # Assuming User model is needed for id_enseignant
from database import db_manager
import logging

router = APIRouter()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory to store uploaded documents - relative to the backend directory
UPLOAD_DIRECTORY = "media/documents"

# Ensure the upload directory exists
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

@router.post("/documents/upload", response_model=Document)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    id_enseignant: Optional[int] = Form(None) # Assuming teacher ID can be passed or derived
):
    if document_type not in ['exam', 'tp']:
        raise HTTPException(status_code=400, detail="Document type must be 'exam' or 'tp'")

    # Generate a unique filename to prevent overwrites
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{datetime.now().strftime("%Y%m%d%H%M%S")}_{file.filename}"
    local_file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)
    url_path = f"/media/documents/{unique_filename}"

    try:
        with open(local_file_path, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        logger.error(f"Error saving file {unique_filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not upload file: {e}")

    # Save document metadata to database
    try:
        insert_query = """
            INSERT INTO document (filename, file_path, document_type, id_enseignant)
            VALUES (?, ?, ?, ?)
        """
        result = db_manager.execute_query(insert_query, (unique_filename, url_path, document_type, id_enseignant))
        doc_id = result[0]['id']
        
        # Fetch the newly created document to return
        new_document_query = "SELECT * FROM document WHERE id_document = ?"
        new_doc_result = db_manager.execute_query(new_document_query, (doc_id,))
        if new_doc_result:
            doc_row = new_doc_result[0]
            return Document(
                id=doc_row['id_document'],
                filename=doc_row['filename'],
                file_path=doc_row['file_path'],
                document_type=doc_row['document_type'],
                id_enseignant=doc_row['id_enseignant'],
                upload_date=doc_row['upload_date'] # Assuming this comes as a string from DB
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to retrieve uploaded document info.")

    except Exception as e:
        logger.error(f"Error saving document metadata to DB: {e}")
        # Clean up the uploaded file if DB save fails
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save document metadata: {e}")

@router.get("/documents", response_model=List[Document])
async def get_documents(document_type: Optional[str] = None):
    query = "SELECT * FROM document WHERE actif = 1"
    params = []
    if document_type:
        if document_type not in ['exam', 'tp']:
            raise HTTPException(status_code=400, detail="Invalid document type. Must be 'exam' or 'tp'.")
        query += " AND document_type = ?"
        params.append(document_type)
    
    query += " ORDER BY upload_date DESC"
    
    try:
        results = db_manager.execute_query(query, tuple(params))
        return [
            Document(
                id=row['id_document'],
                filename=row['filename'],
                file_path=row['file_path'],
                document_type=row['document_type'],
                id_enseignant=row['id_enseignant'],
                upload_date=row['upload_date']
            ) for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve documents: {e}")


@router.delete("/documents/{document_id}")
async def delete_document(document_id: int):
    try:
        # Soft delete: set 'actif' to 0 instead of removing the row
        update_query = "UPDATE document SET actif = 0 WHERE id_document = ?"
        db_manager.execute_query(update_query, (document_id,))
        return {"message": "Document deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {e}")
