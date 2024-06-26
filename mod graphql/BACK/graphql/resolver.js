const bcrypt = require('bcrypt');
const validator = require('validator');
const User = require('../models/user');
// const user = require('../models/user');
const jwt = require('jsonwebtoken');
const Post = require('../models/post')
// const { email } = require('../../00-frontend-starting-setup/src/util/validators');

module.exports ={
    createUser: async function ({ userInput },req) {
        //   const email = args.userInput.email;
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
        errors.push({ message: 'E-Mail is invalid.' });
        }
        if (
        validator.isEmpty(userInput.password) ||
        !validator.isLength(userInput.password, { min: 5 })
        ) {
        errors.push({ message: 'Password too short!' });
        }
        if (errors.length > 0) {
        const error = new Error('Invalid input.');
        error.data = errors;
        error.code = 422;
        throw error;
        }
        const existingUser = await User.findOne({ email: userInput.email})
        if (existingUser) {
            const error = new Error ('User already exist');
            throw error;
        }
        const hashesPw = await bcrypt.hash(userInput.password,12);
        const user = new User({
            email: userInput.email,
            name: userInput.name,
            password: hashesPw
        })

        const createdUser = await user.save()

        return {...createdUser._doc, _id: createdUser._id.toString()}
    },
    login: async function ({email, password}) {
        const user = await User.findOne({email: email})
        if (!user) {
            const error = new Error('User not found')
            error.code = 401;
            throw error
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error('Password incorrect')
            error.code = 401;
            throw error
        }
        const token = jwt.sign(
            {
                userId:user._id,
                email: user.email
            },
            'somesupersecretsecret',
            { expiresIn: '1h'}
        );
        console.log(token);
        return { token: token, userId: user._id.toString()};
    },
    createPost: async function({ postInput }, req) {
        if (!req.isAuth) {
          const error = new Error('Not authenticated!');
          error.code = 401;
          throw error;
        }
        const errors = [];
        if (
          validator.isEmpty(postInput.title) ||
          !validator.isLength(postInput.title, { min: 5 })
        ) {
          errors.push({ message: 'Title is invalid.' });
        }
        if (
          validator.isEmpty(postInput.content) ||
          !validator.isLength(postInput.content, { min: 5 })
        ) {
          errors.push({ message: 'Content is invalid.' });
        }
        if (errors.length > 0) {
          const error = new Error('Invalid input.');
          error.data = errors;
          error.code = 422;
          throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
          const error = new Error('Invalid user.');
          error.code = 401;
          throw error;
        }
        const post = new Post({
          title: postInput.title,
          content: postInput.content,
          imageUrl: postInput.imageUrl,
          creator: user
        });
        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
          ...createdPost._doc,
          _id: createdPost._id.toString(),
          createdAt: createdPost.createdAt.toISOString(),
          updatedAt: createdPost.updatedAt.toISOString()
        };
      }
}