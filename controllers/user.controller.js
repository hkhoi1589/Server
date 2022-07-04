const User = require('../models').users;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const handlePassword = async (password) => {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
};

const sendToken = (user) =>
	jwt.sign(
		{
			_id: user._id,
		},
		process.env.JWT_KEY,
		{
			expiresIn: '24h',
		}
	);

// Get random friend
exports.getFriend = async (req, res) => {
	const { excludeList } = req.body;

	try {
		let users;
		const count = (await User.estimatedDocumentCount()) - 1; // tinh so luong record - 1 vi record cua user
		if (count < 10) {
			users = await User.find({ _id: { $nin: excludeList } }).lean(); // tim cac record khong co id trong excludeList
		} else {
			const rand = Math.floor(Math.random() * count); // tinh random
			users = await User.find({ _id: { $nin: excludeList } }) // tim cac record khong co id trong excludeList
				.skip(rand)
				.limit(9) // skip so luong record random va lay 9 record
				.lean();
		}
		return res.status(200).json(users);
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// Search friend
exports.searchFriend = async (req, res) => {
	const { username, excludeList } = req.body;
	try {
		const users = await User.find({
			_id: { $nin: excludeList },
			username: { $regex: username, $options: 'i' },
		}).lean();
		return res.status(200).json(users);
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// Register
exports.register = async (req, res) => {
	const { username, email, password } = req.body;

	try {
		const existedUser = await User.findOne({ email })
			.populate([
				{ path: 'following', select: '_id username profilePicture' },
				{ path: 'followers', select: '_id username profilePicture' },
				{ path: 'saved' },
			])
			.lean();
		if (existedUser)
			return res.status(404).json({ message: 'This email is already used', type: 'error' });

		// Hash password
		const hashedPassword = await handlePassword(password);

		// Create new user
		const user = new User({
			username: username,
			email: email,
			password: hashedPassword,
		});

		// Save to DB
		await user.save();

		const token = sendToken(user);

		return res.status(200).json({
			message: 'Register successfully',
			type: 'success',
			token,
			user,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

exports.login = async (req, res) => {
	const { email, password } = req.body;

	try {
		// Find user
		const user = await User.findOne({ email })
			.populate([
				{ path: 'following', select: '_id username profilePicture' },
				{ path: 'followers', select: '_id username profilePicture' },
				{ path: 'saved' },
			])
			.lean();
		if (!user) return res.status(404).json({ message: 'User is not found', type: 'error' });

		// Check password
		const validPassword = await bcrypt.compare(password, user.password);
		if (!validPassword)
			return res.status(400).json({ message: 'Wrong Password!', type: 'error' });

		const token = sendToken(user);

		return res.status(200).json({
			message: 'Login successfully',
			type: 'success',
			token,
			user,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// update user
exports.updateUser = async (req, res) => {
	const { username, email, password, desc, coverPicture, profilePicture } = req.body;
	const { id } = req.params;

	try {
		const existedUser = await User.findOne({ email, _id: { $nin: [id] } }); // kiem tra trung email, ngoai tru user
		if (existedUser)
			return res.status(404).json({ message: 'This email is already used', type: 'error' });

		// Hash password
		const hashedPassword = await handlePassword(password);

		// find and update
		const user = await User.findByIdAndUpdate(
			id,
			{
				username: username,
				email: email,
				password: hashedPassword,
				coverPicture: coverPicture,
				profilePicture: profilePicture,
				desc: desc,
			},
			{ new: true } // tra ve document da update
		)
			.populate([
				{ path: 'following', select: '_id username profilePicture' },
				{ path: 'followers', select: '_id username profilePicture' },
				{ path: 'saved' },
			])
			.lean();

		if (!user) return res.status(404).json({ message: 'User not found.', type: 'error' });

		return res.status(200).json({
			type: 'success',
			message: 'Update successfully',
			user,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// delete user
exports.deleteUser = async (req, res) => {
	const { id } = req.params;

	try {
		// find and update
		let user = await User.findById(id).populate([
			{ path: 'following', select: '_id followers' },
			{ path: 'followers', select: '_id following' },
		]);

		// loai user khoi followers
		user.followers.map(async ({ _id, following }) => {
			await User.findByIdAndUpdate(_id, {
				$set: {
					following: following.filter((f) => f._id.toString() !== id),
				},
			});
		});

		// loai user khoi following
		user.following.map(async ({ _id, followers }) => {
			await User.findByIdAndUpdate(_id, {
				$set: {
					followers: followers.filter((f) => f._id.toString() !== id),
				},
			});
		});

		// xoa user
		await User.findByIdAndDelete(id);

		return res.status(200).json({ message: `Deleted: ${user.username}`, type: 'success' });
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// Get user by id
exports.getUser = async (req, res) => {
	const { id } = req.params;

	try {
		const user = await User.findById(id)
			.populate([
				{ path: 'following', select: '_id username profilePicture' },
				{ path: 'followers', select: '_id username profilePicture' },
			])
			.lean();
		if (user) {
			return res.status(200).json(user);
		} else {
			return res.status(404).json({ message: 'User is not found', type: 'error' });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// follow
exports.follow = async (req, res) => {
	const { id } = req.params;
	const { friendId } = req.body;
	if (!friendId) return res.status(404).json({ message: 'No ID found', type: 'error' });

	try {
		// tim user
		let user = await User.findById(id).populate([{ path: 'following', select: '_id' }]);
		const friend = await User.findById(friendId).populate([
			{ path: 'followers', select: '_id' },
		]);

		if (user.following.every((f) => f._id.toString() !== friendId)) {
			await user.updateOne({
				$push: {
					following: {
						_id: new mongoose.Types.ObjectId(friendId),
					},
				},
			});
			await friend.updateOne({
				$push: {
					followers: {
						_id: new mongoose.Types.ObjectId(id),
					},
				},
			});

			// lay lai user
			user = await User.findById(id)
				.populate([
					{ path: 'following', select: '_id username profilePicture' },
					{ path: 'followers', select: '_id username profilePicture' },
					{ path: 'saved' },
				])
				.lean();

			return res.status(200).json({ message: 'Followed this user', type: 'success', user });
		} else {
			return res
				.status(403)
				.json({ message: 'You should unfollow this user first', type: 'error' });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// unfollow
exports.unfollow = async (req, res) => {
	const { id } = req.params;
	const { friendId } = req.body;
	if (!friendId) return res.status(404).json({ message: 'No ID found', type: 'error' });

	try {
		// tim user
		let user = await User.findById(id).populate([{ path: 'following', select: '_id' }]);
		const friend = await User.findById(friendId).populate([
			{ path: 'followers', select: '_id' },
		]);

		if (user.following.some((f) => f._id.toString() === friendId)) {
			await user.updateOne({
				$set: {
					following: user.following.filter((f) => f._id.toString() !== friendId),
				},
			});

			await friend.updateOne({
				$set: {
					followers: friend.followers.filter((f) => f._id.toString() !== id),
				},
			});

			// lay lai user
			user = await User.findById(id)
				.populate([
					{ path: 'following', select: '_id username profilePicture' },
					{ path: 'followers', select: '_id username profilePicture' },
					{ path: 'saved' },
				])
				.lean();

			return res
				.status(200)
				.json({ message: 'Unfollowed this friend', type: 'success', user });
		} else {
			return res
				.status(403)
				.json({ message: 'You should follow this user first', type: 'error' });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};
