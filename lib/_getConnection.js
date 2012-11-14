"use strict";
var comb = require("comb"),
    when = comb.when;


return comb.define(null, {
    instance:{

        constructor:function _GetConnection() {
            this._super(arguments);
            var args = comb(arguments).toArray(),
                connectionCb = args[args.length - 1];
            if ("function" !== typeof connectionCb) {
                throw new TypeError("Expected getConnectionCb to be last argument");
            }
            this.getConnectionCb = connectionCb;
        },

        getConnection:function () {
            return when(this.getConnectionCb());
        }
    }
}).as(module);