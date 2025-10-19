import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import morgan from 'morgan';

dotenv.config({
  path: '.env'
});

export const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Handling preflight requests
app.options("*", cors()); 

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
import UserRouter from './routes/userRoutes.js';
import CategoryRouter from './routes/categoryRoutes.js';
import ListingRouter from './routes/listingRoutes.js';
import ExchangeRouter from './routes/exchangeRoutes.js';
import MessageRouter from './routes/messageRoutes.js';
import ThreadRouter from './routes/threadRoutes.js';
import ReviewRouter from './routes/reviewRoutes.js';

//routes declaration
app.use('/api/v1',AuthRouter);
app.use('/api/v1',UserRouter);
app.use('/api/v1',CategoryRouter);
app.use('/api/v1',ListingRouter);
app.use('/api/v1',ExchangeRouter);
app.use('/api/v1',MessageRouter);
app.use('/api/v1',ThreadRouter);
app.use('/api/v1',ReviewRouter);

// Error handling middleware (must be after routes)
import { errorHandler, notFound } from './middlewares/errorHandler.js';
app.use(notFound);
app.use(errorHandler);