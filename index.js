
const express = require("express");
const app = express();
const path = require('path')
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash')
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
require('dotenv').config();
require('./config/passportConfig')(passport); 
const flashMiddleware = require('./config/flash')

app.use(express.static('public'));
app.use('/uploads/',express.static('uploads'));

app.use(flash())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const port = process.env.PORT || 3000; 
app.use(session({
    secret: 'secret', 
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flashMiddleware)

app.use('/', userRoutes);
app.use('/admin',adminRoutes);


app.listen(port, () => console.log("Server Running"));
