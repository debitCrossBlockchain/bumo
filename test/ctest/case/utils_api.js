'use strict';

function init(input_str) {
    Chain.store('init', input_str);
    Utils.assert(Chain.msg.asset === undefined);
    Utils.log('aaaa');
}

function main(input_str) {
    Utils.log('aaa');

    if (input_str === 'stoI64Check') {
        Chain.store('stoI64Check-0', Utils.stoI64Check('12345678912345').toString());
        Chain.store('stoI64Check-1', Utils.stoI64Check('a').toString());
    }
    
    if (input_str === 'int64Add-0') {
        Chain.store('int64Add-0', Utils.int64Add('1000', 4000).toString());
    }

    if (input_str === 'int64Add-1') {
        Chain.store('int64Add-1', Utils.int64Add('a', 4000).toString());
    }

    if (input_str === 'int64Sub-0') {
        Chain.store('int64Sub-0', Utils.int64Sub('6000', 1000).toString());
    }

    if (input_str === 'int64Sub-1') {
        Chain.store('int64Sub-1', Utils.int64Sub('a', 4000).toString());
    }

    if (input_str === 'int64Mul-0') {
        Chain.store('int64Mul-0', Utils.int64Mul('1000', 5).toString());
    }

    if (input_str === 'int64Mul-1') {
        Utils.int64Sub('a', 4000);
    }

    if (input_str === 'int64Mod-0') {
        Chain.store('int64Mod-0', Utils.int64Mod('5000', 100000).toString());
    }

    if (input_str === 'int64Mod-1') {
        Utils.int64Mod('a', 4000);
    }

    if (input_str === 'int64Div-0') {
        Chain.store('int64Div-0', Utils.int64Div('5000', 1).toString());
    }

    if (input_str === 'int64Div-1') {
        Utils.int64Div('a', 4000);
    }

    if (input_str === 'int64Div-2') {
        Utils.int64Div('5000', 0);
    }

    if (input_str === 'int64Compare-0') {
        Chain.store('int64Compare-0', Utils.int64Compare('5000', 10).toString());
    }

    if (input_str === 'int64Compare-1') {
        Utils.int64Compare('a', 4000);
    }

    if (input_str === 'assert') {
        Utils.assert(false);
    }

    if (input_str === 'sha256-0') {
        Chain.store('sha256-0', Utils.sha256('61626364'));
    }

    if (input_str === 'sha256-1') {
        Chain.store('sha256-1', Utils.sha256('61626365a').toString());
    }

    if (input_str === 'ecVerify-0') {
        Chain.store('ecVerify-0', Utils.ecVerify('3471aceac411975bb83a22d7a0f0499b4bfcb504e937d29bb11ea263b5f657badb40714850a1209a0940d1ccbcfc095c4b2d38a7160a824a6f9ba11f743ad80a', 'b0014e28b305b56ae3062b2cee32ea5b9f3eccd6d738262c656b56af14a3823b76c2a4adda3c', 'abcd', 1).toString());
    }

    if (input_str === 'ecVerify-1') {
        Chain.store('ecVerify-1', Utils.ecVerify('aaaa', 'b0014e28b305b56ae3062b2cee32ea5b9f3eccd6d738262c656b56af14a3823b76c2a4adda3c', 'abcd', 1).toString());
    }

    if (input_str === 'toBaseUnit-0') {
        Chain.store('toBaseUnit-0', Utils.toBaseUnit('1'));
    }

    if (input_str === 'toBaseUnit-1') {
        Chain.store('toBaseUnit-1', Utils.toBaseUnit('a'));
    }

    if (input_str === 'addressCheck-0') {
        Chain.store('addressCheck-0', Utils.addressCheck('buQgmhhxLwhdUvcWijzxumUHaNqZtJpWvNsf').toString());
    }

    if (input_str === 'addressCheck-1') {
        Chain.store('addressCheck-1', Utils.addressCheck('a').toString());
    }

    if (input_str === 'toAddress-0') {
        Chain.store('toAddress-0', Utils.toAddress('b0016ebe6191f2eb73a4f62880b2874cae1191183f50e1b18b23fcf40b75b7cd5745d671d1c8'));
    }

    if (input_str === 'toAddress-1') {
        Chain.store('toAddress-1', Utils.toAddress('a').toString());
    }

    return '';
}

function query(input_str) {
    return '';
}
