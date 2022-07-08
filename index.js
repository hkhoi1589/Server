// import
const express = require('express');
const db = require('./models');
const dotenv = require('dotenv');
dotenv.config();

// middleware
const cors = require('cors');
const helmet = require('helmet'); //secure your Express apps by setting various HTTP headers
const morgan = require('morgan'); //HTTP request logger
const routes = require('./routes');

const app = express();
app.use(cors());

//connect mongodb
db.connect();

//middleware sẽ đóng vai trò trung gian giữa request/response và các tiền xử lý logic.
// parse requests of content-type - application/json
app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('common'));

// Route
routes(app);

app.listen(process.env.PORT || 8080, () => {
	console.log(`Backed server is ready http://localhost:${process.env.PORT || 8080}`);
});
