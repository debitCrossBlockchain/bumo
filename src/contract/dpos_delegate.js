'use strict';

const configKey = 'dpos_config';

function loadObj(key)
{
    let data = storageLoad(key);
    if(data !== false){
        return JSON.parse(data);
    }

    return false;
}

function query(input_str){
    let input  = JSON.parse(input_str);

    let result = {};
    if(input.method !== undefined){
        let cfg = loadObj(configKey);
    	assert(cfg !== false, 'Failed to load configuration.');
		Chain.delegateQuery(cfg.logic_contract, input_str);
    }
    else{
       	throw '<unidentified operation type>';
    }

    log(result);
    return true;
}

function main(input_str){
    let input = JSON.parse(input_str);

	if(input.method !== undefined) {
        let cfg = loadObj(configKey);
		assert(cfg !== false, 'Failed to load configuration.');
		Chain.delegateCall(cfg.logic_contract, input_str);
		log('Delegate call contract ', cfg.logic_contract);
	}
    else {
        throw '<undidentified operation type>';
    }
}

function init(input_str){
    let input = JSON.parse(input_str);
	assert(addressCheck(input.params.logic_contract), 'Invalid logic contract address');
    Chain.delegateCall(input.params.logic_contract, JSON.stringify(input));

    return true;
}
