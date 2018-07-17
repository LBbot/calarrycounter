#!/usr/bin/env node
"use strict";
module.exports = function (app) {

    // Set up bodyparser for JSONs
    const bodyParser = require("body-parser");
    const urlencodedParser = bodyParser.urlencoded({ extended: false });
    // Set up Couch functions
    const couch = require("../couchFunctions");
    const baseURL = "http://127.0.0.1:5984/"; // CONFIG FILE THIS
    // Set up functions for validating input and writing JSONs
    const jsonFuncs = require("../jsonFuncs");


    // Add food page, renders and sends food list variable to templating engine
    app.get("/addpage", function (req, res) {
        const couchPath = "foods/_design/viewByName/_view/viewByNames";
        couch.get(baseURL, couchPath).then(function (foodList) {
            res.render("addpage", {
                foodList: foodList
            });
        }).catch(function (err) {
            // Check if it is a database connection issue
            if (err.message.indexOf("ECONNREFUSED") > 0) {
                // Render error.ejs with custom error info so as not to reveal exact Couch details
                res.status(503).render("error", {
                    errorInfo: "Error connecting to database. Please try again later."
                });
            }
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
        const validatedOutput = jsonFuncs.validator(newArray);

        // Check if validation returned true
        if (validatedOutput.outcome) {
            // Call the json prep and Couch add function on the validated array in validatedArray and redirect to add page
            jsonFuncs.addFood(validatedOutput.content).then(function () {
                res.redirect("/addpage");
            }).catch(function (err) {
                // Check if it is a database connection issue
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    // Render error.ejs with custom error info so as not to reveal exact Couch details
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        } else { // Validation outcome = false, so copy and paste this but with error stuff
            const couchPath = "foods/_design/viewByName/_view/viewByNames";
            couch.get(baseURL, couchPath).then(function (foodList) {
                res.render("addpage", {
                    // PASSING IN ERROR LIST AND FORM STUFF
                    foodList: foodList,
                    errorList: validatedOutput.content,
                    oldFormStuff: newArray
                });
            }).catch(function (err) {
                // Check if it is a database connection issue
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    // Render error.ejs with custom error info so as not to reveal exact Couch details
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        }
    });


    // Editpage get, sends info to edit form
    app.get("/editpage/:id", function (req, res) {
        const id = req.params.id;
        const couchPath = "foods/" + id;
        couch.get(baseURL, couchPath).then(function (foodData) {
            res.render("editpage", {
                foodData: foodData
            });
        }).catch(function (err) {
            // Check if it is a database connection issue
            if (err.message.indexOf("ECONNREFUSED") > 0) {
                // Render error.ejs with custom error info so as not to reveal exact Couch details
                res.status(503).render("error", {
                    errorInfo: "Error connecting to database. Please try again later."
                });
            }
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
        const validatedOutput = jsonFuncs.validator(newArray);

        // Check if validation returned true
        if (validatedOutput.outcome) {
            // Get the JSON to edit it
            couch.get(baseURL, "foods/" + id)
                .then(function (returnedJSON) {
                    // Actually call the function to update and PUT.
                    return jsonFuncs.editFood(validatedOutput.content, returnedJSON);
                })
                .then(function () {
                    console.log("successfully edited");
                    res.redirect("/addpage");
                });
        } else { // Validation outcome = false, so copy and paste this but with error stuff
            const couchPath = "foods/" + id;
            couch.get(baseURL, couchPath).then(function (foodData) {
                res.render("editpage", {
                    foodData: foodData,
                    errorList: validatedOutput.content,
                    oldFormStuff: newArray
                });
            }).catch(function (err) {
                // Check if it is a database connection issue
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    // Render error.ejs with custom error info so as not to reveal exact Couch details
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        }
    });


    // Delete
    app.post("/delete/:id", function (req, res) {
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
            }).catch(function (err) {
                // Check if it is a database connection issue
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    // Render error.ejs with custom error info so as not to reveal exact Couch details
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });

    });


    // Calculator page
    app.get("/calculator", function (req, res) {
        const couchPath = "foods/_design/viewByName/_view/viewByNames";
        couch.get(baseURL, couchPath).then(function (foodList) {
            res.render("calculator", {
                foodList: foodList
            });
        }).catch(function (err) {
            // Check if it is a database connection issue
            if (err.message.indexOf("ECONNREFUSED") > 0) {
                // Render error.ejs with custom error info so as not to reveal exact Couch details
                res.status(503).render("error", {
                    errorInfo: "Error connecting to database. Please try again later."
                });
            }
        });
    });


    // Catch 404 errors as the last of the app. possibilities.
    app.use(function (req, res) {
        res.status(404).render("error", {
            errorInfo: "404: Page Not Found. Please ensure the URL is correct."
        });
    });
};
