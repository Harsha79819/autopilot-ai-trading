"""Document Intelligence & Statement Upload API Router."""
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.financial_document import FinancialDocument
from backend.app.services.document_parser import DocumentParserService

router = APIRouter(prefix="/api/documents", tags=["Document Intelligence"])


class AskDocumentRequest(BaseModel):
    document_id: int
    question: str


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form("TRANSACTION_CSV"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploads and safely parses a financial transaction CSV or statement."""
    content_bytes = await file.read()
    if len(content_bytes) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    try:
        content_text = content_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    parsed = DocumentParserService.parse_csv_transactions(content_text)

    doc = FinancialDocument(
        user_id=current_user.id,
        filename=DocumentParserService.sanitize_text(file.filename or "statement.csv"),
        doc_type=doc_type,
        file_size_bytes=len(content_bytes),
        summary=parsed.get("summary"),
        parsed_transactions=parsed.get("records", []),
        status="PARSED"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "message": "Document parsed successfully",
        "document_id": doc.id,
        "filename": doc.filename,
        "total_records": parsed.get("total_records"),
        "total_turnover_inr": parsed.get("total_turnover_inr"),
        "summary": doc.summary,
        "preview": doc.parsed_transactions[:10]
    }


@router.get("")
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    docs = db.query(FinancialDocument).filter(FinancialDocument.user_id == current_user.id).order_by(FinancialDocument.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "doc_type": d.doc_type,
            "file_size_bytes": d.file_size_bytes,
            "summary": d.summary,
            "record_count": len(d.parsed_transactions) if d.parsed_transactions else 0,
            "created_at": d.created_at.isoformat()
        } for d in docs
    ]


@router.post("/ask")
def ask_document(
    req: AskDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Answers specific questions based strictly on the uploaded document's extracted facts."""
    doc = db.query(FinancialDocument).filter(FinancialDocument.id == req.document_id, FinancialDocument.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    sanitized_q = DocumentParserService.sanitize_text(req.question).lower()
    transactions = doc.parsed_transactions or []

    # Deterministic factual extraction
    if "turnover" in sanitized_q or "total volume" in sanitized_q or "amount" in sanitized_q:
        total = sum(t.get("turnover", 0.0) for t in transactions)
        ans = f"Based on '{doc.filename}', the total traded turnover is ₹{total:,.2f} across {len(transactions)} transactions."
    elif "buy" in sanitized_q:
        buys = [t for t in transactions if t.get("side") == "BUY"]
        ans = f"There are {len(buys)} BUY transactions in this statement totaling ₹{sum(t.get('turnover', 0) for t in buys):,.2f}."
    elif "sell" in sanitized_q:
        sells = [t for t in transactions if t.get("side") == "SELL"]
        ans = f"There are {len(sells)} SELL transactions in this statement totaling ₹{sum(t.get('turnover', 0) for t in sells):,.2f}."
    else:
        ans = f"Document '{doc.filename}' contains {len(transactions)} verified trade rows. Summary: {doc.summary}"

    return {
        "document_id": doc.id,
        "question": req.question,
        "answer": ans,
        "verified_source": doc.filename
    }
