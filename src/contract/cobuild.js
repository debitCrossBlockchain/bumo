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

const share   = 'share';
const gain    = 'gain';
const pledged = 'pledged';

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

    Chain.payCoin(dest, amount);
    Utils.log('Pay coin( ' + amount + ') to dest account(' + dest + ') succeed.');
}

function callDPOS(amount, input){
    Chain.payCoin(dposContract, amount, input);
    Utils.log('Call DPOS contract(address: ' + dposContract + ', input: ' + input +') succeed.');
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
    return JSON.stringify({ 'method' : 'extract' });
}

function getReward(){
    let before = Chain.getBalance(Chain.thisAddress);
    callDPOS('0', extractInput());
    let after = Chain.getBalance(Chain.thisAddress);

    return Utils.int64Sub(after, before);
}

function rewardCobuilders(reward, shares){
    let unitReward = Utils.int64Div(reward, shares);

    Object.keys(cobuilders).forEach(function(key){
        if(cobuilders[key][pledged]){
            let keyReward = Utils.int64Mul(unitReward, cobuilders[key][share]);
            cobuilders[key][gain] = Utils.int64Add(cobuilders[key][gain], keyReward);
        }
    });

    return Utils.int64Mod(reward, shares);
}

function distribute(){
    let reward = getReward();
    if(reward === '0'){
        return;
    }

    let left = 0;
    if(cfg.rewardRatio === 100){
        left = rewardCobuilders(reward, states.pledgedShares);
    }
    else{
        let initiator = cobuilders[cfg.initiator];
        delete cobuilders[cfg.initiator];

        let cobuildersReward = Utils.int64Mul(Utils.int64Div(reward, 100), cfg.rewardRatio); 
        let cobuildersShares = Utils.int64Sub(states.pledgedShares, initiator[share]);
        left = rewardCobuilders(cobuildersReward, cobuildersShares);

        initiator[gain] = Utils.int64Add(initiator[gain], Utils.int64Sub(reward, cobuildersReward));
        cobuilders[cfg.initiator] = initiator;
    }

    cobuilders[cfg.initiator][gain] = Utils.int64Add(cobuilders[cfg.initiator][gain], left);
}

function cobuilder(shares, isPledged){
    return {
        share   :shares,
        pledged :isPledged || false,
        gain    :'0'
    };
}

function subscribe(shares){
    Utils.assert(typeof shares === 'number', 'Illegal parameter type.');
    Utils.assert(Utils.int64Compare(Utils.int64Mul(cfg.unit, shares), Chain.msg.coinAmount) === 0, 'unit * shares !== Chain.msg.coinAmount.');

    if(cobuilders[Chain.tx.sender] === undefined){
        cobuilders[Chain.tx.sender] = cobuilder(shares);
    }
    else{
        cobuilders[Chain.tx.sender][share] = Utils.int64Add(cobuilders[Chain.tx.sender][share], shares);
    }

    states.allShares = Utils.int64Add(states.allShares, shares);
    Utils.assert(Utils.int64Compare(states.allShares, maxShare) <= 0, 'Share overrun.');

    saveObj(statesKey, states);
    saveObj(cobuildersKey, cobuilders);
}

function revoke(){
    Utils.assert(cobuilders[Chain.tx.sender][pledged] === false, 'The share of '+ Chain.tx.sender + ' has been pledged.');

    let stake = cobuilders[Chain.tx.sender];
    delete cobuilders[Chain.tx.sender];
    saveObj(cobuildersKey, cobuilders);

    states.allShares = Utils.int64Sub(states.allShares, stake[share]);
    saveObj(statesKey, states);

    let amount = Utils.int64Mul(cfg.unit, stake[share]);
    if(stake[gain] !== '0'){
        amount = Utils.int64Add(amount, stake[gain]);
    }

    transferCoin(Chain.tx.sender, amount);
}

function applyInput(node){
    let application = {
        'method' : 'apply',
        'params':{
            'role': states.role || 'kol'
        }
    };

    if(node !== undefined && Utils.addressCheck(node)){
        application.params.node = node;
    }

    return JSON.stringify(application);
}

function setStatus(){
    states.applied = true;
    states.pledgedShares = states.allShares;
    saveObj(statesKey, states);

    Object.keys(cobuilders).forEach(function(key){ cobuilders[key][pledged] = true; });
    saveObj(cobuildersKey, cobuilders);
}

function apply(role, node){
    Utils.assert(states.applied === false, 'Already applied.');
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to apply.');
    Utils.assert(Utils.int64Compare(states.allShares, cfg.raiseShares) >= 0, 'Co-building fund is not enough.');

    states.role = role;
    setStatus();
   
    let pledgeAmount = Utils.int64Mul(cfg.unit, states.allShares);
    callDPOS(pledgeAmount, applyInput(node));
}

function appendInput(){
    let addition = {
        'method' : 'append',
        'params':{ 'role': states.role }
    };

    return JSON.stringify(addition);
}

function append(){
    Utils.assert(states.applied === true, 'Has not applied.');
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to append.');

    let appendShares = Utils.int64Sub(states.allShares, states.pledgedShares);
    let appendAmount = Utils.int64Mul(cfg.unit, appendShares);

    setStatus();
    callDPOS(appendAmount, appendInput());
}

function transferKey(from, to){
    return 'transfer_' + from + '_to_' + to;
}

function transfer(to, shares){
    Utils.assert(Utils.addressCheck(to), 'Arg-to is not a valid address.');
    Utils.assert(Utils.int64Compare(shares, '0') >= 0, 'Arg-shares must be >= 0.');
    Utils.assert(cobuilders[Chain.tx.sender][pledged] === true, 'Unpled shares can be withdrawn directly.');
    Utils.assert(Utils.int64Compare(shares, cobuilders[Chain.tx.sender][share]) <= 0, 'Transfer shares > holding shares.');

    let key = transferKey(Chain.tx.sender, to);
    Chain.store(key, shares);
}

function accept(transferor){
    Utils.assert(Utils.addressCheck(transferor), 'Arg-to is not a valid address.');
    Utils.assert(cobuilders[transferor][pledged] === true, 'Unpled shares can be revoked directly.');

    let key = transferKey(transferor, Chain.tx.sender);
    let shares = Chain.load(key);
    Utils.assert(shares !== false, 'Failed to get ' + key + ' from metadata.');
    Utils.assert(Utils.int64Compare(Utils.int64Mul(cfg.unit, shares), Chain.msg.coinAmount) === 0, 'unit * shares !== Chain.msg.coinAmount.');

    distribute();

    if(cobuilders[Chain.tx.sender] === undefined){
        cobuilders[Chain.tx.sender] = cobuilder(shares, true);
    }
    else{
        cobuilders[Chain.tx.sender][share] = Utils.int64Add(cobuilders[Chain.tx.sender][share], shares);
    }

    let reward = '0';
    if(Utils.int64Sub(cobuilders[transferor][share], shares) === 0){
        reward = cobuilders[transferor][gain];
        delete cobuilders[transferor];
    }
    else{
        cobuilders[transferor][share] = Utils.int64Sub(cobuilders[transferor][share], shares);
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

function withdrawInput(){
    let application = {
        'method' : 'withdraw',
        'params':{
            'role':states.role || 'kol'
        }
    };

    return JSON.stringify(application);
}

function withdrawing(proposal){
    proposal.withdrawed = true;
    saveObj(withdrawKey, proposal);
    callDPOS('0', withdrawInput());
}

function withdraw(){
    Utils.assert(states.applied === true, 'Has not applied yet.');
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to withdraw.');

    let proposal = withdrawProposal();
    withdrawing(proposal);
}

function poll(){
    Utils.assert(states.applied === true, 'Has not applied yet.');
    Utils.assert(cobuilders[Chain.tx.sender][pledged], Chain.tx.sender + ' is not involved in application.');

    let proposal = loadObj(withdrawKey);
    if(proposal === false){
        proposal = withdrawProposal();
    }
    else{
        if(proposal.ballot[Chain.tx.sender] !== undefined){
            return Chain.msg.sender + ' has polled.';
        }
    }

    proposal.ballot[Chain.tx.sender] = cobuilders[Chain.tx.sender][share];
    proposal.sum = Utils.int64Add(proposal.sum, cobuilders[Chain.tx.sender][share]);

    if(Utils.int64Div(states.pledgedShares, proposal.sum) >= 2){
        return saveObj(withdrawKey, proposal);
    } 

    withdrawing(proposal);
}

function resetStatus(){
    delete states.role;

    states.applied = false;
    states.pledgedShares = '0';
    saveObj(statesKey, states);

    Object.keys(cobuilders).forEach(function(key){ cobuilders[key][pledged] = false; });
    saveObj(cobuildersKey, cobuilders);
}

function takeback(){
    let proposal = loadObj(withdrawKey);
    assert(proposal !== false, 'Failed to get ' + withdrawKey + ' from metadata.');
    assert(proposal.withdrawed && Chain.block.timestamp >= proposal.expiration, 'Insufficient conditions for recovering the deposit.');

    resetStatus();
    Chain.del(withdrawKey);
    callDPOS('0', withdrawInput());
}

function received(){
    resetStatus(); 

    if(false !== loadObj(withdrawKey)){
        Chain.del(withdrawKey);
    }
}

function extract(){
    Utils.assert(cobuilders[Chain.tx.sender] !== undefined, Chain.tx.sender + ' is not involved in co-building.');

    distribute();
    let reward = cobuilders[Chain.tx.sender][gain];

    cobuilders[Chain.tx.sender][gain] = '0';
    saveObj(cobuildersKey, cobuilders);

    transferCoin(Chain.tx.sender, reward);
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
        result.cfg = getConfiguration();
    }
    else if(input.method === 'getWithdrawInfo'){
        result.withdrawInfo = getWithdrawInfo();
    }
    else if(input.method === 'getTransferInfo'){
        let key = transferKey(params.from, params.to);
        result.transferInfo = Chain.load(key);
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
    else if(input.method === 'append'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
        append();
    }
    else if(input.method === 'withdraw'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    	withdraw();
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
    	takeback();
    }
    else if(input.method === 'poll'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
	    poll();
    }
    else if(input.method === 'refund'){
        received();
    }
}

function init(input_str){
    let params = JSON.parse(input_str).params;
    Utils.assert(typeof params.ratio === 'number' && typeof params.unit === 'number' && typeof params.shares === 'number', 'Illegal parameter type.');

    let mul = Utils.int64Mul(params.unit, params.shares);
    Utils.assert(Utils.int64Compare(mul, minApplyPledge) >= 0, 'Crowdfunding < minimum application pledge.');
    Utils.assert(params.ratio > 0 && params.ratio <= 100, 'The reward ratio should be > 0 and <= 100.');
    Utils.assert(Utils.int64Compare(Chain.msg.coinAmount, minInitAmount) >= 0 && Utils.int64Mod(Chain.msg.coinAmount, params.unit) === '0', 'Initiator subscription amount is illegal.');

    cfg = {
        'initiator'   : Chain.tx.sender,
        'rewardRatio' : params.ratio,
        'unit'        : params.unit,
        'raiseShares' : params.shares
    };
    saveObj(configKey, cfg);

    let initShare = Utils.int64Div(Chain.msg.coinAmount, cfg.unit);
    cobuilders[Chain.tx.sender] = cobuilder(initShare);
    saveObj(cobuildersKey, cobuilders);

    states = {
        'applied': false,
        'allShares': initShare,
        'pledgedShares': '0'
    };
    saveObj(statesKey, states);

}
