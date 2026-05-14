import pdfplumber
import sys

try:
    with pdfplumber.open('Calima.pdf') as pdf:
        for page in pdf.pages:
            print(page.extract_text())
except Exception as e:
    print(f"Error: {e}")
