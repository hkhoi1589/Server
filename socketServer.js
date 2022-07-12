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
		const ids = [...newPost.author.followers, newPost.author._id];
		const clients = users.filter((user) => ids.some((id) => id === user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('likeToClient', newPost);
			});
		}
	});

	socket.on('unLikePost', (newPost) => {
		const ids = [...newPost.author.followers, newPost.author._id];
		const clients = users.filter((user) => ids.some((id) => id === user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('unLikeToClient', newPost);
			});
		}
	});

	// Comments
	socket.on('createComment', (newPost) => {
		const ids = [...newPost.author.followers, newPost.author._id];
		const clients = users.filter((user) => ids.some((id) => id === user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('createCommentToClient', newPost);
			});
		}
	});

	socket.on('deleteComment', (newPost) => {
		const ids = [...newPost.author.followers, newPost.author._id];
		const clients = users.filter((user) => ids.some((id) => id === user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('deleteCommentToClient', newPost);
			});
		}
	});

	// Follow
	socket.on('follow', (newUser) => {
		const user = users.filter((user) => user.id === newUser._id);

		// neu followingUser dang onl
		if (user) socket.to(`${user.socketId}`).emit('followToClient', newUser);
	});

	socket.on('unFollow', (newUser) => {
		const user = users.filter((user) => user.id === newUser._id);

		// neu followingUser dang onl
		if (user) socket.to(`${user.socketId}`).emit('unFollowToClient', newUser);
	});

	// Notification
	socket.on('createNotify', async (msg) => {
		const onlineClients = users.filter((user) =>
			msg.clientId.some((client) => client._id === user.id)
		);
		const offlineClients = users.filter((user) => {
			msg.clientId.every((client) => client._id !== user.id);
		});

		// neu client offline
		// luu truoc vao db
		offlineClients.forEach(async (client) => {
			await User.findByIdAndUpdate(client._id, {
				$push: {
					noti: {
						user: new mongoose.Types.ObjectId(msg.userId),
						text: msg.text,
						url: msg.url,
						isRead: false,
					},
				},
			});
		});

		// neu user online
		onlineClients.forEach((client) => {
			socket.to(`${client.socketId}`).emit('createNotifyToClient', msg);
		});
	});

	// Online/Offline
	socket.on('checkUserOnline', (data) => {
		// tim followings dang online
		const following = data.following.filter((f) => users.some((user) => user._id === f.id));
		// tra ve following cho user
		socket.emit('checkUserOnlineToMe', following);

		// tim followers dang online
		const clients = users.filter((user) => data.followers.some((item) => item._id === user.id)); // can socketId

		// thong bao user dang online cho followers
		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('checkUserOnlineToClient', data);
			});
		}
	});

	socket.on('disconnect', () => {
		const data = users.filter((user) => user.socketId === socket.id)[0];
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
