'use strict';

function init(input_str) {
    Utils.assert(Chain.msg.asset === undefined);
}

//first,address-1,address-2,address-3
function main(input_str) {
    let a = input_str.split(',');
    if (a[0] === '1') {
        let str = input_str;
        let result = str.replace('1', '2');
        Chain.store('main', JSON.stringify(Chain.delegateQuery(Chain.thisAddress, result)));
    }
    return '';
}

function query(input_str) {
    let a = input_str.split(',');
    if (a[0] === '2') {
        let str_1 = input_str;
        let result_1 = str_1.replace('2', '3');
        return Chain.delegateQuery(a[1], result_1).result;
    }

    if (a[0] === '3') {
        if (a[3] === undefined) {
            return Chain.thisAddress;
        }

        let str_3 = input_str;
        let result_3 = str_3.replace('3', '4');
        return Chain.delegateQuery(a[2], result_3).result;
    }

    if (a[0] === '4') {
        if (a[4] === undefined) {
            let my_result = Chain.block.timestamp.toString() + Chain.block.number.toString();
            my_result = my_result + Chain.tx.initiator + Chain.tx.sender + Chain.tx.gasPrice.toString() + Chain.tx.hash + Chain.tx.feeLimit.toString();
            my_result = my_result + Chain.msg.initiator + Chain.msg.sender + Chain.msg.nonce.toString() + Chain.msg.operationIndex.toString() + Chain.thisAddress.toString();
            my_result = my_result + Chain.thisAddress;
            return my_result;
        }

        let str_4 = input_str;
        let result_4 = str_4.replace('4', '5');
        return Chain.delegateQuery(a[3], result_4).result;
        
    }

    if (a[0] === '5') {
        return '';
    }

    return '';
}
