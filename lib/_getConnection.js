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
            this.__connectionP = null;
            this.getConnectionCb = connectionCb;
        },

        getConnection: function () {
            if (!this.__connection) {
                if (this.__connectionP) {
                    return this.__connectionP;
                } else {
                    var self = this;
                    return (this.__connectionP = when(this.getConnectionCb())).chain(function (connection) {
                        self.__connectionP = null;
                        self.__connection = connection;
                        return connection;
                    });
                }
            } else {
                return when(this.__connection);
            }

        },

        close: function () {
            var ret = new comb.Promise();
            if (this._defaultExchange) {
                var connection = this.__connection, exchange = this._defaultExchange;
                exchange.on("close", function (err) {
                    if (err) {
                        ret.errback(new Error("Unexpected Error closing connection"));
                    } else {
                        connection.destroy();
                        ret.callback();
                    }
                });
                exchange.on("error", ret.errback);
                exchange.close();
            } else {
                ret.callback();
            }
            return ret;
        }
    }
}).as(module);