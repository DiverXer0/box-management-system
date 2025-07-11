📦 Box Management System
A lightweight, production-ready web application for managing physical storage boxes and their contents. Features QR code generation/scanning, advanced search capabilities, and professional export options.

Show Image
Show Image
Show Image
Show Image
Show Image

🚀 Features
Box Management: Create, update, delete, and organize storage boxes
Item Tracking: Add items with quantity tracking and descriptions
QR Code System: Generate and scan QR codes for instant box access
Smart Search: Fuzzy search with typo tolerance
Export Options: PDF reports and CSV exports
Mobile Responsive: Works on any device
Lightweight: Uses SQLite - no database server required
All-in-One: Single container deployment
🏃 Quick Start
Option 1: Docker (Recommended)
bash
# Run with persistent storage
docker run -d \
  -p 80:80 \
  -v boxdata:/app/backend/data \
  --name boxmanager \
  diverxer0/box-management-sqlite:latest
Access at: http://localhost

Option 2: Docker Compose
bash
# Clone the repository
git clone https://github.com/DiverXer0/box-management-system.git
cd box-management-system

# Start the application
docker-compose -f docker-compose.sqlite.yml up -d
🛠️ Development Setup
Prerequisites
Docker Desktop
Node.js 18+ (for local development)
Python 3.11+ (for local development)
Local Development
Backend Setup
bash
cd backend
pip install -r requirements.txt
python main.py
Frontend Setup
bash
cd frontend
npm install
npm start
📱 Usage
Creating Boxes
Click "Create New Box"
Enter name, location, and description
Print the QR code for physical labeling
Managing Items
Click on any box
Add items with quantities
Search items within boxes
Export box contents as PDF or CSV
QR Code Workflow
Generate QR code for each box
Print and attach to physical boxes
Scan QR codes to instantly view contents
🏗️ Architecture
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│   SQLite    │
│   (React)   │     │  (FastAPI)  │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                    Single Container
🐳 Docker Configuration
Build from Source
bash
docker build -f Dockerfile.sqlite -t box-management:latest .
Environment Variables
DATABASE_URL: SQLite database path (default: sqlite:///./data/box_management.db)
CORS_ORIGINS: Allowed origins (default: all)
📊 API Documentation
Endpoints
GET /api/health - Health check
GET /api/boxes - List all boxes
POST /api/boxes - Create new box
GET /api/boxes/{id} - Get box details
PUT /api/boxes/{id} - Update box
DELETE /api/boxes/{id} - Delete box
GET /api/boxes/{id}/items - List items in box
POST /api/items - Add item to box
GET /api/search?q=term - Global search
API Documentation
When running locally, visit: http://localhost:8000/docs

🔒 Data Persistence
Data is stored in a SQLite database file. To ensure data persistence:

bash
# Create a named volume
docker volume create boxdata

# Run with volume mounted
docker run -d -p 80:80 -v boxdata:/app/backend/data diverxer0/box-management-sqlite:latest
Backup Database
bash
# Backup
docker exec boxmanager cp /app/backend/data/box_management.db /app/backend/data/backup.db

# Copy to host
docker cp boxmanager:/app/backend/data/backup.db ./backup.db
🚀 Deployment
Synology NAS
Open Container Station
Search for diverxer0/box-management-sqlite
Create container with port 80 mapped
Mount volume to /app/backend/data
Linux Server
bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Run the container
docker run -d \
  --restart unless-stopped \
  -p 80:80 \
  -v /opt/boxmanager/data:/app/backend/data \
  --name boxmanager \
  diverxer0/box-management-sqlite:latest
Docker Swarm
bash
docker service create \
  --name boxmanager \
  --publish 80:80 \
  --mount type=volume,source=boxdata,destination=/app/backend/data \
  diverxer0/box-management-sqlite:latest
🔧 Troubleshooting
Container won't start
bash
# Check logs
docker logs boxmanager

# Check health
docker exec boxmanager curl http://localhost/api/health
Can't create boxes
Check browser console (F12) for errors
Ensure port 80 is not in use
Verify volume permissions
Performance issues
SQLite is suitable for up to 10,000 boxes with 100,000 items
For larger deployments, consider PostgreSQL version
📈 Performance
Startup Time: < 5 seconds
Memory Usage: ~50MB
Storage: ~1MB per 1000 items
Concurrent Users: 10-20 recommended
🤝 Contributing
Fork the repository
Create your feature branch (git checkout -b feature/AmazingFeature)
Commit your changes (git commit -m 'Add some AmazingFeature')
Push to the branch (git push origin feature/AmazingFeature)
Open a Pull Request
📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
FastAPI for the excellent Python framework
React team for the powerful UI library
SQLite for the reliable embedded database
All contributors and users
📞 Support
Issues: GitHub Issues
Discussions: GitHub Discussions
Docker Hub: diverxer0/box-management-sqlite
Made with ❤️ for organizing everything

