"use strict";
var comb = require("comb"),
    isHash = comb.isHash,
    merge = comb.merge;


return comb.define(null, {
    instance:{

        constructor:function _Options() {
            this._super(arguments);
            this._options = {};
            var OPTIONS = this._static.OPTIONS;
            for (var i = 0, l = OPTIONS.length; i < l; i++) {
                this._defineOption(OPTIONS[i]);
            }
        },

        _defineOption:function _defineOption(option) {
            this[option] = function defineOption(val) {
                return this.set(option, val);
            };
        },

        "set":function set(opt, value) {
            var opts = this._options;
            if (isHash(opt)) {
                merge(opts, opt);
            } else {
                opts[opt] = value;
            }
            return this;
        },

        "get":function get(opt) {
            return this._options[opt];
        },

        getters:{
            options:function () {
                return this._options;
            }
        }
    },

    "static":{
        OPTIONS:[]

    }
}).as(module);