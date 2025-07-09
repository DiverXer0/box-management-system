# 📦 Box Management System

A comprehensive, production-ready web application for managing physical storage boxes and their contents. Features QR code generation/scanning, advanced search capabilities, and professional export options.

![Box Management System](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-green.svg)
![React](https://img.shields.io/badge/react-18.2-61dafb.svg)
![Docker](https://img.shields.io/badge/docker-ready-2496ed.svg)

## 🚀 Features

### Core Functionality
- **Box Management**: Create, update, delete, and organize storage boxes
- **Item Tracking**: Add items to boxes with quantity tracking and detailed descriptions
- **Direct Navigation**: Access boxes directly via URL or Box ID input
- **Mobile Responsive**: Fully optimized for mobile and desktop devices

### QR Code Integration
- **QR Generation**: Generate unique QR codes for each box
- **QR Scanning**: Scan QR codes with mobile camera for instant box access
- **Printable Labels**: Export professional QR code labels as PDFs

### Advanced Search & Filtering
- **Fuzzy Search**: Find items even with typos (e.g., "hamr" finds "hammer")
- **Global Search**: Search across all boxes and items simultaneously
- **Smart Filtering**: Filter by location, quantity range, creation date
- **Real-time Results**: Instant search results with highlighting

### Export Capabilities
- **PDF Reports**: Professional item tables with formatting
- **CSV Export**: Excel-compatible exports for data analysis
- **Bulk Operations**: Export entire system data or individual boxes

## 🏗️ Technical Architecture

### Backend Stack
- **FastAPI**: High-performance Python web framework
- **MongoDB**: NoSQL database with UUID-based documents
- **Motor**: Async MongoDB driver for Python
- **Pydantic**: Data validation and settings management

### Frontend Stack
- **React 18**: Modern UI library with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API communication

### Additional Libraries
- **QR Code**: qrcode, html5-qrcode
- **PDF Generation**: jsPDF, jsPDF-autotable
- **Fuzzy Search**: Fuse.js
- **Containerization**: Docker, Docker Compose

## 📋 Prerequisites

- Docker Desktop (includes Docker and Docker Compose)
- Git
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🛠️ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/box-management-system.git
cd box-management-system
```

### 2. Project Structure
Create the following directory structure:
```
box-management-system/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── nginx.conf
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── deploy.sh
└── README.md
```

### 3. Deploy with Single Command

#### Development Environment
```bash
chmod +x deploy.sh
./deploy.sh dev
```

#### Production Environment
```bash
./deploy.sh prod
```

### 4. Access the Application
- **Development**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **MongoDB**: localhost:27017

## 🔧 Configuration

### Environment Variables

Create `.env` file for development:
```env
NODE_ENV=development
REACT_APP_API_URL=http://localhost:8000/api
```

Create `.env.prod` file for production:
```env
NODE_ENV=production
REACT_APP_API_URL=/api
DOMAIN_NAME=your-domain.com
```

### SSL Configuration (Production)
Place SSL certificates in `nginx/ssl/`:
- `cert.pem`: SSL certificate
- `key.pem`: Private key

## 📱 Usage Guide

### Creating a Box
1. Click "Create New Box" on the homepage
2. Enter box name, location, and description
3. Click "Create Box"

### Adding Items
1. Navigate to a box by clicking on it
2. Click "Add Item"
3. Enter item details and quantity
4. Click "Add Item"

### QR Code Workflow
1. Click "QR Code" on any box
2. Print or download the QR code
3. Attach to physical box
4. Scan with mobile device to instantly access box contents

### Search Features
- **Box Search**: Use the search bar on the homepage
- **Item Search**: Use the search bar within a box
- **Global Search**: Click "Global Search" in navigation

### Exporting Data
- **PDF Export**: Click "Export PDF" for professional reports
- **CSV Export**: Click "Export CSV" for spreadsheet analysis

## 🐳 Docker Commands

### Development
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose build
```

### Production
```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## 🔍 API Endpoints

### Boxes
- `GET /api/boxes` - List all boxes
- `POST /api/boxes` - Create new box
- `GET /api/boxes/{box_id}` - Get specific box
- `PUT /api/boxes/{box_id}` - Update box
- `DELETE /api/boxes/{box_id}` - Delete box

### Items
- `GET /api/boxes/{box_id}/items` - List items in box
- `POST /api/items` - Create new item
- `GET /api/items/{item_id}` - Get specific item
- `PUT /api/items/{item_id}` - Update item
- `DELETE /api/items/{item_id}` - Delete item

### Search & Stats
- `GET /api/search?q=term` - Global search
- `GET /api/stats` - System statistics

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
npm run cypress:open
```

## 🚨 Troubleshooting

### Container Issues
```bash
# Check container status
docker ps

# View specific container logs
docker logs box-management-backend

# Restart containers
docker-compose restart
```

### Database Connection
```bash
# Access MongoDB shell
docker exec -it box-management-mongodb mongosh

# Check database
use box_management
db.boxes.find()
```

### Port Conflicts
If ports are already in use:
- Frontend: Change port 3000 in docker-compose.yml
- Backend: Change port 8000 in docker-compose.yml
- MongoDB: Change port 27017 in docker-compose.yml

## 📊 Performance Optimization

### Database Indexes
The application automatically creates indexes on:
- `boxes.name`
- `boxes.location`
- `items.name`
- `items.box_id`

### Caching
- Static assets cached for 1 year
- Gzip compression enabled
- Browser caching for API responses

## 🔐 Security Considerations

### Production Deployment
1. Enable HTTPS with valid SSL certificates
2. Set strong MongoDB passwords
3. Use environment variables for sensitive data
4. Enable CORS only for your domain
5. Regular security updates

### Data Backup
```bash
# Backup database
./deploy.sh backup

# Restore database
./deploy.sh restore backups/mongodb_backup_20240101_120000.dump
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FastAPI for the excellent Python web framework
- React team for the powerful UI library
- MongoDB for the flexible database solution
- All open-source contributors

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: support@boxmanagement.com
- Documentation: https://docs.boxmanagement.com

---

Built with ❤️ for organizing physical storage