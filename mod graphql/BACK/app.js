const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid')
const { createHandler } = require('graphql-http/lib/use/express');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolver');
const expressPlayground = require('graphql-playground-middleware-express').default
const auth = require('./middleware/auth');

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
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200)
    }
    next()
})

app.use(auth)

app.use('/graphql', createHandler({
    schema:graphqlSchema,
    rootValue:graphqlResolver,
    formatError(err){
        if (!err.originalError) {
            return err
        }
        const data= err.originalError.data;
        const message = err.message || 'error Ocurred';
        const code = err.originalError.code || 500;
        return { message : message , status: code , data: data}
    }
}))

app.get('/playground', expressPlayground({ endpoint: '/graphql' }));

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
    app.listen(8080);
})
.catch((err) => {
    console.log(err);
});