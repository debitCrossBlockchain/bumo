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
let feeCfg = ['1', '2']; /* 1 : gas_price, 2 : base_reserve */
let distributed = false;

function doubleSort(a, b){
    let com = Utils.int64Compare(b[1], a[1]) ;

    if(com === 0){
        return a[0] > b[0] ? 1 : -1;
    }

    return com;
}

function loadObj(key)
{
    let data = Chain.load(key);
    if(data !== false){
        return JSON.parse(data);
    }

    return false;
}

function saveObj(key, value)
{
    let str = JSON.stringify(value);
    Chain.store(key, str);
    Utils.log('Set key(' + key + '), value(' + str + ') in metadata succeed.');
}

function minusStake(amount){
    let stake = Utils.int64Sub(elect.allStake, amount);
    Chain.store(stakeKey, stake);
}

function transferCoin(dest, amount)
{
    if(amount === '0'){
        return true; 
    }

    minusStake(amount);
    Chain.payCoin(dest, String(amount));

    Utils.log('Pay coin( ' + amount + ') to dest account(' + dest + ') succeed.');
}

function electInit(){
    elect.distribution = loadObj(rewardKey);
    Utils.assert(elect.distribution !== false, 'Failed to get reward distribution table.');

    elect.balance = Chain.getBalance(Chain.thisAddress);
    Utils.assert(elect.balance !== false, 'Failed to get account balance.');

    elect.validatorCands = loadObj(validatorCandsKey);
    Utils.assert(elect.validatorCands !== false, 'Failed to get validator candidates.');

    elect.kolCands = loadObj(kolCandsKey);
    Utils.assert(elect.kolCands !== false, 'Failed to get kol candidates.');

    elect.validators = elect.validatorCands.slice(0, cfg.validator_size);
    elect.kols       = elect.kolCands.slice(0, cfg.kol_size);
}

function distribute(twoDimenList, allReward){
    if (twoDimenList.length === 0){
        return false;
    }
	
	Utils.log('Distribute reward ' + allReward + ' to ' + twoDimenList.length + ' address');
    let reward = Utils.int64Div(allReward, twoDimenList.length);

    let i = 0;
    for(i = 0; i < twoDimenList.length; i += 1){
        let name = twoDimenList[i][0];
        if(elect.distribution[name] === undefined){
            elect.distribution[name] = reward;
        }
        else{
            elect.distribution[name] = Utils.int64Add(elect.distribution[name], reward);
        }
    }

    let left       = Utils.int64Mod(allReward, twoDimenList.length);
    let element1st = elect.distribution[twoDimenList[0][0]];
    element1st     = Utils.int64Add(element1st, left);

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
    elect.distribution[elect.validators[0][0]] = Utils.int64Add(elect.distribution[elect.validators[0][0]], left);
    distributed = true;

    elect.allStake = elect.balance;
    saveObj(stakeKey, elect.allStake);
}

function extract(){
    electInit();
    rewardDistribution();

    let income = elect.distribution[Chain.msg.sender];
    elect.distribution[Chain.msg.sender] = '0';
    transferCoin(Chain.msg.sender, income);

    if(elect.validatorCands.find(function(x){ return x[0] === Chain.msg.sender; }) === undefined &&
       elect.kols.find(function(x){ return x[0] === Chain.msg.sender; }) === undefined){
        delete elect.distribution[Chain.msg.sender];
        distributed = true;
    }

    Utils.log(Chain.msg.sender + ' extracted block reward ' + income);
}

function proposalKey(operate, content, address){
    return operate + '_' + content + '_' + address;
}

function applicationProposal(node){
    let proposal = {
        'pledge':Chain.msg.coinAmount,
        'expiration':Chain.block.timestamp + cfg.valid_period,
        'ballot':[]
    };

    if(node !== undefined && Utils.addressCheck(node)){
        proposal.node = node;
    }

    return proposal;
}

function checkPledge(roleType){
    let com = -1;

    if(roleType === role.VALIDATOR){
        com = Utils.int64Compare(Chain.msg.coinAmount, cfg.validator_min_pledge);
        Utils.assert(com === 0 || com === 1, 'Quality deposit is less than the minimum pledge of validator.');
    }
    else if(roleType === role.KOL){
        com = Utils.int64Compare(Chain.msg.coinAmount, cfg.kol_min_pledge);
        Utils.assert(com === 0 || com === 1, 'Quality deposit is less than the minimum pledge of KOL.');
    }
    else if(roleType === role.COMMITTEE){
        Utils.assert(Chain.msg.coinAmount === '0', 'No deposit is required to apply to join the committee');
    }
    else{
        throw 'Unkown role type.';
    }
}

function getNodeSet(validators){
    let i = 0;
    for(i = 0; i < validators.length; i += 1){
        validators[i][0] = validators[i][2];
        validators[i].splice(2, 1);
    }

    return validators;
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

    candidates.sort(doubleSort);
    if(candidates.length > maxSize){
        candidates = candidates.slice(0, maxSize);
    }

    if(roleType === role.VALIDATOR && candidates.indexOf(found) < cfg.validator_size){
        let validators = candidates.slice(0, cfg.validator_size);
        validators     = getNodeSet(validators);
        setValidators(JSON.stringify(validators));
    }

    let key = roleType === role.VALIDATOR ? validatorCandsKey : kolCandsKey;
    return saveObj(key, candidates);
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

    if(roleType === role.VALIDATOR && index < cfg.validator_size){
        let validators = candidates.slice(0, cfg.validator_size);
        validators     = getNodeSet(validators);
        setValidators(JSON.stringify(validators));
    }

    let key = roleType === role.VALIDATOR ? validatorCandsKey : kolCandsKey;
    saveObj(key, candidates);
}

function updateStake(roleType, candidate, formalSize, amount){
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;

    let oldPos   = candidates.indexOf(candidate);
    candidate[1] = Utils.int64Add(candidate[1], amount);
    candidates.sort(doubleSort);
    let newPos = candidates.indexOf(candidate);

    if((oldPos > formalSize && newPos <= formalSize) ||
       (oldPos <= formalSize && newPos > formalSize)){
        rewardDistribution();

        if(roleType === role.VALIDATOR){
            let validators = candidates.slice(0, cfg.validator_size);
            validators     = getNodeSet(validators);
            setValidators(JSON.stringify(validators));
        }
    }

    let key = roleType === role.VALIDATOR ? validatorCandsKey : kolCandsKey;
    return saveObj(key, candidates);
}

function roleValid(roleType){
    return roleType === role.COMMITTEE || roleType === role.VALIDATOR || roleType === role.KOL;
}

function apply(roleType, node){
    Utils.assert(roleValid(roleType), 'Unknow role type.');

    let key      = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
    let proposal = loadObj(key);
    Utils.assert(proposal === false, Chain.msg.sender + ' has applied for a ' + roleType);

    checkPledge(roleType);
    if(roleType === role.VALIDATOR){
        proposal = applicationProposal(node || Chain.msg.sender);
    }
    else{
        proposal = applicationProposal();
    }
    return saveObj(key, proposal);
}

function append(roleType){
    let key      = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
    let proposal = loadObj(key);

    Utils.assert(proposal !== false, Chain.msg.sender + ' has not yet applied to become ' + roleType);
    Utils.assert(proposal.expiration < Chain.block.timestamp || proposal.passTime !== undefined, 'Application has expired.');
    Utils.assert(Utils.int64Mod(Chain.msg.coinAmount, cfg.vote_unit) === '0', 'The number of additional pledge must be an integer multiple of ' + cfg.vote_unit);

    proposal.pledge = Utils.int64Add(proposal.pledge, Chain.msg.coinAmount);
    saveObj(key, proposal);
    if(proposal.passTime === undefined){ 
        /* Additional deposit, not yet approved */
        return true;
    }

    /* Approved, additional deposit */
    Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Only the validator and KOL may add a deposit.');

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
        allAsset = Utils.int64Add(proposal.pledge, elect.distribution[evil]);
        delete elect.distribution[evil];
        distributed = true;
    }

    if(allAsset !== '0'){
        Chain.store('penalty_' + evil, allAsset);
    }
}

function updateCfg(key, proposal, item){
    Chain.del(key);
    cfg[item] = proposal.value;
    saveObj(configKey, cfg);

    if(feeCfg.includes(item)){
        let sys = {};
        sys[item] = proposal.value;
        configFee(JSON.stringify(sys));
    }
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
        Utils.assert(committee.includes(address), 'There is no '+ address + ' in the committee');
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

function approve(operate, item, address){
    Utils.assert(operateValid(operate), 'Unknown approve operation');
    Utils.assert(roleValid(item) || cfg[item] !== undefined, 'Unknown approve item.');
    Utils.assert(Utils.addressCheck(address), address + ' is not valid adress.');

    let committee = loadObj(committeeKey);
    Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
    Utils.assert(committee.includes(Chain.msg.sender), 'Only committee members have the right to approve.');

    let key = proposalKey(operate, item, address);
    let proposal = loadObj(key);
    Utils.assert(proposal !== false, 'failed to get metadata: ' + key + '.');

    if(Chain.block.timestamp >= proposal.expiration){
        Chain.del(key);
        if(operate === motion.APPLY && proposal.pledge > 0){
            transferCoin(address, proposal.pledge);
        }

        return;
    }

    Utils.assert(proposal.ballot.includes(Chain.msg.sender) !== true, Chain.msg.sender + ' has voted.');
    proposal.ballot.push(Chain.msg.sender);

    if(proposal.ballot.length <= parseInt(committee.length * cfg.pass_rate)){
        return saveObj(key, proposal);
    }

    if(operate === motion.CONFIG){
		Utils.log('Config of ' + item + ' proposal passed');
        updateCfg(key, proposal, item);
    }
    else if(operate === motion.APPLY){
		Utils.log('Apply proposal of ' + item + '_' + address + ' passed');
        passIn(committee, key, proposal, item, address);
    }
    else if(operate === motion.ABOLISH){
		Utils.log('Abolish proposal of ' + item + '_' + address + ' passed');
        passOut(committee, key, item, address);
    }
}

function voterKey(roleType, candidate, voter){
    let addr = voter || Chain.msg.sender;
    return  'voter_' + addr + '_' + roleType + '_' + candidate;
}

function vote(roleType, address){
    Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Can only vote for validator or KOL.');
    Utils.assert(Utils.addressCheck(address), address + ' is not valid adress.');
    Utils.assert(Utils.int64Mod(Chain.msg.coinAmount, cfg.vote_unit) === '0', 'The number of votes must be an integer multiple of ' + cfg.vote_unit);

    let key        = voterKey(roleType, address);
    let voteAmount = Chain.load(key);

    if(voteAmount === false){
        voteAmount = Chain.msg.coinAmount;
    }
    else{
        voteAmount = Utils.int64Add(voteAmount, Chain.msg.coinAmount);
    }

    Chain.store(key, voteAmount);

    electInit();
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found      = candidates.find(function(x){ return x[0] === address; });

    Utils.assert(found !== undefined, address + ' is not validator candidate or KOL candidate.');
    let formalSize = roleType === role.VALIDATOR ? cfg.validator_size : cfg.kol_size;
    updateStake(roleType, found, formalSize, Chain.msg.coinAmount);
}

function unVote(roleType, address){
    Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Can only vote for validator or KOL.');
    Utils.assert(Utils.addressCheck(address), address + ' is not valid adress.');

    let key    = voterKey(roleType, address);
    let amount = Chain.load(key);
    Utils.assert(amount !== false, 'The account did not vote for: ' + address);

    Chain.del(key);
    transferCoin(Chain.msg.sender, amount);

    electInit();
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found      = candidates.find(function(x){ return x[0] === address; });

    Utils.assert(found !== undefined, address + ' is not validator candidate or KOL candidate.');
    let formalSize = roleType === role.VALIDATOR ? cfg.validator_size : cfg.kol_size;
    updateStake(roleType, found, formalSize, -amount);
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
        Utils.assert(committee.includes(Chain.msg.sender), 'Only committee members have the right to report other committee member.');
    }
    else if(roleType === role.VALIDATOR){
        let validatorCands = loadObj(validatorCandsKey);
        Utils.assert(validatorCands !== false, 'Failed to get validator candidates.');

        let validators = validatorCands.slice(0, cfg.validator_size);
        Utils.assert(isExist(validators, Chain.msg.sender), 'Only validator have the right to report other validator.');
    }
    else if(roleType === role.KOL){
        let kolCands = loadObj(kolCandsKey);
        Utils.assert(kolCands !== false, 'Failed to get kol candidates.');

        let kols = kolCands.slice(0, cfg.kol_size);
        Utils.assert(isExist(kols, Chain.msg.sender), 'Only kol have the right to report other kol.');
    }
    else{
        throw 'Unkown abolish type.';
    }

    return true;
}

function abolish(roleType, address, proof){
    Utils.assert(Utils.addressCheck(address), address + ' is not valid adress.');
    Utils.assert(reportPermission(roleType), Chain.msg.sender + ' has no permission to report.');
    Utils.assert(typeof proof === 'string', 'Args type error, proof must be a string.');

    let key      = proposalKey(motion.ABOLISH, roleType, address);
    let proposal = loadObj(key);

    if(proposal === false){
        proposal = abolitionProposal(proof);
        saveObj(key, proposal);
    }

    proposal.expiration = Chain.block.timestamp + cfg.valid_period;
    saveObj(key, proposal);
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
    Utils.assert(roleValid(roleType), 'Unknow role type.');

    if(roleType === role.COMMITTEE){
        let committee = loadObj(committeeKey);
        Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
        Utils.assert(committee.includes(Chain.msg.sender), 'There is no '+ Chain.msg.sender + ' in the committee');

        let applyKey = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
        Chain.del(applyKey);
        committee.splice(committee.indexOf(Chain.msg.sender), 1);
        return saveObj(committeeKey, committee);
    }

    let exitKey = proposalKey(motion.WITHDRAW, roleType, Chain.msg.sender);
    let exitInfo = Chain.load(exitKey);
    if(exitInfo === false){
        electInit();
        deleteCandidate(roleType, Chain.msg.sender);

        let applicantKey = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
        let applicant    = loadObj(applicantKey);
        Utils.assert(applicant !== false, 'failed to get metadata: ' + applicantKey + '.');

        Chain.del(applicantKey);
        return saveObj(exitKey, exitProposal(Chain.msg.sender, applicant.pledge));
    }
	
	Utils.log('Chain.block.timestamp:' + Chain.block.timestamp + ' , expiration:' + exitInfo.expiration);
    Utils.assert(Chain.block.timestamp >= exitInfo.expiration, 'Buffer period is not over.');

    Chain.del(exitKey);
    transferCoin(Chain.msg.sender, exitInfo.pledge);
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

function configure(item, value){
    Utils.assert(cfg[item] !== undefined, 'Unknown config type');

    let committee = loadObj(committeeKey);
    Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
    Utils.assert(committee.includes(Chain.msg.sender), 'Only the committee has the power to proposal to modify the configuration.');

    let key      = proposalKey(motion.CONFIG, item, Chain.msg.sender);
    let proposal = loadObj(key);
    if(proposal !== false && proposal.value === value){
        return;
    }

    proposal = configProposal(item, value);
    return saveObj(key, proposal);
}

function switchNode(address){
    Utils.assert(Utils.addressCheck(address), address + ' is not valid adress.');

    let key      = proposalKey(motion.APPLY, role.VALIDATOR, Chain.msg.sender);
    let proposal = loadObj(key);
    Utils.assert(proposal !== false, Chain.msg.sender + ' has not applied to become a validator.');

    proposal.node = address;
    saveObj(key, proposal);

    let candidates = loadObj(validatorCandsKey);
    Utils.assert(candidates !== false, 'Failed to get validator candidates.');

    let found = candidates.find(function(x){ return x[0] === Chain.msg.sender; });
    if(found === undefined){
        return false; 
    }
    
    found[2] = address;
    saveObj(validatorCandsKey, candidates);

    if(candidates.indexOf(found) < cfg.validator_size){
        let validators = candidates.slice(0, cfg.validator_size);
        validators     = getNodeSet(validators);
        setValidators(JSON.stringify(validators));
    }
}

function clean(operate, item, address){
    Utils.assert(operateValid(operate), 'Unknown approve operation');
    Utils.assert(roleValid(item) || cfg[item] !== undefined, 'Unknown approve item.');
    Utils.assert(Utils.addressCheck(address), address + ' is not valid adress.');

    let key = proposalKey(operate, item, address);
    let proposal = loadObj(key);
    Utils.assert(proposal !== false, 'failed to get metadata: ' + key + '.');
    Utils.assert(Chain.block.timestamp >= proposal.expiration && proposal.passTime === undefined, 'The proposal is still useful.');

    Chain.del(key);
    if((operate === motion.APPLY || operate === motion.WITHDRAW) && proposal.pledge > 0){
        transferCoin(address, proposal.pledge);
    }

    return true;
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
        Utils.assert(kolCands !== false, 'Failed to get kol candidates.');

        result.kols = kolCands.slice(0, cfg.kol_size);
    }
    else if(input.method === 'getKolCandidates') {
        result.kol_candidates = loadObj(kolCandsKey);
    }
    else if(input.method === 'getCommittee') {
        result.committee = loadObj(committeeKey);
    }
    else if(input.method === 'getRewardDistribute') {
        electInit();
        rewardDistribution();
        result.reward = elect.distribution;
    }
    else if(input.method === 'getConfiguration') {
        result.configuration = loadObj(configKey);
    }
    else{
       	throw '<unidentified operation type>';
    }

    Utils.log(result);
    return JSON.stringify(result);
}

function prepare(){
    cfg = loadObj(configKey);
    Utils.assert(cfg !== false, 'Failed to load configuration.');

    elect.allStake = loadObj(stakeKey);
    Utils.assert(elect.allStake !== false, 'Failed to get all stake.');

    elect.allStake = Utils.int64Add(elect.allStake, Chain.msg.coinAmount);
    saveObj(stakeKey, elect.allStake);
}

function foundingProposal(node){
    let proposal = {
        'pledge': '0',
        'expiration':Chain.block.timestamp,
        'passTime' : Chain.block.timestamp,
        'ballot':['foundings']
    };

    if(node !== undefined && Utils.addressCheck(node)){
        proposal.node = node;
    }

    return proposal;
}

function initialization(params){
    cfg = {
        '1'                        : 1000,     /* 1 : gas_price, 1000 MO */
        '2'                        : 1000000,  /* 2 : base_reserve, 100 0000 MO or 0.01 BU */
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
        'fee_allocation_share'     : '70:20:10',     /* DAPP_70% : blockReward_20% : creator_10% */
        'Utils.logic_contract'           : params.Utils.logic_contract
    };
    saveObj(configKey, cfg);

    Utils.assert(Utils.int64Compare(params.committee.length, cfg.committee_size) <= 0, 'Committee size exceeded.');

    let i = 0;
    for(i = 0; i < params.committee.length; i += 1){
        Utils.assert(Utils.addressCheck(params.committee[i]), 'Committee member(' + params.committee[i] + ') is not valid adress.');
        saveObj(proposalKey(motion.APPLY, role.COMMITTEE, params.committee[i]), foundingProposal());
    }
    saveObj(committeeKey, params.committee);

    let validators = getValidators();
    Utils.assert(validators !== false, 'Get validators failed.');

    let j = 0;
    for(j = 0; j < validators.length; j += 1){
        saveObj(proposalKey(motion.APPLY, role.VALIDATOR, validators[j][0]), foundingProposal(validators[j][0]));
        validators[j][2] = validators[j][0];
    }
    saveObj(validatorCandsKey, validators.sort(doubleSort));

    saveObj(stakeKey, 10000000); /* 0.1BU */
    saveObj(kolCandsKey, []);
    saveObj(rewardKey, {});

    return true;
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
        apply(params.role, params.node);
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
    	extract();
    }
    else if(input.method === 'configure'){
    	configure(params.item, params.value);
    }
    else if(input.method === 'switchNode'){
	    switchNode(params.address);
    }
    else if(input.method === 'clean'){
	    clean(params.operate, params.item, params.address);
    }
    else{
        throw '<undidentified operation type>';
    }

    if(distributed) {
        saveObj(rewardKey, elect.distribution);
    }
}

function init(input_str){
    return true;
}
