#!/usr/bin/env node
"use strict";
// Set up Express
const express = require("express");
const app = express();
// Set up bodyparser for JSONs
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
// Set up Couch functions
const couch = require("./couchFunctions.js");
const baseURL = "http://127.0.0.1:5984/"; // CONFIG FILE THIS
// Set up functions for validating input and writing JSONs
const jsonFuncs = require("./jsonFuncs.js");

// set the view engine to ejs
app.set("view engine", "ejs");

// This sets up storing images, CSS, etc. in a folder/dir called public.
// YOU MAY NOT NEED THIS. READDRESS.
app.use(express.static("public"));


// Add food page, renders and sends food list variable to templating engine
app.get("/addpage", function (req, res) {
    const couchPath = "foods/_design/viewByName/_view/viewByNames";
    couch.get(baseURL, couchPath).then(function (foodList) {
        res.render("addpage", {
            foodList: foodList
        });
    });
});

// Submitting with post
app.post("/newpost", urlencodedParser, function (req, res) {
    // Get info from submitted form.
    const newArray = [
        req.body.name,
        req.body.kcalPer100,
        req.body.fatPer100,
        req.body.saturatedFatPer100,
        req.body.carbohydratesPer100,
        req.body.sugarsPer100,
        req.body.fibrePer100,
        req.body.proteinPer100,
        req.body.saltPer100,
        req.body.averageServing
    ];
    // Validate/sanitise that info
    const validatedArray = jsonFuncs.validator(newArray);

    // Actually call the function and redirect to add page.
    jsonFuncs.addFood(validatedArray).then(function () {
        res.redirect("/addpage");
    });
});


// Editpage get, sends info to edit form
app.get("/editpage/:id", function (req, res) {
    const id = req.params.id;
    const couchPath = "foods/" + id;
    couch.get(baseURL, couchPath).then(function (foodData) {
        res.render("editpage", {
            foodData: foodData
        });
    });
});

// Edit action
app.post("/editconfirm", urlencodedParser, function (req, res) {
    // Get id from URL
    const id = req.query.id;

    // Get info from submitted form.
    const newArray = [
        req.body.name,
        req.body.kcalPer100,
        req.body.fatPer100,
        req.body.saturatedFatPer100,
        req.body.carbohydratesPer100,
        req.body.sugarsPer100,
        req.body.fibrePer100,
        req.body.proteinPer100,
        req.body.saltPer100,
        req.body.averageServing
    ];
    // Validate that info
    const validatedArray = jsonFuncs.validator(newArray);

    // Get the JSON to edit it
    couch.get(baseURL, "foods/" + id)
        .then(function (returnedJSON) {
            // Actually call the function to update and PUT.
            return jsonFuncs.editFood(validatedArray, returnedJSON);
        })
        .then(function () {
            console.log("successfully edited");
            res.redirect("/addpage");
        });
});


// Delete
app.post("/deletepage/:id", function (req, res) {
    // const id = req.query.id;
    const id = req.params.id;
    // Couch needs to get the REV ID from the full doc to delete it
    couch.get(baseURL + "foods/" + id)
        .then(function (foodItem) {
            // Linter hates CouchDB's underscore. Non-issue.
            const revID = foodItem._rev;
            // ACTUAL DELETION:
            return couch.docDelete(baseURL + "foods/", id, revID);
        }).then(function () {
            console.log("successfully deleted");
            res.redirect("/addpage");
        });
});


// Calculator page
app.get("/calculator", function (req, res) {
    const couchPath = "foods/_design/viewByName/_view/viewByNames";
    couch.get(baseURL, couchPath).then(function (foodList) {
        res.render("calculator", {
            foodList: foodList
        });
    });
});


// Start server
const server = app.listen(8081, function () {
    const host = server.address().address;
    const port = server.address().port;
    console.log("File successfully running, app listening at http://%s:%s", host, port);
});
