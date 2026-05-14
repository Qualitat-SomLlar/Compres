import sys
from pypdf import PdfReader

def read_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    with open("pdf_content.txt", "w", encoding="utf-8") as f:
        f.write(text)

if __name__ == "__main__":
    read_pdf(sys.argv[1])
