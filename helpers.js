const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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

const getUserId = (req) => {
	const token = req.body.token || req.query.token || req.headers['authorization'];
	const decoded = jwt.decode(token);
	return decoded._id;
};

module.exports = { handlePassword, sendToken, getUserId };
