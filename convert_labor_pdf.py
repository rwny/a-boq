import fitz
import json
import os
import re

def clean_text(t):
    if not t:
        return ""
    # Normalize spaces, quotes, and clean common OCR errors
    t = t.strip()
    t = re.sub(r'\s+', ' ', t)
    # Common Thai character/OCR fixes
    t = t.replace("ลาดับ", "ลำดับ").replace("ชนาด", "ขนาด").replace("ส์าดับ", "ลำดับ").replace("สำดับ", "ลำดับ")
    return t

def find_headers(words):
    # Detect header center x coordinates on a page to establish column boundaries
    header_x = {
        'col1': None, # ลำดับ
        'col2': None, # รายการ
        'col3': None, # หน่วย
        'col4': None, # ค่าแรง
        'col5': None  # หมายเหตุ
    }
    
    # Header zone is typically y < 160
    header_words = [w for w in words if 80 <= w[1] <= 160]
    
    for w in header_words:
        txt = w[4].replace(" ", "")
        x_center = (w[0] + w[2]) / 2.0
        
        if any(k in txt for k in ["ลำดับ", "ลาดับ", "สำดับ", "ส์าดับ"]):
            header_x['col1'] = x_center
        elif "รายการ" in txt:
            header_x['col2'] = x_center
        elif "หน่วย" in txt:
            header_x['col3'] = x_center
        elif any(k in txt for k in ["ค่าแรง", "ค่าแรงงาน", "ค่าแรง/หน่วย"]):
            header_x['col4'] = x_center
        elif "หมายเหตุ" in txt:
            header_x['col5'] = x_center
            
    # Default boundaries: col1 < 95 < col2 < 355 < col3 < 398 < col4 < 465 < col5
    boundaries = [95, 355, 398, 465]
    
    if header_x['col1'] and header_x['col2']:
        boundaries[0] = (header_x['col1'] + header_x['col2']) / 2.0
    elif header_x['col2']:
        boundaries[0] = header_x['col2'] - 120
        
    if header_x['col2'] and header_x['col3']:
        boundaries[1] = (header_x['col2'] + header_x['col3']) / 2.0
        
    if header_x['col3'] and header_x['col4']:
        boundaries[2] = (header_x['col3'] + header_x['col4']) / 2.0
        
    if header_x['col4'] and header_x['col5']:
        boundaries[3] = (header_x['col4'] + header_x['col5']) / 2.0
        
    # Validation: Boundaries must be in ascending order and within reasonable limits
    if not (50 < boundaries[0] < 150 and 280 < boundaries[1] < 380 and 350 < boundaries[2] < 430 and 420 < boundaries[3] < 500):
        return [95, 355, 398, 465] # Fallback to default
        
    return boundaries

def is_junk_row(row):
    non_empty = [v for v in [row['col1'], row['col2'], row['col3'], row['col4'], row['col5']] if v]
    if not non_empty:
        return True
    joined = "".join(non_empty).replace(" ", "")
    # Skip rows that are just header/unit labels
    if joined in ["(บาท)", "บาท", "ลำดับที่", "รายการ", "หน่วย", "ค่าแรงงาน/หน่วย", "หมายเหตุ", "ค่าแรงงาน", "ค่าแรง", "ค่าแรง/หน่วย"]:
        return True
    return False

def parse_pdf():
    pdf_path = r"D:\Downloads\ว135 ลว 3 มีนาคม 2566 การปรับปรุงบัญชีค่าแรงงาน yotathai.pdf"
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return None

    doc = fitz.open(pdf_path)
    print(f"Opened PDF: {pdf_path} ({len(doc)} pages)")

    raw_rows = []
    
    # Tables are on pages 2 to 37 (index 1 to 36)
    for page_idx in range(1, 37):
        page = doc[page_idx]
        words = page.get_text("words")
        
        # Detect column boundaries dynamically for this page
        boundaries = find_headers(words)
        b1, b2, b3, b4 = boundaries
        
        # Sort words by y0 first to group them into lines
        words.sort(key=lambda w: w[1])
        
        lines = []
        for w in words:
            x0, y0, x1, y1, word = w[0], w[1], w[2], w[3], w[4]
            found = False
            for line in lines:
                line_y_center = (line['y0'] + line['y1']) / 2.0
                word_y_center = (y0 + y1) / 2.0
                if abs(line_y_center - word_y_center) < 4.0:
                    line['words'].append(w)
                    line['y0'] = min(line['y0'], y0)
                    line['y1'] = max(line['y1'], y1)
                    found = True
                    break
            if not found:
                lines.append({
                    'y0': y0,
                    'y1': y1,
                    'words': [w]
                })
        
        lines.sort(key=lambda l: l['y0'])
        
        for line in lines:
            y_center = (line['y0'] + line['y1']) / 2.0
            # Filter page headers/numbers and footers
            if y_center < 85 or y_center > 790:
                continue
                
            cols = {1: [], 2: [], 3: [], 4: [], 5: []}
            for w in line['words']:
                x0 = w[0]
                if x0 < b1:
                    cols[1].append(w)
                elif x0 < b2:
                    cols[2].append(w)
                elif x0 < b3:
                    cols[3].append(w)
                elif x0 < b4:
                    cols[4].append(w)
                else:
                    cols[5].append(w)
            
            # Sort words within each column by x0 and join them
            col_texts = []
            for c in range(1, 6):
                cols[c].sort(key=lambda w: w[0])
                txt = " ".join([w[4] for w in cols[c]]).strip()
                col_texts.append(txt)
                
            col1, col2, col3, col4, col5 = col_texts
            row = {
                'page': page_idx + 1,
                'col1': col1,
                'col2': col2,
                'col3': col3,
                'col4': col4,
                'col5': col5
            }
            
            if not is_junk_row(row):
                raw_rows.append(row)
                
    print(f"Extracted {len(raw_rows)} raw rows.")
    return raw_rows

def build_structured_data(raw_rows):
    if not raw_rows:
        return []
        
    parsed_items = []
    current_cat = "A"
    
    # State variables for accumulating multi-line descriptions/notes
    accumulated_desc = ""
    accumulated_notes = ""
    active_header_desc = ""
    
    for row in raw_rows:
        col1 = clean_text(row['col1'])
        col2 = clean_text(row['col2'])
        col3 = clean_text(row['col3'])
        col4 = clean_text(row['col4'])
        col5 = clean_text(row['col5'])
        
        # Check if it is a main category header ("1", "2", "3", "4")
        if col1 in ["1", "2", "3", "4"] and not col3 and not col4:
            if col1 == "1":
                current_cat = "A"
            elif col1 == "2":
                current_cat = "B"
            elif col1 == "3":
                current_cat = "C"
            elif col1 == "4":
                current_cat = "D"
            
            desc = col2 if col2 else f"หมวดที่ {col1}"
            parsed_items.append({
                "type": "category",
                "cat": current_cat,
                "code": f"{current_cat}.",
                "description": f"{col1}. {desc}",
                "unit": "",
                "labor_price": None,
                "notes": ""
            })
            active_header_desc = desc
            accumulated_desc = ""
            accumulated_notes = ""
            continue
            
        # Parse labor price
        labor_price = None
        if col4:
            val_str = col4.replace(",", "").replace(" ", "")
            try:
                labor_price = float(val_str)
            except ValueError:
                pass
                
        is_item = (col3 != "") or (labor_price is not None)
        
        if not is_item:
            # Check if subcategory header like "1.1", "1.2", "2.1", etc.
            is_subcat = False
            if col1:
                parts = col1.split(".")
                if parts and parts[0].isdigit():
                    is_subcat = True
                    
            if is_subcat:
                parts = col1.split(".")
                suffix = ".".join(parts[1:])
                code = f"{current_cat}{suffix}." if suffix else f"{current_cat}."
                desc = col2 if col2 else col5
                parsed_items.append({
                    "type": "subcategory",
                    "cat": current_cat,
                    "code": code,
                    "description": f"{col1} {desc}",
                    "unit": "",
                    "labor_price": None,
                    "notes": ""
                })
                active_header_desc = desc
                accumulated_desc = ""
                accumulated_notes = ""
            else:
                # Accumulate multi-line texts
                if col2:
                    accumulated_desc = (accumulated_desc + " " + col2).strip()
                if col5:
                    accumulated_notes = (accumulated_notes + " " + col5).strip()
        else:
            # Combine accumulated text with current description
            final_desc = col2
            if accumulated_desc:
                if final_desc:
                    final_desc = accumulated_desc + " " + final_desc
                else:
                    final_desc = accumulated_desc
                accumulated_desc = ""
                
            final_notes = col5
            if accumulated_notes:
                if final_notes:
                    final_notes = accumulated_notes + " " + final_notes
                else:
                    final_notes = accumulated_notes
                accumulated_notes = ""
                
            # Prepend active header to description if needed (e.g. for pile sizes)
            if active_header_desc:
                h = active_header_desc.lower()
                d = final_desc.lower()
                should_combine = False
                if any(kw in h for kw in ["ขนาด", "ความสูง", "dia", "ศก", "รุ่น", "ชนิด", "สายไฟฟ้า", "ท่อ"]):
                    should_combine = True
                elif len(h) < 15:
                    should_combine = True
                    
                if should_combine and not d.startswith(h):
                    final_desc = f"{active_header_desc} {final_desc}"
                    
            parsed_items.append({
                "type": "item",
                "cat": current_cat,
                "code": "", # Will map or generate later
                "description": final_desc,
                "unit": col3,
                "labor_price": labor_price,
                "notes": final_notes
            })
            
    return parsed_items

def update_master_database(parsed_items):
    master_path = r"D:\Works\AR3D\2-DataBase\BOQ\output\spst_data.json"
    if not os.path.exists(master_path):
        print(f"Error: Master database not found at {master_path}")
        return
        
    with open(master_path, "r", encoding="utf-8") as f:
        master_data = json.load(f)
        
    print(f"Loaded master database with {len(master_data)} items.")
    
    # Helper to clean strings for fuzzy matching
    def norm(s):
        if not s:
            return ""
        s = s.replace(" ", "").replace("(", "").replace(")", "").replace("ม.", "เมตร").replace("ลบ.ม.", "ลูกบาศก์เมตร").replace("ตร.ม.", "ตารางเมตร")
        return s.lower()
        
    # Group parsed items by category
    parsed_by_cat = {'A': [], 'B': [], 'C': [], 'D': []}
    for item in parsed_items:
        if item['type'] == 'item':
            parsed_by_cat[item['cat']].append(item)
            
    # Keep track of statistics
    updated_count = 0
    not_found_count = 0
    
    # We will match items sequentially and by description inside each category
    current_cat = "A"
    
    for master_item in master_data:
        code = master_item.get("code", "")
        if code.endswith("."):
            # Update current category
            if code.startswith("A"):
                current_cat = "A"
            elif code.startswith("B"):
                current_cat = "B"
            elif code.startswith("C"):
                current_cat = "C"
            elif code.startswith("D"):
                current_cat = "D"
            continue
            
        # Only update items that have units or had labor_price
        if not master_item.get("unit") and master_item.get("labor_price") is None:
            continue
            
        # Try to find a match in parsed_by_cat[current_cat]
        m_desc = norm(master_item.get("description", ""))
        m_unit = norm(master_item.get("unit", ""))
        
        match = None
        # Look for exact or very close match
        for p_item in parsed_by_cat[current_cat]:
            p_desc = norm(p_item["description"])
            p_unit = norm(p_item["unit"])
            
            # Simple match condition: unit matches and description contains or matches
            if p_unit == m_unit and (p_desc == m_desc or m_desc in p_desc or p_desc in m_desc):
                match = p_item
                # Remove matched item to avoid reuse
                parsed_by_cat[current_cat].remove(p_item)
                break
                
        if match:
            # Update the labor price!
            master_item["labor_price"] = match["labor_price"]
            # Also copy updated notes if present
            if match["notes"]:
                master_item["notes"] = match["notes"]
            updated_count += 1
        else:
            not_found_count += 1
            
    output_path = r"D:\Works\AR3D\2-DataBase\BOQ\output\spst_data_new.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(master_data, f, ensure_ascii=False, indent=2)
        
    print(f"\nUpdate Statistics:")
    print(f"- Updated items: {updated_count}")
    print(f"- Unmatched master items: {not_found_count}")
    print(f"- Saved updated database to: {output_path}")

def main():
    raw_rows = parse_pdf()
    if not raw_rows:
        return
    parsed_items = build_structured_data(raw_rows)
    print(f"Structured {len(parsed_items)} items/categories from PDF.")
    update_master_database(parsed_items)

if __name__ == "__main__":
    main()
