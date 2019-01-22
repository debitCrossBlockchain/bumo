'use strict';

const committeeKey      = 'committee';
const validatorCandsKey = 'validator_candidates';
const kolCandsKey       = 'kol_candidates';
const rewardKey         = 'block_reward';
const configKey         = 'dos_config';

const iRole = ['committee', 'validator', 'kol', 'config'];
const role  = {
    'committee' : 0,
    'validator' : 1,
    'kol'       : 2,
    'config'    : 3
};

const motion = {
    'apply'    : 'application',
    'abolish'  : 'abolition',
    'withdraw' : 'withdraw',
    'configure': 'config'
};

let sysCfg = ['fee_allocation_share'];
let elect = {};
let cfg = {};

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

function transferCoin(dest, amount)
{
    if(amount === '0'){
        return true; 
    }

    payCoin(dest, amount);
    log('Pay coin( ' + amount + ') to dest account(' + dest + ') succeed.');
}

function electInit(){
    let rewards = loadObj(rewardKey);
    assert(rewards !== false, 'Faild to get all stake and reward distribution table.');

    elect.allStake     = int64Add(rewards.allStake, thisPayCoinAmount);
    elect.distribution = rewards.distribution;

    elect.balance  = getBalance();
    assert(elect.balance !== false, 'Faild to get account balance.');

    elect.validatorCands = loadObj(validatorCandsKey);
    assert(elect.validatorCands !== false, 'Faild to get validator candidates.');

    elect.kolCands = loadObj(kolCandsKey);
    assert(elect.kolCands !== false, 'Faild to get kol candidates.');

    elect.validators = elect.validatorCands.slice(0, cfg.validator_size);
    elect.kols       = elect.kolCands.slice(0, cfg.kol_size);
}

function distribute(twoDimenList, allReward){
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
}

function rewardDistribution(){
    let rewards = int64Sub(elect.balance, elect.allStake);
    if(rewards === '0'){
        return;
    }

    let oneTenth = rewards / 10;
    distribute(elect.kols, oneTenth);
    distribute(elect.validators, oneTenth * 5);
    distribute(elect.validatorCands, oneTenth * 4);

    let left = rewards % 10;
    elect.distribution[elect.validators[0][0]] = int64Add(elect.distribution[elect.validators[0][0]], left);

    let distributed = {};
    distributed.allStake     = getBalance();
    distributed.distribution = elect.distribution;
    saveObj(rewardKey, distributed);
}

function extract(){
    electInit();
    rewardDistribution();

    let income = elect.distribution[sender];
    transferCoin(sender, income);
    log(sender + ' extracted block reward ' + income);
}

function proposalKey(address, proposalType, content){
    return address + '_' + proposalType + '_' + content;
}

function applicationProposal(){
    let proposal = {
        'pledge':thisPayCoinAmount,
        'expiration':blockTimestamp + cfg.valid_period,
        'ballot':[]
    };

    return proposal;
}

function checkPledge(type){
    let com = -1;

    if(type === role.validator){
        com = int64Compare(thisPayCoinAmount, cfg.validator_min_pledge);
        assert(com === 0 || com === 1, 'Quality deposit is less than the minimum pledge of validator.');
    }
    else if(type === role.kol){
        com = int64Compare(thisPayCoinAmount, cfg.kol_min_pledge);
        assert(com === 0 || com === 1, 'Quality deposit is less than the minimum pledge of KOL.');
    }
    else if(type === role.committee){
        assert(thisPayCoinAmount === '0', 'No deposit is required to apply to join the committee');
    }
    else{
        throw 'Unkown member type.';
    }
}

function addCandidates(type, address, pledge, maxSize){
    let candidates = type === role.validator ? elect.validatorCands : elect.kolCands;
    let com        = int64Compare(pledge, candidates[candidates.length - 1][1]);
    
    if(candidates.length >= maxSize && com <= 0){
        return;
    }

    rewardDistribution();

    let size = candidates.push([address, pledge]);
    let node = candidates[size - 1];

    candidates.sort(doubleSort);
    if(candidates.length > maxSize){
        candidates = candidates.slice(0, maxSize);
    }

    if(type === role.validator && candidates.indexOf(node) < cfg.validator_size){
        let validators = candidates.slice(0, cfg.validator_size);
        setValidators(JSON.stringify(validators));
    }

    let key = type === role.validator ? validatorCandsKey : kolCandsKey;
    return saveObj(key, candidates);
}

function deleteCandidate(type, address){
    let candidates = type === role.validator ? elect.validatorCands : elect.kolCands;
    let node       = candidates.find(function(x){ return x[0] === address; });
    if(node === undefined){
        return; 
    }

    rewardDistribution();

    let index = candidates.indexOf(node);
    candidates.splice(index, 1);
    candidates.sort(doubleSort);

    if(type === role.validator && index < cfg.validator_size){
        let validators = candidates.slice(0, cfg.validator_size);
        setValidators(JSON.stringify(validators));
    }

    let key = type === role.validator ? validatorCandsKey : kolCandsKey;
    saveObj(key, candidates);
}

function updateStake(type, node, formalSize, amount){
    let candidates = type === role.validator ? elect.validatorCands : elect.kolCands;

    let oldPos = candidates.indexOf(node);
    node[1]    = int64Add(node[1], amount);
    candidates.sort(doubleSort);
    let newPos = candidates.indexOf(node);

    if((oldPos > formalSize && newPos <= formalSize) ||
       (oldPos <= formalSize && newPos > formalSize)){
        rewardDistribution();

        if(type === role.validator){
            let validators = candidates.slice(0, cfg.validator_size);
            setValidators(JSON.stringify(validators));
        }
    }

    let key = type === role.validator ? validatorCandsKey : kolCandsKey;
    return saveObj(key, candidates);
}

function apply(type){
    let key      = proposalKey(sender, motion.apply, iRole[type]);
    let proposal = loadObj(key);

    if(proposal === false){
        /* first apply */
        checkPledge(type);
        proposal = applicationProposal();
        return saveObj(key, proposal);
    }

    proposal.pledge = int64Add(proposal.pledge, thisPayCoinAmount);
    if(proposal.passTime === undefined){ 
        /* Additional deposit, not yet approved */
        proposal.expiration = blockTimestamp + cfg.valid_period;
        return saveObj(key, proposal);
    }

    /* Approved, additional deposit */
    saveObj(key, proposal);
    assert(type === role.validator || type === role.kol, 'Only the validator and KOL may add a deposit.');

    electInit();
    let candidates = type === role.validator ? elect.validatorCands : elect.kolCands;
    let node = candidates.find(function(x){ return x[0] === sender; });

    if(node === undefined){
        let maxSize = type === role.validator ? cfg.validator_candidate_size : cfg.kol_candidate_size;
        addCandidates(type, sender, proposal.pledge, maxSize);
    }
    else{
        let formalSize = type === role.validator ? cfg.validator_size : cfg.kol_size;
        updateStake(type, node, formalSize, thisPayCoinAmount);
    }
}

function penalty(evil, roleType){
    let applicantKey  = proposalKey(evil, motion.apply, iRole[roleType]);
    let applicant     = loadObj(applicantKey);
    assert(applicant !== false, 'Faild to get ' + applicantKey + ' from metadata.');

    let candidates = roleType === role.validator ? elect.validatorCands : elect.kolCands;
    distribute(candidates, applicant.pledge);
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

function approve(proposalType, item, address){
    let committee = loadObj(committeeKey);
    assert(committee !== false, 'Faild to get ' + committeeKey + ' from metadata.');
    assert(committee.includes(sender), 'Only committee members have the right to approve.');

    let content = proposalType === motion.configure ? item : iRole[item];
    let key = proposalKey(address, proposalType, content);
    let proposal = loadObj(key);
    assert(proposal !== false, 'failed to get metadata: ' + key + '.');
        
    if(blockTimestamp >= proposal.expiration){
        if(proposalType === motion.apply){
            transferCoin(address, proposal.pledge);
        }
        return storageDel(key);
    }

    assert(proposal.ballot.includes(sender) !== true, sender + ' has voted.');
    proposal.ballot.push(sender);
    if(proposal.ballot.length <= parseInt(committee.length * cfg.in_pass_rate + 0.5)){
        return saveObj(key, proposal);
    }

    if(proposalType === motion.configure){
        return updateCfg(key, proposal, item);
    }

    if(proposalType === motion.apply){
        proposal.passTime = blockTimestamp;
        saveObj(key, proposal);
    }
    else if(proposalType === motion.abolish){
        storageDel(key);
    }

    if(item === role.committee){
        committee = proposalType === motion.apply ? committee.push(address) : committee.splice(committee.indexOf(address), 1);
        return saveObj(key, committee);
    }

    electInit();
    if(proposalType === motion.apply){
        let maxSize = item === role.validator ? cfg.validator_candidate_size : cfg.kol_candidate_size;
        addCandidates(item, address, proposal.pledge, maxSize);
    }
    else if(proposalType === motion.abolish){
        deleteCandidate(item, address);
        penalty(address, item);
    }
}

function approveIn(type, applicant){
    approve(motion.apply, type, applicant);
}

function approveOut(type, evil){
    approve(motion.abolish, type, evil);
}

function approveCfg(proposer, item){
    approve(motion.configure, item, proposer);
}

function voterKey(type, address){
    let key = '';

    if(type === role.validators){
        key = 'voter_' + sender + '_validator_' + address;
    }
    else if(type === role.kol){
        key = 'voter_' + sender + '_kol_' + address;
    }
    else{
        throw 'Unkown voting type.';
    }

    return key;
}

function vote(type, address){
    assert(type === role.validator || type === role.kol, 'Can only vote for validator or KOL.');
    assert(addressCheck(address), address + ' is not valid adress.');

    let key        = voterKey(type, address);
    let voteAmount = storageLoad(key);

    if(voteAmount === false){
        voteAmount = thisPayCoinAmount;
    }
    else{
        voteAmount = int64Add(voteAmount, thisPayCoinAmount);
    }

    storageStore(key, voteAmount);

    electInit();
    let candidates = type === role.validator ? elect.validatorCands : elect.kolCands;
    let node       = candidates.find(function(x){ return x[0] === address; });

    assert(node !== undefined, address + ' is not validator candidate or KOL candidate.');
    let formalSize = type === role.validator ? cfg.validator_size : cfg.kol_size;
    updateStake(type, node, formalSize, thisPayCoinAmount);
}

function unVote(type, address, amount){
    assert(type === role.validator || type === role.kol, 'Can only vote for validator or KOL.');
    assert(addressCheck(address), address + ' is not valid adress.');
    assert(int64Compare(amount, 0) > 0, 'Unvote amount <= 0.');

    let key         = voterKey(type, address);
    let votedAmount = storageLoad(key);
    assert(votedAmount !== false, 'The account did not vote for: ' + address);

    let com = int64Compare(amount, votedAmount);
    assert(com <= 0, 'Unvote number > voted number.');

    transferCoin(sender, amount);
    if(com === 0){
        storageDel(key);
    }
    else{
        storageStore(key, int64Sub(votedAmount, amount));
    }

    let formalSize = type === role.validator ? cfg.validator_size : cfg.kol_size;
    updateStake(type, address, formalSize, -amount);
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

function reportPermission(type){
    if(type === role.committee){
        let committee = loadObj(committeeKey);
        assert(committee !== false, 'Faild to get ' + committeeKey + ' from metadata.');
        assert(committee.includes(sender), 'Only committee members have the right to report other committee member.');
    }
    else if(type === role.validator){
        let validatorCands = loadObj(validatorCandsKey);
        assert(validatorCands !== false, 'Faild to get validator candidates.');

        let validators = validatorCands.slice(0, cfg.validator_size);
        assert(isExist(validators, sender), 'Only validator have the right to report other validator.');
    }
    else if(type === role.kol){
        let kolCands = loadObj(kolCandsKey);
        assert(kolCands !== false, 'Faild to get kol candidates.');

        let kols = kolCands.slice(0, cfg.kol_size);
        assert(isExist(kols, sender), 'Only kol have the right to report other kol.');
    }
    else{
        throw 'Unkown abolish type.';
    }

    return true;
}

function abolish(type, address, proof){
    assert(addressCheck(address), address + ' is not valid adress.');
    assert(reportPermission(type), sender + ' has no permission to report.');

    let key      = proposalKey(address, motion.abolish, iRole[type]);
    let proposal = loadObj(key);

    if(proposal === false){
        proposal = abolitionProposal(proof);
        saveObj(key, proposal);
    }

    proposal.expiration = blockTimestamp + cfg.valid_period;
    saveObj(key, proposal);
}

function withdraw(type){
    let withdrawKey = proposalKey(sender, motion.withdraw, iRole[type]);
    let expiration  = storageLoad(withdrawKey);

    if(expiration === false){
        return storageStore(withdrawKey, blockTimestamp + cfg.valid_period);
    }

    assert(int64Compare(blockTimestamp, expiration) >= 0, 'Buffer period is not over.');

    let applicantKey = proposalKey(sender, motion.apply, iRole[type]);
    let applicant    = loadObj(applicantKey);
    assert(applicant !== false, 'failed to get metadata: ' + applicantKey + '.');

    if(type === role.committee){
        let committee = loadObj(committeeKey);
        assert(committee !== false, 'Faild to get ' + committeeKey + ' from metadata.');

        committee.splice(committee.indexOf(sender), 1);
        saveObj(committeeKey, committee);
    }
    else{
        electInit();
        deleteCandidate(type, sender);

        if(elect.distribution[sender] === undefined){
            elect.distribution[sender] = applicant.pledge;
        }
        else{
            elect.distribution[sender] = int64Add(elect.distribution[sender], applicant.pledge);
        }
    }

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
    assert(cfg[item] !== undefined, 'Configuration ' + item + ' cannot be changed.');

    let committee = loadObj(committeeKey);
    assert(committee !== false, 'Faild to get ' + committeeKey + ' from metadata.');
    assert(committee.includes(sender), 'Only the committee has the power to proposal to modify the configuration.');

    let key      = proposalKey(sender, motion.configure, item);
    let proposal = loadObj(key);
    if(proposal !== false && proposal.value === value){
        return;
    }

    proposal = configProposal(item, value);
    return saveObj(key, proposal);
}

function query(input_str){
    let input  = JSON.parse(input_str);

    let result = {};
    if(input.method === 'getValidators'){
        result.current_validators = getValidators();
    }
    else if(input.method === 'getCandidates'){
        result.current_candidates = storageLoad(validatorCandsKey);
    }
    else{
       	throw '<unidentified operation type>';
    }

    log(result);
    return JSON.stringify(result);
}

function main(input_str){
    let input  = JSON.parse(input_str);
    let params = input.params;

    cfg = loadObj(configKey);
    assert(cfg !== false, 'Failed to load configuration.');

    if(input.method === 'apply'){
        apply(params.type);
    }
    else if(input.method === 'approveIn'){
	    approveIn(params.type, params.address);
    }
    else if(input.method === 'approveOut'){
    	approveOut(params.type, params.address);
    }
    else if(input.method === 'vote'){
	    vote(params.type, params.address);
    }
    else if(input.method === 'unVote'){
	    unVote(params.type, params.address, params.amount);
    }
    else if(input.method === 'abolish'){
    	abolish(params.type, params.address, params.proof);
    }
    else if(input.method === 'withdraw'){
    	withdraw(params.type);
    }
    else if(input.method === 'extract'){
    	extract();
    }
    else if(input.method === 'configure'){
    	configure(params.item, params.value);
    }
    else if(input.method === 'approveCfg'){
    	approveCfg(params.proposer, params.item);
    }
    else{
        throw '<undidentified operation type>';
    }
}

function init(input_str){
    cfg = {
        'committee_size'           : 100,
        'kol_size'                 : 30,
        'kol_candidate_size'       : 300,
        'kol_min_pledge'           : 5000000000000,  /* 5 0000 0000 0000 */
        'validator_size'           : 30,
        'validator_candidate_size' : 300,
        'validator_min_pledge'     : 500000000000000,/* 500 0000 0000 0000 */
        'in_pass_rate'             : 0.5,
        'out_pass_rate'            : 0.7,
        'valid_period'             : 1296000000000,  /* 15 * 24 * 60 * 60 * 1000 * 1000 */
        'fee_allocation_share'     : '70:20:10',     /* DAPP_70% : blockReward_20% : creator_10% */
        'reward_allocation_share'  : '50:40:10'      /* validator_50% : validatorCandidate_40% : kol_10% */
    };
    saveObj(configKey, cfg);

    let committee = JSON.parse(input_str);
    assert(int64Compare(committee.length, cfg.committee_size) <= 0, 'Committee size exceeded.');

    let i = 0;
    for(i = 0; i < committee.length; i += 1){
        assert(addressCheck(committee[i]), 'Committee member(' +committee[i] + ') is not valid adress.');
    }
    saveObj(committeeKey, committee);

    let validators = getValidators();
    assert(validators !== false, 'Get validators failed.');

    let candidates = validators.sort(doubleSort);
    saveObj(validatorCandsKey, candidates);

    let balance = getBalance();
    assert(balance !== false, 'Faild to get account balance.');

    let reward = {};
    reward.allStake     = balance;
    reward.distribution = {};
    saveObj(rewardKey, reward);

    return true;
}
