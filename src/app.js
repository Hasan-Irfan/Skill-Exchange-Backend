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
import UserRouter from './routes/userRoutes.js';

//routes declaration
app.use('/api/v1',AuthRouter);
app.use('/api/v1',UserRouter);
