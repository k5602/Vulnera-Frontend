# Vulnera Frontend# Astro Starter Kit: Minimal



A modern, high-performance vulnerability analysis web application built with **Astro**, **React**, and **TypeScript**. This frontend integrates with the Vulnera vulnerability analysis API to provide comprehensive scanning and analysis across multiple package ecosystems.```sh

npm create astro@latest -- --template minimal

## 🌟 Features```



### Core Functionality> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

- **Multi-Ecosystem Support**: Analyze dependencies from NPM, PyPI, Maven, Cargo, NuGet, RubyGems, and more

- **Real-time Vulnerability Scanning**: Upload manifests or import GitHub repositories for instant analysis## 🚀 Project Structure

- **Interactive Dashboard**: View scan history, statistics, and vulnerability trends

- **Advanced Filtering**: Filter vulnerabilities by ecosystem, severity level, and statusInside of your Astro project, you'll see the following folders and files:

- **Comprehensive Reports**: Detailed vulnerability reports with remediation guidance

```text

### Technical Highlights/

- ⚡ **Lightning-Fast Build**: 2.28s build time with optimized Vite configuration├── public/

- 🔒 **Secure by Default**: Zero production console leaks, input validation, strict TypeScript├── src/

- 📦 **Optimized Bundle**: 179.42 kB (56.51 kB gzipped) with smart code splitting│   └── pages/

- 🎯 **Type-Safe**: Full TypeScript strict mode with centralized type definitions│       └── index.astro

- 🧹 **Clean Code**: 20+ ESLint rules enforced for consistent quality└── package.json

- ♿ **Accessible**: WCAG-compliant semantic HTML and ARIA attributes```



## 📋 PrerequisitesAstro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.



- **Node.js**: 18.x or higherThere's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

- **npm**: 9.x or higher

- **Git**: For version controlAny static assets, like images, can be placed in the `public/` directory.



## 🚀 Quick Start## 🧞 Commands



### InstallationAll commands are run from the root of the project, from a terminal:



```bash| Command                   | Action                                           |

# Clone the repository| :------------------------ | :----------------------------------------------- |

git clone https://github.com/k5602/Vulnera-Frontend.git| `npm install`             | Installs dependencies                            |

cd Vulnera-Frontend| `npm run dev`             | Starts local dev server at `localhost:4321`      |

| `npm run build`           | Build your production site to `./dist/`          |

# Install dependencies| `npm run preview`         | Preview your build locally, before deploying     |

npm install| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

```| `npm run astro -- --help` | Get help using the Astro CLI                     |



### Development## 👀 Want to learn more?



```bashFeel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

# Start development server (http://localhost:4321)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_API_VERSION=v1
VITE_API_TIMEOUT=30000

# OIDC Configuration (optional)
VITE_ENABLE_OIDC=false
VITE_OIDC_AUTHORITY=
VITE_OIDC_CLIENT_ID=
VITE_OIDC_REDIRECT_URI=

# Feature Flags
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=false
```

## 📁 Project Structure

```
vulnera-frontend/
├── src/
│   ├── components/          # Reusable Astro/React components
│   │   ├── ui/             # UI building blocks
│   │   ├── forms/          # Form components
│   │   ├── report/         # Report components
│   │   └── ...
│   ├── pages/              # Astro page routes
│   │   ├── index.astro     # Home page
│   │   ├── dashboard.astro # Dashboard (protected)
│   │   ├── scan.astro      # Scan interface (protected)
│   │   ├── login.astro     # Authentication
│   │   └── ...
│   ├── layouts/            # Layout components
│   ├── config/             # Configuration files
│   │   ├── auth.ts         # Auth config
│   │   ├── api.ts          # API config
│   │   └── theme.ts        # Theme/styling config
│   ├── types/              # TypeScript type definitions
│   │   ├── index.ts        # Main types
│   │   └── modules.d.ts    # Module type declarations
│   ├── utils/              # Utility functions
│   │   ├── api/            # API services
│   │   │   ├── client.ts   # API client
│   │   │   ├── auth-service.ts
│   │   │   └── ...
│   │   ├── validation.ts   # Input validation
│   │   ├── route-guards.ts # Route protection
│   │   └── ...
│   ├── styles/             # Global styles
│   └── ui/                 # UI utilities
├── public/                 # Static assets
├── dist/                   # Production build (generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── astro.config.mjs
├── eslint.config.js
└── README.md
```

## 🔐 Authentication

The application supports two authentication methods:

### Demo/Traditional Auth
- Default credentials: `demo@vulnera.com` / `demo123`
- Tokens stored in localStorage (remember me) or sessionStorage
- Protected routes automatically redirect to login

### OIDC/Cognito (Optional)
- Configure environment variables for AWS Cognito
- Automatic token refresh
- Silent authentication in background

### Protected Routes
- `/dashboard` - User dashboard with scan history
- `/scan` - File upload and repository import interface

Unauthenticated users are automatically redirected to `/login`.

## 🛠️ Available Commands

```bash
# Development
npm run dev           # Start dev server

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript

# Other
npm run astro ...    # Direct Astro CLI access
```

## 📦 Key Dependencies

### Framework & UI
- **Astro 5**: Meta-framework for fast web experiences
- **React 19**: Component library
- **Tailwind CSS 4**: Utility-first CSS framework
- **Framer Motion 12**: Animation library

### Development
- **TypeScript 5.9**: Type safety
- **Vite 5**: Lightning-fast build tool
- **ESLint 9**: Code quality linting

### Features
- **OIDC Client TS**: OpenID Connect support
- **React OIDC Context**: OIDC context management
- **UA Parser JS**: User agent detection

## 🔧 Configuration Files

### tsconfig.json
Strict TypeScript configuration with full type safety:
- `strict: true` - Full strict mode
- `noUnusedLocals: true` - Catches unused variables
- `noImplicitReturns: true` - Ensures all code paths return
- `declaration: true` - Generates .d.ts files

### vite.config.ts
Optimized bundling and build:
- Tree-shaking enabled
- Smart vendor code splitting
- Compression (gzip & brotli)
- Hash-based caching

### eslint.config.js
Comprehensive code quality enforcement:
- 20+ linting rules
- TypeScript-specific rules
- Consistent code style
- Strict quality standards

### astro.config.mjs
Astro framework configuration:
- React integration enabled
- Tailwind CSS plugin
- Prefetch enabled for performance

## 📊 API Integration

The frontend communicates with the Vulnera API for:

- **Authentication**: Login, logout, token refresh
- **Scanning**: Upload manifests, import repositories
- **Analysis**: Retrieve vulnerability data
- **Reports**: Generate and download reports

### API Endpoints

```
POST   /api/v1/auth/login         - User login
POST   /api/v1/auth/logout        - User logout
POST   /api/v1/auth/refresh       - Refresh token
GET    /api/v1/auth/me            - Get current user
POST   /api/v1/scan               - Create scan
GET    /api/v1/scan/:id           - Get scan details
GET    /api/v1/vulnerabilities    - List vulnerabilities
```

## ✅ Quality Assurance

### TypeScript
- Full strict mode enabled
- Centralized type definitions
- Type declarations for all modules
- 8+ strict checks enforced

### Code Quality
- 20+ ESLint rules active
- Consistent code style
- No production console logs
- Input validation on all forms

### Performance
- 179.42 kB bundle size (56.51 kB gzipped)
- 2.28s build time
- Tree-shaking and code splitting enabled
- Optimized assets and compression

### Security
- No sensitive data in console
- Input validation and sanitization
- CSRF protection ready
- Secure token handling

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

The `dist/` directory is ready for deployment to:
- Static hosting (Vercel, Netlify, GitHub Pages)
- Docker container
- Traditional web server

### Environment Setup

Set these environment variables in production:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_API_VERSION=v1
VITE_ENVIRONMENT=production
VITE_ENABLE_DEBUG=false
```

## 📚 Documentation

### Types
All TypeScript types are centralized in `src/types/index.ts`:
- API response types
- Authentication types
- Scan and vulnerability types
- UI state types

### Utilities
Reusable functions in `src/utils/`:
- **validation.ts** - Input validation functions
- **api/** - API service layer
- **route-guards.ts** - Route protection logic

### Configuration
Application config in `src/config/`:
- **auth.ts** - OIDC and auth settings
- **api.ts** - API base configuration
- **theme.ts** - Color palette and site metadata

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes with clear commits
3. Ensure code quality: `npm run lint`
4. Submit a pull request

### Code Standards
- TypeScript strict mode required
- ESLint rules must pass
- No production console logs
- Comprehensive error handling
- Input validation for all forms

## 📋 Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

## 🐛 Troubleshooting

### Dev Server Won't Start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Build Errors
```bash
# Check TypeScript
npm run type-check

# Check ESLint
npm run lint

# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Port Already in Use
The dev server uses port 4321 by default. To use a different port:
```bash
npm run dev -- --port 3000
```

## 📄 License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

## 🙋 Support & Contact

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@example.com

## 🔗 Related Projects

- [Vulnera Backend](https://github.com/k5602/Vulnera) - API server
- [Vulnera Documentation](https://docs.vulnera.dev) - Full documentation

---

**Last Updated**: October 27, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
