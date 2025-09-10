import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { swaggerDocs } from './config/swagger.js';

dotenv.config({
  path: '.env'
});

export const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://78b371ec2126.ngrok-free.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


// Handling preflight requests
app.options("*", cors()); // Enable pre-flight across-the-board

// Your routes and server setup
app.get("/", (req, res) => {
  res.send("CORS is enabled for all origins!");
});

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({limit: '16kb'}));
app.use(express.static(process.env.PUBLIC_DIR));
app.use(cookieParser());
app.use(morgan('combined'));

//routes imports
import AuthRouter from './routes/AuthRoutes.js';
import CategoryRouter from './routes/categoryRoutes.js';
import VendorRouter from './routes/vendorRoutes.js';
import ProductRouter from './routes/productRoutes.js';
import InventoryRouter from './routes/inventoryRoutes.js';
import OrderRouter from './routes/orderRoutes.js';
import ReportRouter from './routes/reportRoutes.js';

//routes declaration
app.use('/api/v1',AuthRouter);
app.use('/api/v1/categories',CategoryRouter);
app.use('/api/v1/vendors',VendorRouter);
app.use('/api/v1/products',ProductRouter);
app.use('/api/v1/inventory',InventoryRouter);
app.use('/api/v1/orders',OrderRouter);
app.use('/api/v1/reports',ReportRouter);

swaggerDocs(app);