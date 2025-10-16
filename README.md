# Modern Blog System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go&logoColor=white)](https://golang.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

A feature-rich, modern blog platform with advanced content management, multimedia support, intelligent study system, and powerful search capabilities. Built with Go and React for optimal performance and developer experience.

## ✨ Features

### 🎯 Core Content Management
- **Article System**: Full-featured blog posts with Markdown/rich text editing, cover images, SEO optimization
- **Blog System**: Multimedia content support with audio/video files, thumbnails, and transcripts
- **Series Management**: Organize articles into ordered series with automatic navigation
- **Category & Tag System**: Multi-level categories with hierarchical structure and flexible tagging
- **Quote Collection**: Curated quotes with multiple view modes (grid, list, masonry, detailed)
- **User Submissions**: Community contribution system with review workflow and approval process

### 🎓 Intelligent Study System
- **Spaced Repetition**: Built-in learning algorithms (Ebbinghaus, SM2, Anki-style)
- **Study Plans**: Create personalized learning plans with daily/weekly/monthly goals
- **Progress Tracking**: Comprehensive analytics on learning efficiency, retention, and consistency
- **Smart Reminders**: Automated study reminders with priority levels and snooze functionality
- **Learning Analytics**: Detailed insights into study patterns, weak points, and mastery levels
- **Deliberate Practice**: Note-taking, difficulty ratings, and personalized review schedules

### 📚 Search & Discovery
- **Full-Text Search**: Bleve-powered search with Chinese language support
- **Advanced Filtering**: Multi-dimensional filtering by category, tags, date, and popularity
- **Search Suggestions**: Real-time search suggestions and autocomplete
- **Related Content**: AI-powered content recommendations based on similarity
- **Search Analytics**: Track popular queries and user search behavior
- **Saved Searches**: Save and reuse complex search queries

### 📖 Reading Experience
- **Table of Contents**: Auto-generated TOC with collapsible sections and smooth scrolling
- **Reading Progress**: Visual progress indicator and reading time estimation
- **Syntax Highlighting**: Code blocks with multiple language support via highlight.js
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark Mode**: Full dark mode support with smooth transitions
- **Typography Settings**: Customizable font size, line height, and reading width

### 👥 User Management
- **Authentication**: JWT-based secure authentication with refresh tokens
- **User Profiles**: Customizable profiles with avatar, bio, and GitHub links
- **Role-Based Access**: Admin and regular user roles with permission management
- **User Activity**: Track user submissions, comments, and contributions

### 🎨 Admin Dashboard
- **Content Management**: Full CRUD operations for articles, blogs, categories, tags, and series
- **User Management**: Manage users, toggle admin privileges, activate/deactivate accounts
- **Submission Review**: Review and approve/reject community submissions
- **Study Plan Management**: Create and manage study plans and reminders
- **Analytics Dashboard**: View statistics on content, users, and system usage
- **Media Management**: Upload and manage images, audio, and video files

### 🛠️ Technical Highlights
- **Modern Stack**: Go 1.23+ backend with React 19 frontend
- **Type Safety**: Full TypeScript implementation across the frontend
- **Performance**: Optimized with React Query for caching and Gin for fast API responses
- **Search Engine**: Bleve full-text search with custom analyzers
- **Database**: MySQL with GORM ORM and optimized queries
- **Caching**: Redis integration for session management and performance
- **Docker Ready**: Complete containerization with production-ready configurations
- **File Upload**: Support for images (up to 200MB), audio, and video files

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
- **React 19** - Latest React with concurrent features and improved performance
- **TypeScript 5.8+** - Full type safety across the application
- **Vite 7** - Lightning-fast build tool and dev server
- **Tailwind CSS 3** - Utility-first CSS with custom design system
- **React Router 7** - Client-side routing with nested routes
- **TanStack Query (React Query)** - Powerful server state management and caching
- **TipTap 3** - Extensible rich text editor with custom extensions
- **ByteMD** - Markdown editor with live preview and plugins
- **React Markdown** - Markdown rendering with custom components
- **Lucide React** - Beautiful, consistent icon library
- **React Photo View** - Image lightbox and gallery
- **Highlight.js** - Syntax highlighting for code blocks
- **Axios** - HTTP client with interceptors

### Backend  
- **Go 1.23+** - High-performance, statically-typed backend
- **Gin** - Fast HTTP web framework with middleware support
- **GORM** - Feature-rich ORM with MySQL support
- **Bleve v2** - Full-text search engine with Chinese language support
- **JWT (golang-jwt/jwt)** - Secure token-based authentication
- **bcrypt** - Industry-standard password hashing
- **godotenv** - Environment variable management
- **CORS** - Cross-origin resource sharing middleware

### Database & Infrastructure
- **MySQL 8+** - Reliable relational database with full-text search
- **Redis 7** - In-memory caching and session storage
- **Docker** - Container platform for consistent deployments
- **Docker Compose** - Multi-container orchestration for dev and prod
- **Nginx** - High-performance reverse proxy and static file server

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
echo "VITE_API_BASE_URL=http://127.0.0.1:3001" > frontend/.env
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

The backend provides a comprehensive RESTful API with the following endpoints:

### Authentication (`/api/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout (requires auth)
- `GET /auth/profile` - Get current user profile (requires auth)
- `PUT /auth/profile` - Update user profile (requires auth)
- `POST /auth/refresh-token` - Refresh JWT token
- `POST /auth/change-password` - Change password (requires auth)

### Articles (`/api/articles`)
- `GET /articles` - List articles with pagination and filtering
- `GET /articles/:id` - Get article by ID
- `GET /articles/slug/:slug` - Get article by slug
- `POST /articles` - Create article (requires auth)
- `PUT /articles/:id` - Update article (requires auth)
- `DELETE /articles/:id` - Delete article (requires auth)
- `POST /articles/:id/views` - Increment view count
- `POST /articles/:id/like` - Toggle article like
- `GET /articles/:id/related` - Get related articles
- `GET /articles/:id/comments` - Get article comments
- `POST /articles/:id/comments` - Create comment

### Blogs (`/api/blogs`)
- `GET /blogs` - List blogs (audio/video content)
- `GET /blogs/:id` - Get blog by ID
- `GET /blogs/slug/:slug` - Get blog by slug
- `POST /blogs` - Create blog (requires auth)
- `PUT /blogs/:id` - Update blog (requires auth)
- `DELETE /blogs/:id` - Delete blog (requires auth)
- `POST /blogs/:id/views` - Increment blog views
- `POST /blogs/:id/like` - Toggle blog like
- `PATCH /blogs/:id/toggle-publish` - Toggle publish status (requires auth)

### Categories (`/api/categories`)
- `GET /categories` - List all categories
- `GET /categories/tree` - Get category tree structure
- `GET /categories/:id` - Get category details
- `GET /categories/slug/:slug` - Get category by slug
- `POST /categories` - Create category (requires auth)
- `PUT /categories/:id` - Update category (requires auth)
- `DELETE /categories/:id` - Delete category (requires auth)
- `GET /categories/:id/articles` - Get articles by category

### Tags (`/api/tags`)
- `GET /tags` - List all tags
- `GET /tags/popular` - Get popular tags
- `GET /tags/:id` - Get tag details
- `GET /tags/slug/:slug` - Get tag by slug
- `POST /tags` - Create tag (requires auth)
- `PUT /tags/:id` - Update tag (requires auth)
- `DELETE /tags/:id` - Delete tag (requires auth)
- `GET /tags/:id/articles` - Get articles by tag
- `GET /tags/search` - Search tags

### Series (`/api/series`)
- `GET /series` - List all series
- `GET /series/:id` - Get series details
- `GET /series/slug/:slug` - Get series by slug
- `POST /series` - Create series (requires auth)
- `PUT /series/:id` - Update series (requires auth)
- `DELETE /series/:id` - Delete series (requires auth)
- `GET /series/:id/articles` - Get articles in series
- `GET /series/slug/:slug/articles` - Get articles by series slug

### Search (`/api/search`)
- `GET /search` - Full-text search with advanced filters
- `GET /search/suggestions` - Search suggestions and autocomplete
- `GET /search/stats` - Search statistics
- `POST /search/reindex` - Reindex all articles (requires auth)

### Study System (`/api/study`)
- `GET /study/plans` - List study plans
- `POST /study/plans` - Create study plan
- `GET /study/plans/:id` - Get study plan details
- `PUT /study/plans/:id` - Update study plan
- `DELETE /study/plans/:id` - Delete study plan
- `POST /study/plans/:id/articles` - Add article to study plan
- `GET /study/plans/:id/items` - Get study items
- `DELETE /study/items/:item_id` - Remove study item
- `PUT /study/items/:item_id/notes` - Update study notes
- `POST /study/items/:item_id/study` - Record study session
- `GET /study/due` - Get due study items
- `GET /study/plans/:id/analytics` - Get study analytics
- `GET /study/plans/:id/reminders` - Get study reminders
- `POST /study/plans/:id/generate-reminders` - Generate reminders

### Reminders (`/api/reminders`)
- `GET /reminders` - Get reminders list
- `GET /reminders/unread-count` - Get unread count
- `GET /reminders/stats` - Get reminder statistics
- `POST /reminders/:id/read` - Mark as read
- `POST /reminders/:id/complete` - Mark as completed
- `POST /reminders/batch-read` - Batch mark as read
- `POST /reminders` - Create manual reminder

### Submissions (`/api/submissions`)
- `POST /submissions` - Create submission (requires auth)
- `GET /submissions/my` - Get user's submissions (requires auth)
- `GET /submissions/:id` - Get submission details (requires auth)
- `PUT /submissions/:id` - Update submission (requires auth)
- `POST /submissions/:id/submit` - Submit for review (requires auth)
- `DELETE /submissions/:id` - Delete submission (requires auth)
- `GET /submissions/admin/all` - Get all submissions (requires auth)
- `POST /submissions/:id/review` - Review submission (requires auth)
- `POST /submissions/:id/publish` - Publish submission (requires auth)

### File Upload (`/api/upload`)
- `POST /upload/image` - Upload image (requires auth, max 200MB)
- `POST /upload/file` - Upload file (requires auth, max 200MB)
- `POST /upload/media` - Upload media (audio/video) (requires auth, max 200MB)
- `GET /upload/image/*filename` - Get uploaded image
- `GET /upload/file/*filename` - Get uploaded file
- `GET /upload/media/*filename` - Get uploaded media

### Cover Images (`/api/cover`)
- `GET /cover` - List cover images
- `POST /cover/upload` - Upload cover image (requires auth)
- `GET /upload/cover/*filename` - Get cover image

### Statistics (`/api/stats`)
- `GET /stats` - Get overall statistics
- `GET /stats/popular-articles` - Get popular articles
- `GET /stats/views` - Get views statistics

### Admin - User Management (`/api/admin/users`)
- `GET /admin/users` - Get users list (requires auth)
- `GET /admin/users/:id` - Get user details (requires auth)
- `PUT /admin/users/:id/toggle-admin` - Toggle admin privilege (requires auth)
- `PUT /admin/users/:id/toggle-active` - Toggle user status (requires auth)
- `DELETE /admin/users/:id` - Delete user (requires auth)

### Health Check
- `GET /health` - Health check endpoint
- `GET /health/db` - Database health and statistics

## 📊 Database Schema

The system uses MySQL with the following main tables:

### Core Content Tables
- **users** - User accounts with authentication and profile data
- **articles** - Blog articles with Markdown content
- **blogs** - Multimedia content (audio/video) with metadata
- **categories** - Hierarchical category structure
- **tags** - Flexible tagging system
- **series** - Article series organization
- **submissions** - User-submitted content for review

### Study System Tables
- **study_plans** - Learning plans with goals and algorithms
- **study_items** - Individual learning items with progress tracking
- **study_logs** - Detailed study session records
- **study_reminders** - Scheduled learning reminders
- **study_analytics** - Aggregated learning statistics

### Engagement Tables
- **comments** - Article comments with threading
- **article_views** - View tracking for analytics
- **article_likes** - Like/favorite tracking
- **blog_views** - Blog view statistics
- **blog_likes** - Blog engagement tracking

### Search & Analytics
- **search_indexes** - Full-text search indexes
- **search_statistics** - Search query analytics
- **configs** - System configuration key-value store

All tables include soft delete support (`deleted_at`) and automatic timestamps (`created_at`, `updated_at`).

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

Create a `.env.prod` file in the root directory:

```env
# Server Configuration
SERVER_HOST=0.0.0.0
PORT=3001
GIN_MODE=release
ENVIRONMENT=production

# Database Configuration (MySQL)
DB_HOST=host.docker.internal
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=blog_db
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Shanghai

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Frontend Configuration
DOMAIN=your-domain.com
VITE_API_BASE_URL=https://your-domain.com

# CORS Configuration
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5173
```

### Docker Production Build

```bash
# Build and start all production services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Production Deployment Checklist

1. **Database Setup**
   - Ensure MySQL 8+ is installed and running
   - Create database: `CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
   - Run migrations from `backend/migrations/`

2. **Environment Configuration**
   - Copy `.env.prod` and update all passwords and secrets
   - Set `DOMAIN` to your production domain
   - Update `VITE_API_BASE_URL` to match your API endpoint

3. **SSL/TLS Setup**
   - Place SSL certificates in `config/ssl/` or `docker/nginx/ssl/`
   - Update Nginx configuration for HTTPS

4. **Build and Deploy**
   - Build images: `docker-compose -f docker-compose.prod.yml build`
   - Start services: `docker-compose -f docker-compose.prod.yml up -d`

5. **Post-Deployment**
   - Create admin user via API or database
   - Test all critical endpoints
   - Monitor logs for errors
   - Set up backup strategy for database and uploads

## 📄 Project Status

### ✅ Completed Features

**Core Content Management**
- [x] Article system with full CRUD operations
- [x] Blog system with audio/video support
- [x] Multi-level category hierarchy
- [x] Flexible tag system with color coding
- [x] Article series with ordering
- [x] Quote collection with multiple view modes
- [x] User submission and review workflow
- [x] Comment system with moderation

**Study System**
- [x] Study plan creation and management
- [x] Spaced repetition algorithms (Ebbinghaus, SM2, Anki)
- [x] Learning progress tracking
- [x] Smart reminder system with notifications
- [x] Study analytics and insights
- [x] Deliberate practice features

**Search & Discovery**
- [x] Full-text search with Bleve
- [x] Advanced filtering and sorting
- [x] Search suggestions and autocomplete
- [x] Related content recommendations
- [x] Search statistics tracking

**User Experience**
- [x] Responsive design (mobile, tablet, desktop)
- [x] Dark mode with smooth transitions
- [x] Reading progress indicator
- [x] Table of contents with auto-scroll
- [x] Syntax highlighting for code
- [x] Image lightbox and gallery
- [x] Customizable typography settings

**Admin & Management**
- [x] Admin dashboard with analytics
- [x] User management with role-based access
- [x] Content moderation tools
- [x] Media file management
- [x] Study plan administration
- [x] Reminder management

**Infrastructure**
- [x] Docker containerization
- [x] Production-ready configurations
- [x] MySQL database with migrations
- [x] Redis caching layer
- [x] JWT authentication
- [x] File upload system (images, audio, video)
- [x] Health check endpoints

### 🔄 In Progress / Future Enhancements

- [ ] Unit and integration test coverage
- [ ] CI/CD pipeline automation
- [ ] Performance monitoring and APM
- [ ] Email notification system
- [ ] Social media integration
- [ ] Advanced analytics dashboard
- [ ] Content versioning and history
- [ ] Multi-language support (i18n)
- [ ] Progressive Web App (PWA) features
- [ ] GraphQL API option

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

## 🎯 Key Features Highlights

### 📝 Rich Content Editing
- **TipTap Editor**: Extensible WYSIWYG editor with custom extensions
- **ByteMD**: Markdown editor with live preview and GitHub Flavored Markdown
- **Media Support**: Upload and embed images, audio, and video files
- **Cover Images**: Beautiful cover image selection and management

### 🎓 Advanced Study System
The study system implements scientifically-proven spaced repetition algorithms:
- **Ebbinghaus Forgetting Curve**: Optimal review intervals based on memory research
- **SM-2 Algorithm**: Adaptive difficulty adjustment based on performance
- **Anki-style Learning**: Proven flashcard methodology for knowledge retention

### 🔍 Powerful Search
- **Chinese Language Support**: Optimized tokenization for Chinese content
- **Fuzzy Matching**: Find content even with typos
- **Relevance Ranking**: Smart sorting based on multiple factors
- **Real-time Indexing**: Automatic index updates on content changes

### 📊 Analytics & Insights
- **Content Analytics**: Track views, likes, and engagement
- **Study Analytics**: Monitor learning progress and efficiency
- **Search Analytics**: Understand user search behavior
- **User Statistics**: Track user activity and contributions

## 🙏 Acknowledgments

- **Backend**: Built with [Go](https://golang.org/) and [Gin](https://gin-gonic.com/)
- **Frontend**: Powered by [React 19](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- **Search**: Full-text search by [Bleve](https://blevesearch.com/)
- **Styling**: Beautiful UI with [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: Consistent icons from [Lucide](https://lucide.dev/)
- **Editor**: Rich text editing with [TipTap](https://tiptap.dev/)
- **Markdown**: Markdown support via [ByteMD](https://bytemd.js.org/)
- **Database**: Reliable storage with [MySQL](https://www.mysql.com/) and [GORM](https://gorm.io/)
- **Caching**: Fast caching with [Redis](https://redis.io/)

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review closed issues for solutions

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**⭐ Star this repository if you find it helpful!**

**🔗 Live Demo**: [www.godepth.top](https://www.godepth.top)