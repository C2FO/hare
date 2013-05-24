"use strict";
var _ = require("./extended"),
    isHash = _.isHash,
    merge = _.merge;


_.declare({
    instance: {

        constructor: function _Options() {
            this._super(arguments);
            this._options = {};
            var OPTIONS = this._static.OPTIONS;
            for (var i = 0, l = OPTIONS.length; i < l; i++) {
                this._defineOption(OPTIONS[i]);
            }
        },

        _defineOption: function _defineOption(option) {
            this[option] = function defineOption(val) {
                return this.set(option, val);
            }.bind(this);
        },

        "set": function set(opt, value) {
            var opts = this._options;
            if (isHash(opt)) {
                merge(opts, opt);
            } else {
                opts[opt] = value;
            }
            return this;
        },

        "get": function get(opt) {
            if (_.isIn(opt, this._static.OPTIONS)) {
                return this._options[opt];
            } else {
                return this._super(arguments);
            }
        },

        getters: {
            options: function () {
                return this._options;
            }
        }
    },

    "static": {
        OPTIONS: []

    }
}).as(module);