#!/usr/bin/env node
"use strict";
// Setup Couch
const couch = require("./couchFunctions.js");
const baseURL = "http://127.0.0.1:5984/";
// THIS SHOULD BE IN A CONFIG FILE


function validator(arrayOf10Fields) {
    // Empty error array to check later
    const errorArray = [];

    // Argument amount check (must be 10)
    if (arrayOf10Fields.length < 10 || arrayOf10Fields.length > 10) {
        errorArray.push("Too many or too few arguments supplied to function. Should be 10.");
    }

    // Name validation (MANDATORY FIELD)
    if (typeof arrayOf10Fields[0] !== "string") {
        try {
            arrayOf10Fields[0] = String(arrayOf10Fields[0]);
        } catch (err) {
            errorArray.push("Food name should be a string value." + err);
        }
    }
    if (arrayOf10Fields[0].trim() === "") {
        errorArray.push("Food name should not be blank.");
    }

    // check numbers
    for (let argNumber = 1; argNumber < arrayOf10Fields.length; argNumber += 1) {
        // Check for floats and round them to two decimal places.
        if (Number(arrayOf10Fields[argNumber]) % 1 !== 0) {
            arrayOf10Fields[argNumber] = parseFloat(arrayOf10Fields[argNumber]).toFixed(2);
        }

        // Catch empties and note them
        if (String(arrayOf10Fields[argNumber]).trim() === "") {
            arrayOf10Fields[argNumber] = "";
        // OR catch non-numbers
        } else if (isNaN(arrayOf10Fields[argNumber])) {
            errorArray.push("Input #" + [argNumber + 1] + " should be a number.");
        // OR catch ints/floats outside of range (This should cover infinity)
        } else if (arrayOf10Fields[argNumber] < 0 || arrayOf10Fields[argNumber] > 9999) {
            errorArray.push("Input #" + [argNumber + 1] + " should be between 0 and 9999.");
        }
    }

    // If anything in errorArray: return it, otherwise return validated fields
    if (errorArray.length > 0) {
        console.log(errorArray);
        return {
            outcome: false,
            content: errorArray
        };
    }
    return {
        outcome: true,
        content: arrayOf10Fields
    };
}


// Preps and POSTs json to database
function addFood(arrayOf10Fields) {
    // Stick trimmed and checked values into a JSON
    const newJSON = {
        "name": arrayOf10Fields[0].trim(),
        "kcalPer100": arrayOf10Fields[1],
        "fatPer100": arrayOf10Fields[2],
        "saturatedFatPer100": arrayOf10Fields[3],
        "carbohydratesPer100": arrayOf10Fields[4],
        "sugarsPer100": arrayOf10Fields[5],
        "fibrePer100": arrayOf10Fields[6],
        "proteinPer100": arrayOf10Fields[7],
        "saltPer100": arrayOf10Fields[8],
        "averageServing": arrayOf10Fields[9],
        "createdAt": new Date()
    };

    const couchPath = "foods/";
    const url = baseURL + couchPath;
    // Actual add request
    return couch.post(url, newJSON);
}


// Preps and PUTs json to database
function editFood(arrayOf10Fields, oldJSON) {
    // modify old json properties with new array info
    oldJSON.name = arrayOf10Fields[0].trim();
    oldJSON.kcalPer100 = arrayOf10Fields[1];
    oldJSON.fatPer100 = arrayOf10Fields[2];
    oldJSON.saturatedFatPer100 = arrayOf10Fields[3];
    oldJSON.carbohydratesPer100 = arrayOf10Fields[4];
    oldJSON.sugarsPer100 = arrayOf10Fields[5];
    oldJSON.fibrePer100 = arrayOf10Fields[6];
    oldJSON.proteinPer100 = arrayOf10Fields[7];
    oldJSON.saltPer100 = arrayOf10Fields[8];
    oldJSON.averageServing = arrayOf10Fields[9];

    const couchPath = "foods/";
    const url = baseURL + couchPath;
    // Actual add request (Linter doesn't like Couch underscores, is non issue)
    return couch.update(url, oldJSON._id, oldJSON);
}


function calcValidator(formFoodID, formType, formAmount) {
    // Empty error array to check later
    const errorArray = [];
    const arrayOfFoodCalculations = [];

    // Check for floats and round them to two decimal places.
    if (Number(formAmount) % 1 !== 0) {
        formAmount = parseFloat(formAmount).toFixed(2);
    }

    // Catch non-numbers
    if (isNaN(formAmount) || formAmount.trim() === "") {
        errorArray.push("Amount should be a number.");
    // OR catch ints/floats outside of range (This should cover infinity)
    } else if (formAmount < 1 || formAmount > 9999) {
        errorArray.push("Amount should be between 0 and 9999.");
    }


    couch.get(baseURL, "foods/_design/viewByName/_view/viewByNames").then(function (foodList) {
        // Loops through foodList IDs to find a match with the one added to the calculator
        for (let foodNum = 0; foodNum < foodList.rows.length; foodNum += 1) {
            if (foodList.rows[foodNum].id === formFoodID) {
                // Add food name at top of empty array intended for output
                arrayOfFoodCalculations.push(foodList.rows[foodNum].value[0]);

                // ACTUAL CALCULATION
                // Times nutritional number by *100 to avoid floating point errors, turning grams to miligrams
                // Times that by the amount input and divide by 10000
                // (Basically divide by 100 to work out the miligrams PER amount, then / 100 again to go back to grams)
                // Add each nutrition category to array sequentially and ensure it's a float rounded to two places.
                for (let foodProperty = 1; foodProperty < foodList.rows[foodNum].value.length; foodProperty += 1) {
                    const nutritionNum = foodList.rows[foodNum].value[foodProperty];
                    arrayOfFoodCalculations.push(Number.parseFloat(nutritionNum * 100 * formAmount / 10000).toFixed(2));
                }

                // Add the three inputs to the array last (so that 0-9 is consistent with uncalculated food entries)
                arrayOfFoodCalculations.push(formFoodID, formType, formAmount);
                console.log("THING: " + arrayOfFoodCalculations);
                break;
            }

            // This should never happen, but just in case, at the end of the outermost for loop:
            if (foodNum === foodList.rows.length) {
                errorArray.push("Could not find matching food in database.");
            }
        }

    }).catch(function (err) {
        if (err.message.indexOf("ECONNREFUSED") > 0) {
            errorArray.push("Error connecting to database.");
        }
    }).then(function () {
        // If anything in errorArray: return it, otherwise return validated fields
        if (errorArray.length > 0) {
            console.log(errorArray);
            return {
                outcome: false,
                content: errorArray
            };
        }
        return {
            outcome: true,
            content: arrayOfFoodCalculations
        };
    });
}


// Preps and POSTs json to database
function addToCalc(calculatedArray) {

    console.log("ADDTOCALC " + calculatedArray);

    // Stick trimmed and checked values into a JSON
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

    const couchPath = "currentfood/";
    const url = baseURL + couchPath;
    // Actual add request
    return couch.post(url, newJSON);
}


module.exports.validator = validator;
module.exports.addFood = addFood;
module.exports.editFood = editFood;

module.exports.calcValidator = calcValidator;
module.exports.addToCalc = addToCalc;
