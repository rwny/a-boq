import fitz

def inspect():
    pdf_path = r"D:\Downloads\ว135 ลว 3 มีนาคม 2566 การปรับปรุงบัญชีค่าแรงงาน yotathai.pdf"
    doc = fitz.open(pdf_path)
    page = doc[1] # Page 2
    words = page.get_text("words")
    # Sort words by y0 then x0
    words.sort(key=lambda w: (w[1], w[0]))
    
    with open("inspect_page1.txt", "w", encoding="utf-8") as f:
        for w in words:
            f.write(f"x0={w[0]:.1f}, y0={w[1]:.1f}, x1={w[2]:.1f}, y1={w[3]:.1f}: {w[4]}\n")

if __name__ == "__main__":
    inspect()
