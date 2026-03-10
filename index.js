
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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
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
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
app.use(passport.initialize());
app.use(passport.session());
app.use(flashMiddleware)

app.use('/', userRoutes);
app.use('/admin',adminRoutes);

app.use((req,res)=>{
    res.status(404).render("404");
});


app.listen(port, () => console.log("Server Running"));
