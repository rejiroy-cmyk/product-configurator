import pandas as pd
import re

with open('Schmidlin.csv', 'r') as f:
    lines = [line.strip() for line in f.readlines()]

data = []
current_item = None

# We skip the header "Extracted Text" which is lines[0]
for line in lines[1:]:
    # Try to match the main product line: e.g., "10 1.0 1311 207.100.000 URP 714.00 714.00"
    # Or "20 1.0 1311 208.100.000 URP ..."
    match = re.match(r'^(\d+)\s+([\d\.]+)\s+(\d{4}\s\d{3}\.\d{3}\.\d{3})\s+(\w+)\s+([\d\.\,]+)\s+([\d\.\,]+)', line)
    
    if match:
        if current_item:
            data.append(current_item)
            
        pos = match.group(1)
        qty = match.group(2)
        art_nr = match.group(3)
        currency = match.group(4)
        price = match.group(5)
        total = match.group(6)
        
        current_item = {
            "Position": pos,
            "Quantity": qty,
            "ArticleNumber": art_nr,
            "Description": "",
            "Currency": currency,
            "UnitPrice": price,
            "TotalPrice": total
        }
    elif current_item:
        # Ignore pagination headers/footers
        if not line.startswith('Seite ') and 'exkl. MwSt.' not in line and 'Position Menge Bild' not in line:
            # Assume it's part of the description
            desc_text = line
            if desc_text.startswith('ST '):
                desc_text = desc_text[3:] # Remove the "ST " prefix indicating pieces
            current_item["Description"] += (" " + desc_text) if current_item["Description"] else desc_text

if current_item:
    data.append(current_item)

df = pd.DataFrame(data)
# Clean up descriptions
df['Description'] = df['Description'].str.strip()

df.to_csv('Schmidlin_Structured.csv', index=False)
print(f"Successfully extracted {len(df)} structured line items.")

# Print some basic analysis
print("\n--- Summary Analysis ---")
print(f"Total Unique Article Numbers: {df['ArticleNumber'].nunique()}")

# Try to parse prices
try:
    df['TotalPriceNumeric'] = df['TotalPrice'].str.replace(',', '').astype(float)
    total_sum = df['TotalPriceNumeric'].sum()
    print(f"Total Sum of all items: {df.iloc[0]['Currency']} {total_sum:.2f}")
except Exception as e:
    print(f"Could not calculate total sum due to parsing error: {e}")

print("\nTop 5 Most Expensive Items (by Total Price):")
try:
    top5 = df.sort_values(by='TotalPriceNumeric', ascending=False).head(5)
    for _, row in top5.iterrows():
        print(f"- {row['ArticleNumber']}: {row['Description'][:50]}... ({row['Currency']} {row['TotalPrice']})")
except:
    pass

