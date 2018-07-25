"use strict";
// Fetch required to actually interact with CouchDB via HTTP
const fetch = require("node-fetch");


/*
Get/Read
e.g. get("http://127.0.0.1:5984/foods/", "_design/viewByName/_view/viewByNames");
This is the only func that (optionally) takes two parts of a URL. Inconsistent, but it makes the other files neater.
*/
function get(url, path) {
    // Will join URL and path if two arguments, or just use a single full URL if only one argument.
    if (path) {
        url += path;
    }

    return fetch(url)
        .then(function (response) {
            return response.json();
        }).then(function (body) {
            return body;
        });
}


/*
Post/Create
e.g. post("http://127.0.0.1:5984/foods/", newjson);
*/
function post(url, data) {
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    }).then(function (response) {
        response.json();
    }).then(function (body) {
        return body;
    });
}


/*
Put/Update
e.g. update("http://127.0.0.1:5984/foods/", "d3e8a273c00ad1e5a732b5778a000e8e", newerjson);
*/
function update(url, id, data) {
    const updateURL = url + id;

    return fetch(updateURL, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    }).then(function (response) {
        response.json().then(function (body) {
            return body;
        });
    });
}


/*
Delete
e.g. docDelete(
    "http://127.0.0.1:5984/foods/", "d3e8a273c00ad1e5a732b5778a000e8e", "2-123a5506374b1b4995c570100c64222c"
);
*/
function docDelete(url, id, rev) {
    const deleteURL = url + id + "?rev=" + rev;

    return fetch(deleteURL, {
        method: "DELETE"
    }).then(function (response) {
        response.json().then(function (body) {
            return body;
        });
    });
}


module.exports.get = get;
module.exports.post = post;
module.exports.update = update;
module.exports.docDelete = docDelete;


// Uncomment below for CLI use (janky implementation)
// require("make-runnable");
