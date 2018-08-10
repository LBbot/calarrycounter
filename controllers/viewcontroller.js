"use strict";
// Exporting all of this content as a function to be used by app.js
module.exports = function (app) {


    // Bodyparser for JSONs
    const bodyParser = require("body-parser");
    const urlencodedParser = bodyParser.urlencoded({ extended: false });
    // Couch functions for CRUD operations
    const couch = require("../couchFunctions");
    const config = require("../config.json");
    // Module for validating input, performing calculations, writing JSONs and calling CouchDB requests
    const userInputFunctions = require("../userInputFunctions");


    /*
    Food page (food.ejs) - has form to add food and a list of any added food
    */
    app.get("/food", function (req, res) {
        // GET foodList from CouchDB, render food.ejs with it
        const couchPath = "foods/_design/viewByName/_view/viewByNames";
        couch.get(config.baseCouchURL, couchPath).then(function (foodList) {
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
        const validationOutput = userInputFunctions.foodListValidation(formDataAsArray);

        // Check if validation succeeded (this is a boolean property)
        if (validationOutput.success) {
            // Func preps data into JSON and posts to Couch, then we send user back to food page
            userInputFunctions.writeJSONAndAddToFoodList(validationOutput.content).then(function () {
                res.redirect("/food");
            }).catch(function (err) {
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        } else { // if validation success = false: re-render food.ejs showing errors and the input that caused them
            const couchPath = "foods/_design/viewByName/_view/viewByNames";
            couch.get(config.baseCouchURL, couchPath).then(function (foodList) {
                res.render("food", {
                    foodList: foodList,
                    errorList: validationOutput.content,
                    previousUserInput: formDataAsArray
                });
            }).catch(function (err) { // Database errors
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        }
    });


    /*
    Edit food list item:
    GET single CouchDB doc from id in URL to pre-fill an ediatable form in edit-food-item.ejs
    */
    app.get("/edit-food-item/:id", function (req, res) {
        const id = req.params.id;
        const couchPath = "foods/" + id;
        couch.get(config.baseCouchURL, couchPath).then(function (foodListItem) {
            res.render("edit-food-item", {
                foodListItem: foodListItem
            });
        }).catch(function (err) { // Database errors
            if (err.message.indexOf("ECONNREFUSED") > 0) {
                res.status(503).render("error", {
                    errorInfo: "Error connecting to database. Please try again later."
                });
            }
        });
    });


    /*
    Edit confirmation: Actually make the edit on the food list item (activated on submit)
    */
    app.post("/edit-food-item-confirmation/:id", urlencodedParser, function (req, res) {
        // Get id from URL
        const id = req.params.id;

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
        const validationOutput = userInputFunctions.foodListValidation(formDataAsArray);

        if (validationOutput.success) {
            // Get the original JSON so we can edit it
            couch.get(config.baseCouchURL, "foods/" + id)
                .then(function (originalJSON) {
                    // Update the JSON properties with array of new content and send it back to CouchDB
                    return userInputFunctions.editJSONAndPutBack(validationOutput.content, originalJSON);
                })
                .then(function () {
                    // Send user back to food list page
                    res.redirect("/food");
                });
        } else { // if validation success = false, re-render form with errors and the inputs that caused them
            const couchPath = "foods/" + id;
            couch.get(config.baseCouchURL, couchPath).then(function (foodListItem) {
                res.render("edit-food-item", {
                    foodListItem: foodListItem,
                    errorList: validationOutput.content,
                    previousUserInput: formDataAsArray
                });
            }).catch(function (err) { // Database errors
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        }
    });


    /*
    Delete item from food list - no page render, just the operation as a POST (because a delete header doesn't work)
    */
    app.post("/delete-food-item/:id", function (req, res) {
        // Couch needs to get the whole doc (via ID in URL) to get the REV ID to delete it
        const id = req.params.id;
        couch.get(config.baseCouchURL + "foods/" + id).then(function (foodItem) {
            // We also need to get items on the calculator and loop through them so we can delete any matches
            couch.get(config.baseCouchURL + "currentfood/_design/viewz/_view/viewById").then(function (calcList) {
                calcList.rows.forEach(async function (calcEntry) {
                    // If id is matched in calculator entries, delete them with their ID and rev_ID)
                    if (id === calcEntry.value[1]) {
                        const calcRevID = calcEntry.value[0];
                        await couch.docDelete(config.baseCouchURL + "currentfood/", calcEntry.id, calcRevID);
                    }
                });

                // To delete original we get _rev property (linter doesn't like Couch underscores so make exception)
                /* eslint no-underscore-dangle: ["error", { "allow": ["_rev"] }]*/
                const revID = foodItem._rev;
                return couch.docDelete(config.baseCouchURL + "foods/", id, revID);

            }).then(function () {
                // Send user back to food list page.
                res.redirect("/food");
            }).catch(function (err) { // Database errors
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        });
    });


    /*
    Calculator - gets main food list, and a list of foods added to the calculator in order to render calculator.ejs
    */
    app.get("/calculator", function (req, res) {
        const foodListCouchView = "foods/_design/viewByName/_view/viewByNames";
        const calculatorListFoodCouchView = "currentfood/_design/viewz/_view/byDate";
        couch.get(config.baseCouchURL, foodListCouchView).then(function (mainFoodList) {
            couch.get(config.baseCouchURL, calculatorListFoodCouchView).then(function (calculatorFoodList) {
                res.render("calculator", {
                    mainFoodList: mainFoodList,
                    calculatorFoodList: calculatorFoodList
                });
            });
        }).catch(function (err) { // Database errors
            if (err.message.indexOf("ECONNREFUSED") > 0) {
                res.status(503).render("error", {
                    errorInfo: "Error connecting to database. Please try again later."
                });
            }
        });
    });


    /*
    Calculator post
    Add a food from the main food list to the Calculator with an amount for it to calculate.
    */
    app.post("/calculator", urlencodedParser, function (req, res) {
        /* Validate/sanitise the 3 items submitted in the form, then cross-reference with the matching foodID in the
        main food list to get nutritional values and multiply them based on the amount entered */
        userInputFunctions.validateAndCalculateFromAmount(
            req.body.foodID,
            req.body.type,
            req.body.amount
        ).then(function (validationOutput) {
            if (validationOutput.success) {
                // Func preps data into JSON and posts to Couch, then we send user back to calculator.ejs
                userInputFunctions.writeJSONAndAddToCalculatorList(validationOutput.content).then(function () {
                    res.redirect("/calculator");
                });
            } else { // if validation success = false, re-render form with errors and the inputs that caused them
                const foodListCouchView = "foods/_design/viewByName/_view/viewByNames";
                const calculatorListFoodCouchView = "currentfood/_design/viewz/_view/byDate";
                couch.get(config.baseCouchURL, foodListCouchView).then(function (mainFoodList) {
                    couch.get(config.baseCouchURL, calculatorListFoodCouchView).then(function (calculatorFoodList) {
                        res.render("calculator", {
                            mainFoodList: mainFoodList,
                            calculatorFoodList: calculatorFoodList,
                            errorList: validationOutput.content
                        });
                    });
                }).catch(function (err) { // Database errors
                    if (err.message.indexOf("ECONNREFUSED") > 0) {
                        res.status(503).render("error", {
                            errorInfo: "Error connecting to database. Please try again later."
                        });
                    }
                });
            }
        });
    });


    /*
    Calculator Delete -total repeat of the Delete function except for the route and Couch path
    */
    app.post("/remove-from-calculator/:id", function (req, res) {
        // Couch needs to get the whole doc (via ID in URL) to get the REV ID to delete it
        const id = req.params.id;
        couch.get(config.baseCouchURL + "currentfood/" + id).then(function (foodItem) {
            // Get _rev property
            const revID = foodItem._rev;
            return couch.docDelete(config.baseCouchURL + "currentfood/", id, revID);
        }).then(function () {
            // Send user back to calculator page.
            res.redirect("/calculator");
        }).catch(function (err) { // Database errors
            if (err.message.indexOf("ECONNREFUSED") > 0) {
                res.status(503).render("error", {
                    errorInfo: "Error connecting to database. Please try again later."
                });
            }
        });
    });

    /*
    Calculator Edit Amount on already added items
    Has to get original figures and recalculate them on the backend to edit.
    */
    app.post("/calculator/:id", urlencodedParser, function (req, res) {
        // Get ID from URL
        const id = req.params.id;
        // Get amount passed in by form submit
        const amount = req.body.editamount;

        // Validate/sanitise/round amount
        const validatedAmount = userInputFunctions.amountValidationOnly(amount);

        if (validatedAmount.success) {
            /* GET the nutrients by main list ID, and recalculate from the new amount, PUT back in database, then send
            user back to calculator page */
            userInputFunctions.amountRecalculationAndPutJSON(id, validatedAmount.content)
                .then(function () {
                    res.redirect("/calculator");
                }).catch(function (err) { // Database errors
                    if (err.message.indexOf("ECONNREFUSED") > 0) {
                        res.status(503).render("error", {
                            errorInfo: "Error connecting to database. Please try again later."
                        });
                    }
                });
        } else { // if validation success = false, re-render calculator page with errors and the inputs that caused them
            const foodListCouchView = "foods/_design/viewByName/_view/viewByNames";
            const calculatorListFoodCouchView = "currentfood/_design/viewz/_view/byDate";
            couch.get(config.baseCouchURL, foodListCouchView).then(function (mainFoodList) {
                couch.get(config.baseCouchURL, calculatorListFoodCouchView).then(function (calculatorFoodList) {
                    res.render("calculator", {
                        mainFoodList: mainFoodList,
                        calculatorFoodList: calculatorFoodList,
                        errorList: validatedAmount.content
                    });
                });
            }).catch(function (err) { // Database errors
                if (err.message.indexOf("ECONNREFUSED") > 0) {
                    res.status(503).render("error", {
                        errorInfo: "Error connecting to database. Please try again later."
                    });
                }
            });
        }
    });


    app.get("/", function (req, res) {
        res.render("index");
    });


    app.get("/login", function (req, res) {
        res.render("login");
    });
    app.post("/login", urlencodedParser, function (req, res) {
        const inputUsername = req.body.username;
        const inputPassword = req.body.password;

        couch.get(config.baseCouchURL, "ccusers/_design/views/_view/nameList").then(function (listOfNames) {
            // listOfNames is an object with an array called rows which has the docs in the view of users


            const bcrypt = require("bcrypt");
            const errorArray = [];
            let foundUsername = false;
            let correctPassword = false;

            for (const doc of listOfNames.rows) {
                // .key property has the name in each doc using this view
                if (inputUsername === doc.key) {
                    foundUsername = true;
                    if (bcrypt.compareSync(inputPassword, doc.value)) {
                        correctPassword = true;
                    } else {
                        errorArray.push("Password does not match.");
                    }
                    break;
                }
            }

            if (foundUsername === false) {
                errorArray.push("Username not on record.");
            }

            if (errorArray.length > 0) {
                res.render("login", {
                    errorList: errorArray,
                    previousUserInput: [req.body.username, req.body.password]
                });
            } else {
                res.send("password match!");
            }
        });
    });


    app.get("/register", function (req, res) {
        res.render("register");
    });
    app.post("/register", urlencodedParser, function (req, res) {
        const formDataAsArray = [
            req.body.username,
            req.body.password,
            req.body.passwordconfirm
        ];
        // Validate/sanitise that info, and if successful, package into JSON
        userInputFunctions.userRegistrationValidation(formDataAsArray).then(function (validationOutput) {

            if (validationOutput.success) {
                // Set up URL for posting to Couch
                const postURL = config.baseCouchURL + "ccusers/";
                // Post JSON with username and password to CouchDB
                couch.post(postURL, validationOutput.content).then(function () {
                    res.redirect("login");
                }).catch(function (err) { // Database errors
                    if (err.message.indexOf("ECONNREFUSED") > 0) {
                        res.status(503).render("error", {
                            errorInfo: "Error connecting to database. Please try again later."
                        });
                    }
                });
            } else { // if validation success = false, re-render form with errors and the inputs that caused them
                res.render("register", {
                    errorList: validationOutput.content,
                    previousUserInput: formDataAsArray
                });
            }
        });
    });

    app.get("/logout", function (req, res) {
        // Do something to log user out and send back to homepage I guess
        res.redirect("/");
    });

    app.get("/account", function (req, res) {
        // do something with user stuff here
        res.send("nothing here yet");
    });


    // Catch 404 errors as the last of the app. possibilities.
    app.use(function (req, res) {
        res.status(404).render("error", {
            errorInfo: "404: Page Not Found. Please ensure the URL is correct."
        });
    });
};
