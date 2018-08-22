"use strict";

// Set up Express, require viewcontroller.js, require session+passport
const express = require("express");
const app = express();
const session = require("express-session");
const passport = require("passport");
const viewController = require("./controllers/viewcontroller");

// ejs templating engine
app.set("view engine", "ejs");

// Storing static files: images, CSS, etc. in a dir called public.
app.use(express.static("public"));

// passport setup
// TODO: CHANGE SECRET
app.use(session({
    secret: "supersecret",
    resave: false,
    saveUninitialized: false
    // cookie: { secure: true } // Secure requires HTTPS! So don't use this with localhost
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions


// Call viewcontroller.js as function, (gets, posts, etc.)
viewController(app);

// Start server
app.listen(8081);

/*
TODO: These FOLLOWING variables currently do basically nothing.
Might be different on a real server.
Unclear that it needs logging.
*/
// const server = app.listen(8081, function () {
//     const host = server.address().address;
//     const port = server.address().port;
//     console.log("File successfully running, app listening at http://%s:%s", host, port);
// });
