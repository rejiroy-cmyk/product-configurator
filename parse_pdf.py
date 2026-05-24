import pdfplumber
import pandas as pd
import json

pdf_path = 'Schmidlin.pdf'
csv_path = 'Schmidlin.csv'
summary = {"total_pages": 0, "tables_found": 0, "rows_extracted": 0, "sample_data": []}
all_tables = []

with pdfplumber.open(pdf_path) as pdf:
    summary["total_pages"] = len(pdf.pages)
    for page_num, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        if tables:
            for table in tables:
                summary["tables_found"] += 1
                df = pd.DataFrame(table[1:], columns=table[0])
                all_tables.append(df)
        else:
            # If no tables, try extracting text to see if it's unstructured
            pass

if all_tables:
    final_df = pd.concat(all_tables, ignore_index=True)
    summary["rows_extracted"] = len(final_df)
    final_df.to_csv(csv_path, index=False)
    summary["sample_data"] = final_df.head(5).to_dict(orient='records')
else:
    # If no structural tables were found, let's just dump text
    text_data = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                for line in text.split('\n'):
                    text_data.append([line])
    if text_data:
        final_df = pd.DataFrame(text_data, columns=["Extracted Text"])
        summary["rows_extracted"] = len(final_df)
        final_df.to_csv(csv_path, index=False)
        summary["sample_data"] = final_df.head(5).to_dict(orient='records')

print(json.dumps(summary, indent=2))
