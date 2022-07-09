const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model(
	'Users',
	new Schema(
		{
			username: {
				type: String,
				require: true,
				min: 3,
				max: 27,
			},
			email: {
				type: String,
				require: true,
				max: 50,
				unique: true,
			},
			password: {
				type: String,
				require: true,
			},
			coverPicture: {
				type: String,
				default:
					'https://res.cloudinary.com/dlvk5v5jr/image/upload/v1656087346/cover_qk86qy.png',
			},
			profilePicture: {
				type: String,
				default:
					'https://res.cloudinary.com/dlvk5v5jr/image/upload/v1656087345/profile_atg3sg.jpg',
			},
			desc: {
				type: String,
				default: 'Hello world',
			},
			followers: {
				type: [{ type: Schema.ObjectId, ref: 'Users' }],
				default: [],
			},
			following: {
				type: [{ type: Schema.ObjectId, ref: 'Users' }],
				default: [],
			},
			noti: {
				type: [
					{
						client: { type: Schema.ObjectId, ref: 'Users' },
						text: String,
						url: String,
						isRead: Boolean,
					},
					{ timestamps: true },
				],
				default: [],
			},
			saved: {
				type: [{ type: Schema.ObjectId, ref: 'Posts' }],
				default: [],
			},
		},
		{ timestamps: true }
	)
);
module.exports = User;
