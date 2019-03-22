'use strict';

const oneBU          = 100000000; /* 1 0000 0000 MO */
const maxShare       = 1000;
const minInitAmount  = 1000000 * oneBU; /* 100 0000 BU */
const minApplyPledge = 5000000 * oneBU; /* 500 0000 BU */

const statesKey     = 'states';
const configKey     = 'config';
const withdrawKey   = 'withdraw';
const cobuildersKey = 'cobuilders';
const dposContract  = 'buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss';

let cfg  = {};
let states = {};
let cobuilders = {};

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
    states = loadObj(statesKey);
    Utils.assert(states !== false, 'Failed to get ' + statesKey + ' from metadata.');

    cfg = loadObj(configKey);
    Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');

    cobuilders = loadObj(cobuildersKey);
    Utils.assert(cobuilders !== false, 'Failed to get ' + cobuildersKey + ' from metadata.');
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

    let unitReward = Utils.int64Div(reward, states.realShares);
    Object.keys(cobuilders).forEach(function(key){
        let keyReward = Utils.int64Mul(unitReward, cobuilders[key][0]);
        cobuilders[key][1] = Utils.int64Add(cobuilders[key][1], keyReward);
    });

    let left = Utils.int64Mod(reward, states.realShares);
    cobuilders[cfg.initiator][1] = Utils.int64Add(cobuilders[cfg.initiator][1], left);
}

function subscribe(shares){
    Utils.assert(states.applied === false, 'Already applied.');
    Utils.assert(typeof shares === 'number', 'Illegal parameter type.');
    Utils.assert(Utils.int64Compare(Utils.int64Mul(cfg.unit, shares), Chain.msg.coinAmount) === 0, 'unit * shares !== Chain.msg.coinAmount.');

    if(cobuilders[Chain.tx.sender] === undefined){
        cobuilders[Chain.tx.sender] = [shares, '0'];
    }
    else{
        cobuilders[Chain.tx.sender][0] = Utils.int64Add(cobuilders[Chain.tx.sender][0], shares);
    }

    states.funding = Utils.int64Add(states.funding, Chain.msg.coinAmount);
    states.realShares = Utils.int64Add(states.realShares, shares);

    saveObj(statesKey, states);
    saveObj(cobuildersKey, cobuilders);
}

function revoke(){
    Utils.assert(states.applied === false, 'Already applied.');
    Utils.assert(cobuilders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');

    let stake = cobuilders[Chain.tx.sender];
    delete cobuilders[Chain.tx.sender];
    saveObj(cobuildersKey, cobuilders);

    let amount = Utils.int64Mul(cfg.unit, stake[0]);
    states.funding = Utils.int64Sub(states.funding, amount);
    states.realShares = Utils.int64Sub(states.realShares, stake[0]);
    saveObj(statesKey, states);

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

function apply(role, node){
    Utils.assert(states.applied === false, 'Already applied.');
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to apply.');
    Utils.assert(Utils.int64Compare(states.realShares, cfg.raiseShares) >= 0, 'Co-building fund is not enough.');

    states.pledged = states.realShares;
    states.applied = true;
    saveObj(statesKey, states);
   
    let application = applyInput(role, node);
    triggerContract(dposContract, states.funding, application);
}

function transferKey(from, to){
    return 'transfer_' + from + '_to_' + to;
}

function transfer(to, shares){
    Utils.assert(states.applied === true, 'Has not applied yet.');
    Utils.assert(Utils.addressCheck(to), 'Arg-to is not a valid address.');
    Utils.assert(Utils.int64Compare(shares, '0') >= 0, 'Arg-shares must be >= 0.');
    Utils.assert(cobuilders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');
    Utils.assert(Utils.int64Compare(shares, cobuilders[Chain.tx.sender][0]) <= 0, 'Transfer shares > holding shares.');

    let key = transferKey(Chain.tx.sender, to);
    Chain.store(key, shares);
}

function accept(transferor){
    Utils.assert(states.applied === true, 'Has not applied yet.');
    Utils.assert(Utils.addressCheck(transferor), 'Arg-to is not a valid address.');

    let key = transferKey(transferor, Chain.tx.sender);
    let shares = Chain.load(key);
    Utils.assert(shares !== false, 'Failed to get ' + key + ' from metadata.');
    Utils.assert(Utils.int64Compare(Utils.int64Mul(cfg.unit, shares), Chain.msg.coinAmount) === 0, 'unit * shares !== Chain.msg.coinAmount.');

    distribute();

    if(cobuilders[Chain.tx.sender] === undefined){
        cobuilders[Chain.tx.sender] = [cobuilders[transferor][0], '0'];
    }
    else{
        cobuilders[Chain.tx.sender][0] = Utils.int64Add(cobuilders[Chain.tx.sender][0], cobuilders[transferor][0]);
    }

    let reward = '0';
    if(Utils.int64Sub(cobuilders[transferor][0], shares) === 0){
        reward = cobuilders[transferor][1];
        delete cobuilders[transferor];
    }
    else{
        Utils.assert(Utils.int64Compare(states.realShares, maxShare) < 0, 'Share overrun.');
        cobuilders[transferor][0] = Utils.int64Sub(cobuilders[transferor][0], shares);
    }

    saveObj(cobuildersKey, cobuilders);
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
    Utils.assert(states.applied === true, 'Has not applied yet.');
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to withdraw.');

    let proposal = withdrawProposal();
    withdrawing(role, proposal);
}

function vote(role){
    Utils.assert(states.applied === true, 'Has not applied yet.');
    Utils.assert(cobuilders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');

    let proposal = loadObj(withdrawKey);
    if(proposal === false){
        proposal = withdrawProposal();
    }
    else{
        if(proposal.ballot[Chain.tx.sender] !== undefined){
            return Chain.msg.sender + ' has voted.';
        }
    }

    proposal.ballot[Chain.tx.sender] = cobuilders[Chain.tx.sender][0];
    proposal.sum = Utils.int64Add(proposal.sum, cobuilders[Chain.tx.sender][0]);

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

    states.applied = false;
    states.pledged = '0';
    saveObj(statesKey, states);

    triggerContract(dposContract, 0, withdrawInput(role));
}

function extract(){
    Utils.assert(cobuilders[Chain.tx.sender] !== undefined, 'Sender is not involved in co-building.');

    distribute();
    let reward = cobuilders[Chain.msg.sender][1];

    cobuilders[Chain.msg.sender][1] = '0';
    saveObj(cobuildersKey, cobuilders);

    transferCoin(Chain.msg.sender, reward);
}

function getCobuilders(){
    return loadObj(cobuildersKey);
}

function getStatus(){
    return loadObj(statesKey);
}

function getConfiguration(){
    return loadObj(configKey);
}

function getWithdrawInfo(){
    return loadObj(withdrawKey);
}

function query(input_str){
    let input  = JSON.parse(input_str);
    let params = input.params;

    let result = {};
    if(input.method === 'getCobuilders') {
        result.cobuilders = getCobuilders();
    }
    else if(input.method === 'getStatus'){
        result.states = getStatus();
    }
    else if(input.method === 'getConfiguration'){
        result = getConfiguration();
    }
    else if(input.method === 'getWithdrawInfo'){
        result = getWithdrawInfo();
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
    cobuilders[Chain.tx.sender] = [initShare, '0'];
    saveObj(cobuildersKey, cobuilders);

    states = {
        'applied' : false,
        'pledged' : '0',
        'funding' : Chain.msg.coinAmount,
        'realShares' : initShare,
        'distributed': '0'
    };
    saveObj(statesKey, states);

}
