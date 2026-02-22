# Plataforma NR01 - Base Inicial

Estrutura inicial com:
- `backend/`: Django + DRF
- `frontend/`: React + Vite

## 1) Backend (Django + DRF)

No diretório do projeto:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python backend/manage.py migrate
backend/.venv/Scripts/python backend/manage.py runserver
```

Se o `venv` falhar no seu ambiente, use temporariamente:

```powershell
python -m pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py runserver
```

Endpoint inicial:
- `GET http://127.0.0.1:8000/api/health/`

Autenticacao:
- `POST http://127.0.0.1:8000/api/auth/login/`
- `GET http://127.0.0.1:8000/api/auth/me/` (enviar header `Authorization: Token <token>`)
- CRUD Consultores (somente ADM):
- `GET/POST http://127.0.0.1:8000/api/consultores/`
- `GET/PATCH/DELETE http://127.0.0.1:8000/api/consultores/<id>/`

Criar superusuario (`ADM`):

```powershell
python backend/manage.py createsuperuser
```

## 2) Frontend (React + Vite)

Como o PowerShell pode bloquear `npm.ps1`, prefira `npm.cmd`:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Frontend padrão em:
- `http://127.0.0.1:5173`

## 3) Integração

O frontend já consulta o backend em:
- `http://127.0.0.1:8000/api/health/`
# nr1facil
