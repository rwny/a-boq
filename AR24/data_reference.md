# BOQ Data Reference — AR-24 ชอปเหล็ก

## 📋 โครงสร้างข้อมูล

แต่ละ sheet มีคอลัมน์ดังนี้:
| Column | ชื่อ | ความหมาย |
|:------:|:----|:---------|
| A | ลำดับที่ | หมายเลขลำดับ / รหัส (sn-1, P2, JF1, ฯลฯ) |
| B | รายการ | ชื่อรายการหลัก — **สำคัญที่สุด** |
| C | รายการประกอบ | รายละเอียดย่อยของ item (บางครั้งมีข้อมูลสำคัญ) |
| D | - | ส่วนน้อยที่ใช้ |
| E | จำนวน | Quantity |
| F | หน่วย | หน่วยนับ (ตร.ม., ชุด, ท่อน, ฯลฯ) |
| G | ค่าวัสดุ/หน่วย | ราคาค่าวัสดุต่อหน่วย |
| H | ค่าวัสดุรวม | ราคาค่าวัสดุรวม (G × E) |
| I | ค่าแรง/หน่วย | ราคาค่าแรงต่อหน่วย |
| J | ค่าแรงรวม | ราคาค่าแรงรวม (I × E) |
| K | รวม | H + J |

## 🔑 รหัสลัด ↔ รายการเต็ม

### งานพื้น (B.2)
| รหัส | รายการเต็ม |
|:----:|:-----------|
| F0 | พื้นเดิม ทำความสะอาด ขัดยาแนว |
| F3 | ปูกระเบื้องยางแผ่น鎖 \u200b ลายไม้ หนา 3 มม. |
| F4 | งานปูกระเบื้องเซรามิก ขนาด 60x60 ซม. |
| F5 | งานปูกระเบื้องเซรามิก ขนาด 30x30 ซม. |
| F8 | งานพื้นไม้จริง ไม้เต็ง หนา 16 มม. |

### งานผนัง (B.3)
| รหัส | รายการเต็ม |
|:----:|:-----------|
| P2 | ผนังคอนกรีตมวลเบา G4 หนา 7.5 ซม. |
| P3 | ผนังไฟเบอร์ซีเมนต์ หนา 12 มม. กรุ 2 ด้าน โครงคร่าวเหล็กกล่องชุบสีกันสนิม 75x38x3.2 มม. |
| P4 | ตะแกรงเหล็กฉีก |
| P5 | ผนังก่ออิฐมอญเต็มแผ่น |
| P6 | ผนังก่ออิฐมอญครึ่งแผ่น |
| S3 | ทาสีปูนใหม่ สีน้ำอะครีลิค 100% ทาภายนอก |
| S4 | ทาสีปูนใหม่ สีน้ำอะครีลิค 100% ทาภายใน |
| B1 | บัวเชิงผนังแผ่นยาง 10 ซม. หนา 1.4 มม. |
| C2 | ฝ้าเพดาน(Ceiling) |
| C3 | ฝ้าเพดาน 
| C5 | ฝ้าเพดาน |

... and so on for each section.

Wait, I don't actually have the full descriptions for many of these codes. The user said the full description is in columns B/C/D of the Excel but the clean script didn't pick it up. The real question is: how do we extract these full descriptions?

Let me think about this differently. The user is suggesting we create documentation (.md) for each project that documents:
1. What data is in columns B, C, D
2. Code mappings

But I think the user is actually suggesting a process improvement - not just documentation. They want to be able to see the full item descriptions in the dashboard. The example was "sn-1" should show "sn-1 โถส้วม" - meaning the description should include the full product name.

Let me address both: create the .md reference AND potentially improve the data extraction to include fuller descriptions.

Actually, the user said "เราดควรทำ .md ไว้สำหรบแต่ละัหมวดไม๊" - should we make .md for each category? And the example about sn-1 showing just "sn-1" but should show "sn-1 โถส้วม" - this is about the DATA QUALITY issue.

The root cause: in the Excel, some items have their full description in column C (รายการประกอบ) while column B only has the short code. The clean script reads column B only, missing the full description.

So the solution could be:
1. Create reference .md files documenting code mappings
2. OR fix the data extraction to concatenate columns B + C

Let me propose this to the user and see what they want.
