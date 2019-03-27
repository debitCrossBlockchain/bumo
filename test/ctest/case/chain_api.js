'use strict';

function init(input_str) {
    Chain.store('init', input_str);
    Utils.assert(Chain.msg.asset === undefined);
}

function main(input_str) {

    if (input_str === 'getBalance') {
        let balance_1 = Chain.getBalance('1231');
        Chain.store('getBalance-0', balance_1);

        let balance_2 = Chain.getBalance(Chain.thisAddress);
        Chain.store('getBalance-1', balance_2);
    }

    if (input_str === 'load') {
        let value = Chain.load('init');
        Chain.store('init-main-0', value);

        value = Chain.load('init-null');
        Chain.store('init-main-1', value.toString());
    }

    if (input_str === 'del') {
        Chain.del('init-main-0');
        Chain.del('init-main-1');
    }

    if (input_str === 'getBlockHash') {
        let hash = Chain.getBlockHash(0);
        Chain.store('getBlockHash', hash);
    }

    if (input_str === 'tlog') {
        let tlogResult = Chain.tlog('tlog', 'bbbbbbbbbbbbbb');
        Chain.store('tlog', tlogResult.toString());
    }

    if (input_str === 'getValidators') {
        let validators = Chain.getValidators();
        Chain.store('getValidators', JSON.stringify(validators));
    }

    if (input_str === 'getAccountMetadata') {
        let meta_1 = Chain.getAccountMetadata(Chain.thisAddress, 'hello');
        Chain.store('getAccountMetadata-0', meta_1.toString());

        let meta_2 = Chain.getAccountMetadata(Chain.thisAddress, 'init');
        Chain.store('getAccountMetadata-1', meta_2.toString());
    }

    if (input_str === 'payasset') {
        Chain.store('asset-key', JSON.stringify(Chain.msg.asset));
    }

    if (input_str === 'getAccountAsset') {
        let asset_0 = Chain.getAccountAsset(Chain.thisAddress, 'hello');
        Chain.store('getAccountAsset-0', asset_0.toString());

        let asset_json = { 'issuer': 'buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY', 'code': 'bu' };
        let asset_1 = Chain.getAccountAsset(Chain.thisAddress, asset_json);
        Chain.store('getAccountAsset-1', asset_1.toString());

        let asset_json_2 = JSON.parse(Chain.load('asset-key'));
        let asset_2 = Chain.getAccountAsset(Chain.thisAddress, asset_json_2.key);
        Chain.store('getAccountAsset-2', asset_2);
    }

    if (input_str === 'configFee') {
        Chain.configFee('hello');
    }

    if (input_str === 'setValidators') {
        Chain.setValidators('hello');
    }

    if (input_str === 'payCoin') {
        let balance_3 = Chain.getBalance('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY');
        Chain.payCoin('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY', Chain.msg.coinAmount);
        let balance_4 = Chain.getBalance('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY');
        Chain.store('getBalance-3', int64Sub(balance_4, balance_3));
    }

    if (input_str === 'issueAsset' || input_str === 'payAsset') {
        Chain.issueAsset('bu-test', '30000000');
        Chain.payAsset('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY', Chain.thisAddress, 'bu-test', '20000000');

        let asset_json_3 = { 'issuer': '', 'code': 'bu-test' };
        asset_json_3.issuer = Chain.thisAddress;
        let asset_3 = Chain.getAccountAsset('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY', asset_json_3);
        Chain.store('payAsset', asset_3);
    }

    return '';
}

function query(input_str) {
    return '';
}
