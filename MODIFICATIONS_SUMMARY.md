# Summary of Modifications — Quotation App

**Prepared for supervisor review**

---

## 1. Smart Home Page (تسعير سمارت هوم)

- **Categories:** The page is split into 6 categories. User selects a category to see its items:
  - Curtain (ستائر)
  - Switches (سويتشات)
  - Control Panels (شاشات تحكم)
  - Smart Door Locks (أقفال ذكية)
  - Sensors (حساسات)
  - AC (تكييف)

- **Items:** Each item shows:
  - Product photo (from project assets)
  - Name
  - Price
  - Stock quantity
  - Quantity selector for quotation

- **Catalog data:** Product list and prices were updated to match the provided catalog (11 items: smart curtain, 1/2/3 gang switches, 4" & 10" control panels, smart door locks, motion sensors, smart thermostat controllers). Photos are linked from the `frontend/src/assets` folder per item.

---

## 2. AI Quotation Page (تسعير AI)

- **Simplified form:** Only two fields:
  - **Name of service** (اسم الخدمة)
  - **Description** (الوصف)
- Removed the previous service-type dropdown and fixed list. Quotation is generated from the entered name and description for record-keeping.

---

## 3. Smart Home Rough / Approximate Quotation (تسعير تقريبي)

- **Step-by-step flow:** Questions are shown one by one with **Next** / **Previous**. Each question has a numeric field and **+** / **−** buttons.
- **Questions (in order):**
  1. كم طابق؟ (Number of floors)
  2. كم غرفة نوم؟ (Number of bedrooms)
  3. كم حمام؟ (Number of bathrooms)
  4. كم صالة؟ (Number of living rooms)
  5. كم ممر؟ (Number of corridors)
  6. كم شباك؟ (Number of windows)
  7. كم باب؟ (Number of doors)

- **Calculation rules (as requested):**
  - Each **bedroom** → 3 switches + 1 AC (using highest switch price)
  - Each **bathroom** → 1 switch + 1 motion sensor
  - Each **corridor** → 1 switch + 1 motion sensor
  - Each **window** → 1 curtain
  - Each **door** → 1 smart door lock
  - Each **living room** → 4 switches + 1 AC
  - Each **floor** → 1× 10-inch control panel  

  Prices are taken from the current product catalog (API/stock).

- **Tax:** **15% tax** (ضريبة 15%) is always applied on the devices subtotal and shown as a separate line in the quotation.

- **Optional: Installation & programming:** A checkbox **أجرة تركيب وبرمجة (+15%)** was added. When selected, an extra **15%** is added for installation and programming (أجرة تركيب وبرمجة) and shown as a separate line. When not selected, this 15% is not added.

- **Result screen:** After the last step, the user sees a summary of answers, can edit answers, and sees the full quotation table with total, **Download PDF**, and **Save quotation**.

---

## 4. Quotation PDF

- **Layout:** Two-page PDF similar to the Zuccess sample:
  - **Page 1:** Quote title, quote number, company details, Bill To, Subject, Quote Date, items table (#, Item & Description, Qty, Rate, Amount), Sub Total, Total, Notes, signature line.
  - **Page 2:** Payment terms, installation duration, warranty & support, validity, exclusions.

- **Company details on PDF:** In addition to name, address, phone, email, and website, the following are included:
  - **License Number:** 7042632393
  - **VAT Number:** 312668821500003

- **Download:** Available from Smart Home, AI, and Smart Home Rough quotation result screens.

---

## 5. Technical / Deployment

- Backend and frontend prepared for deployment (Railway + Vercel): environment variables, CORS, API base URL, `DEPLOY.md` with steps.
- Repository pushed to GitHub (e.g. smart_home repo); deployment instructions are in `DEPLOY.md`.

---

## 6. Files Touched (Overview)

| Area              | Main files |
|-------------------|------------|
| Smart Home        | `SmartHome.jsx`, `QuotationForm.jsx`, `initDb.js`, `itemImages.js` |
| AI Quotation      | `AIQuotation.jsx`, `QuotationForm.jsx` |
| Smart Home Rough  | `SmartHomeRough.jsx`, `QuotationForm.jsx`, `Section.css` |
| PDF               | `quotationPdf.js` |
| Data & assets     | `initDb.js` (catalog), `frontend/src/assets` (images) |

---

*End of summary.*
