'use strict';

function init(input_str) {
    Utils.assert(Chain.msg.asset === undefined);
}

//first,address-1,address-2,address-3
function main(input_str) {
    let ret = Chain.contractCreate(toBaseUnit('10'), 0, input_str, '');
    Chain.store('address', ret);
    let address_2 = Chain.contractQuery(ret, '').result;
    Chain.store('address_2', ret);
    return '';
}

function query(input_str) {
    return '';
}
