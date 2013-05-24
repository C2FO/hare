module.exports = require("extended")()
    .register(require("is-extended"))
    .register(require("object-extended"))
    .register(require("arguments-extended"))
    .register(require("string-extended"))
    .register(require("promise-extended"))
    .register(require("promise-utils"))
    .register("declare", require("declare.js"));