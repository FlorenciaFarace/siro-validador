import pdfplumber

pdf1 = 'docs/SIRO-Developers-Codigo-de-Barra-0448-Version-5.4-09.25.pdf'
pdf2 = 'docs/SIRO-Developers-Subida-Base-Deuda-Full-Version-5.4-08.25.pdf'

# Extract all text from PDF 1
print("=" * 80)
print("PDF 1: CODIGO DE BARRA 0448")
print("=" * 80)
with pdfplumber.open(pdf1) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        if text:
            print(f"\n--- PAGE {i+1} ---\n")
            print(text)

# Extract all text from PDF 2
print("\n\n" + "=" * 80)
print("PDF 2: SUBIDA BASE DEUDA FULL")
print("=" * 80)
with pdfplumber.open(pdf2) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        if text:
            print(f"\n--- PAGE {i+1} ---\n")
            print(text)
