const User = require('../models').users;
const Post = require('../models').posts;
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
				.select('profilePicture username followers')
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
		})
			.select('profilePicture username followers')
			.lean();
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
			return res.status(400).json({ message: 'This email is already used', type: 'error' });

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
				{ path: 'following', select: 'username profilePicture' },
				{ path: 'followers', select: 'username profilePicture' },
				{
					path: 'noti',
					populate: { path: 'user', select: 'username profilePicture' },
				},
				{
					path: 'saved',
					populate: { path: 'author', select: 'username profilePicture' },
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

	if (req.body.action === 'addNoti') {
		if (req.body.text.length === 0)
			return res.status(400).json({ message: 'Text is empty', type: 'error' });
		try {
			const noti = await User.findByIdAndUpdate(
				id,
				{
					$push: {
						noti: {
							user: new mongoose.Types.ObjectId(req.body.userId),
							text: req.body.text,
							url: req.body.url,
							isRead: false,
						},
					},
				},
				{ new: true }
			)
				.select('noti')
				.populate({
					path: 'noti',
					populate: { path: 'user', select: 'username profilePicture' },
				})
				.lean();

			if (noti) {
				return res.status(200).json(noti);
			} else {
				return res.status(404).json({ message: 'User is not found', type: 'error' });
			}
		} catch (error) {
			return res.status(500).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'clearNoti') {
		try {
			await User.updateMany(
				{ _id: id },
				{
					$set: { 'noti.$[].isRead': true },
				}
			).lean();

			return res.status(200).json({});
		} catch (error) {
			return res.status(500).json({ message: error.message, type: 'error' });
		}
	}

	try {
		const existedUser = await User.findOne({ email, _id: { $nin: [id] } }); // kiem tra trung email, ngoai tru user
		if (existedUser)
			return res.status(400).json({ message: 'This email is already used', type: 'error' });

		// Hash password
		const hashedPassword = await handlePassword(password);

		// find and update
		const user = await User.findByIdAndUpdate(
			id,
			{
				$set: {
					username: username,
					email: email,
					password: hashedPassword,
					coverPicture: coverPicture,
					profilePicture: profilePicture,
					desc: desc,
				},
			},
			{ new: true } // tra ve document da update
		).lean();

		if (!user) return res.status(404).json({ message: 'User is not found.', type: 'error' });

		return res.status(200).json({
			type: 'success',
			message: 'Updated successfully',
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
		// find
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

		//xoa post cua user
		await Post.deleteMany({ author: id });

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
		if (req.body.action === 'authUser') {
			let user = await User.findById(id)
				.populate([
					{ path: 'following', select: 'username profilePicture' },
					{ path: 'followers', select: 'username profilePicture' },
					{
						path: 'noti',
						populate: { path: 'user', select: 'username profilePicture' },
					},
					{
						path: 'saved',
						populate: { path: 'author', select: 'username profilePicture' },
					},
				])
				.lean();

			if (user) {
				return res.status(200).json(user);
			} else {
				return res.status(404).json({ message: 'User is not found', type: 'error' });
			}
		}

		if (req.body.action === 'user') {
			let user = await User.findById(id)
				.populate([
					{ path: 'following', select: 'username profilePicture' },
					{ path: 'followers', select: 'username profilePicture' },
				])
				.lean();

			if (user) {
				return res.status(200).json(user);
			} else {
				return res.status(404).json({ message: 'User is not found', type: 'error' });
			}
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// follow
exports.follow = async (req, res) => {
	const { friendId } = req.params;
	const id = getUserId(req);
	if (!friendId) return res.status(404).json({ message: 'No user ID found', type: 'error' });

	try {
		await User.findOneAndUpdate(
			{ _id: id },
			{
				$push: { following: new mongoose.Types.ObjectId(friendId) },
			},
			{ new: true }
		);

		const user = await User.findOneAndUpdate(
			{ _id: friendId },
			{
				$push: { followers: new mongoose.Types.ObjectId(id) },
			},
			{ new: true }
		)
			.select('username profilePicture')
			.populate([
				{ path: 'following', select: 'username profilePicture' },
				{ path: 'followers', select: 'username profilePicture' },
			])
			.lean();

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
		await User.findOneAndUpdate(
			{ _id: id },
			{
				$pull: { following: friendId },
			},
			{ new: true }
		);

		const user = await User.findOneAndUpdate(
			{ _id: friendId },
			{
				$pull: { followers: id },
			},
			{ new: true }
		)
			.select('username profilePicture following followers')
			.populate([
				{ path: 'following', select: 'username profilePicture' },
				{ path: 'followers', select: 'username profilePicture' },
			])
			.lean();

		return res.status(200).json({ message: 'Unfollowed this user', type: 'success', user });
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};
