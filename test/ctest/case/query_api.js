'use strict';

function init(input_str) {
    Chain.store('init', input_str);
    return '';
}

function main(input_str) {
    if (input_str === 'load') {
        Chain.store('load', JSON.stringify(Chain.delegateQuery(Chain.thisAddress, input_str)));
    }

    if (input_str === 'store') {
        Chain.store('store', JSON.stringify(Chain.delegateQuery(Chain.thisAddress, input_str)));
    }

    if (input_str === 'del') {
        Chain.store('del', JSON.stringify(Chain.delegateQuery(Chain.thisAddress, input_str)));
    }

    if (input_str === 'getBlockHash') {
        Chain.store('getBlockHash', JSON.stringify(Chain.delegateQuery(Chain.thisAddress, input_str)));
    }

    if (input_str === 'tlog') {
        Chain.store('tlog', JSON.stringify(Chain.delegateQuery(Chain.thisAddress, input_str)));
    }

    if (input_str === 'getValidators') {
        Chain.store('getValidators', JSON.stringify(Chain.delegateQuery(Chain.thisAddress, input_str)));
    }

    if (input_str === 'getAccountMetadata') {
        Chain.store('getAccountMetadata', JSON.stringify(Chain.delegateQuery(Chain.thisAddress, input_str)));
    }

    return '';
}

function query(input_str) {
    if (input_str === 'load') {
        return Chain.load('init');
    }

    if (input_str === 'store') {
        return Chain.store('init', 'hello');
    }

    if (input_str === 'del') {
        return Chain.del('init');
    }

    if (input_str === 'getBlockHash') {
        return Chain.getBlockHash(0);
    }

    if (input_str === 'tlog') {
        return Chain.tlog(0);
    }

    if (input_str === 'getValidators') {
        return JSON.stringify(Chain.getValidators());
    }

    if (input_str === 'getAccountMetadata') {
        return Chain.getAccountMetadata(Chain.thisAddress, 'init');
    }

    return '';
}
