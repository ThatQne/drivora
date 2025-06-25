# CarTrade Backend API

A robust Node.js/Express backend with MongoDB for the CarTrade vehicle marketplace application.

## 🚀 **Quick Start**

### Prerequisites
- Node.js 16+ and npm
- MongoDB (local or cloud)
- Git

### 1. **Install Dependencies**
```bash
cd backend
npm install
```

### 2. **Environment Setup**
Copy `.env` and update with your values:
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cartrade
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
NODE_ENV=development

# Cloudinary Configuration (optional - for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

### 3. **MongoDB Setup Options**

#### Option A: Local MongoDB
1. **Install MongoDB Community Edition**
   - Windows: Download from [MongoDB Downloads](https://www.mongodb.com/try/download/community)
   - macOS: `brew install mongodb-community`
   - Linux: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

2. **Start MongoDB Service**
   ```bash
   # Windows (as service)
   net start MongoDB
   
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

3. **Verify Connection**
   ```bash
   mongosh mongodb://localhost:27017/cartrade
   ```

#### Option B: MongoDB Atlas (Cloud - Recommended)
1. **Create Free Account** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Create Cluster** (free tier available)
3. **Create Database User** with read/write permissions
4. **Whitelist IP Address** (0.0.0.0/0 for development)
5. **Get Connection String** and update `MONGODB_URI` in `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cartrade?retryWrites=true&w=majority
   ```

### 4. **Start the Server**
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

Server will start on `http://localhost:5000`

## 📊 **API Endpoints**

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-token` - Verify JWT token
- `POST /api/auth/change-password` - Change password

### Vehicles
- `GET /api/vehicles` - Get user's vehicles
- `GET /api/vehicles/:id` - Get single vehicle
- `POST /api/vehicles` - Create new vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle
- `POST /api/vehicles/:id/update-status` - Update listing status

### Listings
- `GET /api/listings` - Get all listings (with filters)
- `GET /api/listings/my` - Get user's listings
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create new listing
- `PUT /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing
- `POST /api/listings/:id/renew` - Renew listing (24h cooldown)
- `POST /api/listings/:id/deactivate` - Mark as sold

### Health Check
- `GET /api/health` - Server health status

## 🗄️ **Database Schema**

### User Model
```javascript
{
  username: String (unique, max 24 chars),
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  location: String,
  phone: String,
  avatar: String (Cloudinary URL),
  rating: Number (0-5),
  reviewCount: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Model
```javascript
{
  ownerId: ObjectId (ref: User),
  make: String,
  model: String,
  year: Number,
  vin: String (unique per user),
  mileage: Number,
  transmission: String (manual/automatic),
  estimatedValue: Number,
  customPrice: Number,
  images: [String] (Cloudinary URLs),
  isListed: Boolean,
  isAuctioned: Boolean,
  listingId: ObjectId (ref: Listing),
  auctionId: ObjectId (ref: Auction),
  createdAt: Date,
  updatedAt: Date
}
```

### Listing Model
```javascript
{
  vehicleId: ObjectId (ref: Vehicle),
  sellerId: ObjectId (ref: User),
  title: String,
  description: String,
  price: Number,
  problems: [String],
  additionalFeatures: [String],
  tags: [String],
  isActive: Boolean,
  views: Number,
  lastRenewed: Date,
  canRenewAfter: Date,
  featured: Boolean,
  soldAt: Date,
  soldTo: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 **Security Features**

- **JWT Authentication** with 7-day expiration
- **Password Hashing** with bcrypt (10 rounds)
- **Input Validation** and sanitization
- **CORS Protection** configured for frontend
- **Rate Limiting** ready for production
- **Error Handling** with proper HTTP status codes

## 🚀 **Deployment**

### Heroku Deployment
1. **Create Heroku App**
   ```bash
   heroku create cartrade-backend
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI=your_mongodb_atlas_uri
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set NODE_ENV=production
   heroku config:set FRONTEND_URL=https://your-frontend-domain.com
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

### Railway Deployment
1. **Connect Repository** at [Railway](https://railway.app)
2. **Add Environment Variables** in dashboard
3. **Deploy** automatically on push

### DigitalOcean App Platform
1. **Create App** from GitHub repo
2. **Configure Environment Variables**
3. **Deploy** with auto-scaling

## 🛠️ **Development**

### Project Structure
```
backend/
├── models/          # MongoDB schemas
├── routes/          # API endpoints
├── middleware/      # Auth & validation
├── config/          # Database connection
├── server.js        # Main application
└── package.json     # Dependencies
```

### Adding New Features
1. **Create Model** in `models/` folder
2. **Add Routes** in `routes/` folder
3. **Update Server** to include new routes
4. **Test Endpoints** with Postman/Thunder Client

### Environment Variables
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `CLOUDINARY_*` - Image upload service (optional)

## 📝 **API Usage Examples**

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Create Vehicle
```bash
curl -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vin": "1HGBH41JXMN109186",
    "mileage": 50000,
    "transmission": "automatic",
    "estimatedValue": 25000
  }'
```

### Create Listing
```bash
curl -X POST http://localhost:5000/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "vehicleId": "VEHICLE_ID",
    "title": "2020 Toyota Camry - Excellent Condition",
    "description": "Well-maintained vehicle with full service history",
    "price": 24000,
    "tags": ["low-mileage", "one-owner", "garage-kept"]
  }'
```

## 🐛 **Troubleshooting**

### Common Issues
1. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Ensure network connectivity

2. **JWT Token Invalid**
   - Check if token is properly formatted
   - Verify JWT_SECRET matches
   - Token may be expired (7-day limit)

3. **CORS Errors**
   - Update FRONTEND_URL in `.env`
   - Check if frontend is running on correct port

### Logs
```bash
# View server logs
npm run dev

# MongoDB logs (local)
tail -f /var/log/mongodb/mongod.log
```

## 📚 **Additional Resources**

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [JWT.io](https://jwt.io/) - JWT token debugging
- [Postman](https://www.postman.com/) - API testing
- [MongoDB Compass](https://www.mongodb.com/products/compass) - Database GUI

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License. 
 
 