"use strict";
var _ = require("./extended"),
    when = _.when;


_.declare({
    instance: {

        constructor: function _GetConnection() {
            this._super(arguments);
            var args = _(arguments).toArray().value(),
                connectionCb = args[args.length - 1];
            if ("function" !== typeof connectionCb) {
                throw new TypeError("Expected getConnectionCb to be last argument");
            }
            this.getConnectionCb = connectionCb;
        },

        getConnection: function () {
            return when(this.getConnectionCb());
        }
    }
}).as(module);