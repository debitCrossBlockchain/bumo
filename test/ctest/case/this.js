'use strict';

function init(input_str) {
    Chain.store('this-init', JSON.stringify(this));
}

function main(input_str) {
    Chain.store('this-main', JSON.stringify(this));
    return '';
}

function query(input_str) {
    return '';
}
