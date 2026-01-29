"""File download and text extraction utilities."""
import httpx
import io
from typing import Optional
from PyPDF2 import PdfReader
from docx import Document


async def download_file(url: str) -> bytes:
    """
    Download file from URL.
    
    Args:
        url: URL of the file to download
        
    Returns:
        File content as bytes
        
    Raises:
        Exception: If download fails
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30.0)
        response.raise_for_status()
        return response.content


def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extract text from PDF file.
    
    Args:
        file_content: PDF file content as bytes
        
    Returns:
        Extracted text
    """
    pdf_file = io.BytesIO(file_content)
    reader = PdfReader(pdf_file)
    text_parts = []
    
    for page in reader.pages:
        text_parts.append(page.extract_text())
    
    return "\n".join(text_parts)


def extract_text_from_docx(file_content: bytes) -> str:
    """
    Extract text from DOCX file.
    
    Args:
        file_content: DOCX file content as bytes
        
    Returns:
        Extracted text
    """
    docx_file = io.BytesIO(file_content)
    doc = Document(docx_file)
    text_parts = []
    
    for paragraph in doc.paragraphs:
        text_parts.append(paragraph.text)
    
    return "\n".join(text_parts)


def extract_text_from_txt(file_content: bytes) -> str:
    """
    Extract text from TXT file.
    
    Args:
        file_content: TXT file content as bytes
        
    Returns:
        Extracted text
    """
    try:
        # Try UTF-8 first
        return file_content.decode('utf-8')
    except UnicodeDecodeError:
        # Fallback to latin-1
        return file_content.decode('latin-1', errors='ignore')


async def extract_text_from_file(url: str) -> str:
    """
    Download file and extract text based on file extension.
    
    Supported formats: PDF, DOCX, TXT
    
    Args:
        url: URL of the file to download and extract
        
    Returns:
        Extracted text
        
    Raises:
        ValueError: If file format is not supported
    """
    file_content = await download_file(url)
    
    # Determine file type from URL
    url_lower = url.lower()
    
    if url_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_content)
    elif url_lower.endswith('.docx') or url_lower.endswith('.doc'):
        return extract_text_from_docx(file_content)
    elif url_lower.endswith('.txt'):
        return extract_text_from_txt(file_content)
    else:
        raise ValueError(f"Unsupported file format. Supported: PDF, DOCX, TXT")
