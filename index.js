import connectDB from './src/db/index.js';
import dotenv from 'dotenv';
import { app } from './src/app.js';
import http from 'http';

dotenv.config({
  path: '.env'
});

const port = process.env.PORT || 4000;

const server = http.createServer(app);

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Example app listening on port ${process.env.PORT || port}`)
    });
  })
  .catch((error) => {
    console.error("MONGO Connection ERROR", error);
  });

// import connectDB from './src/db/index.js'
// import dotenv from 'dotenv';
// import { app } from './src/app.js';

// dotenv.config({
//   path: '.env'
// });

// const port = 4000;

// connectDB().then(
//   app.listen(process.env.PORT || port , () => {
//     console.log(`Example app listening on port ${process.env.PORT || port}`)
//   })
// ).catch((error)=>{
//   console.error("MONGO Connection ERROR", error);
// });

