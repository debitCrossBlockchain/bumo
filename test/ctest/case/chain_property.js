'use strict';

function init(input_str) {
    Chain.store('input_str-init', input_str);
    Chain.store('Chain.block.timestamp-init', Chain.block.timestamp.toString());
    Chain.store('Chain.block.number-init', Chain.block.number.toString());

    Chain.store('Chain.tx.initiator-init', Chain.tx.initiator);
    Chain.store('Chain.tx.sender-init', Chain.tx.sender);
    Chain.store('Chain.tx.gasPrice-init', Chain.tx.gasPrice.toString());
    Chain.store('Chain.tx.hash-init', Chain.tx.hash);
    Chain.store('Chain.tx.feeLimit-init', Chain.tx.feeLimit.toString());

    Chain.store('Chain.msg.initiator-init', Chain.msg.initiator);
    Chain.store('Chain.msg.sender-init', Chain.msg.sender);
    Chain.store('Chain.msg.coinAmount-init', Chain.msg.coinAmount.toString());
    Chain.store('Chain.msg.nonce-init', Chain.msg.nonce.toString());
    Chain.store('Chain.msg.operationIndex-init', Chain.msg.operationIndex.toString());
    Chain.store('Chain.thisAddress-init', Chain.thisAddress.toString());

    Utils.assert(Chain.msg.asset === undefined);
}

function main(input_str) {

    if (input_str === 'paycoin') {
        Chain.store('input_str-main', input_str);
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

        Utils.assert(Chain.msg.asset === undefined);
    }

    if (input_str === 'payasset') {
        Chain.store('input_str-main', input_str);
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
        Chain.store('Chain.msg.asset-main', JSON.stringify(Chain.msg.asset));

        Chain.store('Chain.thisAddress-main', Chain.thisAddress.toString());
    }

    return '';
}

function query(input_str) {
    return '';
}
