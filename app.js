"use strict";

// Set up Express and require viewcontroller.js
const express = require("express");
const app = express();
const viewController = require("./controllers/viewcontroller");

// ejs templating engine
app.set("view engine", "ejs");

// Storing static files: images, CSS, etc. in a dir called public.
app.use(express.static("public"));

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
