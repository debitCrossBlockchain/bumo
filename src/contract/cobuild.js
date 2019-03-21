'use strict';

const maxShare          = 1000;
const oneBU             = 100000000;
const minApplyPledge    = 5000000 * oneBU;
const minInitAmount     = 1000000 * oneBU;

const statusKey         = 'status';
const configKey         = 'dpos_config';
const shareholdersKey   = 'shareholders';
const withdrawKey       = 'withdraw';
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
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to apply.');
    Utils.assert(Utils.int64Compare(stat.realShares, cfg.raiseShares) >= 0, 'Co-building fund is not enough.');

    stat.pledged = stat.realShares;
    stat.applied = true;
    saveObj(statusKey, stat);
   
    let application = applyInput(role, node);
    triggerContract(dposContract, stat.funding, application);
}

function transferKey(from, to){
    return 'transfer_' + from + '_to_' + to;
}

/* transfer of shares */
function transfer(to, shares){
    Utils.assert(stat.applied === true, 'Has not applied yet.');
    Utils.assert(Utils.addressCheck(to), 'Arg-to is not a valid address.');
    Utils.assert(Utils.int64Compare(shares, '0') >= 0, 'Arg-shares must be >= 0.');
    Utils.assert(shareholders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');
    Utils.assert(Utils.int64Compare(shares, shareholders[Chain.tx.sender][0]) <= 0, 'Transfer shares > holding shares.');

    let key = transferKey(Chain.tx.sender, to);
    Chain.store(key, shares);
}

/* accept transfer */
function accept(transferor){
    Utils.assert(stat.applied === true, 'Has not applied yet.');
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

function withdrawProposal(){
    let proposal = {
        'withdrawed' : false,
        'expiration' : Chain.block.timestamp + cfg.valid_period,
        'sum':'0',
        'ballot': {}

    };

    return proposal;
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

function withdrawing(role, proposal){
    proposal.withdrawed = true;
    saveObj(withdrawKey, proposal);
    triggerContract(dposContract, 0, withdrawInput(role));
}

function withdraw(role){
    Utils.assert(stat.applied === true, 'Has not applied yet.');
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to withdraw.');

    let proposal = withdrawProposal();
    withdrawing(role, proposal);
}

function vote(role){
    Utils.assert(stat.applied === true, 'Has not applied yet.');
    Utils.assert(shareholders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');

    let proposal = loadObj(withdrawKey);
    if(proposal === false){
        proposal = withdrawProposal();
    }
    else{
        if(proposal.ballot[Chain.tx.sender] !== undefined){
            return Chain.msg.sender + ' has voted.';
        }
    }

    proposal.ballot[Chain.tx.sender] = shareholders[Chain.tx.sender][0];
    proposal.sum = Utils.int64Add(proposal.sum, shareholders[Chain.tx.sender][0]);

    if(Utils.int64Div(cfg.pledged, proposal.sum) >= 2){
        return saveObj(withdrawKey, proposal);
    } 

    withdrawing(role, proposal);
}

function takeback(role){
    let proposal = loadObj(withdrawKey);
    assert(proposal !== false, 'Failed to get ' + withdrawKey + ' from metadata.');
    assert(proposal.withdrawed && Chain.block.timestamp >= proposal.expiration, 'Insufficient conditions for recovering the deposit.');

    Chain.del(withdrawKey);

    stat.applied = false;
    stat.pledged = '0';
    saveObj(statusKey, stat);

    triggerContract(dposContract, 0, withdrawInput(role));
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
    else if(input.method === 'takeback'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    	takeback(params.role);
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
