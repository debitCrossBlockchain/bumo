'use strict';

const maxShare          = 1000;
const oneBU             = 100000000;
const minApplyPledge    = 5000000 * oneBU;
const minInitAmount     = 1000000 * oneBU;

const statusKey         = 'status';
const configKey         = 'dpos_config';
const shareholdersKey   = 'shareholders';
const dposContract      = 'buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss';

let cfg  = {};
let stat = {};
let shareholders = {};

function loadObj(key){
    let data = Chain.load(key);
    if(data !== false){
        return JSON.parse(data);
    }

    return false;
}

function saveObj(key, value){
    let str = JSON.stringify(value);
    Chain.store(key, str);
    Utils.log('Set key(' + key + '), value(' + str + ') in metadata succeed.');
}

function transferCoin(dest, amount){
    if(amount === '0'){
        return true; 
    }

    Chain.payCoin(dest, String(amount));
    Utils.log('Pay coin( ' + amount + ') to dest account(' + dest + ') succeed.');
}

function triggerContract(dest, amount, input){
    Chain.payCoin(dest, String(amount), input);
    Utils.log('Pay coin( ' + amount + ') to dest account(' + dest + ') succeed.');
}

function prepare(){
    stat = loadObj(statusKey);
    Utils.assert(stat !== false, 'Failed to get ' + statusKey + ' from metadata.');

    cfg = loadObj(configKey);
    Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');

    shareholders = loadObj(shareholdersKey);
    Utils.assert(shareholders !== false, 'Failed to get ' + shareholdersKey + ' from metadata.');
}

function extractInput(){
    return { 'method' : 'extract' };
}

function distribute(){
    let before = Chain.getBalance(Chain.thisAddress);
    triggerContract(dposContract, 0, extractInput());
    let after = Chain.getBalance(Chain.thisAddress);

    let reward = Utils.int64Sub(after, before);
    if(reward === '0'){
        return;
    }

    let unitReward = Utils.int64Mod(reward, stat.realShares);
    Object.keys(shareholders).forEach(function(key){
        let keyReward = Utils.int64Mul(unitReward, shareholders[key][0]);
        if(shareholders[key] === undefined){
            shareholders[key].push(keyReward);
        }
        else{
            shareholders[key][1] = Utils.int64Add(shareholders[key][1], keyReward);
        }
    });
}

/*Ordinary users participate in crowdfunding*/
function subscribe(shares){
    Utils.assert(stat.applied === false, 'Already applied.');
    Utils.assert(typeof shares === 'number', 'Illegal parameter type.');
    Utils.assert(Utils.int64Compare(Utils.int64Mul(cfg.unit, shares), Chain.msg.coinAmount) === 0, 'unit * shares !== Chain.msg.coinAmount.');

    if(shareholders[Chain.tx.sender] === undefined){
        shareholders[Chain.tx.sender] = [shares, '0'];
    }
    else{
        shareholders[Chain.tx.sender][0] = Utils.int64Add(shareholders[Chain.tx.sender][0], shares);
    }

    stat.funding = Utils.int64Add(stat.funding, Chain.msg.coinAmount);
    stat.realShares = Utils.int64Add(stat.realShares, shares);

    saveObj(statusKey, stat);
    saveObj(shareholdersKey, shareholders);
}

/*Ordinary users exit crowdfunding before application*/
function revoke(){
    Utils.assert(stat.applied === false, 'Already applied.');
    Utils.assert(shareholders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');

    let stake = shareholders[Chain.tx.sender];
    delete shareholders[Chain.tx.sender];
    saveObj(shareholdersKey, shareholders);

    let amount = Utils.int64Mul(cfg.unit, stake[0]);
    stat.funding = Utils.int64Sub(stat.funding, amount);
    stat.realShares = Utils.int64Sub(stat.realShares, stake[0]);
    saveObj(statusKey, stat);

    if(stake[1] !== '0'){
        amount = Utils.int64Add(amount, stake[1]);
    }

    transferCoin(Chain.tx.sender, amount);
}

function applyInput(role, node){
    let application = { 'method' : 'apply', 'params':{ 'role': 'kol' } };

    if(role === 'validator'){
        application.params.role = role;
    }
    if(node !== undefined && Utils.addressCheck(node)){
        application.params.node = node;
    }

    return application;
}

/*The initiator applies to become a super node*/
function apply(role, node){
    Utils.assert(stat.applied === false, 'Already applied.');
    Utils.assert(Chain.tx.sender === stat.initiator, 'Only the initiator has the right to apply.');
    Utils.assert(Utils.int64Compare(stat.realShares, cfg.raiseShares) >= 0, 'Co-building fund is not enough.');

    stat.pledged = stat.realShares;
    stat.applied = true;
    saveObj(statusKey, stat);
   
    let application = applyInput(role, node);
    triggerContract(dposContract, stat.funding, application);
}

function withdrawedKey(){
    return 'withdrawed';
}

function withdrawInput(role){
    let application = {
        'method' : 'withdraw',
        'params':{
            'role':role || 'kol'
        }
    };

    return application;
}

function takeback(key, role){
    stat.applied = false;
    stat.pledged = '0';
    saveObj(statusKey, stat);
    Chain.del(key);

    triggerContract(dposContract, 0, withdrawInput(role));
}

/* The initiator exits super node campaign*/
function withdraw(role){
    Utils.assert(stat.applied === true, 'Have not applied yet.');
    Utils.assert(Chain.tx.sender === stat.initiator, 'Only the initiator has the right to withdraw.');

    let withdrawed = Chain.load(withdrawedKey());
    if(withdrawed === false){
        withdrawed = true;
        Chain.store(withdrawedKey, withdrawed);
        triggerContract(dposContract, 0, withdrawInput(role));
    }
    else{
        takeback(withdrawedKey(), role);
    }
}

function transferKey(from, to){
    return 'transfer_' + from + '_to_' + to;
}

/* transfer of shares */
function transfer(to, shares){
    Utils.assert(stat.applied === true, 'Have not applied yet.');
    Utils.assert(Utils.addressCheck(to), 'Arg-to is not a valid address.');
    Utils.assert(Utils.int64Compare(shares, '0') >= 0, 'Arg-shares must be >= 0.');
    Utils.assert(shareholders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');
    Utils.assert(Utils.int64Compare(shares, shareholders[Chain.tx.sender][0]) <= 0, 'Transfer shares > holding shares.');

    let key = transferKey(Chain.tx.sender, to);
    Chain.store(key, shares);
}

/* accept transfer */
function accept(transferor){
    Utils.assert(stat.applied === true, 'Have not applied yet.');
    Utils.assert(Utils.addressCheck(transferor), 'Arg-to is not a valid address.');

    let key = transferKey(transferor, Chain.tx.sender);
    let shares = Chain.load(key);
    Utils.assert(shares !== false, 'Failed to get ' + key + ' from metadata.');
    Utils.assert(Utils.int64Compare(Utils.int64Mul(cfg.unit, shares), Chain.msg.coinAmount) === 0, 'unit * shares !== Chain.msg.coinAmount.');

    distribute();

    if(shareholders[Chain.tx.sender] === undefined){
        shareholders[Chain.tx.sender] = [shareholders[transferor][0], '0'];
    }
    else{
        shareholders[Chain.tx.sender][0] = Utils.int64Add(shareholders[Chain.tx.sender][0], shareholders[transferor][0]);
    }

    let reward = '0';
    if(Utils.int64Sub(shareholders[transferor][0], shares) === 0){
        reward = shareholders[transferor][1];
        delete shareholders[transferor];
    }
    else{
        Utils.assert(Utils.int64Compare(stat.realShares, maxShare) < 0, 'Share overrun.');
        shareholders[transferor][0] = Utils.int64Sub(shareholders[transferor][0], shares);
    }

    saveObj(shareholdersKey, shareholders);
    transferCoin(transferor, Utils.int64Add(Chain.msg.coinAmount, reward));
}

function exitKey(){
    return 'exitKey';
}

/*Ordinary users initiate an exit vote*/
function initiateExit(role){
    Utils.assert(stat.applied === true, 'Have not applied yet.');
    Utils.assert(shareholders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');

    let ballot = Chain.load(exitKey());
    if(ballot !== false){
        return;
    }

    ballot.sum = shareholders[Chain.tx.sender][0];
    ballot[Chain.tx.sender] = shareholders[Chain.tx.sender][0];

    if(Utils.int64Div(cfg.pledged, ballot.sum) >= 2){
        return saveObj(exitKey(), ballot);
    } 

    if(ballot.withdrawed !== true){
        ballot.withdrawed = true;
        saveObj(exitKey(), ballot);
        triggerContract(dposContract, 0, withdrawInput(role));
    }
    else{
        takeback(exitKey(), role);
    }
}

function vote(role){
    Utils.assert(stat.applied === true, 'Have not applied yet.');
    Utils.assert(shareholders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');

    let ballot = Chain.load(exitKey());
    Utils.assert(ballot !== false, 'Failed to get ' + exitKey() + ' from metadata.');

    if(ballot[Chain.tx.sender] === undefined){
        ballot[Chain.tx.sender] = shareholders[Chain.tx.sender][0];
        ballot.sum = Utils.int64Add(ballot.sum, shareholders[Chain.tx.sender][0]);
    }

    if(Utils.int64Div(cfg.pledged, ballot.sum) >= 2){
        return saveObj(exitKey(), ballot);
    } 

    if(ballot.withdrawed !== true){
        ballot.withdrawed = true;
        saveObj(exitKey(), ballot);
        triggerContract(dposContract, 0, withdrawInput(role));
    }
    else{
        takeback(exitKey(), role);
    }
}

function extract(){
    Utils.assert(shareholders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');

    distribute();
    let reward = shareholders[Chain.msg.sender][1];

    shareholders[Chain.msg.sender][1] = '0';
    saveObj(shareholdersKey, shareholders);

    transferCoin(Chain.msg.sender, reward);
}

function getDistribution(){
    return loadObj(shareholdersKey);
}

function getStatus(){
    return loadObj(statusKey);
}

function getConfiguration(){
    return loadObj(configKey);
}

function query(input_str){
    let input  = JSON.parse(input_str);
    let params = input.params;

    let result = {};
    if(input.method === 'getDistribution') {
        result = getDistribution();
    }
    else if(input.method === 'getStatus'){
        result = getStatus();
    }
    else if(input.method === 'getConfiguration'){
        result = getConfiguration();
    }

    Utils.log(result);
    return JSON.stringify(result);
}

function main(input_str){
    let input  = JSON.parse(input_str);
    let params = input.params;

    prepare();

    if(input.method === 'subscribe'){
	    subscribe(params.shares);
    }
    else if(input.method === 'revoke'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
	    revoke();
    }
    else if(input.method === 'apply'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
        apply(params.role, params.node);
    }
    else if(input.method === 'withdraw'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    	withdraw(params.role);
    }
    else if(input.method === 'transfer'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    	transfer(params.to, params.shares);
    }
    else if(input.method === 'accept'){
    	accept(params.transferor);
    }
    else if(input.method === 'extract'){
        extract();
    }
    else if(input.method === 'initiateExit'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    	initiateExit(params.role);
    }
    else if(input.method === 'vote'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
	    vote(params.role);
    }
    else{
        throw '<undidentified operation type>';
    }
}

function init(input_str){
    let params = JSON.parse(input_str).params;
    Utils.assert(typeof params.ratio === 'number' && typeof params.unit === 'number' && typeof params.shares === 'number', 'Illegal parameter type.');

    let mul = Utils.int64Mul(params.unit, params.shares);
    Utils.assert(Utils.int64Compare(mul, minApplyPledge) >= 0, 'Crowdfunding < minimum application pledge.');
    Utils.assert(Utils.int64Compare(Chain.msg.coinAmount, minInitAmount) >= 0 && Utils.int64Mod(Chain.msg.coinAmount, params.unit) === '0', 'Initiator subscription amount is illegal.');

    cfg = {
        'initiator'   : Chain.tx.sender,
        'rewardRatio' : params.ratio,
        'unit'        : params.unit,
        'raiseShares' : params.shares
    };
    saveObj(configKey, cfg);

    let initShare = Utils.int64Div(Chain.msg.coinAmount, cfg.unit);
    shareholders[Chain.tx.sender] = [initShare, '0'];
    saveObj(shareholdersKey, shareholders);

    stat = {
        'applied' : false,
        'pledged' : '0',
        'funding' : Chain.msg.coinAmount,
        'realShares' : initShare,
        'distributed': '0'
    };
    saveObj(statusKey, stat);

}
