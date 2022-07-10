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
		const client = users.filter((user) => user.id === msg.clientId);
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

	// Online/Offline
	socket.on('checkUserOnline', (data) => {
		// tim following dang online
		const following = users.filter((user) =>
			data.following.some((item) => item._id === user.id)
		);
		// tra ve following cho user
		socket.emit('checkUserOnlineToMe', following);

		// tim following dang online
		const clients = users.filter((user) => data.followers.some((item) => item._id === user.id));

		// thong bao user dang online cho followers
		if (clients.length > 0) {
			let msg = {
				_id: data._id,
				username: data.username,
				profilePicture: data.profilePicture,
			};
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('checkUserOnlineToClient', msg);
			});
		}
	});

	socket.on('disconnect', () => {
		const data = users.filter((user) => user.socketId === socket.id);
		if (data) {
			const clients = users.filter((user) =>
				data.followers.some((item) => item._id === user.id)
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
