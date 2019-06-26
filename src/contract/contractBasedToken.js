'use strict';
const administrators = 'buQnZpHB7sSW2hTG9eFefYpeCVDufMdmmsBF';

const CONTRACT_STATUS = {
    INIT: 'INIT',
    FROZEN: 'FROZEN',
    END: 'END'
};


function checkContractEnable() {
    let status = storageLoad('headers_status');
    if (status === null) {
        throw 'Contract status unknown';
    }

    if (status !== CONTRACT_STATUS.INIT) {
        throw 'Contract status unavailable';
    }

    return true;
}


function modifyContractStatus(input) {

    let status = storageLoad('headers_status');
    if (status === null) {
        throw 'Contract status unknown';
    }

    if (status === CONTRACT_STATUS.END) {
        throw 'The contract has been destroyed';
    }


    if (sender !== administrators) {
        throw 'Only administrators have the right to modify';
    }

    let bFlag = input.status===CONTRACT_STATUS.INIT||input.status===CONTRACT_STATUS.FROZEN||input.status===CONTRACT_STATUS.END;

    if(bFlag!==true){
        throw 'The state to be set does not exist';
    }

    storageStore('headers_status', input.status);
}


let globalAttribute = {};
const globalAttributeKey = 'global_attribute';

function makeAllowanceKey(owner, spender){
    return 'allow_' + owner + '_to_' + spender;
}

function approve(spender, value){
    assert(addressCheck(spender) === true, 'Arg-spender is not a valid address.');
    assert(stoI64Check(value) === true, 'Arg-value must be alphanumeric.');
    assert(int64Compare(value, '0') > 0, 'Arg-value of spender ' + spender + ' must be greater than 0.');

    let key = makeAllowanceKey(sender, spender);
    storageStore(key, value);

    tlog('approve', sender, spender, value);

    return true;
}

function allowance(owner, spender){
    assert(addressCheck(owner) === true, 'Arg-owner is not a valid address.');
    assert(addressCheck(spender) === true, 'Arg-spender is not a valid address.');

    let key = makeAllowanceKey(owner, spender);
    let value = storageLoad(key);
    assert(value !== false, 'Failed to get the allowance given to ' + spender + ' by ' + owner + ' from metadata.');

    return value;
}

function transfer(to, value){
    assert(addressCheck(to) === true, 'Arg-to is not a valid address.');
    assert(stoI64Check(value) === true, 'Arg-value must be alphanumeric.');
    assert(int64Compare(value, '0') > 0, 'Arg-value must be greater than 0.');
    if(sender === to) {
        tlog('transfer', sender, to, value);  
        return true;
    }
    
    let senderValue = storageLoad(sender);
    assert(senderValue !== false, 'Failed to get the balance of ' + sender + ' from metadata.');
    assert(int64Compare(senderValue, value) >= 0, 'Balance:' + senderValue + ' of sender:' + sender + ' < transfer value:' + value + '.');

    let toValue = storageLoad(to);
    toValue = (toValue === false) ? value : int64Add(toValue, value); 
    storageStore(to, toValue);

    senderValue = int64Sub(senderValue, value);
    storageStore(sender, senderValue);

    tlog('transfer', sender, to, value);

    return true;
}

function transferFrom(from, to, value){
    assert(addressCheck(from) === true, 'Arg-from is not a valid address.');
    assert(addressCheck(to) === true, 'Arg-to is not a valid address.');
    assert(stoI64Check(value) === true, 'Arg-value must be alphanumeric.');
    assert(int64Compare(value, '0') > 0, 'Arg-value must be greater than 0.');
    
    if(from === to) {
        tlog('transferFrom', sender, from, to, value);
        return true;
    }
    
    let fromValue = storageLoad(from);
    assert(fromValue !== false, 'Failed to get the value, probably because ' + from + ' has no value.');
    assert(int64Compare(fromValue, value) >= 0, from + ' Balance:' + fromValue + ' < transfer value:' + value + '.');

    let allowValue = allowance(from, sender);
    assert(int64Compare(allowValue, value) >= 0, 'Allowance value:' + allowValue + ' < transfer value:' + value + ' from ' + from + ' to ' + to  + '.');

    let toValue = storageLoad(to);
    toValue = (toValue === false) ? value : int64Add(toValue, value); 
    storageStore(to, toValue);

    fromValue = int64Sub(fromValue, value);
    storageStore(from, fromValue);

    let allowKey = makeAllowanceKey(from, sender);
    allowValue   = int64Sub(allowValue, value);
    storageStore(allowKey, allowValue);

    tlog('transferFrom', sender, from, to, value);

    return true;
}

function balanceOf(address){
    assert(addressCheck(address) === true, 'Arg-address is not a valid address.');

    let value = storageLoad(address);
    assert(value !== false, 'Failed to get the balance of ' + address + ' from metadata.');
    return value;
}

function init(init_input){
    let params = JSON.parse(init_input).params;

    assert(stoI64Check(params.totalSupply) === true && params.totalSupply > 0 &&
           typeof params.name === 'string' && params.name.length > 0 &&
           typeof params.symbol === 'string' && params.symbol.length > 0 &&
           typeof params.decimals === 'number' && params.decimals >= 0, 
           'Failed to check args');
       
    globalAttribute.totalSupply = params.totalSupply;
    globalAttribute.name = params.name;
    globalAttribute.symbol = params.symbol;
    globalAttribute.version = 'ATP20';
    globalAttribute.decimals = params.decimals;


    storageStore('headers_status', CONTRACT_STATUS.INIT);
    
    storageStore(globalAttributeKey, JSON.stringify(globalAttribute));
    storageStore(sender, globalAttribute.totalSupply);
}

function main(input_str){
    let input = JSON.parse(input_str);

    if(input.method!== 'modifyContractStatus'){
       checkContractEnable();
    }

    if(input.method === 'modifyContractStatus'){
        modifyContractStatus(input);
    }
    else if(input.method === 'transfer'){
        transfer(input.params.to, input.params.value);
    }
    else if(input.method === 'transferFrom'){
        transferFrom(input.params.from, input.params.to, input.params.value);
    }
    else if(input.method === 'approve'){
        approve(input.params.spender, input.params.value);
    }
    else{
        throw '<Main interface passes an invalid operation type>';
    }
}

function query(input_str){
    checkContractEnable();

    let result = {};
    let input  = JSON.parse(input_str);

    if(input.method === 'tokenInfo'){
        globalAttribute = JSON.parse(storageLoad(globalAttributeKey));
        result.tokenInfo = globalAttribute;
    }
    else if(input.method === 'allowance'){
        result.allowance = allowance(input.params.owner, input.params.spender);
    }
    else if(input.method === 'balanceOf'){
        result.balance = balanceOf(input.params.address);
    }
    else{
        throw '<Query interface passes an invalid operation type>';
    }
    return JSON.stringify(result);
}