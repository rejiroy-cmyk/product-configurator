import re
import os

log_path = "/Users/jenistonsellathamby/.gemini/antigravity/brain/81c6ec1a-149c-4c4f-8c83-757f57a9eabe/.system_generated/logs/overview.txt"

with open(log_path, 'r') as f:
    content = f.read()

# Find the view_file tool output for index.css lines 701 to 1500
match = re.search(r"File Path: `file:///Users/jenistonsellathamby/Desktop/product-configurator/index\.css`\nTotal Lines: \d+\nTotal Bytes: \d+\nShowing lines 701 to 1500\n.*?(701:.*?1500:.*?)\nThe above content", content, re.DOTALL)
if match:
    lines = match.group(1).split('\n')
    cleaned_lines = [re.sub(r'^\d+: ', '', line) for line in lines]
    with open('scratch/recovered_css_part2.css', 'w') as out:
        out.write('\n'.join(cleaned_lines))
    print("Successfully extracted CSS lines 701-1500! Found", len(cleaned_lines), "lines.")
else:
    print("Could not find the view_file output in the logs.")
