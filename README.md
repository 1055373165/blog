# Modern Blog System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go&logoColor=white)](https://golang.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

A modern, minimal blog system focused on powerful categorization and search capabilities with professional content management features.

## ✨ Features

### 🎯 Core Functionality
- **Advanced Categorization**: Multi-level categories, tag clouds, article series management
- **Intelligent Search**: Full-text search with Bleve, advanced filtering, related article recommendations
- **Modern Design**: Minimalist UI, responsive layout, dark mode support
- **Excellent Reading Experience**: Markdown support, syntax highlighting, reading progress tracking
- **Content Management**: Rich text editor with TipTap, image uploads, article drafts
- **Quote System**: Curated quotes with advanced filtering and display modes

### 📚 Search & Organization
- Multi-dimensional categorization: Categories → Subcategories → Tags
- Full-text search: Title, content, and excerpt search powered by Bleve
- Advanced filtering: Category + tag + date + view count combinations
- Smart recommendations: Content-based article suggestions
- Search analytics: Popular search terms and reading statistics

### 🛠️ Technical Highlights
- **Full-Stack TypeScript**: Type-safe development across frontend and backend
- **Modern React**: React 19 with hooks, context, and performance optimizations
- **Go Backend**: High-performance API with Gin framework and GORM
- **Search Engine**: Bleve full-text search with Chinese language support
- **Responsive UI**: Tailwind CSS with mobile-first design
- **Docker Ready**: Complete containerization for easy deployment

## 🏗️ Architecture

```
blog/
├── frontend/           # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utilities and helpers
│   └── package.json
├── backend/            # Go + Gin + GORM
│   ├── cmd/               # Application entry points
│   ├── internal/          # Private application code
│   │   ├── handlers/      # HTTP handlers
│   │   ├── models/        # Data models
│   │   ├── services/      # Business logic
│   │   └── middleware/    # HTTP middleware
│   ├── pkg/              # Public libraries
│   └── go.mod
├── docker/            # Docker configuration
├── scripts/           # Development and deployment scripts
└── docker-compose.yml
```

## 🚀 Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **TypeScript 5.8+** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query** - Server state management
- **TipTap** - Rich text editor
- **Lucide React** - Modern icon library

### Backend  
- **Go 1.23+** - Modern, efficient backend language
- **Gin** - High-performance HTTP web framework
- **GORM** - Developer-friendly ORM
- **Bleve** - Full-text search and indexing
- **JWT** - Secure authentication
- **bcrypt** - Password hashing

### Database & Infrastructure
- **MySQL 8+** - Primary database
- **Redis 7** - Caching and session storage
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and static file serving

## 🚀 Quick Start

### Prerequisites

- **Go 1.23+**
- **Node.js 18+** 
- **MySQL 8+**
- **Docker & Docker Compose** (recommended)

### One-Click Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd blog

# Ensure Docker is running, then execute:
./start-dev.sh
```

The script will automatically:
- Start MySQL and Redis databases
- Install dependencies and start backend service (port 3001)
- Install dependencies and start frontend service (port 5173)

### Manual Setup

#### 1. Database Setup
```bash
# Start databases with Docker
docker-compose up -d redis

# For MySQL, ensure it's running on localhost:3306
# macOS: brew services start mysql
# Ubuntu: sudo systemctl start mysql
```

#### 2. Environment Configuration
```bash
# Create environment files
echo "DB_PASSWORD=your_mysql_password" > .env
echo "VITE_API_BASE_URL=http://localhost:3001" > frontend/.env
```

#### 3. Backend Setup
```bash
cd backend
make deps    # Install Go dependencies
make dev     # Start development server
```

#### 4. Frontend Setup
```bash
cd frontend
yarn install  # Install dependencies
yarn dev      # Start development server
```

### Production Deployment

```bash
# Build and start all services
docker-compose --profile production up -d

# Check service status
docker-compose ps
```

## 🌐 Service URLs

| Service | Development | Production |
|---------|-------------|------------|
| 🎨 Frontend | http://localhost:5173 | http://localhost:3000 |
| 🔧 Backend API | http://localhost:3001 | http://localhost:3001 |
| 🗄️ MySQL | localhost:3306 | localhost:3306 |
| 🔴 Redis | localhost:6379 | localhost:6379 |

### Default Credentials

- **Admin**: admin@blog.com / password

## 📖 API Documentation

The backend provides a RESTful API with the following main endpoints:

### Articles
- `GET /api/articles` - List articles with pagination and filtering
- `GET /api/articles/:id` - Get article details  
- `POST /api/articles` - Create new article (admin)
- `PUT /api/articles/:id` - Update article (admin)
- `DELETE /api/articles/:id` - Delete article (admin)

### Categories & Tags
- `GET /api/categories` - List all categories
- `GET /api/tags` - List all tags
- `GET /api/categories/:id/articles` - Articles by category
- `GET /api/tags/:id/articles` - Articles by tag

### Search
- `GET /api/search` - Full-text search with filters
- `GET /api/search/suggestions` - Search suggestions

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user info

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend
go test ./...

# Frontend tests
cd frontend
yarn test
```

### Code Quality
```bash
# Lint Go code
cd backend
go fmt ./...
go vet ./...

# Lint TypeScript/React
cd frontend
yarn lint
yarn typecheck
```

## 🚀 Deployment

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=blog_db

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=3001
GIN_MODE=release
```

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with production profile
docker-compose -f docker-compose.prod.yml up -d
```

## 📄 Project Status

- [x] ✅ Project structure and architecture
- [x] ✅ Go backend with Gin framework  
- [x] ✅ React frontend with TypeScript
- [x] ✅ Full-text search with Bleve
- [x] ✅ Article management system
- [x] ✅ Category and tag system
- [x] ✅ Quote management feature
- [x] ✅ Image upload functionality
- [x] ✅ Responsive UI design
- [x] ✅ Docker containerization
- [x] ✅ Development tooling
- [ ] 🔄 Unit test coverage
- [ ] 🔄 CI/CD pipeline
- [ ] 🔄 Performance monitoring

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`  
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Submit** a Pull Request

### Development Guidelines

- Follow Go standards and idiomatic patterns
- Use TypeScript for type safety
- Write clear, documented code
- Include tests for new features
- Follow the existing code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Go](https://golang.org/) and [React](https://reactjs.org/)
- Search powered by [Bleve](https://blevesearch.com/)
- UI components with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Star ⭐ this repository if you find it helpful!**