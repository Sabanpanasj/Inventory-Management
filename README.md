
**INVENTORY MANAGEMENT SYSTEM**

**Video Demo:** [URL HERE]

**DESCRIPTION**

A full-featured, modern inventory management system with real-time analytics and dashboard visualization. This web application helps businesses track products, manage stock levels, process sales, and gain insights through interactive charts and reports.

**FEATURES**

**📊 Dashboard**
- Real-time statistics cards showing total products, inventory value, units sold, and sales revenue
- Interactive charts for product categories and sales trends
- Low stock alerts with quick restock actions
- Top selling products leaderboard
- Auto-refresh functionality (every 2 minutes)

**📦 Product Management**
- Complete CRUD operations for products
- Advanced search with filters (name, category, ID)
- Sorting by multiple fields (name, price, stock, sales)
- Pagination with customizable items per page
- Stock level indicators (In Stock/Low Stock/Out of Stock)
- Bulk stock updates and quick restocking

**💰 Sales Processing**
- Quick sale form with product selection
- Sales history with date filtering
- Revenue tracking and transaction logging
- Paginated sales records

**📈 Analytics & Reports**
- Inventory value by category (bar chart)
- Revenue trend analysis (line chart)
- Stock distribution visualization (pie chart)
- Top products by revenue (horizontal bar chart)
- Performance metrics and growth indicators

**TECHNOLOGY STACK**

**Frontend:**
- **HTML5/CSS3** – Responsive, modern UI with CSS variables for theming
- **Vanilla JavaScript** – No frameworks for lightweight performance
- **Chart.js** – Interactive data visualization
- **Font Awesome** – Icon library
- **CSS Grid/Flexbox** – Modern layout techniques

**Backend:**
- **Flask** – Python web framework
- **SQLAlchemy** – ORM for database management
- **SQLite** – Lightweight database (production-ready with PostgreSQL support)
- **CORS** – Cross-origin resource sharing
- **RESTful API** – Clean, stateless architecture

**PROJECT STRUCTURE**

**Frontend Files:**

**`index.html`**
The main HTML document containing:
- Navigation bar with four main sections (Dashboard, Products, Sales, Analytics)
- Dashboard page with stats cards, charts, and alerts
- Products page with search, sort, and paginated table
- Sales page with quick sale form and history
- Analytics page with four detailed charts
- Modals for product creation and stock updates
- Responsive design that works on mobile and desktop

**`styles.css`**
Comprehensive styling with:
- CSS custom properties for consistent theming
- Responsive grid layouts
- Interactive hover states and animations
- Loading progress indicators

**`app.js`**
Main JavaScript application with:
- `InventoryApp` class encapsulating all functionality
- API communication layer with error handling
- Chart initialization and management
- Real-time updates with auto-refresh
- Pagination and sorting logic
- Modal management and form validation
- Progressive loading with visual feedback

**Backend Files:**

**`config.py`**
Configuration management with environment variables support using `python-dotenv`. Handles database URLs and secret keys.

**`app.py`**
Main Flask application with REST API endpoints:
- **Products API**: CRUD operations with pagination and sorting
- **Search API**: Advanced product search functionality
- **Analytics API**: Dashboard statistics and chart data
- **Sales API**: Sales history and transaction processing
- **Health Check**: System status monitoring
- Comprehensive error handling with JSON responses

**`database.py`**
SQLAlchemy models defining:
- **Product**: Core inventory item with fields for name, category, price, quantity, and sales tracking
- **SalesHistory**: Transaction records linking to products
- Database initialization and session management

**`models.py`**
Business logic layer with `InventoryManager` class:
- Product ID generation based on categories
- Stock management with sales tracking
- Paginated queries for efficient data retrieval
- Analytics calculations for dashboard metrics
- Search functionality with various filters
- Performance metrics calculation

**`run.py`**
Application entry point with startup messages.

**`requirements.txt`**
Python dependencies including Flask, SQLAlchemy, Flask-CORS, and python-dotenv.

**DESIGN DECISIONS**

**1. No JavaScript Frameworks**
I chose vanilla JavaScript over frameworks like React or Vue to:
- Keep the application lightweight (no build step needed)
- Demonstrate fundamental JavaScript skills
- Reduce dependencies and complexity
- Improve initial load time

**2. SQLite Database**
SQLite was selected because:
- It's file-based with zero configuration
- Perfect for single-user or small team applications
- Easy to deploy and backup
- The schema can easily migrate to PostgreSQL for production

**3. Chart.js for Visualization**
Chart.js provides:
- Beautiful, responsive charts out of the box
- Lightweight compared to alternatives like D3.js
- Easy integration with minimal configuration
- Good mobile support

**4. RESTful API Design**
The backend follows REST principles:
- Clear separation between frontend and backend
- JSON-based communication
- Stateless operations
- Proper HTTP status codes
- Consistent error handling

**5. Progressive Enhancement**
The application works without JavaScript for basic functionality, but JavaScript enhances the experience with:
- Real-time updates
- Interactive charts
- Client-side validation
- Smooth animations

**KEY IMPLEMENTATION DETAILS**

**Real-time Updates**
- Charts auto-refresh every 2 minutes
- Manual refresh buttons with loading states
- Last updated timestamps
- Visual indicators for data freshness

**Error Handling**
- Graceful degradation when backend is unavailable
- User-friendly error messages
- Retry mechanisms for failed requests
- Loading states during API calls

**Performance Optimizations**
- Pagination to handle large datasets
- Efficient database queries with proper indexing
- Chart data caching to reduce API calls
- Lazy loading for chart components

**User Experience**
- Responsive design works on mobile, tablet, and desktop
- Keyboard navigation support
- Form validation with helpful messages
- Confirmation dialogs for destructive actions
- Toast notifications for user feedback

**SETUP INSTRUCTIONS (runs fully offline)**

The Flask server now serves the frontend as well, so there is a single local process and no internet is needed once set up.

**One-time setup (needs internet once):**
```bash
pip install -r backend/requirements.txt
python frontend/vendor.py        # saves Chart.js + Font Awesome into frontend/vendor/
```

**Run (no internet needed):**
```bash
./run.sh          # macOS/Linux
run.bat           # Windows
# or: cd backend && python run.py
```
Then open http://localhost:5000 (the browser opens automatically).

**Setting up on a machine that never has internet:** on a connected machine run
`pip download -r backend/requirements.txt -d wheels`, copy the whole project (including `wheels/` and `frontend/vendor/`) over, then run
`pip install --no-index --find-links wheels -r backend/requirements.txt`.

**Database:**
`backend/inventory.db` is created automatically on first run. To use your own settings, copy `backend/.env.example` to `backend/.env`.

**DISTRIBUTING THE APP (so others can download it)**

1. Create a GitHub repository and push this project (`.gitignore` keeps your `.env` and `inventory.db` out).
2. Publish a version: `git tag v1.0.0 && git push --tags`. The workflow in `.github/workflows/release.yml` builds the app for Windows, macOS and Linux and attaches `IMS-windows.zip`, `IMS-macos.tar.gz` and `IMS-linux.tar.gz` to a GitHub Release.
3. Open `docs/index.html` and set `REPO` to `your-username/your-repo`.
4. In the repo go to Settings → Pages → deploy from branch `main`, folder `/docs`. Your download page is then at `https://your-username.github.io/your-repo/`.

Notes: the packaged app keeps each user's database in their own app-data folder (so re-downloading never erases data) and starts with an empty inventory. The builds are unsigned, so Windows SmartScreen and macOS Gatekeeper show a one-time warning. The macOS build is for Apple Silicon.

**FUTURE ENHANCEMENTS**

**Planned Features:**
1. **User Authentication** – Multi-user support with roles
2. **Export Functionality** – CSV/PDF reports
3. **Barcode Scanning** – Mobile integration
4. **Email Notifications** – Low stock alerts
5. **Inventory Forecasting** – Predictive analytics
6. **Multi-language Support** – Internationalization

**Technical Improvements:**
1. **WebSocket Integration** – Real-time collaboration
2. **Redis Caching** – Improved performance
3. **Docker Containerization** – Easy deployment
4. **Unit Testing** – Comprehensive test coverage
5. **CI/CD Pipeline** – Automated deployment

**LEARNING OUTCOMES**

This project demonstrates proficiency in:
- Full-stack web development
- REST API design and implementation
- Database design with SQLAlchemy
- Frontend development with modern JavaScript
- Data visualization with Chart.js
- Responsive web design principles
- Error handling and user experience design
- Project architecture and code organization

**LICENSE**

This project is available for educational purposes. Feel free to modify and extend it for your own inventory management needs.

---

**Note:** This is a production-ready application that can be deployed with minimal changes. The modular architecture allows easy extension and customization for specific business requirements.
