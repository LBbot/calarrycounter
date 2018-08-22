"use strict";
// Couch functions for CRUD operations
const couch = require("./couchFunctions.js");
const config = require("./config.json");
const bcrypt = require("bcrypt");


function foodListValidation(formDataArray) {
    // Any errors in validation will be added to this. If it's not empty by the end, it will be returned
    const errorArray = [];

    // Must be 10 fields (actual form should never trigger the error, this is in case the function runs some other way)
    if (formDataArray.length < 10 || formDataArray.length > 10) {
        errorArray.push("Too many or too few arguments supplied to function. Should be 10.");
    }

    // Name validation (MANDATORY FIELD)
    if (typeof formDataArray[0] !== "string") {
        try {
            formDataArray[0] = String(formDataArray[0]);
        } catch (err) {
            errorArray.push("Food name should be a string value." + err);
        }
    }
    if (formDataArray[0].trim() === "") {
        errorArray.push("Food name should not be blank.");
    }
    if (formDataArray[0].trim().length > 45) {
        errorArray.push("Food name should not be longer than 45 characters.");
    }

    // Number validation
    for (let argNumber = 1; argNumber < formDataArray.length; argNumber += 1) {
        // Check for floats, round them to two decimal places or turn non-numbers into NaN)
        if (Number(formDataArray[argNumber]) % 1 !== 0) {
            const floatedArg = parseFloat(formDataArray[argNumber]).toFixed(2);

            // Register error for non-numbers, else apply float rounding to original arg
            if (isNaN(floatedArg)) {
                errorArray.push("Input #" + [argNumber + 1] + " should be a number.");
            } else {
                formDataArray[argNumber] = floatedArg;
            }
        }

        // Catch empties and store them how the DB expects them, or make sure number is in range
        if (String(formDataArray[argNumber]).trim() === "") {
            formDataArray[argNumber] = "";
        } else if (formDataArray[argNumber] < 0 || formDataArray[argNumber] > 9999) {
            errorArray.push("Input #" + [argNumber + 1] + " should be between 0 and 9999.");
        }
    }

    // If anything in errorArray: return it, otherwise return validated array
    if (errorArray.length > 0) {
        return {
            success: false,
            content: errorArray
        };
    }
    return {
        success: true,
        content: formDataArray
    };
}


function writeJSONAndAddToFoodList(validatedArray) {
    // Preps a JSON from the validated array, and posts to database
    const newJSON = {
        "name": validatedArray[0].trim(),
        "kcalPer100": validatedArray[1],
        "fatPer100": validatedArray[2],
        "saturatedFatPer100": validatedArray[3],
        "carbohydratesPer100": validatedArray[4],
        "sugarsPer100": validatedArray[5],
        "fibrePer100": validatedArray[6],
        "proteinPer100": validatedArray[7],
        "saltPer100": validatedArray[8],
        "averageServing": validatedArray[9],
        "createdAt": new Date()
    };

    const couchPath = "foods/";
    const url = config.baseCouchURL + couchPath;
    return couch.post(url, newJSON);
}


function editJSONAndPutBack(formDataArray, oldJSON) {
    // Takes original JSON and replaces properties with new ones, then PUTs to database
    oldJSON.name = formDataArray[0].trim();
    oldJSON.kcalPer100 = formDataArray[1];
    oldJSON.fatPer100 = formDataArray[2];
    oldJSON.saturatedFatPer100 = formDataArray[3];
    oldJSON.carbohydratesPer100 = formDataArray[4];
    oldJSON.sugarsPer100 = formDataArray[5];
    oldJSON.fibrePer100 = formDataArray[6];
    oldJSON.proteinPer100 = formDataArray[7];
    oldJSON.saltPer100 = formDataArray[8];
    oldJSON.averageServing = formDataArray[9];

    const couchPath = "foods/";
    const url = config.baseCouchURL + couchPath;
    // Linter doesn't like Couch underscores so make exception
    /* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }]*/
    return couch.update(url, oldJSON._id, oldJSON);
}


// validation for amount put into calculator + calculates calories and nutrients from amount, outputs them
function validateAndCalculateFromAmount(formFoodID, formType, formAmount) {
    // Any errors in validation will be added to this. If it's not empty by the end, it will be returned
    const errorArray = [];
    const arrayOfFoodCalculations = [];

    // Check for floats and round them to two decimal places.
    if (Number(formAmount) % 1 !== 0) {
        formAmount = parseFloat(formAmount).toFixed(2);
    }

    // Catch non-numbers
    if (isNaN(formAmount) || formAmount.trim() === "") {
        errorArray.push("Amount should be a number.");
    // OR catch numbers outside of range (This should cover infinity)
    } else if (formAmount < 1 || formAmount > 9999) {
        errorArray.push("Amount should be between 0 and 9999.");
    }

    // Get nutritional values from main food list so we can calculate them by amount.
    const matchingFoodCouchPath = "foods/" + formFoodID;
    return couch.get(config.baseCouchURL, matchingFoodCouchPath).then(function (foodListItemObject) {
        // Put name in final array first
        arrayOfFoodCalculations.push(foodListItemObject.name);

        // Get the values so you can loop through them by index
        const foodListValuesArray = Object.values(foodListItemObject);

        // Start at 3 to skip id, rev and name, stop 1 place before the end to skip date
        for (let foodProperty = 3; foodProperty < foodListValuesArray.length - 1; foodProperty += 1) {
            const nutritionNum = foodListValuesArray[foodProperty];
            /*
            CALCULATION:
            Times nutritional number by *100 to avoid floating point errors (basically turning grams to miligrams)
            Times that by the amount and divide by 10000 (basically divide by 100 to work out the miligrams PER amount,
            then divide by 100 again to go back to grams)
            Add each nutrition category to array sequentially and ensure it's a float rounded to two places.
            */
            arrayOfFoodCalculations.push(Number.parseFloat(nutritionNum * 100 * formAmount / 10000).toFixed(2));
        }

        // Add the three calculator page inputs to the array last
        arrayOfFoodCalculations.push(formFoodID, formType, formAmount);
    }).catch(function (err) { // Database errors
        if (err.message.indexOf("ECONNREFUSED") > 0) {
            errorArray.push("Error connecting to database.");
        }
    }).then(function () {
        // If anything in errorArray: return it, otherwise return validated fields
        if (errorArray.length > 0) {
            return {
                success: false,
                content: errorArray
            };
        }
        return {
            success: true,
            content: arrayOfFoodCalculations
        };
    });
}


function writeJSONAndAddToCalculatorList(calculatedArray) {
    // Write values into a JSON, add date
    const newJSON = {
        "name": calculatedArray[0],
        "kcalPerAmount": calculatedArray[1],
        "fatPerAmount": calculatedArray[2],
        "saturatedFatPerAmount": calculatedArray[3],
        "carbohydratesPerAmount": calculatedArray[4],
        "sugarsPerAmount": calculatedArray[5],
        "fibrePerAmount": calculatedArray[6],
        "proteinPerAmount": calculatedArray[7],
        "saltPerAmount": calculatedArray[8],
        "averageServing": calculatedArray[9],
        "foodID": calculatedArray[10],
        "type": calculatedArray[11],
        "amount": calculatedArray[12],
        "createdAt": new Date()
    };

    // Post to CouchDB
    const couchPath = "currentfood/";
    const url = config.baseCouchURL + couchPath;
    return couch.post(url, newJSON);
}


function amountValidationOnly(newAmount) {
    // Any errors in validation will be added to this. If it's not empty by the end, it will be returned
    const errorArray = [];

    // Check for floats and round them to two decimal places.
    if (Number(newAmount) % 1 !== 0) {
        newAmount = parseFloat(newAmount).toFixed(2);
    }

    // Catch non-numbers
    if (isNaN(newAmount) || newAmount.trim() === "") {
        errorArray.push("Amount should be a number.");
    // OR catch numbers outside of range (This should cover infinity)
    } else if (newAmount < 1 || newAmount > 9999) {
        errorArray.push("Amount should be between 0 and 9999.");
    }

    // Checking errors early because there's no point doing the rest if it fails validation.
    if (errorArray.length > 0) {
        return {
            success: false,
            content: errorArray
        };
    }
    return {
        success: true,
        content: newAmount
    };
}


function amountRecalculationAndPutJSON(calcListID, newAmount) {
    const calcListCouchPath = "currentfood/" + calcListID;
    return couch.get(config.baseCouchURL, calcListCouchPath).then(function (calcListItemObject) {
        // Use foodID property to find the matching item in the main foodList to get original nutrients
        const mainFoodListCouchPath = "foods/" + calcListItemObject.foodID;
        return couch.get(config.baseCouchURL, mainFoodListCouchPath).then(function (foodListItemObject) {

            // Get the values so you can loop through them by index
            const foodListValuesArray = Object.values(foodListItemObject);
            const arrayOfFoodCalculations = [];

            // Start at 3 for kcal, stop at 11 for salt.
            for (let foodProperty = 3; foodProperty < 11; foodProperty += 1) {
                const nutritionNum = foodListValuesArray[foodProperty];
                /*
                CALCULATION:
                Times nutritional number by *100 to avoid floating point errors (basically turning grams to miligrams)
                Times that by the amount and divide by 10000 (basically divide by 100 to work out the miligrams PER
                amount, then divide by 100 again to go back to grams)
                Add each nutrition category to array sequentially and ensure it's a float rounded to two places.
                */
                arrayOfFoodCalculations.push(Number.parseFloat(nutritionNum * 100 * newAmount / 10000).toFixed(2));
            }

            calcListItemObject.amount = newAmount;
            calcListItemObject.kcalPerAmount = arrayOfFoodCalculations[0];
            calcListItemObject.fatPerAmount = arrayOfFoodCalculations[1];
            calcListItemObject.saturatedFatPerAmount = arrayOfFoodCalculations[2];
            calcListItemObject.carbohydratesPerAmount = arrayOfFoodCalculations[3];
            calcListItemObject.sugarsPerAmount = arrayOfFoodCalculations[4];
            calcListItemObject.fibrePerAmount = arrayOfFoodCalculations[5];
            calcListItemObject.proteinPerAmount = arrayOfFoodCalculations[6];
            calcListItemObject.saltPerAmount = arrayOfFoodCalculations[7];

            const couchPutPath = "currentfood/";
            const url = config.baseCouchURL + couchPutPath;
            return couch.update(url, calcListItemObject._id, calcListItemObject);
        });
    });
}


function userRegistrationValidation(arrayOfUsernamePasswordAndPasswordConfirm) {
    // Any errors in validation will be added to this. If it's not empty by the end, it will be returned
    const errorArray = [];

    // check password matches passwordconfirm first
    if (arrayOfUsernamePasswordAndPasswordConfirm[1] !== arrayOfUsernamePasswordAndPasswordConfirm[2]) {
        errorArray.push("Password and confirmation must match.");
    }

    // Make sure username and password are strings, convert them if needed
    if (typeof arrayOfUsernamePasswordAndPasswordConfirm[0] !== "string") {
        try {
            arrayOfUsernamePasswordAndPasswordConfirm[0] = String(arrayOfUsernamePasswordAndPasswordConfirm[0]);
        } catch (err) {
            errorArray.push("Username should be a string value." + err);
        }
    }
    if (typeof arrayOfUsernamePasswordAndPasswordConfirm[1] !== "string") {
        try {
            arrayOfUsernamePasswordAndPasswordConfirm[1] = String(arrayOfUsernamePasswordAndPasswordConfirm[1]);
        } catch (err) {
            errorArray.push("Password should be a string value." + err);
        }
    }

    // USERNAME validation
    const username = arrayOfUsernamePasswordAndPasswordConfirm[0].trim();
    if (username === "") {
        errorArray.push("Username cannot be blank.");
    }
    if (username.length > 25) {
        errorArray.push("Username cannot be more than 25 characters in length.");
    }
    // test that name includes only alphanumeric characters with underscores (\w) and hyphens
    if (/^[\w-]+$/.test(username) === false) {
        errorArray.push("Username can only include letters, numbers, underscores and hyphens.");
    }

    // PASSWORD validation
    if (arrayOfUsernamePasswordAndPasswordConfirm[1] === "") {
        errorArray.push("Password cannot be blank.");
    }
    // Because a trillion character password could slow things down
    if (arrayOfUsernamePasswordAndPasswordConfirm[1].length > 256) {
        errorArray.push("Password cannot be more than 256 characters.");
    }

    // check username isn't already taken
    return couch.get(config.baseCouchURL, "ccusers/_design/views/_view/nameList").then(function (listOfNames) {
        // listOfNames is an object with an array called rows which has the docs in the view of users
        for (const doc of listOfNames.rows) {
            // .key property has the name in each doc using this view (and we won't distinguish uppercase and lowercase)
            if (username.toLowerCase() === doc.key.toLowerCase()) {
                errorArray.push("That username is unavailable.");
                break;
            }
        }
    }).catch(function (err) { // Database errors
        if (err.message.indexOf("ECONNREFUSED") > 0) {
            errorArray.push("Error connecting to database.");
        }
    }).then(function () {
        // SALT, THEN HASH PASSWORD, THEN SET UP JSON
        const password = arrayOfUsernamePasswordAndPasswordConfirm[1];
        const saltRounds = 12;
        const salt = bcrypt.genSaltSync(saltRounds);
        const hash = bcrypt.hashSync(password, salt);
        const hashedPassword = hash;

        // If anything in errorArray: return it, otherwise return validated fields as a JSON
        if (errorArray.length > 0) {
            return {
                success: false,
                content: errorArray
            };
        } // else no errors:
        const userJSON = {
            "username": username,
            "password": hashedPassword
        };
        return {
            success: true,
            content: userJSON
        };
    });
}


function logIn(inputUsername, inputPassword) {
    // Any errors in validation will be added to this. If it's not empty by the end, it will be returned
    const errorArray = [];

    // get list of names to loop through to try and match up and and get the hashed password
    return couch.get(config.baseCouchURL, "ccusers/_design/views/_view/nameList").then(function (listOfNames) {
        // set this flag up so we can check if it becomes true when we find the username
        let foundUsername = false;

        // listOfNames is an object with an array called rows which has the docs in the view
        for (const doc of listOfNames.rows) {
            // .key property has the name in each doc using this view (and we ignore upper/lower case)
            if (inputUsername.toLowerCase() === doc.key.toLowerCase()) {
                foundUsername = true;
                // value has the hashed password for the user
                if (bcrypt.compareSync(inputPassword, doc.value) === false) {
                    errorArray.push("Password does not match.");
                }
                break;
            }
        }

        // Check this after the for loop because then we know if it failed
        if (foundUsername === false) {
            errorArray.push("Username not on record.");
        }

    }).catch(function (err) { // Database errors
        if (err.message.indexOf("ECONNREFUSED") > 0) {
            errorArray.push("Error connecting to database.");
        }
    }).then(function () {
        if (errorArray.length > 0) {
            return {
                success: false,
                content: errorArray
            };
        } // else no errors:
        return {
            success: true
        };
    });
}



// main food list exports
module.exports.foodListValidation = foodListValidation;
module.exports.writeJSONAndAddToFoodList = writeJSONAndAddToFoodList;
module.exports.editJSONAndPutBack = editJSONAndPutBack;

// calculator list exports
module.exports.validateAndCalculateFromAmount = validateAndCalculateFromAmount;
module.exports.writeJSONAndAddToCalculatorList = writeJSONAndAddToCalculatorList;
module.exports.amountValidationOnly = amountValidationOnly;
module.exports.amountRecalculationAndPutJSON = amountRecalculationAndPutJSON;

// User page exports
module.exports.userRegistrationValidation = userRegistrationValidation;
module.exports.logIn = logIn;
