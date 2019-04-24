'use strict';

const oneBU          = 100000000; /* 1 0000 0000 MO */
const minInitAmount  = 1000000 * oneBU; /* 100 0000 BU */

const statesKey     = 'states';
const configKey     = 'config';
const withdrawKey   = 'withdraw';
const cobuildersKey = 'cobuilders';
const dposContract  = 'buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss';

const share     = 'share';
const award     = 'award';
const pledged   = 'pledged';
const validator = 'validator';
const kol       = 'kol';


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

function queryDposCfg(){
    let input = {'method': 'getConfiguration'};
    let res = Chain.contractQuery(dposContract, JSON.stringify(input)); /* get base_reserve and valid_period from dpos contract */
    Utils.assert(res.error === undefined && res.result !== undefined, 'Failed to query contract, ' + JSON.stringify(res));
    Utils.log('Query DPOS contract(address: ' + dposContract + ', input:' + input + ') succeed.');
    return JSON.parse(res.result).configuration;
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

function distribute(allReward){
    let unitReward = Utils.int64Div(allReward, states.pledgedShares);

    Object.keys(cobuilders).forEach(function(key){
        if(cobuilders[key][pledged]){
            let each = Utils.int64Mul(unitReward, cobuilders[key][share]);
            cobuilders[key][award] = Utils.int64Add(cobuilders[key][award], each);
        }
    });
    
    let left = Utils.int64Mod(allReward, states.pledgedShares);
    cobuilders[cfg.initiator][award] = Utils.int64Add(cobuilders[cfg.initiator][award], left);
}

function cobuilder(shares, isPledged){
    return {
        share   :shares,
        pledged :isPledged || false,
        award    :'0'
    };
}

function subscribe(shares){
    Utils.assert(shares > 0 && shares % 1 === 0, 'Invalid shares:' + shares + '.');
    Utils.assert(Utils.int64Compare(Utils.int64Mul(cfg.unit, shares), Chain.msg.coinAmount) === 0, 'unit * shares !== Chain.msg.coinAmount.');

    if(cobuilders[Chain.tx.sender] === undefined){
        cobuilders[Chain.tx.sender] = cobuilder(shares);
    }
    else{
        assert(cobuilders[Chain.tx.sender][pledged] === false, Chain.tx.sender + ' has already participated in the application.');
        cobuilders[Chain.tx.sender][share] = Utils.int64Add(cobuilders[Chain.tx.sender][share], shares);
    }

    states.allShares = Utils.int64Add(states.allShares, shares);
    saveObj(statesKey, states);
    saveObj(cobuildersKey, cobuilders);
    Chain.tlog('subscribe', Chain.tx.sender, shares, Chain.msg.coinAmount);
}

function revoke(){
    if(Chain.tx.sender === cfg.initiator){
        Utils.assert(states.disabled, Chain.tx.sender + ' is initiator.');
    }
    Utils.assert(cobuilders[Chain.tx.sender][pledged] === false, 'The share of '+ Chain.tx.sender + ' has been pledged.');

    let stake = cobuilders[Chain.tx.sender];
    delete cobuilders[Chain.tx.sender];
    saveObj(cobuildersKey, cobuilders);

    states.allShares = Utils.int64Sub(states.allShares, stake[share]);
    saveObj(statesKey, states);

    let amount = Utils.int64Mul(cfg.unit, stake[share]);
    if(stake[award] !== '0'){
        amount = Utils.int64Add(amount, stake[award]);
    }

    transferCoin(Chain.tx.sender, amount);
    Chain.tlog('revoke', Chain.tx.sender, stake[share], amount);
}

function applyInput(pool, ratio, node){
    let application = {
        'method' : 'apply',
        'params':{
            'role': states.role,
            'pool': pool,
            'ratio':ratio
        }
    };

    if(application.params.role === kol){
        return JSON.stringify(application);
    }

    Utils.assert(Utils.addressCheck(node) && node !== Chain.thisAddress, 'Invalid address:' + node + '.');
    application.params.node = node;

    return JSON.stringify(application);
}

function setStatus(){
    states.applied = true;
    states.pledgedShares = states.allShares;
    saveObj(statesKey, states);

    Object.keys(cobuilders).forEach(function(key){ cobuilders[key][pledged] = true; });
    saveObj(cobuildersKey, cobuilders);
}

function coApply(role, pool, ratio, node){
    Utils.assert(role === validator || role === kol,  'Unknown role:' + role + '.');
    Utils.assert(Utils.addressCheck(pool), 'Invalid address:' + pool + '.');
    Utils.assert(0 <= ratio && ratio <= 100 && ratio % 1 === 0, 'Invalid vote reward ratio:' + ratio + '.');

    Utils.assert(states.applied === false, 'Already applied.');
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to apply.');
    Utils.assert(Utils.int64Compare(states.allShares, cfg.raiseShares) >= 0, 'Co-building fund is not enough.');

    states.role = role;
    setStatus();
   
    let pledgeAmount = Utils.int64Mul(cfg.unit, states.allShares);
    callDPOS(pledgeAmount, applyInput(pool, ratio, node));
    Chain.tlog('apply', pledgeAmount, pool, ratio);
}

function appendInput(){
    let addition = {
        'method' : 'append',
        'params':{ 'role': states.role }
    };

    return JSON.stringify(addition);
}

function coAppend(){
    Utils.assert(states.applied, 'Has not applied.');
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to append.');

    let appendShares = Utils.int64Sub(states.allShares, states.pledgedShares);
    let appendAmount = Utils.int64Mul(cfg.unit, appendShares);

    setStatus();
    callDPOS(appendAmount, appendInput());
    Chain.tlog('coAppend', appendAmount);
}

function coSetNodeAddress(address){
    Utils.assert(Utils.addressCheck(address),  'Invalid address:' + address + '.');

    let input = {
        'method' : 'setNodeAddress',
        'params':{
            'address': address
        }
    };

    callDPOS('0', input);
    Chain.tlog('coSetNodeAddress', address);

}

function coSetVoteDividend(pool, ratio){
    let input = {
        'method' : 'setVoteDividend',
        'params':{}
    };

    if(pool !== undefined){
        Utils.assert(Utils.addressCheck(pool), 'Invalid address:' + pool + '.');
        input.params.pool = pool;
    }

    if(ratio !== undefined){
        Utils.assert(0 <= ratio && ratio <= 100 && ratio % 1 === 0, 'Invalid vote reward ratio:' + ratio + '.');
        input.params.ratio = ratio;
    }

    callDPOS('0', input);
    Chain.tlog('coSetVoteDividend', pool, ratio);
}

function transferKey(from, to){
    return 'transfer_' + from + '_to_' + to;
}

function transfer(to, shares){
    Utils.assert(Utils.addressCheck(to), 'Invalid address:' + to + '.');
    Utils.assert(shares > 0 && shares % 1 === 0, 'Invalid shares:' + shares + '.');
    Utils.assert(cobuilders[Chain.tx.sender][pledged], 'Unpled shares can be withdrawn directly.');
    Utils.assert(Utils.int64Compare(shares, cobuilders[Chain.tx.sender][share]) <= 0, 'Transfer shares > holding shares.');

    shares = String(shares);

    let key = transferKey(Chain.tx.sender, to);
    let transfered = Chain.load(key);
    if(transfered !== false){
        shares = Utils.int64Add(transfered ,shares);
    }
    
    Chain.store(key, shares);
}

function accept(transferor){
    Utils.assert(Utils.addressCheck(transferor), 'Invalid address:' + transferor + '.');
    Utils.assert(cobuilders[transferor][pledged], 'Unpled shares can be revoked directly.');

    let key = transferKey(transferor, Chain.tx.sender);
    let shares = Chain.load(key);
    Utils.assert(shares !== false, 'Failed to get ' + key + ' from metadata.');
    Utils.assert(Utils.int64Compare(Utils.int64Mul(cfg.unit, shares), Chain.msg.coinAmount) === 0, 'unit * shares !== Chain.msg.coinAmount.');

    let allReward = getReward();
    if(allReward !== '0'){
        distribute(allReward);
    }

    if(cobuilders[Chain.tx.sender] === undefined){
        cobuilders[Chain.tx.sender] = cobuilder(shares, true);
    }
    else{
        cobuilders[Chain.tx.sender][share] = Utils.int64Add(cobuilders[Chain.tx.sender][share], shares);
    }

    let gain = '0';
    if(Utils.int64Sub(cobuilders[transferor][share], shares) === 0){
        gain = cobuilders[transferor][award];
        delete cobuilders[transferor];
    }
    else{
        cobuilders[transferor][share] = Utils.int64Sub(cobuilders[transferor][share], shares);
    }

    Chain.del(key);
    saveObj(cobuildersKey, cobuilders);
    transferCoin(transferor, Utils.int64Add(Chain.msg.coinAmount, gain));
    Chain.tlog('deal', transferor, Chain.tx.sender, shares, Chain.msg.coinAmount);
}

function withdrawProposal(){
    let dpos_cfg = queryDposCfg();
    let proposal = {
        'withdrawed' : false,
        'expiration' : Chain.block.timestamp + dpos_cfg.valid_period,
        'sum':'0',
        'ballot': {}

    };

    return proposal;
}

function withdrawInput(){
    let application = {
        'method' : 'withdraw',
        'params':{
            'role':states.role || kol
        }
    };

    return JSON.stringify(application);
}

function withdrawing(proposal){
    proposal.withdrawed = true;
    saveObj(withdrawKey, proposal);
    callDPOS('0', withdrawInput());
}

function coWithdraw(){
    Utils.assert(Chain.tx.sender === cfg.initiator, 'Only the initiator has the right to withdraw.');

    if(states.applied){
        let proposal = withdrawProposal();
        withdrawing(proposal);
        Chain.tlog('coWithdraw', cfg.initiator);
    }
    else{
        states.disabled = true;
        saveObj(statesKey, states);
        Chain.tlog('disabled', cfg.initiator);
    }
}

function poll(){
    Utils.assert(states.applied, 'Has not applied yet.');
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
    Chain.tlog('votePassed', proposal.sum);
}

function resetStatus(){
    delete states.role;

    states.disabled = true;
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

    callDPOS('0', withdrawInput());
}

function received(){
    Utils.assert(Chain.msg.sender === dposContract, 'Chain.msg.sender != dpos contract(' + dposContract + ').');

    resetStatus(); 
    if(false !== loadObj(withdrawKey)){
        Chain.del(withdrawKey);
    }
    Chain.tlog('receivedPledge', Chain.msg.coinAmount);
}

function coExtract(list){
    let allReward = getReward();
    if(allReward !== '0'){
        distribute(allReward);
    }

    if(list === undefined){
        let profit = cobuilders[Chain.tx.sender][award];
        cobuilders[Chain.tx.sender][award] = '0';
        saveObj(cobuildersKey, cobuilders);
        transferCoin(Chain.tx.sender, profit);
        return Chain.tlog('coExtract', Chain.tx.sender, profit);
    }

    assert(typeof list === 'object', 'Wrong parameter type.');
    assert(list.length <= 100, 'The award-receiving addresses:' + list.length + ' exceed upper limit:100.');

    let i = 0;
    for(i = 0; i < list.length; i += 1){
        let gain = cobuilders[list[i]][award];
        cobuilders[list[i]][award] = '0';
        transferCoin(list[i], gain);
        Chain.tlog('coExtract', list[i], gain);
    }

    saveObj(cobuildersKey, cobuilders);
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
        result.transferShares = Chain.load(key);
    }

    return JSON.stringify(result);
}

function main(input_str){
    let input  = JSON.parse(input_str);
    let params = input.params;

    prepare();

    if(states.disabled && input.method !== 'revoke'){
        return 'Co-build is disband.';
    }

    if(input.method === 'subscribe'){
	    subscribe(params.shares);
    }
    else if(input.method === 'revoke'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
	    revoke();
    }
    else if(input.method === 'coApply'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
        coApply(params.role, params.pool, params.ratio, params.node);
    }
    else if(input.method === 'coAppend'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
        coAppend();
    }
    else if(input.method === 'coSetNodeAddress'){
	    coSetNodeAddress(params.address);
    }
    else if(input.method === 'coSetVoteDividend'){
        coSetVoteDividend(params.role, params.pool, params.ratio);
    }
    else if(input.method === 'transfer'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    	transfer(params.to, params.shares);
    }
    else if(input.method === 'accept'){
    	accept(params.transferor);
    }
    else if(input.method === 'coExtract'){
        coExtract(params !== undefined ? params.list : params);
    }
    else if(input.method === 'coWithdraw'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    	coWithdraw();
    }
    else if(input.method === 'poll'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
	    poll();
    }
    else if(input.method === 'takeback'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    	takeback();
    }
    else if(input.method === 'reward'){
        distribute(Chain.msg.coinAmount);
        Chain.tlog('reward', Chain.msg.coinAmount);
    }
    else if(input.method === 'refund'){
        received();
    }
}

function init(input_str){
    let params = JSON.parse(input_str).params;
    Utils.assert(typeof params.unit === 'number' && params.unit % oneBU === 0, 'Illegal unit:' + params.unit + '.');
    Utils.assert(typeof params.shares === 'number'&& params.shares % 1 === 0, 'Illegal raise shares:' + params.shares + '.');

    let dpos_cfg = queryDposCfg();
    let bail = Utils.int64Sub(Chain.msg.coinAmount, dpos_cfg.base_reserve);
    Utils.assert(Utils.int64Compare(bail, minInitAmount) >= 0, 'Initiating funds <= ' + minInitAmount + '.');
    Utils.assert(Utils.int64Mod(bail, params.unit) === 0, '(Initiating funds - base_reserve) % unit != 0.');

    cfg = {
        'initiator'   : Chain.tx.sender,
        'unit'        : params.unit,
        'raiseShares' : params.shares
    };
    saveObj(configKey, cfg);

    let initShare = Utils.int64Div(Chain.msg.coinAmount, cfg.unit);
    cobuilders[Chain.tx.sender] = cobuilder(initShare);
    saveObj(cobuildersKey, cobuilders);

    states = {
        'disabled':false,
        'applied': false,
        'allShares': initShare,
        'pledgedShares': '0'
    };
    saveObj(statesKey, states);
}
