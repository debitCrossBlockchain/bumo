'use strict';

const stakeKey          = 'all_stake';
const rewardKey         = 'reward_distribute';
const configKey         = 'dpos_config';
const kolCandsKey       = 'kol_candidates';
const committeeKey      = 'committee';
const validatorCandsKey = 'validator_candidates';

const role = {
    'COMMITTEE' : 'committee',
    'VALIDATOR' : 'validator',
    'KOL'       : 'kol'
};

const motion = {
    'APPLY'   : 'apply',
    'ABOLISH' : 'abolish',
    'WITHDRAW': 'withdraw',
    'CONFIG'  : 'config'
};

let elect  = {};
let cfg    = {};
let feeCfg ={'gas_price': 1, 'base_reserve': 2};
let distributed = false;

function doubleSort(a, b){
    let com = Utils.int64Compare(b[1], a[1]) ;

    if(com === 0){
        return a[0] > b[0] ? 1 : -1;
    }

    return com;
}

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
}

function minusStake(amount){
    elect.allStake = Utils.int64Sub(elect.allStake, amount);
    Chain.store(stakeKey, elect.allStake);
}

function transferCoin(dest, amount, input){
    if(amount === '0'){
        return true; 
    }

    minusStake(amount);
    Chain.payCoin(dest, amount, input);
}

function electInit(){
    elect.distribution = loadObj(rewardKey);
    Utils.assert(elect.distribution !== false, 'Failed to get ' + rewardKey + ' from metadata.');

    elect.balance = Chain.getBalance(Chain.thisAddress);
    Utils.assert(elect.balance !== false, 'Failed to get account balance.');

    elect.validatorCands = loadObj(validatorCandsKey);
    Utils.assert(elect.validatorCands !== false, 'Failed to get ' + elect.validatorCands + ' from metadata.');

    elect.kolCands = loadObj(kolCandsKey);
    Utils.assert(elect.kolCands !== false, 'Failed to get ' + kolCandsKey + ' from metadata.');

    elect.validators = elect.validatorCands.slice(0, cfg.validator_size);
    elect.kols       = elect.kolCands.slice(0, cfg.kol_size);
}

function distribute(twoDimenList, allReward){
    if (twoDimenList.length === 0){
        return false;
    }
	
    let i = 0;
    let reward = Utils.int64Div(allReward, twoDimenList.length);
    for(i = 0; i < twoDimenList.length; i += 1){
        let name = twoDimenList[i][0];
        elect.distribution[name][0] = Utils.int64Add(elect.distribution[name][0], reward);
    }

    let left   = Utils.int64Mod(allReward, twoDimenList.length);
    let topOne = elect.distribution[twoDimenList[0][0]];
    topOne[0]  = Utils.int64Add(topOne[0], left);

    return true;
}

function rewardDistribution(){
    let reward = Utils.int64Sub(elect.balance, elect.allStake);
    if(reward === '0'){
        return;
    }

    let centi = Utils.int64Div(reward, 100);
    let rValForm = Utils.int64Mul(centi, cfg.reward_allocation_share[0]);
    let rValCand = Utils.int64Mul(centi, cfg.reward_allocation_share[1]);
    let rKolForm = Utils.int64Mul(centi, cfg.reward_allocation_share[2]);
    let rKolCand = Utils.int64Mul(centi, cfg.reward_allocation_share[3]);

    let kolCandidates = elect.kolCands.slice(cfg.kol_size);
    let valCandidates = elect.validatorCands.slice(cfg.validator_size);

    rKolForm = distribute(kolCandidates, rKolCand) ? rKolForm : Utils.int64Add(rKolForm, rKolCand);
    rValForm = distribute(elect.kols, rKolForm)    ? rValForm : Utils.int64Add(rValForm, rKolForm);
    rValForm = distribute(valCandidates, rValCand) ? rValForm : Utils.int64Add(rValForm, rValCand);
    distribute(elect.validators, rValForm);

    let left = Utils.int64Mod(reward, 100);
    let topOne = elect.distribution[elect.validators[0][0]];
    topOne[0] = Utils.int64Add(topOne[0], left);
    distributed = true;

    elect.allStake = elect.balance;
    saveObj(stakeKey, elect.allStake);
    Chain.tlog('rewardDistribution', reward, Chain.msg.sender);
}

function rewardInput(){
    return JSON.stringify({ 'method' : 'reward' });
}

function award(address){
    let element = elect.distribution[address];
    if(element === undefined || element[0] === '0'){
        return;
    }

    if(element[2] === 0){
        transferCoin(address, element[0], rewardInput());
        Chain.tlog('award', address, element[0], element[1], '0');
    }
    else if(element[2] === 100){
        transferCoin(element[1], element[0], rewardInput());
        Chain.tlog('award', address, '0', element[1], element[0]);
    }
    else{
        let onePercent = Utils.int64Div(element[0], 100);
        let dividend   = Utils.int64Mul(onePercent, element[2]);
        transferCoin(element[1], dividend, rewardInput());

        let reserve = Utils.int64Sub(element[0], dividend);
        transferCoin(address, reserve, rewardInput());
        Chain.tlog('award', address,  reserve, element[1], dividend);
    }

    elect.distribution[address][0] = '0';
    distributed = true;

    if(elect.validatorCands.find(function(x){ return x[0] === address; }) === undefined &&
       elect.kolCands.find(function(x){ return x[0] === address; }) === undefined){
        delete elect.distribution[address];
    }
}

function extract(list){
    electInit();
    rewardDistribution();

    if(list === undefined){
        return award(Chain.msg.sender);
    }

    assert(typeof list === 'object', 'Wrong parameter type.');
    assert(list.length <= 100, 'The award-receiving addresses:' + list.length + ' exceed upper limit:100.');

    let i = 0;
    for(i = 0; i < list.length; i += 1){
        award(list[i]);
    }
}

function proposalKey(operate, content, address){
    return operate + '_' + content + '_' + address;
}

function applicationProposal(roleType, pool, ratio, node){
    let proposal = {
        'pledge':Chain.msg.coinAmount,
        'expiration':Chain.block.timestamp + cfg.valid_period,
        'ballot':[]
    };

    if(roleType === role.COMMITTEE){
        return proposal;
    }

    Utils.assert(Utils.addressCheck(pool), 'Invalid address:' + pool + '.');
    Utils.assert(0 <= ratio && ratio <= 100 && ratio % 1 === 0, 'Invalid vote reward ratio:' + ratio + '.');

    proposal.rewardPool = pool;
    proposal.rewardRatio = ratio;
    if(roleType === role.KOL){
        return proposal;
    }

    Utils.assert(Utils.addressCheck(node), 'Invalid address:' + node + '.');
    proposal.node = node;
    return proposal;
}

function checkPledge(roleType){
    let com = -1;

    if(roleType === role.VALIDATOR){
        com = Utils.int64Compare(Chain.msg.coinAmount, cfg.validator_min_pledge);
        Utils.assert(com === 0 || com === 1, 'The pledge:' + Chain.msg.coinAmount + ' is less than the minimum requirement:' + cfg.validator_min_pledge +  ' of the validator.');
    }
    else if(roleType === role.KOL){
        com = Utils.int64Compare(Chain.msg.coinAmount, cfg.kol_min_pledge);
        Utils.assert(com === 0 || com === 1, 'The pledge:' + Chain.msg.coinAmount + ' is less than the minimum requirement:' + cfg.kol_min_pledge + ' of the KOL.');
    }
    else if(roleType === role.COMMITTEE){
        Utils.assert(Chain.msg.coinAmount === '0', 'No pledge is required to apply to join the committee.');
    }
    else{
        throw 'Unkown role:' + roleType + '.';
    }
}

function updateValidators(candidates){
    let validators = candidates.slice(0, cfg.validator_size);

    let i = 0;
    for(i = 0; i < validators.length; i += 1){
        validators[i][0] = validators[i][2];
        validators[i].splice(2, 1);
    }

    setValidators(JSON.stringify(validators));
    Chain.tlog('updateValidators', validators.length);
}

function addCandidates(roleType, address, proposal, maxSize){
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let stake = Utils.int64Mul(proposal.pledge, cfg.pledge_magnification);
	let com = -1;

	if(candidates.length > 0) {
    	com = Utils.int64Compare(stake, candidates[candidates.length - 1][1]);
	}

    if(candidates.length >= maxSize && com <= 0){
        return;
    }

    rewardDistribution();

    let addition = [address, stake];
    if(roleType === role.VALIDATOR){
        addition.push(proposal.node);
    }

    let size = candidates.push(addition);
    let found = candidates[size - 1];
    if(elect.distribution[address] === undefined){
        elect.distribution[address] = ['0', proposal.rewardPool, proposal.rewardRatio];
        distributed = true;
    }
    Chain.tlog('addCandidate', address, roleType);

    candidates.sort(doubleSort);
    if(candidates.length > maxSize){
        candidates = candidates.slice(0, maxSize);
    }

    let key = roleType === role.VALIDATOR ? validatorCandsKey : kolCandsKey;
    saveObj(key, candidates);

    if(roleType === role.VALIDATOR && candidates.indexOf(found) < cfg.validator_size){
        updateValidators(candidates);
    }
}

function deleteCandidate(roleType, address){
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found      = candidates.find(function(x){ return x[0] === address; });
    if(found === undefined){
        return; 
    }

    rewardDistribution();

    let index = candidates.indexOf(found);
    candidates.splice(index, 1);
    candidates.sort(doubleSort);
    Chain.tlog('deleteCandidate', address, roleType);

    let key = roleType === role.VALIDATOR ? validatorCandsKey : kolCandsKey;
    saveObj(key, candidates);

    if(roleType === role.VALIDATOR && index < cfg.validator_size){
        updateValidators(candidates);
    }
}

function updateStake(roleType, candidate, formalSize, amount){
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;

    let oldPos   = candidates.indexOf(candidate);
    candidate[1] = Utils.int64Add(candidate[1], amount);
    candidates.sort(doubleSort);
    let newPos = candidates.indexOf(candidate);
    Chain.tlog('updateStake', candidate[0], roleType, amount);

    let key = roleType === role.VALIDATOR ? validatorCandsKey : kolCandsKey;
    saveObj(key, candidates);

    if((oldPos >= formalSize && newPos < formalSize) ||
       (oldPos < formalSize && newPos >= formalSize)){
        rewardDistribution();

        if(roleType === role.VALIDATOR){
            updateValidators(candidates);
        }
    }
}

function roleValid(roleType){
    return roleType === role.COMMITTEE || roleType === role.VALIDATOR || roleType === role.KOL;
}

function apply(roleType, pool, ratio, node){
    Utils.assert(roleValid(roleType), 'Unknown role:' + roleType + '.');

    let key      = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
    let proposal = loadObj(key);
    Utils.assert(proposal === false, Chain.msg.sender + ' has applied to become a ' + roleType + '.');

    checkPledge(roleType);
    if(roleType === role.COMMITTEE){
        proposal = applicationProposal(roleType);
        Chain.tlog('apply', Chain.msg.sender, roleType);
    }
    else if(roleType === role.KOL){
        proposal = applicationProposal(roleType, pool||Chain.msg.sender, ratio||0);
        Chain.tlog('apply', Chain.msg.sender, roleType, pool||Chain.msg.sender, ratio||0);
    }
    else{
        proposal = applicationProposal(roleType, pool||Chain.msg.sender, ratio||0, node||Chain.msg.sender);
        Chain.tlog('apply', Chain.msg.sender, roleType, pool||Chain.msg.sender, ratio||0, node||Chain.msg.sender);
    }

    saveObj(key, proposal);
}

function append(roleType){
    Utils.assert(roleValid(roleType), 'Unknown role:' + roleType + '.');

    let key      = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
    let proposal = loadObj(key);

    Utils.assert(proposal !== false, Chain.msg.sender + ' has not yet applied to become a ' + roleType + '.');
    Utils.assert( Chain.block.timestamp < proposal.expiration || proposal.passTime !== undefined, 'Application has expired.');
    Utils.assert(Utils.int64Mod(Chain.msg.coinAmount, cfg.vote_unit) === '0', 'The amount of additional pledge must be an integer multiple of ' + cfg.vote_unit + '.');

    proposal.pledge = Utils.int64Add(proposal.pledge, Chain.msg.coinAmount);
    saveObj(key, proposal);
    Chain.tlog('append', Chain.msg.sender, roleType, Chain.msg.coinAmount);
    if(proposal.passTime === undefined){ 
        /* Additional deposit, not yet approved */
        return true;
    }

    /* Approved, additional deposit */
    Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Only the validator and KOL can add a deposit.');

    electInit();
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found = candidates.find(function(x){ return x[0] === Chain.msg.sender; });

    if(found === undefined){
        let maxSize = roleType === role.VALIDATOR ? cfg.validator_candidate_size : cfg.kol_candidate_size;
        addCandidates(roleType, Chain.msg.sender, proposal, maxSize);
    }
    else{
        let formalSize = roleType === role.VALIDATOR ? cfg.validator_size : cfg.kol_size;
        let stake = Utils.int64Mul(Chain.msg.coinAmount, cfg.pledge_magnification);
        updateStake(roleType, found, formalSize, stake);
    }
}

function penaltyKey(evil, roleType){
    return 'penalty_' + roleType + '_' + evil;
}

function penalty(evil, roleType){
    let key = proposalKey(motion.APPLY, roleType, evil);
    let proposal = loadObj(key);

    if(proposal === false){
        key = proposalKey(motion.WITHDRAW, roleType, evil);
        proposal = loadObj(key);
    }

    Utils.assert(proposal !== false, 'Failed to get ' + key + ' from metadata.');
    Chain.del(key);

    let allAsset = proposal.pledge;
    if(elect.distribution[evil] !== undefined){
        allAsset = Utils.int64Add(proposal.pledge, elect.distribution[evil][0]);
        delete elect.distribution[evil];
        distributed = true;
    }

    Chain.store(penaltyKey(evil, roleType), allAsset);
    Chain.tlog('penalty', evil, roleType, allAsset);
}

function updateCfg(key, proposal, item){
    Chain.del(key);
    cfg[item] = proposal.value;
    saveObj(configKey, cfg);

    if(feeCfg[item] !== undefined){
        let sys = {};
        sys[feeCfg[item]] = proposal.value;
        configFee(JSON.stringify(sys));
    }

    Chain.tlog('updateConfigure', key, item);
}

function passIn(committee, key, proposal, item, address){
    proposal.passTime = Chain.block.timestamp;
    saveObj(key, proposal);

    if(item === role.COMMITTEE){
        if(committee.length < cfg.committee_size){
            committee.push(address);
            saveObj(committeeKey, committee);
        }
    }
    else{
        electInit();
        let maxSize = item === role.VALIDATOR ? cfg.validator_candidate_size : cfg.kol_candidate_size;
        addCandidates(item, address, proposal, maxSize);
    }
}

function passOut(committee, key, item, address){
    Chain.del(key);

    if(item === role.COMMITTEE){
        Utils.assert(committee.includes(address), 'There is no '+ address + ' in the committee.');
        committee.splice(committee.indexOf(address), 1);
        saveObj(committeeKey, committee);
    }
    else{
        electInit();
        deleteCandidate(item, address);
        penalty(address, item);
    }
}

function operateValid(operate){
    return operate === motion.APPLY || operate === motion.ABOLISH || operate === motion.CONFIG;
}

function refundInput(){
    return JSON.stringify({ 'method' : 'refund' });
}

function approve(operate, item, address){
    Utils.assert(operateValid(operate), 'Unknown proposal operation:' + operate + '.');
    Utils.assert(roleValid(item) || cfg[item] !== undefined, 'Unknown proposal item:' + item + '.');
    Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');

    let committee = loadObj(committeeKey);
    Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
    Utils.assert(committee.includes(Chain.msg.sender), 'Only committee members have the right to approve.');

    let key = proposalKey(operate, item, address);
    let proposal = loadObj(key);
    Utils.assert(proposal !== false, 'Failed to get ' + key + ' from metadata.');
    Utils.assert(proposal.passTime === undefined, 'The ' + key + ' proposal has been approved.');

    if(Chain.block.timestamp >= proposal.expiration){
        return false;
    }

    Utils.assert(proposal.ballot.includes(Chain.msg.sender) !== true, Chain.msg.sender + ' has voted.');
    proposal.ballot.push(Chain.msg.sender);

    if(proposal.ballot.length <= parseInt(committee.length * cfg.pass_rate)){
        return saveObj(key, proposal);
    }

    Chain.tlog('approved', operate, item, address);
    if(operate === motion.CONFIG){
        updateCfg(key, proposal, item);
    }
    else if(operate === motion.APPLY){
        passIn(committee, key, proposal, item, address);
    }
    else if(operate === motion.ABOLISH){
        passOut(committee, key, item, address);
    }
}

function voterKey(roleType, candidate, voter){
    let addr = voter || Chain.msg.sender;
    return  'voter_' + addr + '_' + roleType + '_' + candidate;
}

function vote(roleType, address){
    Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL,  'Illegal role:' + roleType + '.');
    Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');
    Utils.assert(Utils.int64Mod(Chain.msg.coinAmount, cfg.vote_unit) === '0', 'The number of votes must be an integer multiple of ' + cfg.vote_unit + '.');

    let key        = voterKey(roleType, address);
    let voteAmount = Chain.load(key);

    if(voteAmount === false){
        voteAmount = Chain.msg.coinAmount;
    }
    else{
        voteAmount = Utils.int64Add(voteAmount, Chain.msg.coinAmount);
    }

    Chain.store(key, voteAmount);
    Chain.tlog('vote', Chain.msg.sender, roleType, address, Chain.msg.coinAmount);

    electInit();
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found      = candidates.find(function(x){ return x[0] === address; });

    Utils.assert(found !== undefined, address + ' is not a validator candidate or KOL candidate.');
    let formalSize = roleType === role.VALIDATOR ? cfg.validator_size : cfg.kol_size;
    updateStake(roleType, found, formalSize, Chain.msg.coinAmount);
}

function unVote(roleType, address){
    Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Illegal role:' + roleType + '.');
    Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');

    let key    = voterKey(roleType, address);
    let amount = Chain.load(key);
    Utils.assert(amount !== false, 'The account: ' + Chain.msg.sender + ' has not voted for: ' + address + '.');

    Chain.del(key);
    transferCoin(Chain.msg.sender, amount);
    Chain.tlog('unVote', Chain.msg.sender, roleType, address, amount);

    electInit();
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found      = candidates.find(function(x){ return x[0] === address; });
    if(found === undefined){
        return true;
    }

    let formalSize = roleType === role.VALIDATOR ? cfg.validator_size : cfg.kol_size;
    updateStake(roleType, found, formalSize, '-' + amount);
}

function abolitionProposal(proof){
    let proposal = {
        'Informer': Chain.msg.sender,
        'reason': proof,
        'expiration': Chain.block.timestamp + cfg.valid_period,
        'ballot': [Chain.msg.sender]
    };

    return proposal;
}

function isExist(twoDimenList, address){
    let element = twoDimenList.find(function(x){
        return x[0] === address;
    });

    return element !== undefined;
}

function reportPermission(roleType){
    if(roleType === role.COMMITTEE){
        let committee = loadObj(committeeKey);
        Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
        Utils.assert(committee.includes(Chain.msg.sender), 'Only committee members have the right to report illegal practices.');
    }
    else if(roleType === role.VALIDATOR){
        let validatorCands = loadObj(validatorCandsKey);
        Utils.assert(validatorCands !== false, 'Failed to get ' + validatorCandsKey + ' from metadata.');

        let validators = validatorCands.slice(0, cfg.validator_size);
        Utils.assert(isExist(validators, Chain.msg.sender), 'Only validators have the right to report illegal practices.');
    }
    else if(roleType === role.KOL){
        let kolCands = loadObj(kolCandsKey);
        Utils.assert(kolCands !== false, 'Failed to get ' + kolCandsKey + ' from metadata.');

        let kols = kolCands.slice(0, cfg.kol_size);
        Utils.assert(isExist(kols, Chain.msg.sender), 'Only KOLs have the right to report illegal practices.');
    }
    else{
        throw 'Unkown role:' + roleType + '.';
    }

    return true;
}

function abolish(roleType, address, proof){
    reportPermission(roleType);
    Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');
    Utils.assert(typeof proof === 'string', 'Proof must be a string.');

    let applyKey      = proposalKey(motion.APPLY, roleType, address);
    let applyProposal = loadObj(applyKey);
    Utils.assert(applyProposal.passTime !== undefined, address + ' can not be abolished.');

    let key      = proposalKey(motion.ABOLISH, roleType, address);
    let proposal = loadObj(key);

    if(proposal === false){
        proposal = abolitionProposal(proof);
        saveObj(key, proposal);
    }

    proposal.expiration = Chain.block.timestamp + cfg.valid_period;
    saveObj(key, proposal);
    Chain.tlog('abolish', Chain.msg.sender, roleType, address, proof);
}

function exitProposal(exiter, pledge){
    let proposal = {
        'exiter': exiter,
        'pledge': pledge,
        'expiration': Chain.block.timestamp + cfg.valid_period
    };

    return proposal;
}

function withdraw(roleType){
    Utils.assert(roleValid(roleType), 'Unknown role:' + roleType + '.');

    if(roleType === role.COMMITTEE){
        let committee = loadObj(committeeKey);
        Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
        Utils.assert(committee.includes(Chain.msg.sender), 'There is no '+ Chain.msg.sender + ' in the committee.');
        Utils.assert(committee.length >= 2, 'Inadequate committee members.');

        let applyKey = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
        Chain.del(applyKey);
        committee.splice(committee.indexOf(Chain.msg.sender), 1);
        return saveObj(committeeKey, committee);
    }

    let exitKey = proposalKey(motion.WITHDRAW, roleType, Chain.msg.sender);
    let exitInfo = loadObj(exitKey);
    if(exitInfo === false){
        let applicantKey = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
        let applicant    = loadObj(applicantKey);
        Utils.assert(applicant !== false, 'Failed to get ' + applicantKey + ' from metadata.');

        Chain.del(applicantKey);
        if(applicant.passTime === undefined){
            transferCoin(Chain.msg.sender, applicant.pledge, refundInput());
            return Chain.tlog('withdraw', Chain.msg.sender, roleType, applicant.pledge);
        }

        electInit();
        deleteCandidate(roleType, Chain.msg.sender);
        saveObj(exitKey, exitProposal(Chain.msg.sender, applicant.pledge));
        return Chain.tlog('withdraw', Chain.msg.sender, roleType);
    }
	
    Utils.assert(Chain.block.timestamp >= exitInfo.expiration, 'Buffer period is not finished.');

    Chain.del(exitKey);
    transferCoin(Chain.msg.sender, exitInfo.pledge, refundInput());
    Chain.tlog('withdraw', Chain.msg.sender, roleType, exitInfo.pledge);
}

function configProposal(item, value){
    let proposal = {
        'item': item,
        'value': value,
        'expiration':Chain.block.timestamp + cfg.valid_period,
        'ballot':[Chain.msg.sender]
    };

    return proposal;
}

function cfgValid(item, value){
    Utils.assert(cfg[item] !== undefined, 'Unknown configuration item:' + item + '.');

    if(item === 'reward_allocation_share'){
        return Utils.assert(value[0] + value[1] + value[2] + value[3] === 100, 'Reward allocation is invalid.');
    }

    if(item === 'logic_contract'){
        return Utils.assert(Utils.addressCheck(value), 'Invalid address:' + value + '.');
    }

    Utils.assert(typeof value === 'number' && value > 0, 'Illegal configuration value: ' + value + '.');

    if(item === 'pass_rate'){
        Utils.assert(value <= 1, 'Invalid passing rate: ' + value + '.');
    }
    else{
        Utils.assert(value % 1 === 0, 'Illegal configuration value: ' + value + '.'); 
    }
}

function configure(item, value){
    cfgValid(item, value);

    let committee = loadObj(committeeKey);
    Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
    Utils.assert(committee.includes(Chain.msg.sender), 'Only the committee has the right to propose to modify the configuration.');

    let key      = proposalKey(motion.CONFIG, item, Chain.msg.sender);
    let proposal = loadObj(key);
    if(proposal !== false && proposal.value === value){
        return;
    }

    proposal = configProposal(item, value);
    saveObj(key, proposal);
    Chain.tlog('configure', Chain.msg.sender, item, value);
}

function setNodeAddress(address){
    Utils.assert(Utils.addressCheck(address),  'Invalid address:' + address + '.');

    let key      = proposalKey(motion.APPLY, role.VALIDATOR, Chain.msg.sender);
    let proposal = loadObj(key);
    Utils.assert(proposal !== false, Chain.msg.sender + ' has not applied to become a validator.');

    proposal.node = address;
    saveObj(key, proposal);

    let candidates = loadObj(validatorCandsKey);
    Utils.assert(candidates !== false, 'Failed to get ' + validatorCandsKey + ' from metadata.');

    let found = candidates.find(function(x){ return x[0] === Chain.msg.sender; });
    if(found === undefined){
        return false; 
    }
    
    found[2] = address;
    saveObj(validatorCandsKey, candidates);
    Chain.tlog('setNodeAddress', Chain.msg.sender, address);

    if(candidates.indexOf(found) < cfg.validator_size){
        updateValidators(candidates);
    }
}

function setVoteDividend(roleType, pool, ratio){
    Utils.assert(roleValid(roleType), 'Unknown role:' + roleType + '.');

    let key      = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
    let proposal = loadObj(key);
    Utils.assert(proposal !== false, 'Failed to get ' + key + ' from metadata.');

    elect.distribution = loadObj(rewardKey);
    Utils.assert(elect.distribution !== false, 'Failed to get ' + rewardKey + ' from metadata.');

    if(pool !== undefined){
        Utils.assert(Utils.addressCheck(pool), 'Invalid address:' + pool + '.');
        proposal.rewardPool = pool;
        elect.distribution[Chain.msg.sender][1] = pool;
    }
    
    if(ratio !== undefined){
        Utils.assert(0 <= ratio && ratio <= 100 && ratio % 1 === 0, 'Invalid vote reward ratio:' + ratio + '.');
        proposal.rewardRatio = ratio;
        elect.distribution[Chain.msg.sender][2] = ratio;
    }

    saveObj(key, proposal);
    saveObj(rewardKey, elect.distribution);
    Chain.tlog('setVoteDividend', pool||proposal.rewardPool, ratio||proposal.rewardRatio);
}

function clean(operate, item, address){
    Utils.assert(operateValid(operate), 'Unknown proposal operation:' + operate + '.');
    Utils.assert(roleValid(item) || cfg[item] !== undefined, 'Unknown proposal item:' + item + '.');
    Utils.assert(Utils.addressCheck(address),  'Invalid address:' + address + '.');

    let key = proposalKey(operate, item, address);
    let proposal = loadObj(key);
    Utils.assert(proposal !== false, 'Failed to get ' + key + ' from metadata.');
    Utils.assert(Chain.block.timestamp >= proposal.expiration && proposal.passTime === undefined, 'The proposal is still valid.');

    Chain.del(key);
    /*operate === motion.APPLY || operate === motion.WITHDRAW*/
    if(proposal.pledge > 0){
        transferCoin(address, proposal.pledge, refundInput());
    }

    Chain.tlog('clean', operate, item, address);
}

function calculateReward(){
    cfg = loadObj(configKey);
    Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');
    elect.allStake = loadObj(stakeKey);
    Utils.assert(elect.allStake !== false, 'Failed to get ' + stakeKey + ' from metadata.');

    electInit();
    let reward = Utils.int64Sub(elect.balance, elect.allStake);
    if(reward === '0'){
        return;
    }

    let centi = Utils.int64Div(reward, 100);
    let rValForm = Utils.int64Mul(centi, cfg.reward_allocation_share[0]);
    let rValCand = Utils.int64Mul(centi, cfg.reward_allocation_share[1]);
    let rKolForm = Utils.int64Mul(centi, cfg.reward_allocation_share[2]);
    let rKolCand = Utils.int64Mul(centi, cfg.reward_allocation_share[3]);

    let kolCandidates = elect.kolCands.slice(cfg.kol_size);
    let valCandidates = elect.validatorCands.slice(cfg.validator_size);

    rKolForm = distribute(kolCandidates, rKolCand) ? rKolForm : Utils.int64Add(rKolForm, rKolCand);
    rValForm = distribute(elect.kols, rKolForm)    ? rValForm : Utils.int64Add(rValForm, rKolForm);
    rValForm = distribute(valCandidates, rValCand) ? rValForm : Utils.int64Add(rValForm, rValCand);
    distribute(elect.validators, rValForm);

    let left = Utils.int64Mod(reward, 100);
    let topOne = elect.distribution[elect.validators[0][0]];
    topOne[0] = Utils.int64Add(topOne[0], left);

    return elect.distribution;
}

function query(input_str){
    let input  = JSON.parse(input_str);
    let params = input.params;

    let result = {};
    if(input.method === 'getProposal') {
        let pKey = proposalKey(params.operate, params.item, params.address);
        result.proposal = loadObj(pKey);
    }
    else if(input.method === 'getVoteInfo'){
        let vKey = voterKey(params.role, params.candidate, params.voter);
        result.voterInfo = loadObj(vKey);
    }
    else if(input.method === 'getValidators') {
        result.validators = getValidators();
    }
    else if(input.method === 'getValidatorCandidates') {
        result.validator_candidates = loadObj(validatorCandsKey);
    }
    else if(input.method === 'getKols') {
        let kolCands = loadObj(kolCandsKey);
        Utils.assert(kolCands !== false, 'Failed to get ' + kolCandsKey + ' from metadata.');

        result.kols = kolCands.slice(0, cfg.kol_size);
    }
    else if(input.method === 'getKolCandidates') {
        result.kol_candidates = loadObj(kolCandsKey);
    }
    else if(input.method === 'getCommittee') {
        result.committee = loadObj(committeeKey);
    }
    else if(input.method === 'getRewardDistribute') {
        result.reward = calculateReward();
    }
    else if(input.method === 'getConfiguration') {
        result.configuration = loadObj(configKey);
    }
    else{
       	throw 'Unknown operating: ' + input.method + '.';
    }

    return JSON.stringify(result);
}

function prepare(){
    cfg = loadObj(configKey);
    Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');

    elect.allStake = loadObj(stakeKey);
    Utils.assert(elect.allStake !== false, 'Failed to get ' + stakeKey + ' from metadata.');

    elect.allStake = Utils.int64Add(elect.allStake, Chain.msg.coinAmount);
    saveObj(stakeKey, elect.allStake);
}

function initProposal(roleType, pool, ratio, node){
    let proposal = {
        'pledge': '0',
        'expiration':Chain.block.timestamp + cfg.valid_period,
        'passTime':Chain.block.timestamp + cfg.valid_period,
        'ballot':[]
    };

    if(roleType === role.COMMITTEE){
        return proposal;
    }

    proposal.rewardPool = pool;
    proposal.rewardRatio = ratio;
    proposal.node = node;
    return proposal;
}

function initialization(params){
    cfg = {
        'gas_price'                : 1000,     /* 1 : gas_price, 1000 MO */
        'base_reserve'             : 1000000,  /* 2 : base_reserve, 100 0000 MO or 0.01 BU */
        'committee_size'           : 10,
        'kol_size'                 : 21,
        'kol_candidate_size'       : 100,
        'kol_min_pledge'           : 500000000000000,/* 500 0000 0000 0000 */
        'validator_size'           : 19,
        'validator_candidate_size' : 100,
        'validator_min_pledge'     : 500000000000000,/* 500 0000 0000 0000 */
        'pledge_magnification'     : 2,
        'pass_rate'                : 0.5,
        'valid_period'             : 1296000000000,  /* 15 * 24 * 60 * 60 * 1000 * 1000 */
        'vote_unit'                : 1000000000,     /* 10 0000 0000 */
        'reward_allocation_share'  : [50,6,40,4],    /* validators 50%, validator candidates 6%, kols 40%, kol candidates 4% */
        'logic_contract'           : params.logic_contract
    };
    saveObj(configKey, cfg);

    Utils.assert(Utils.int64Compare(params.committee.length, cfg.committee_size) <= 0, 'The committee size is exceeded.');

    let i = 0;
    for(i = 0; i < params.committee.length; i += 1){
        Utils.assert(Utils.addressCheck(params.committee[i]), 'Invalid address:' + params.committee[i] + '.');

        let proposalC = initProposal(role.COMMITTEE);
        saveObj(proposalKey(motion.APPLY, role.COMMITTEE, params.committee[i]), proposalC);
    }
    saveObj(committeeKey, params.committee);

    let validators = getValidators();
    Utils.assert(validators !== false, 'Failed to get validators.');

    let j = 0;
    let dist = {};
    for(j = 0; j < validators.length; j += 1){
        let proposalV = initProposal(role.VALIDATOR, validators[j][0], 0, validators[j][0]);
        saveObj(proposalKey(motion.APPLY, role.VALIDATOR, validators[j][0]), proposalV);

        validators[j][2] = validators[j][0];
        dist[validators[j][0]] = ['0', validators[j][0], 0];
    }
    saveObj(validatorCandsKey, validators.sort(doubleSort));

    saveObj(stakeKey, Chain.getBalance(Chain.thisAddress));
    saveObj(kolCandsKey, []);
    saveObj(rewardKey, dist);
    Chain.tlog('init', Chain.tx.sender, Chain.thisAddress, cfg.logic_contract);
}

function main(input_str){
    let input  = JSON.parse(input_str);
    let params = input.params;

    if(input.method === 'init'){
        return initialization(params);
    }

    prepare();

    if(input.method !== 'apply' && input.method !== 'append' && input.method !== 'vote'){
        Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
    }

    if(input.method === 'apply'){
        apply(params.role, params.pool, params.ratio, params.node);
    }
    else if(input.method === 'append'){
        append(params.role);
    }
    else if(input.method === 'approve'){
	    approve(params.operate, params.item, params.address);
    }
    else if(input.method === 'vote'){
	    vote(params.role, params.address);
    }
    else if(input.method === 'unVote'){
	    unVote(params.role, params.address);
    }
    else if(input.method === 'abolish'){
    	abolish(params.role, params.address, params.proof);
    }
    else if(input.method === 'withdraw'){
    	withdraw(params.role);
    }
    else if(input.method === 'extract'){
    	extract(params !== undefined ? params.list : params);
    }
    else if(input.method === 'configure'){
    	configure(params.item, params.value);
    }
    else if(input.method === 'setNodeAddress'){
	    setNodeAddress(params.address);
    }
    else if(input.method === 'setVoteDividend'){
        setVoteDividend(params.role, params.pool, params.ratio);
    }
    else if(input.method === 'clean'){
	    clean(params.operate, params.item, params.address);
    }
    else{
        throw 'Unknown operating: ' + input.method + '.';
    }

    if(distributed) {
        saveObj(rewardKey, elect.distribution);
    }
}

function init(input_str){
    return true;
}
