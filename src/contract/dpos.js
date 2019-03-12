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
let sysCfg = ['fee_allocation_share'];
let distributed = false;

function doubleSort(a, b){
    let com = int64Compare(b[1], a[1]) ;

    if(com === 0){
        return a[0] > b[0] ? 1 : -1;
    }

    return com;
}

function loadObj(key)
{
    let data = storageLoad(key);
    if(data !== false){
        return JSON.parse(data);
    }

    return false;
}

function saveObj(key, value)
{
    let str = JSON.stringify(value);
    storageStore(key, str);
    log('Set key(' + key + '), value(' + str + ') in metadata succeed.');
}

function minusStake(amount){
    let stake = int64Sub(elect.allStake, amount);
    storageStore(stakeKey, stake);
}

function transferCoin(dest, amount)
{
    if(amount === '0'){
        return true; 
    }

    minusStake(amount);
    payCoin(dest, String(amount));

    log('Pay coin( ' + amount + ') to dest account(' + dest + ') succeed.');
}

function electInit(){
    elect.distribution = loadObj(rewardKey);
    assert(elect.distribution !== false, 'Failed to get reward distribution table.');

    elect.balance = getBalance(thisAddress);
    assert(elect.balance !== false, 'Failed to get account balance.');

    elect.validatorCands = loadObj(validatorCandsKey);
    assert(elect.validatorCands !== false, 'Failed to get validator candidates.');

    elect.kolCands = loadObj(kolCandsKey);
    assert(elect.kolCands !== false, 'Failed to get kol candidates.');

    elect.validators = elect.validatorCands.slice(0, cfg.validator_size);
    elect.kols       = elect.kolCands.slice(0, cfg.kol_size);
}

function distribute(twoDimenList, allReward){
    if (twoDimenList.length === 0){
        return false;
    }
	
	log('Distribute reward ' + allReward + ' to ' + twoDimenList.length + ' address');
    let reward = int64Div(allReward, twoDimenList.length);

    let i = 0;
    for(i = 0; i < twoDimenList.length; i += 1){
        let name = twoDimenList[i][0];
        if(elect.distribution[name] === undefined){
            elect.distribution[name] = reward;
        }
        else{
            elect.distribution[name] = int64Add(elect.distribution[name], reward);
        }
    }

    let left       = int64Mod(allReward, twoDimenList.length);
    let element1st = elect.distribution[twoDimenList[0][0]];
    element1st     = int64Add(element1st, left);

    return true;
}

function rewardDistribution(){
    let reward = int64Sub(elect.balance, elect.allStake);
    if(reward === '0'){
        return;
    }

    let left = reward % 10;
    if(elect.kolCands.length !== 0 ){
        let kolAllReward = (reward / 10) * (10 - cfg.reward_validator_share);
        distribute(elect.kols, (kolAllReward / 10) * cfg.reward_approved_share);
        distribute(elect.kolCands, (kolAllReward / 10) * (10 - cfg.reward_approved_share));
        left += kolAllReward % 10;
    }

    let validatorAllReward = elect.kolCands.length === 0 ? reward : ((reward / 10) * cfg.reward_validator_share);
    distribute(elect.validators, (validatorAllReward / 10) * cfg.reward_approved_share);
    distribute(elect.validatorCands, (validatorAllReward / 10) * (10 - cfg.reward_approved_share));
    left += validatorAllReward % 10;

    elect.distribution[elect.validators[0][0]] = int64Add(elect.distribution[elect.validators[0][0]], left);

    elect.allStake = elect.balance;
    saveObj(stakeKey, elect.allStake);
    distributed = true;
}

function extract(){
    electInit();
    rewardDistribution();

    let income = elect.distribution[sender];
    elect.distribution[sender] = '0';
    transferCoin(sender, income);

    if(elect.validatorCands.find(function(x){ return x[0] === sender; }) === undefined &&
       elect.kols.find(function(x){ return x[0] === sender; }) === undefined){
        delete elect.distribution[sender];
        distributed = true;
    }

    log(sender + ' extracted block reward ' + income);
}

function proposalKey(operate, content, address){
    return operate + '_' + content + '_' + address;
}

function applicationProposal(node){
    let proposal = {
        'pledge':thisPayCoinAmount,
        'expiration':blockTimestamp + cfg.valid_period,
        'ballot':[]
    };

    if(node !== undefined && addressCheck(node)){
        proposal.node = node;
    }

    return proposal;
}

function checkPledge(roleType){
    let com = -1;

    if(roleType === role.VALIDATOR){
        com = int64Compare(thisPayCoinAmount, cfg.validator_min_pledge);
        assert(com === 0 || com === 1, 'Quality deposit is less than the minimum pledge of validator.');
    }
    else if(roleType === role.KOL){
        com = int64Compare(thisPayCoinAmount, cfg.kol_min_pledge);
        assert(com === 0 || com === 1, 'Quality deposit is less than the minimum pledge of KOL.');
    }
    else if(roleType === role.COMMITTEE){
        assert(thisPayCoinAmount === '0', 'No deposit is required to apply to join the committee');
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
	let com = -1;
	if(candidates.length > 0) {
    	com = int64Compare(proposal.pledge, candidates[candidates.length - 1][1]);
	}

    if(candidates.length >= maxSize && com <= 0){
        return;
    }

    rewardDistribution();

    let addition = [address, proposal.pledge];
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
    candidate[1] = int64Add(candidate[1], amount);
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
    assert(roleValid(roleType), 'Unknow role type.');

    let key      = proposalKey(motion.APPLY, roleType, sender);
    let proposal = loadObj(key);
    if(proposal === false){
        /* first apply */
        checkPledge(roleType);
        if(roleType === role.VALIDATOR){
            proposal = applicationProposal(node || sender);
        }
        else{
            proposal = applicationProposal();
        }
        return saveObj(key, proposal);
    }

    assert(int64Mod(thisPayCoinAmount, cfg.vote_unit) === '0', 'The number of additional pledge must be an integer multiple of ' + cfg.vote_unit);
    proposal.pledge = int64Add(proposal.pledge, thisPayCoinAmount);
    if(proposal.passTime === undefined){ 
        /* Additional deposit, not yet approved */
        proposal.expiration = blockTimestamp + cfg.valid_period;
        return saveObj(key, proposal);
    }

    /* Approved, additional deposit */
    saveObj(key, proposal);
    assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Only the validator and KOL may add a deposit.');

    electInit();
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found = candidates.find(function(x){ return x[0] === sender; });

    if(found === undefined){
        let maxSize = roleType === role.VALIDATOR ? cfg.validator_candidate_size : cfg.kol_candidate_size;
        addCandidates(roleType, sender, proposal, maxSize);
    }
    else{
        let formalSize = roleType === role.VALIDATOR ? cfg.validator_size : cfg.kol_size;
        updateStake(roleType, found, formalSize, thisPayCoinAmount);
    }
}

function penalty(evil, roleType){
    let applicantKey  = proposalKey(motion.APPLY, roleType, evil);
    let applicant     = loadObj(applicantKey);
    assert(applicant !== false, 'Failed to get ' + applicantKey + ' from metadata.');

    let allAsset = applicant.pledge;
    if(elect.distribution[evil] !== undefined){
        allAsset = int64Add(applicant.pledge, elect.distribution[evil]);
        delete elect.distribution[evil];
        distributed = true;
    }

    if(allAsset !== '0'){
        let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
        distribute(candidates, allAsset);
        distributed = true;
    }

    storageDel(applicantKey);
}

function updateCfg(key, proposal, item){
    storageDel(key);
    cfg[item] = proposal.value;
    saveObj(configKey, cfg);

    if(sysCfg.includes(item)){
        let sys = {};
        sys[item] = proposal.value;
        setSystemCfg(JSON.stringify(sys));
    }
}

function passIn(committee, key, proposal, item, address){
    proposal.passTime = blockTimestamp;
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
    storageDel(key);
    if(item === role.COMMITTEE){
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
    assert(operateValid(operate), 'Unknown approve operation');
    assert(roleValid(item) || cfg[item] !== undefined, 'Unknown approve item.');

    let committee = loadObj(committeeKey);
    assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
    assert(committee.includes(sender), 'Only committee members have the right to approve.');

    let key = proposalKey(operate, item, address);
    let proposal = loadObj(key);
    assert(proposal !== false, 'failed to get metadata: ' + key + '.');

    if(blockTimestamp >= proposal.expiration){
        storageDel(key);
        if(operate === motion.APPLY && proposal.pledge > 0){
            transferCoin(address, proposal.pledge);
        }

        return;
    }

    assert(proposal.ballot.includes(sender) !== true, sender + ' has voted.');
    proposal.ballot.push(sender);

    if(proposal.ballot.length <= parseInt(committee.length * cfg.pass_rate)){
        return saveObj(key, proposal);
    }

    if(operate === motion.CONFIG){
		log('Config of ' + item + ' proposal passed');
        updateCfg(key, proposal, item);
    }
    else if(operate === motion.APPLY){
		log('Apply proposal of ' + item + '_' + address + ' passed');
        passIn(committee, key, proposal, item, address);
    }
    else if(operate === motion.ABOLISH){
		log('Abolish proposal of ' + item + '_' + address + ' passed');
        passOut(committee, key, item, address);
    }
}

function voterKey(roleType, candidate, voter){
    let addr = voter || sender;
    return  'voter_' + addr + '_' + roleType + '_' + candidate;
}

function vote(roleType, address){
    assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Can only vote for validator or KOL.');
    assert(addressCheck(address), address + ' is not valid adress.');
    assert(int64Mod(thisPayCoinAmount, cfg.vote_unit) === '0', 'The number of votes must be an integer multiple of ' + cfg.vote_unit);

    let key        = voterKey(roleType, address);
    let voteAmount = storageLoad(key);

    if(voteAmount === false){
        voteAmount = thisPayCoinAmount;
    }
    else{
        voteAmount = int64Add(voteAmount, thisPayCoinAmount);
    }

    storageStore(key, voteAmount);

    electInit();
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found      = candidates.find(function(x){ return x[0] === address; });

    assert(found !== undefined, address + ' is not validator candidate or KOL candidate.');
    let formalSize = roleType === role.VALIDATOR ? cfg.validator_size : cfg.kol_size;
    updateStake(roleType, found, formalSize, thisPayCoinAmount);
}

function unVote(roleType, address){
    assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Can only vote for validator or KOL.');
    assert(addressCheck(address), address + ' is not valid adress.');

    let key    = voterKey(roleType, address);
    let amount = storageLoad(key);
    assert(amount !== false, 'The account did not vote for: ' + address);

    storageDel(key);
    transferCoin(sender, amount);

    electInit();
    let candidates = roleType === role.VALIDATOR ? elect.validatorCands : elect.kolCands;
    let found      = candidates.find(function(x){ return x[0] === address; });

    assert(found !== undefined, address + ' is not validator candidate or KOL candidate.');
    let formalSize = roleType === role.VALIDATOR ? cfg.validator_size : cfg.kol_size;
    updateStake(roleType, found, formalSize, -amount);
}

function abolitionProposal(proof){
    let proposal = {
        'Informer': sender,
        'reason': proof,
        'expiration': blockTimestamp + cfg.valid_period,
        'ballot': [sender]
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
        assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
        assert(committee.includes(sender), 'Only committee members have the right to report other committee member.');
    }
    else if(roleType === role.VALIDATOR){
        let validatorCands = loadObj(validatorCandsKey);
        assert(validatorCands !== false, 'Failed to get validator candidates.');

        let validators = validatorCands.slice(0, cfg.validator_size);
        assert(isExist(validators, sender), 'Only validator have the right to report other validator.');
    }
    else if(roleType === role.KOL){
        let kolCands = loadObj(kolCandsKey);
        assert(kolCands !== false, 'Failed to get kol candidates.');

        let kols = kolCands.slice(0, cfg.kol_size);
        assert(isExist(kols, sender), 'Only kol have the right to report other kol.');
    }
    else{
        throw 'Unkown abolish type.';
    }

    return true;
}

function abolish(roleType, address, proof){
    assert(addressCheck(address), address + ' is not valid adress.');
    assert(reportPermission(roleType), sender + ' has no permission to report.');

    let key      = proposalKey(motion.ABOLISH, roleType, address);
    let proposal = loadObj(key);

    if(proposal === false){
        proposal = abolitionProposal(proof);
        saveObj(key, proposal);
    }

    proposal.expiration = blockTimestamp + cfg.valid_period;
    saveObj(key, proposal);
}

function withdraw(roleType){
    assert(roleValid(roleType), 'Unknow role type.');

    let withdrawKey = proposalKey(motion.WITHDRAW, roleType, sender);
    let expiration  = storageLoad(withdrawKey);
    if(expiration === false){
        if(roleType === role.COMMITTEE){
            let committee = loadObj(committeeKey);
            assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');

            committee.splice(committee.indexOf(sender), 1);
            saveObj(committeeKey, committee);
        }
        else{
            electInit();
            deleteCandidate(roleType, sender);
        }

        return storageStore(withdrawKey, String(blockTimestamp + cfg.valid_period));
    }
	
	log('blockTimestamp:' + blockTimestamp + ' , expiration:' + expiration);
    assert(int64Compare(blockTimestamp, expiration) >= 0, 'Buffer period is not over.');

    let applicantKey = proposalKey(motion.APPLY, roleType, sender);
    let applicant    = loadObj(applicantKey);
    assert(applicant !== false, 'failed to get metadata: ' + applicantKey + '.');

    if(elect.distribution[sender] === undefined){
        elect.distribution[sender] = applicant.pledge;
    }
    else{
        elect.distribution[sender] = int64Add(elect.distribution[sender], applicant.pledge);
    }
    distributed = true;

    storageDel(applicantKey);
    storageDel(withdrawKey);
}

function configProposal(item, value){
    let proposal = {
        'item': item,
        'value': value,
        'expiration':blockTimestamp + cfg.valid_period,
        'ballot':[sender]
    };

    return proposal;
}

function configure(item, value){
    assert(cfg[item] !== undefined, 'Unknown config type');

    let committee = loadObj(committeeKey);
    assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
    assert(committee.includes(sender), 'Only the committee has the power to proposal to modify the configuration.');

    let key      = proposalKey(motion.CONFIG, item, sender);
    let proposal = loadObj(key);
    if(proposal !== false && proposal.value === value){
        return;
    }

    proposal = configProposal(item, value);
    return saveObj(key, proposal);
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
        assert(kolCands !== false, 'Failed to get kol candidates.');

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

    log(result);
    return JSON.stringify(result);
}

function prepare(){
    cfg = loadObj(configKey);
    assert(cfg !== false, 'Failed to load configuration.');

    elect.allStake = loadObj(stakeKey);
    assert(elect.allStake !== false, 'Failed to get all stake.');

    elect.allStake = int64Add(elect.allStake, thisPayCoinAmount);
    saveObj(stakeKey, elect.allStake);
}

function foundingProposal(){
    let proposal = {
        'pledge': '0',
        'expiration':blockTimestamp,
        'passTime' : blockTimestamp,
        'ballot':['foundings']
    };

    return proposal;

}

function initialization(params){
    cfg = {
        'committee_size'           : 10,
        'kol_size'                 : 21,
        'kol_candidate_size'       : 100,
        'kol_min_pledge'           : 500000000000000,/* 500 0000 0000 0000 */
        'validator_size'           : 19,
        'validator_candidate_size' : 100,
        'validator_min_pledge'     : 500000000000000,/* 500 0000 0000 0000 */
        'pass_rate'                : 0.5,
        'valid_period'             : 1296000000000,  /* 15 * 24 * 60 * 60 * 1000 * 1000 */
        'vote_unit'                : 1000000000,     /* 10 0000 0000 */
        'reward_validator_share'   : 6,              /* validators 60%, kols 40% */
        'reward_approved_share'    : 9,              /* approved validators or kols 90%, candidates 10% */
        'fee_allocation_share'     : '70:20:10',     /* DAPP_70% : blockReward_20% : creator_10% */
        'logic_contract'           : params.logic_contract
    };
    saveObj(configKey, cfg);

    assert(int64Compare(params.committee.length, cfg.committee_size) <= 0, 'Committee size exceeded.');

    let i = 0;
    for(i = 0; i < params.committee.length; i += 1){
        assert(addressCheck(params.committee[i]), 'Committee member(' + params.committee[i] + ') is not valid adress.');
        saveObj(proposalKey(motion.APPLY, role.COMMITTEE, params.committee[i]), foundingProposal());
    }
    saveObj(committeeKey, params.committee);

    let validators = getValidators();
    assert(validators !== false, 'Get validators failed.');

    let j = 0;
    for(j = 0; j < validators.length; j += 1){
        saveObj(proposalKey(motion.APPLY, role.VALIDATOR, validators[j][0]), foundingProposal());
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

    if(input.method === 'apply'){
        apply(params.role, params.node);
    }
    else if(input.method === 'approve'){
        assert(thisPayCoinAmount === '0', 'thisPayCoinAmount != 0.');
	    approve(params.operate, params.item, params.address);
    }
    else if(input.method === 'vote'){
	    vote(params.role, params.address);
    }
    else if(input.method === 'unVote'){
        assert(thisPayCoinAmount === '0', 'thisPayCoinAmount != 0.');
	    unVote(params.role, params.address, params.amount);
    }
    else if(input.method === 'abolish'){
        assert(thisPayCoinAmount === '0', 'thisPayCoinAmount != 0.');
    	abolish(params.role, params.address, params.proof);
    }
    else if(input.method === 'withdraw'){
        assert(thisPayCoinAmount === '0', 'thisPayCoinAmount != 0.');
    	withdraw(params.role);
    }
    else if(input.method === 'extract'){
        assert(thisPayCoinAmount === '0', 'thisPayCoinAmount != 0.');
    	extract();
    }
    else if(input.method === 'configure'){
        assert(thisPayCoinAmount === '0', 'thisPayCoinAmount != 0.');
    	configure(params.item, params.value);
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
