"use strict";
const fetch = require("node-fetch");


// Get/Read
// e.g. get("http://127.0.0.1:5984/foods/", "_design/viewByName/_view/viewByNames");
function get(url, path) {
    // Can fetch with a single argument of a full URL, or by putting two pieces together, say from a config file
    if (path) {
        url += path;
    }

    return fetch(url)
        .then(function (response) {
            return response.json();
        }).then(function (body) {
            if (body.error) {
                console.log("HELP Error: " + body.error);
                // Should exit or throw here
            }
            return body;
        });
}


// Post/Create
// e.g. post("http://127.0.0.1:5984/foods/", "d3e8a273c00ad1e5a732b5778a000e8e", newjson);
function post(url, data) {
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    }).then(function (response) {
        response.json();
    }).then(function (body) {
        // if (body.error) {
        //     // throw new Error(body.reason || body.error);
        //     console.log("Error hit on FETCH POST");
        // }
        console.log("Successfully added to database.");
        return body;
    });
}
// });
//             console.log("Successfully added to database.");
//             return body;
//         );
//     }) .catch(function (reason) {
//         console.log("Horrible error:" + reason);
//         // Should exit or throw here
//     });
// }


// Delete
// e.g. docDelete(
//     "http://127.0.0.1:5984/foods/", "d3e8a273c00ad1e5a732b5778a000e8e", "2-123a5506374b1b4995c570100c64222c"
// );
function docDelete(url, id, rev) {
    const deleteurl = url + id + "?rev=" + rev;

    return fetch(deleteurl, {
        method: "DELETE"
    }).then(function (response) {
        response.json().then(function (body) {
            if (body.error) {
                console.log("Hit error thingy");
                // throw new Error(body.reason || body.error);
            }
            return body;
        });
    });
}


// Put/Update
// e.g. update("http://127.0.0.1:5984/foods/", "d3e8a273c00ad1e5a732b5778a000e8e", newjson);
function update(url, id, data) {
    const updateurl = url + id;

    return fetch(updateurl, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    }).then(function (response) {
        response.json().then(

            // edited this in to find Couch error (Even though capital E error is a class from simple-errors on NPM)
            body => {
                if (body.error) {
                    throw new Error(body.reason || body.error);
                }
                return body;
            });
    });
}
//             console.log("Successfully updated database entry.")
//         );
//     }) .catch(function (reason) {
//         console.log("Horrible error:" + reason);
//         // Should exit or throw here
//     });
// }


module.exports.get = get;
module.exports.post = post;
module.exports.docDelete = docDelete;
module.exports.update = update;

require("make-runnable");
