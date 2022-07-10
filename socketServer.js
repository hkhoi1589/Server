const User = require('./models').users;
const mongoose = require('mongoose');

let users = [];
// users trung lap
const SocketServer = (socket, io) => {
	// Connect - Disconnect
	socket.on('joinUser', (user) => {
		if (users.every((item) => item.id !== user._id))
			users.push({
				id: user._id,
				socketId: socket.id,
				following: user.following,
				followers: user.followers,
			});
	});

	// Likes
	socket.on('likePost', (newPost) => {
		const ids = [...newPost.user.followers, newPost.user._id];
		const clients = users.filter((user) => ids.includes(user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('likeToClient', newPost);
			});
		}
	});

	socket.on('unLikePost', (newPost) => {
		const ids = [...newPost.user.followers, newPost.user._id];
		const clients = users.filter((user) => ids.includes(user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('unLikeToClient', newPost);
			});
		}
	});

	// Comments
	socket.on('createComment', (newPost) => {
		const ids = [...newPost.user.followers, newPost.user._id];
		const clients = users.filter((user) => ids.includes(user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('createCommentToClient', newPost);
			});
		}
	});

	socket.on('deleteComment', (newPost) => {
		const ids = [...newPost.user.followers, newPost.user._id];
		const clients = users.filter((user) => ids.includes(user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('deleteCommentToClient', newPost);
			});
		}
	});

	// Notification
	socket.on('createNotify', async (msg) => {
		const client = users.find((user) => user.id === msg.clientId);
		if (!client) {
			// neu client offline
			// luu truoc vao db
			await User.findByIdAndUpdate(msg.clientId, {
				$push: {
					noti: {
						user: new mongoose.Types.ObjectId(msg.userId),
						text: msg.text,
						url: msg.url,
						isRead: false,
					},
				},
			});
		} else socket.to(`${client.socketId}`).emit('createNotifyToClient', msg);
	});

	// Check User Online / Offline
	socket.on('checkUserOnline', (data) => {
		console.log(users);
		// user is online in follwing
		const following = users.filter((user) =>
			data.following.find((item) => item._id === user.id)
		);
		console.log('Following:', following);
		//socket.emit('checkUserOnlineToMe', following);
	});

	socket.on('disconnect', () => {
		const data = users.find((user) => user.socketId === socket.id);
		if (data) {
			const clients = users.filter((user) =>
				data.followers.find((item) => item._id === user.id)
			);

			if (clients.length > 0) {
				clients.forEach((client) => {
					socket.to(`${client.socketId}`).emit('CheckUserOffline', data.id);
				});
			}
		}

		users = users.filter((user) => user.socketId !== socket.id);
	});
};

module.exports = SocketServer;
