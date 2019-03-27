'use strict';

function init(input_str) {
    Utils.assert(Chain.msg.asset === undefined);
}

//first,address-1,address-2,address-3
function main(input_str) {
    let a = input_str.split(',');
    if (a[0] === '1') {
        Chain.store('init-main', input_str);
        let str = input_str;
        let result = str.replace('1', '2');
        Chain.store('init-main-1', result);
        Chain.contractCall(a[1], true, '123', result);
    }

    if (a[0] === '2') {
        Chain.store('init-main', input_str);
        let str_2 = input_str;
        let result_2 = str_2.replace('2', '3');
        Chain.store('init-main-2', result_2);
        Chain.contractCall(a[2], true, '123', result_2);
    }

    if (a[0] === '3') {
        Chain.store('init-main', input_str);
        let str_3 = input_str;
        let result_3 = str_3.replace('3', '4');
        Chain.store('init-main-3', result_3);
        Chain.contractCall(a[3], true, '123', result_3);

        Chain.store('Chain.block.timestamp-main', Chain.block.timestamp.toString());
        Chain.store('Chain.block.number-main', Chain.block.number.toString());

        Chain.store('Chain.tx.initiator-main', Chain.tx.initiator);
        Chain.store('Chain.tx.sender-main', Chain.tx.sender);
        Chain.store('Chain.tx.gasPrice-main', Chain.tx.gasPrice.toString());
        Chain.store('Chain.tx.hash-main', Chain.tx.hash);
        Chain.store('Chain.tx.feeLimit-main', Chain.tx.feeLimit.toString());

        Chain.store('Chain.msg.initiator-main', Chain.msg.initiator);
        Chain.store('Chain.msg.sender-main', Chain.msg.sender);
        Chain.store('Chain.msg.coinAmount-main', Chain.msg.coinAmount.toString());
        Chain.store('Chain.msg.nonce-main', Chain.msg.nonce.toString());
        Chain.store('Chain.msg.operationIndex-main', Chain.msg.operationIndex.toString());
        Chain.store('Chain.thisAddress-main', Chain.thisAddress.toString());

        if (Chain.msg.asset !== undefined) {
            Chain.store('Chain.msg.asset-main', JSON.stringify(Chain.msg.asset));
        }
    }

    if (a[0] === '4') {
        if (a[4] !== undefined) {
            Chain.store('init-main-4', input_str);
        }
    }

    return '';
}

function query(input_str) {
    return '';
}
