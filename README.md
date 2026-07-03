# Pour réveiller venv: 
# recréer : 
python -m venv .venv

# activer : 
.venv\Scripts\activate
.venv\Scripts\Activate.ps1

# mettre à jour pip: 
python -m pip install --upgrade pip

# installer les deps : 
pip install -r requirements.txt

# vérifier : 
where python
where pip

# installer correctement les deps : 
python -m pip install -r requirements.txt

# test final pour python et venv : 
python -c "import sys; print(sys.executable)"

# Installer npm 
npm install


# wake up server
uvicorn server:app --reload
uvicorn server:app --reload --port 8000

# In conclusion
- main folder : .venv\Scripts\Activate.ps1
- backend : uvicorn server:app --reload --port 8000
- frontend : npm start

# Endpoint pour créer un compte Administrateur:
db.users.insertOne({
    email: "admin@prestigemoneytransfer.ca",
    password: "$2b$12....", // mot de passe bcrypt haché
    first_name: "Admin",
    last_name: "Prestige",
    role: "admin",
    is_active: true,
    created_at: new Date()
})

db.users.insertOne({
    id: "ADMIN-001",
    email: "admin@prestigemoneytransfer.ca",
    password: "$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    full_name: "Admin Prestige",
    phone: "+1 514 000 0000",
    country: "Canada",
    is_admin: true,
    created_at: new Date().toISOString()
})

### ------------------------------------------------------------------------------------------------------------------------- ###

To start venv (project root folder)
# .venv\Scripts\Activate

To start server (in backend folder)
# uvicorn server:app --reload

To Launch user interface (In frontend folder)
# npm start

En cas de perte de tous tes comptes admin et que tu as encore accès à l'API, le plus simple est d'appeler :
# POST /api/admin/create-admin
# curl -X POST https://prestige-money-transfer-api-onrender-com.onrender.com/api/admin/create-admin
Cela recréera automatiquement --------- Email : admin@prestigemoneytransfer.ca Mot de passe : PrestigeAdmin2024!

### ------------------------------------------------------------------------------------------------------------------------- ###

Troubleshooting "Scripts are Disabled"
If you get an error saying "running scripts is disabled on this system," Windows is blocking the activation script for security. You can fix this for your current session by running:

PowerShell

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
After running that, try the activation command again.

3. How to Create a New one (If needed)
If you ever need to create a fresh environment from scratch, use these commands:

Create the folder: python -m venv .venv

Activate it: .\.venv\Scripts\Activate.ps1

Install dependencies: pip install -r requirements.txt (if you have a Python backend).

Quick Summary for Other Terminals
If you switch away from PowerShell, the command changes slightly:

Command Prompt (cmd): .venv\Scripts\activate.bat

Git Bash / Linux / macOS: source .venv/bin/activate

Quick Access
Users: Can register and start sending transfers immediately

To create admin user : curl -X POST http://localhost:8001/api/admin/create-admin