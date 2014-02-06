"use strict";
var comb = require("comb"),
    when = comb.when;


return comb.define(null, {
    instance: {

        constructor: function _GetConnection() {
            this._super(arguments);
            var args = comb(arguments).toArray(),
                connectionCb = args[args.length - 1];
            if ("function" !== typeof connectionCb) {
                throw new TypeError("Expected getConnectionCb to be last argument");
            }
            this.__connection = null;
            this.getConnectionCb = connectionCb;
        },

        getConnection: function () {
            if (!this.__connection) {
                var self = this;
                return when(this.getConnectionCb()).chain(function (connection) {
                    self.__connection = connection;
                    return connection;
                });
            } else {
                return when(this.__connection);
            }

        }
    }
}).as(module);