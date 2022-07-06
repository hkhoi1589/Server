const mongoose = require('mongoose');
const { Schema } = mongoose;

const Post = mongoose.model(
	'Posts',
	new Schema(
		{
			author: { type: Schema.ObjectId, ref: 'Users' },
			comments: {
				type: [
					{
						user: { type: Schema.ObjectId, ref: 'Users' },
						text: String,
						timestamp: Number,
					},
				],
				default: [],
			},
			likers: {
				type: [{ type: Schema.ObjectId, ref: 'Users' }],
				default: [],
			},
			text: {
				type: String,
				trim: true,
				default: '',
			},
			file: {
				type: String,
				default:
					'https://res.cloudinary.com/dlvk5v5jr/image/upload/v1656904678/noimage_food_viet247_r3nlzm.jpg',
			},
			userSaved: {
				type: [String],
				default: [],
			},
		},
		{ timestamps: true }
	)
);
module.exports = Post;
