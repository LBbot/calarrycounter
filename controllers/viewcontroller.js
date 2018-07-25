"use strict";
// Exporting all of this content as a function to be used by app.js
module.exports = function (app) {

    // Bodyparser for JSONs
    const bodyParser = require("body-parser");
    const urlencodedParser = bodyParser.urlencoded({ extended: false });
    // Couch functions for CRUD operations
    const couch = require("../couchFunctions");
    const baseCouchURL = "http://127.0.0.1:5984/"; // TODO: CONFIG FILE THIS
    // Module for validating input, performing calculations, writing JSONs and calling CouchDB requests
    const jsonFunctions = require("../jsonFunctions");


    /*
    Food page (food.ejs) - has form to add food and a list of any added food
    */
    app.get("/food", function (req, res) {
        // GET foodList from CouchDB, render food.ejs with it
        const couchPath = "foods/_design/viewByName/_view/viewByNames";
        couch.get(baseCouchURL, couchPath).then(function (foodList) {
            res.render("food", {
                foodList: foodList
            });
        }).catch(function (err) {
            // Check if it is a database connection issue
            // Render error.ejs with custom error info so as not to reveal Couch details in the stack
            if (err.message.indexOf("ECONNREFUSED") > 0) {
                res.status(503).render("error", {
                    errorInfo: "Error connecting to database. Please try again later."
                });
            }
        });
    });

    /*
    Add a new food to the list on food page (food.ejs)
    */
    app.post("/food", urlencodedParser, function (req, res) {
        // Get info from each field of the submitted form.
        const formDataAsArray = [
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



        // WORKING FROM HERE, RENAMING VARIABLES



        const validatedOutput = jsonFunctions.foodListValidation(formDataAsArray);

        // Check if validation succeeded (this is a boolean property)
        if (validatedOutput.success) {
            // JSON prep and Couch add func on the validated array and send user back to food page
            jsonFunctions.addFood(validatedOutput.content).then(function () {
                res.redirect("/food");
            }).catch(function (err) {
                // Check if it is a database connection issue
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    // Render error.ejs with custom error info so as not to reveal exact Couch details
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        } else { // Validation success = false, so copy and paste this but with error stuff
            const couchPath = "foods/_design/viewByName/_view/viewByNames";
            couch.get(baseCouchURL, couchPath).then(function (foodList) {
                res.render("food", {
                    // PASSING IN ERROR LIST AND FORM STUFF
                    foodList: foodList,
                    errorList: validatedOutput.content,
                    oldFormStuff: formDataAsArray
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
        couch.get(baseCouchURL, couchPath).then(function (foodData) {
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
        const formDataAsArray = [
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
        const validatedOutput = jsonFunctions.foodListValidation(formDataAsArray);

        // Check if validation returned true
        if (validatedOutput.success) {
            // Get the JSON to edit it
            couch.get(baseCouchURL, "foods/" + id)
                .then(function (returnedJSON) {
                    // Actually call the function to update and PUT.
                    return jsonFunctions.editFood(validatedOutput.content, returnedJSON);
                })
                .then(function () {
                    console.log("successfully edited");
                    res.redirect("/food");
                });
        } else { // Validation success = false, so copy and paste this but with error stuff
            const couchPath = "foods/" + id;
            couch.get(baseCouchURL, couchPath).then(function (foodData) {
                res.render("editpage", {
                    foodData: foodData,
                    errorList: validatedOutput.content,
                    oldFormStuff: formDataAsArray
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
        couch.get(baseCouchURL + "foods/" + id)
            .then(function (foodItem) {
                // Linter hates CouchDB's underscore. Non-issue.
                const revID = foodItem._rev;
                // ACTUAL DELETION:
                return couch.docDelete(baseCouchURL + "foods/", id, revID);
            }).then(function () {
                console.log("successfully deleted");
                res.redirect("/food");
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
        const foodsPath = "foods/_design/viewByName/_view/viewByNames";
        const currentFoodPath = "currentfood/_design/viewz/_view/byDate";
        couch.get(baseCouchURL, foodsPath).then(function (foodList) {
            couch.get(baseCouchURL, currentFoodPath).then(function (currentFoodList) {
                res.render("calculator", {
                    foodList: foodList,
                    currentFoodList: currentFoodList
                });
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


    // Calculator POST
    app.post("/calculator", urlencodedParser, function (req, res) {
        // Validate/sanitise the 3 items submitted by the form
        jsonFunctions.calcValidator(req.body.foodID, req.body.type, req.body.amount).then(function (validatedOutput) {

            // Check if validation returned true
            if (validatedOutput.success) {

                // Call the json prep and Couch add function on the validated array and redirect to calc page
                jsonFunctions.addToCalc(validatedOutput.content).then(function () {
                    res.redirect("/calculator");

                // THIS BIT MIGHT BE REDUNDANT GIVEN OTHER CATCH
                // }).catch(function (err) {
                //     // Check if it is a database connection issue
                //     if (err.message.indexOf("ECONNREFUSED") > 0) {
                //         // Render error.ejs with custom error info so as not to reveal exact Couch details
                //         res.status(503).render("error", {
                //             errorInfo: "Error connecting to database. Please try again later."
                //         });
                //     }
                });
            } else { // Validation success = false, so copy and paste this but with error stuff
                const foodsPath = "foods/_design/viewByName/_view/viewByNames";
                const currentFoodPath = "currentfood/_design/viewz/_view/byDate";
                couch.get(baseCouchURL, foodsPath).then(function (foodList) {
                    couch.get(baseCouchURL, currentFoodPath).then(function (currentFoodList) {
                        res.render("calculator", {
                            foodList: foodList,
                            currentFoodList: currentFoodList,
                            errorList: validatedOutput.content
                        });
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
    });

    // Calculator Delete
    // (total repeat of the Delete function except for the route and Couch path. No better way to do it?)
    app.post("/remove/:id", function (req, res) {
        // const id = req.query.id;
        const id = req.params.id;
        // Couch needs to get the REV ID from the full doc to delete it
        couch.get(baseCouchURL + "currentfood/" + id)
            .then(function (foodItem) {
                // Linter hates CouchDB's underscore. Non-issue.
                const revID = foodItem._rev;
                // ACTUAL DELETION:
                return couch.docDelete(baseCouchURL + "currentfood/", id, revID);
            }).then(function () {
                console.log("successfully deleted");
                res.redirect("/calculator");
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
