#!/usr/bin/env node
"use strict";
// Setup Couch
const couch = require("./couchFunctions.js");
const baseURL = "http://127.0.0.1:5984/";
// THIS SHOULD BE IN A CONFIG FILE


function validator(arrayOf10Fields) {
    let error = "";
    // Logs error and exits
    function errorOutFunc() {
        console.log(error);
        process.exit();
    }

    // Argument amount check (must be 10)
    if (arrayOf10Fields.length < 10 || arrayOf10Fields.length > 10) {
        error = "Too many or too few arguments supplied to function. Should be 10.";
        console.log(arguments);
        errorOutFunc();
    }

    // Name validation (MANDATORY FIELD)
    if (typeof arrayOf10Fields[0] !== "string") {
        try {
            arrayOf10Fields[0] = String(arrayOf10Fields[0]);
        } catch (err) {
            error = "Food name should be a string value." + err;
            errorOutFunc();
        }
    }
    if (arrayOf10Fields[0].trim() === "") {
        error = "Food name should not be blank.";
        errorOutFunc();
    }

    // check numbers
    for (let argNumber = 1; argNumber < arrayOf10Fields.length; argNumber += 1) {
        // Check for floats and round them to two decimal places.
        if (typeof arrayOf10Fields[argNumber] === "number" && arrayOf10Fields[argNumber] % 1 !== 0) {
            arrayOf10Fields[argNumber] = parseFloat(arrayOf10Fields[argNumber].toFixed(2));
        }

        // Catch empties and note them
        if (String(arrayOf10Fields[argNumber]).trim() === "") {
            arrayOf10Fields[argNumber] = "";
        // OR catch non-numbers
        } else if (isNaN(arrayOf10Fields[argNumber])) {
            error = "Input #" + [argNumber] + " should be a number.";
            errorOutFunc();
        // OR catch ints/floats outside of range (This should cover infinity)
        } else if (arrayOf10Fields[argNumber] < 0 || arrayOf10Fields[argNumber] > 9999) {
            error = "Input #" + [argNumber] + " should be between 0 and 9999.";
            errorOutFunc();
        }
    }

    return arrayOf10Fields;
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


module.exports.validator = validator;
module.exports.addFood = addFood;
module.exports.editFood = editFood;
