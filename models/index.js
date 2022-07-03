const mongoose = require('mongoose');

const db = {};
db.connect = async () => {
	try {
		await mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true });
		console.log('Connected to MongoDB');
	} catch (error) {
		console.log('Failed to connect to MongoDB', error);
	}
};

db.users = require('./Users.model');
db.posts = require('./Posts.model');

module.exports = db;
