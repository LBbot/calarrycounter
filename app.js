#!/usr/bin/env node
"use strict";
// Set up Express
const express = require("express");
const app = express();
const viewController = require("./controllers/viewcontroller");

// set the view engine to ejs
app.set("view engine", "ejs");

// Storing static files: images, CSS, etc. in a dir called public.
app.use(express.static("public"));

// Fire controller (gets, posts, etc.)
viewController(app);

// Start server
const server = app.listen(8081, function () {
    const host = server.address().address;
    const port = server.address().port;
    console.log("File successfully running, app listening at http://%s:%s", host, port);
});
