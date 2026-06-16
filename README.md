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

# --------------------------------------------------------------------------------------------------------------------------------------------------
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
Admin Login: admin@prestigehorizon.com / admin123
Users: Can register and start sending transfers immediately

To create admin user : curl -X POST http://localhost:8001/api/admin/create-admin