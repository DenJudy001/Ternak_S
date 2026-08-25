# SiTernak (Sistem Manajemen Peternakan Ayam Petelur)

SiTernak adalah platform manajemen peternakan modern yang dirancang untuk membantu pengelolaan dan pemantauan operasional peternakan ayam petelur secara efisien, mulai dari pencatatan produksi telur, manajemen pakan, hingga monitoring kesehatan dan inventaris.

---

## 🏗️ Struktur Arsitektur Monorepo

Proyek ini menggunakan struktur monorepo dengan pemisahan independen antara Backend dan Frontend:

```text
SiTernak/
├── backend/
│   ├── app/
│   │   ├── core/           # Konfigurasi aplikasi & settings
│   │   ├── models/         # Database entities (SQLAlchemy - Ticket T0.2)
│   │   ├── schemas/        # Validasi payload request/response (Pydantic)
│   │   ├── repositories/   # Data access layer (Query & Database operations)
│   │   ├── services/       # Core business logic
│   │   └── routers/        # API route handlers / controllers
│   ├── main.py             # FastAPI entry point
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Template environment backend
├── frontend/
│   ├── src/
│   │   ├── assets/         # Static assets (gambar, icon, dll.)
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Halaman aplikasi / View
│   │   ├── services/       # API call handlers & integration
│   │   ├── App.jsx         # Root React component
│   │   ├── index.css       # Tailwind CSS base styles
│   │   └── main.jsx        # Frontend entry point
│   ├── package.json        # Node dependencies & scripts
│   ├── tailwind.config.js  # Konfigurasi Tailwind CSS
│   ├── vite.config.js      # Konfigurasi bundler Vite
│   └── .env.example        # Template environment frontend
├── .gitignore
├── issue.md
└── README.md
```

---

## ⚙️ Prasyarat (Prerequisites)

- **Python**: versi 3.10+ (disarankan 3.11+)
- **Node.js**: versi 18+ (LTS) & **npm**

---

## 🚀 Panduan Menjalankan Secara Lokal

### 1. Menjalankan Backend (FastAPI)

1. Buka terminal dan masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Buat virtual environment dan aktifkan:
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Salin template konfigurasi & environment:
   ```bash
   cp .env.example .env
   cp alembic.ini.example alembic.ini
   # Di Windows CMD/PowerShell:
   # copy .env.example .env
   # copy alembic.ini.example alembic.ini
   ```
5. Jalankan migrasi database (Alembic):
   ```bash
   alembic upgrade head
   ```
6. Jalankan server backend:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
7. Akses status server & dokumentasi OpenAPI interaktif:
   - Health Check: [http://localhost:8000/health](http://localhost:8000/health)
   - Swagger UI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 2. Menjalankan Frontend (React + Vite + Tailwind CSS)

1. Buka terminal baru dan masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Salin environment file:
   ```bash
   cp .env.example .env
   # Di Windows CMD/PowerShell: copy .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Jalankan development server:
   ```bash
   npm run dev
   ```
5. Buka browser di [http://localhost:5173](http://localhost:5173).

---

## 📌 Status Roadmap Tiket
- [x] **T0.1**: Inisialisasi struktur monorepo, FastAPI skeleton, React Vite + Tailwind CSS, `.gitignore`, dan README.
- [x] **T0.2**: Setup PostgreSQL, model SQLAlchemy (6 tabel), & migrasi Alembic.
