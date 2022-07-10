const User = require('./models/Users.model');

let users = [];

const EditData = (data, id, call) => {
	const newData = data.map((item) => (item.id === id ? { ...item, call } : item));
	return newData;
};

const SocketServer = (socket) => {
	// Connect - Disconnect
	socket.on('joinUser', (user) => {
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
			// client offline
			// luu truoc vao db
			await User.findByIdAndUpdate(id, {
				$push: {
					noti: {
						user: new mongoose.Types.ObjectId(req.body.userId),
						text: req.body.text,
						url: req.body.url,
						isRead: false,
					},
				},
			});
		}
		client && socket.to(`${client.socketId}`).emit('createNotifyToClient', msg);
	});

	socket.on('removeNotify', (msg) => {
		const client = users.find((user) => msg.recipients.includes(user.id));
		client && socket.to(`${client.socketId}`).emit('removeNotifyToClient', msg);
	});

	// Check User Online / Offline
	socket.on('checkUserOnline', (data) => {
		const following = users.filter((user) =>
			data.following.find((item) => item._id === user.id)
		);
		socket.emit('checkUserOnlineToMe', following);

		const clients = users.filter((user) => data.followers.find((item) => item._id === user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('checkUserOnlineToClient', data._id);
			});
		}
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
