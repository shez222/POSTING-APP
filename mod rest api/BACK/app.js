const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid')

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const app = express();
const fileStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'images');
    },
    filename: function(req, file, cb) {
        const uniqueFilename = `${uuidv4()}.${file.originalname.split('.').pop()}`;
        cb(null, uniqueFilename);
    }
});
const fileFilter = (req,file,cb)=>{
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null,true)
    } else {
        cb(null,false)
    }
}
app.use(bodyParser.json());//for json body
app.use(multer({storage:fileStorage, fileFilter: fileFilter}).single('image'))
app.use('/images',express.static(path.join(__dirname,'images')))
app.use((req,res,next)=>{
    //allowing server and host on diff domains (*) is wildcard means any client
    res.setHeader('Access-Control-Allow-Origin','*');
    //after aloowing above we set methods which are allowed
    res.setHeader('Access-Control-Allow-Methods','OPTIONS,GET,POST,PUT,PATCH,DELETE');
    //allowing client to set extra headers
    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
    next()
})

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error,req,res,next)=>{
    console.log(error);
    const status= error.status || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({
        message:message,
        data: data
    })
})

mongoose.connect('mongodb+srv://bilalshehroz420:00000@cluster0.wru7job.mongodb.net/messages?retryWrites=true&w=majority')
.then((result) => {
    const server = app.listen(8080);
    const CORS = {
        cors: {
            origin: "http://localhost:3000", // Allow only your client application's origin
            methods: ["GET", "POST","PUT","PATCH","OPTIONS","DELETE"], // Allowable methods
            allowedHeaders: ["my-custom-header"], // Optional: specify headers
            credentials: true // Optional: if you need cookies or authorization headers
        }
    }
    const io = require('./socket').init(server,CORS);
    return io;
})
.then((io)=>{
    io.on('connection', socket => {
        console.log('Client connected');
    }); 
}).catch((err) => {
    console.log(err);
});