#include "ctest.h"
#include "http_client.h"
#include <json/json.h>
namespace  bumo{

CtestConfigure::CtestConfigure(){
}

CtestConfigure::~CtestConfigure(){
}

bool CtestConfigure::LoadFromJson(const Json::Value &values){
	const Json::Value &value = values["ctest"];
	Configure::GetValue(value, "address", address_);
	Configure::GetValue(value, "private_key", private_key_);
	Configure::GetValue(value, "chain_address", chain_address_);

	return true;
}

CTest::CTest(){
	test_project_path_ = utils::File::GetBinHome() + "\\..\\..\\test\\ctest\\";
	if (!config_.Load(test_project_path_ + "common\\config.json")){
		LOG_STD_ERRNO("Failed to load configuration", STD_ERR_CODE, STD_ERR_DESC);
		Assert(false);
	}
}

CTest::~CTest(){
}

int32_t CTest::Create(const std::string &file_name, const Param &param){
	std::string contract = LoadContract(file_name);
	return SendCreateContractTx(config_.private_key_, contract, config_.address_, param);
}

int32_t CTest::Paycoin(const Param &param, const std::string dest_adderss){

	if (dest_adderss == ""){
		return SendPaycoinTx(config_.private_key_, config_.address_, contract_address_, param);
	}
	contract_address_ = dest_adderss;
	return SendPaycoinTx(config_.private_key_, config_.address_, dest_adderss, param);
}

int32_t CTest::Payasset(const Param &param){
	return SendPayassetTx(config_.private_key_, config_.address_, contract_address_, param);
}

int32_t CTest::Issueasset(const Param &param){
	return SendIssueassetTx(config_.private_key_, config_.address_, contract_address_, param);
}

std::string CTest::Load(const std::string &input, const std::string &dest_address){
	if (!dest_address.empty()){
		contract_address_ = dest_address;
	}

	std::string path = utils::String::Format("/getAccountMetaData?address=%s&key=%s", contract_address_.c_str(), input.c_str());
	Json::Value result;
	GetHttpResult(path, result);
	std::string a = result["result"][input]["value"].asString();
	return a;
}

std::string CTest::GetSender(){
	return config_.address_;
}

std::string CTest::GetLastHash(){
	return last_tx_;
}

std::string CTest::GetLastNonce(){
	return last_nonce_;
}

std::string CTest::GetContractAddress(){
	return contract_address_;
}

bool CTest::GetHttpResult(const std::string &path, Json::Value &result){
	HttpClient client;
	if (!client.Initialize(config_.chain_address_)){
		Assert(false);
		return false;
	}
	HttpClient::RecvMessage rcv = client.http_request(HttpClient::HTTP_GET, path, "");
	if (rcv.status_code != 200){
		Assert(false);
		return false;
	}
	result.fromString(rcv.context);
	return true;
}

std::string CTest::GetAccountNonce(){
	Json::Value result;
	GetHttpResult("/getAccount?address=" + config_.address_, result);

	last_nonce_ = utils::String::Format("%d", (result["result"]["nonce"].asInt() + 1));
	return last_nonce_;
}

std::string CTest::LoadContract(const std::string &file_name){
	std::string name = utils::File::GetFileFromPath(file_name);
	size_t nPos = name.rfind('.');
	if (std::string::npos == nPos || (nPos + 1) == name.size()) {
		Assert(false);
		return "";
	}

	std::string full_file = test_project_path_ + "case\\" + name.substr(0, nPos) + ".js";
	utils::File file;
	if (!file.Open(full_file, utils::File::FILE_M_READ)){
		Assert(false);
		return "";
	}
	std::string data;
	if (file.ReadData(data, 10 * utils::BYTES_PER_MEGA) < 0) {
		Assert(false);
		return "";
	}

	return data;
}

int32_t CTest::SendCreateContractTx(const std::string &private_key, const std::string &payload, const std::string &source_address, const Param &param){
	std::string full_file = test_project_path_ + "template\\create_contract.json";
	utils::File file;
	if (!file.Open(full_file, utils::File::FILE_M_READ)){
		return -1;
	}
	std::string data;
	if (file.ReadData(data, 10 * utils::BYTES_PER_MEGA) < 0) {
		return -1;
	}

	utils::String::Replace(data, "{private_keys}", private_key);
	utils::String::Replace(data, "{fee_limit}", param.fee_limit);
	utils::String::Replace(data, "{gas_price}", param.gas_price);
	utils::String::Replace(data, "{nonce}", GetAccountNonce());
	utils::String::Replace(data, "{init_balance}", param.balance);
	utils::String::Replace(data, "{payload}", payload);
	utils::String::Replace(data, "{source_address}", source_address); 
	utils::String::Replace(data, "{init_input}", param.input);

	HttpClient client;
	if (!client.Initialize(config_.chain_address_)){
		Assert(false);
		return false;
	}
	HttpClient::RecvMessage rcv = client.http_request(HttpClient::HTTP_POST, "submitTransaction", data);
	if (rcv.status_code != 200){
		Assert(false);
		return false;
	}

	Json::Value result;
	result.fromString(rcv.context);
	last_tx_ = result["results"][Json::UInt(0)]["hash"].asString();
	Assert(result["results"][Json::UInt(0)]["error_code"].asInt() == 0);
	LOG_INFO("Create contract address, last tx:%s", last_tx_.c_str());
	Json::Value query_result;
	QueryLastTxResult(query_result);
	std::string b = query_result.toFastString();
	Assert(query_result["result"]["transactions"][Json::UInt(0)]["error_code"].asInt() == 0);
	Json::Value address_obj;
	std::string a = query_result["result"]["transactions"][Json::UInt(0)]["error_desc"].asString();
	Assert(!a.empty());
	address_obj.fromString(a);
	contract_address_ = address_obj[Json::UInt(0)]["contract_address"].asString();
	LOG_INFO("Create contract address:%s", contract_address_.c_str());
	return query_result["result"]["transactions"][Json::UInt(0)]["error_code"].asInt();
}

int32_t CTest::SendPaycoinTx(const std::string &private_key, const std::string &source_address, const std::string &dest_address, const Param &param){
	std::string full_file = test_project_path_ + "template\\paycoin.json";
	utils::File file;
	if (!file.Open(full_file, utils::File::FILE_M_READ)){
		return -1;
	}
	std::string data;
	if (file.ReadData(data, 10 * utils::BYTES_PER_MEGA) < 0) {
		return -1;
	}

	utils::String::Replace(data, "{private_key}", private_key);
	utils::String::Replace(data, "{fee_limit}", param.fee_limit);
	utils::String::Replace(data, "{gas_price}", param.gas_price);
	utils::String::Replace(data, "{nonce}", GetAccountNonce());
	utils::String::Replace(data, "{amount}", param.balance);
	utils::String::Replace(data, "{dest_address}", dest_address);
	utils::String::Replace(data, "{source_address}", source_address);
	utils::String::Replace(data, "{input}", param.input);

	HttpClient client;
	if (!client.Initialize(config_.chain_address_)){
		Assert(false);
		return false;
	}
	HttpClient::RecvMessage rcv = client.http_request(HttpClient::HTTP_POST, "submitTransaction", data);
	if (rcv.status_code != 200){
		Assert(false);
		return false;
	}

	Json::Value result;
	result.fromString(rcv.context);
	Assert(result["results"][Json::UInt(0)]["error_code"].asInt() == 0);
	last_tx_ = result["results"][Json::UInt(0)]["hash"].asString();

	Json::Value query_result;
	QueryLastTxResult(query_result);

	LOG_INFO("Paycoin last tx:%s", last_tx_.c_str());
	return query_result["result"]["transactions"][Json::UInt(0)]["error_code"].asInt();
}

int32_t CTest::SendPayassetTx(const std::string &private_key, const std::string &source_address, const std::string &dest_address, const Param &param){
	std::string full_file = test_project_path_ + "template\\payasset.json";
	utils::File file;
	if (!file.Open(full_file, utils::File::FILE_M_READ)){
		return -1;
	}
	std::string data;
	if (file.ReadData(data, 10 * utils::BYTES_PER_MEGA) < 0) {
		return -1;
	}

	utils::String::Replace(data, "{private_key}", private_key);
	utils::String::Replace(data, "{fee_limit}", param.fee_limit);
	utils::String::Replace(data, "{gas_price}", param.gas_price);
	utils::String::Replace(data, "{nonce}", GetAccountNonce());
	utils::String::Replace(data, "{amount}", param.balance);
	utils::String::Replace(data, "{code}", param.asset_key);
	utils::String::Replace(data, "{issuer}", source_address);
	utils::String::Replace(data, "{dest_address}", dest_address);
	utils::String::Replace(data, "{source_address}", source_address);
	utils::String::Replace(data, "{input}", param.input);

	HttpClient client;
	if (!client.Initialize(config_.chain_address_)){
		Assert(false);
		return false;
	}
	HttpClient::RecvMessage rcv = client.http_request(HttpClient::HTTP_POST, "submitTransaction", data);
	if (rcv.status_code != 200){
		Assert(false);
		return false;
	}

	Json::Value result;
	result.fromString(rcv.context);

	Assert(result["results"][Json::UInt(0)]["error_code"].asInt() == 0);
	last_tx_ = result["results"][Json::UInt(0)]["hash"].asString();

	LOG_INFO("Payasset last tx:%s", last_tx_.c_str());
	Json::Value query_result;
	QueryLastTxResult(query_result);
	return query_result["result"]["transactions"][Json::UInt(0)]["error_code"].asInt();
}

int32_t CTest::SendIssueassetTx(const std::string &private_key, const std::string &source_address, const std::string &dest_address, const Param &param){
	std::string full_file = test_project_path_ + "template\\issueasset.json";
	utils::File file;
	if (!file.Open(full_file, utils::File::FILE_M_READ)){
		return -1;
	}
	std::string data;
	if (file.ReadData(data, 10 * utils::BYTES_PER_MEGA) < 0) {
		return -1;
	}

	utils::String::Replace(data, "{private_key}", private_key);
	utils::String::Replace(data, "{fee_limit}", param.fee_limit);
	utils::String::Replace(data, "{gas_price}", param.gas_price);
	utils::String::Replace(data, "{nonce}", GetAccountNonce());
	utils::String::Replace(data, "{amount}", param.balance);
	utils::String::Replace(data, "{code}", param.asset_key);
	utils::String::Replace(data, "{source_address}", source_address);

	HttpClient client;
	if (!client.Initialize(config_.chain_address_)){
		Assert(false);
		return false;
	}
	HttpClient::RecvMessage rcv = client.http_request(HttpClient::HTTP_POST, "submitTransaction", data);
	if (rcv.status_code != 200){
		Assert(false);
		return false;
	}

	Json::Value result;
	result.fromString(rcv.context);

	Assert(result["results"][Json::UInt(0)]["error_code"].asInt() == 0);
	last_tx_ = result["results"][Json::UInt(0)]["hash"].asString();

	LOG_INFO("Payasset last tx:%s", last_tx_.c_str());
	Json::Value query_result;
	QueryLastTxResult(query_result);
	return query_result["result"]["transactions"][Json::UInt(0)]["error_code"].asInt();
}

void CTest::QueryLastTxResult(Json::Value &result){
	result.clear();
	int64_t start_time = utils::Timestamp::HighResolution();
	while (true){
		int64_t cur_time = utils::Timestamp::HighResolution();
		if ((cur_time - start_time) > 20 * 1000 * 1000){
			break;
		}
		utils::Sleep(1 * 1000);

		GetHttpResult("/getTransactionHistory?hash=" + last_tx_, result);
		if (result["error_code"].asInt() != 0){
			continue;
		}
		break;
	}
}

void CTest::Assert(bool result){
	if (result != true){
		printf("Assert!!!!!!!!!\n");
		getchar();
		printf("");
	}
	assert(result);
}

}
