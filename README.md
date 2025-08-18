# AI Content Hub

An advanced AI-powered news platform that leverages cutting-edge technologies for intelligent content creation, optimization, and management.

## Features

### Public News Website
- Professional news website with crypto, gadgets, AI, electric bikes, and electric cars categories
- Trending topics display and article search functionality
- Mobile-responsive design optimized for reader engagement
- Google AdSense integration for automatic monetization
- SEO-optimized content structure for maximum search visibility

### Admin Dashboard
- Secure password-protected admin panel for content management
- AI Website Manager with chat interface for system control
- Content approval workflow and publishing controls
- Comprehensive SEO management and analytics dashboard
- Deployment management for custom domain migration

### Automated Content Generation
- AI Integration with OpenAI GPT-4 API for high-quality content generation
- Daily automation that generates exactly 10 posts daily (30% crypto, 20% gadgets, 20% AI news, 20% electric bikes, 10% electric cars)
- Built-in plagiarism checking and SEO optimization for every post
- Web scraping for trending topics and current market data
- Admin workflow with web-based approval system for quality control

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful endpoints with JSON responses

### External Services
- **OpenAI API**: Content generation using GPT-4
- **Neon Database**: Serverless PostgreSQL hosting
- **Google Search Console**: SEO insights and performance tracking

## Installation

1. Clone the repository:
```bash
git clone https://github.com/wahidsuman/Technews.git
cd Technews
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with:
```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Database URL (Neon or other PostgreSQL)
DATABASE_URL=your_database_url

# Other optional keys
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GOOGLE_SEARCH_CONSOLE_KEY=your_google_console_key
```

4. Run database migrations:
```bash
npm run db:migrate
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities and configurations
├── server/                # Backend Express application
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database interface
│   └── services/          # External service integrations
├── shared/                # Shared types and schemas
└── db/                    # Database schema and migrations
```

## Features in Detail

### Content Generation System
- Automated daily content generation using OpenAI GPT-4
- Intelligent keyword research and trending topic analysis
- Built-in plagiarism detection and prevention
- SEO optimization for every generated post
- Multi-category content distribution (crypto, gadgets, AI, electric bikes, electric cars)

### SEO Management
- Automated SEO auditing and scoring
- Google search ranking tracking
- Meta tag optimization
- XML sitemap generation
- Performance analytics and insights

### Admin Interface
- Secure authentication system
- Content approval workflow
- Real-time analytics dashboard
- SEO performance monitoring
- Deployment management tools

## API Endpoints

### Posts
- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get specific post
- `POST /api/posts` - Create new post
- `PATCH /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Content Generation
- `POST /api/content/generate` - Generate new content
- `GET /api/content/requests` - Get generation requests
- `POST /api/content/plagiarism-check` - Check for plagiarism

### SEO & Analytics
- `GET /api/seo/audit` - Run SEO audit
- `GET /api/analytics/dashboard` - Get dashboard stats
- `GET /api/research/trending` - Get trending topics

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub or contact the maintainer.
