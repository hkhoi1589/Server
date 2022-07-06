const User = require('../models').users;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { handlePassword, sendToken, getUserId } = require('../helpers');

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
		const existedUser = await User.findOne({ email });

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
				{
					path: 'saved',
					populate: { path: 'author', select: '_id username profilePicture' },
				},
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
	const id = getUserId(req);

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
		).lean();

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
	const id = getUserId(req);

	try {
		// find and update
		let user = await User.findById(id);

		// loai user khoi followers
		user.followers.map(async (_id) => {
			await User.findByIdAndUpdate(_id, {
				$pull: { following: id },
			});
		});

		// loai user khoi following
		user.following.map(async (_id) => {
			await User.findByIdAndUpdate(_id, {
				$pull: { followers: id },
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
	const authId = getUserId(req);

	try {
		let user;
		if (authId === id) {
			// neu la authUser
			user = await User.findById(id)
				.populate([
					{ path: 'following', select: '_id username profilePicture' },
					{ path: 'followers', select: '_id username profilePicture' },
					{
						path: 'saved',
						populate: { path: 'author', select: '_id username profilePicture' },
					},
				])
				.lean();
		} else {
			// neu khong
			user = await User.findById(id)
				.populate([
					{ path: 'following', select: '_id username profilePicture' },
					{ path: 'followers', select: '_id username profilePicture' },
				])
				.lean();
		}

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
	const { friendId } = req.params;
	const id = getUserId(req);
	if (!friendId) return res.status(404).json({ message: 'No ID found', type: 'error' });

	try {
		const friend = await User.find({ _id: friendId, followers: id });
		if (friend.length > 0) return res.status(500).json({ msg: 'You followed this user.' });

		const user = await User.findOneAndUpdate(
			{ _id: id },
			{
				$push: { following: new mongoose.Types.ObjectId(friendId) },
			},
			{ new: true }
		)
			.populate([{ path: 'following', select: '_id username profilePicture' }])
			.lean();

		await User.findOneAndUpdate(
			{ _id: friendId },
			{
				$push: { followers: new mongoose.Types.ObjectId(id) },
			},
			{ new: true }
		);

		return res.status(200).json({ message: 'Followed this user', type: 'success', user });
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// unfollow
exports.unfollow = async (req, res) => {
	const { friendId } = req.params;
	const id = getUserId(req);
	if (!friendId) return res.status(404).json({ message: 'No ID found', type: 'error' });

	try {
		const friend = await User.find({ _id: friendId, followers: id });
		if (friend.length === 0) return res.status(500).json({ msg: 'You unfollowed this user.' });

		const user = await User.findOneAndUpdate(
			{ _id: id },
			{
				$pull: { following: friendId },
			},
			{ new: true }
		)
			.populate([{ path: 'following', select: '_id username profilePicture' }])
			.lean();

		await User.findOneAndUpdate(
			{ _id: friendId },
			{
				$pull: { followers: id },
			},
			{ new: true }
		);

		return res.status(200).json({ message: 'Unfollowed this user', type: 'success', user });
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};
