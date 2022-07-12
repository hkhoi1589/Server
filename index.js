// import
const express = require('express');
const db = require('./models');
const dotenv = require('dotenv');
const SocketServer = require('./socketServer');
dotenv.config();

// middleware
const cors = require('cors');
const helmet = require('helmet'); //secure your Express apps by setting various HTTP headers
const routes = require('./routes');

const app = express();
app.use(
	cors({
		origin: ['http://localhost:3000', 'https://social-server-demo.herokuapp.com/'], // domain cua client
	})
);

//connect mongodb
db.connect();

// parse requests of content-type - application/json
app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// Socket
const http = require('http');
const server = http.createServer(app); // http server
const { Server } = require('socket.io');
const io = new Server(server, {
	cors: {
		origin: ['http://localhost:3000', 'https://social-server-demo.herokuapp.com/'], // domain cua client
	},
});

// Route
routes(app);

// socket io
io.on('connection', (socket) => {
	SocketServer(socket, io);
});

server.listen(process.env.PORT || 8080, () => {
	console.log(`Backed server is ready http://localhost:${process.env.PORT || 8080}`);
});
