#include "utils/base_int.h"
#include <utils/timer.h>
#include <utils/file.h>
#include<ledger/ledger_manager.h>
#include <common/configure_base.h>
#include <utils/logger.h>

namespace bumo{

class CtestConfigure : public ConfigureBase{
public:
	CtestConfigure();
	~CtestConfigure();
	
	std::string address_;
	std::string private_key_;
	std::string chain_address_;

private:
	virtual bool LoadFromJson(const Json::Value &values);
};

class CTest{
public:
	CTest();
	virtual ~CTest();

	typedef struct Param{
		std::string fee_limit;
		std::string gas_price;
		std::string balance;
		std::string input;
		std::string asset_key;
		std::string asset_issuer;
	};

	int32_t Create(const std::string &file_name, const Param &param);
	int32_t Paycoin(const Param &param, const std::string dest_adderss = "");
	int32_t Payasset(const Param &param);
	int32_t Issueasset(const Param &param);

	std::string Load(const std::string &input, const std::string &dest_address = "");
	std::string GetSender();
	std::string GetLastHash();
	std::string GetLastNonce();
	std::string GetContractAddress();
	CtestConfigure GetConfig() { return config_; }

private:
	bool GetHttpResult(const std::string &path, Json::Value &result);
	std::string GetAccountNonce();

	std::string LoadContract(const std::string &file_name);

	void QueryLastTxResult(Json::Value &result);

	int32_t SendCreateContractTx(const std::string &private_key, const std::string &payload, const std::string &source_address, const Param &param);
	int32_t SendPaycoinTx(const std::string &private_key, const std::string &source_address, const std::string &dest_address, const Param &param);
	int32_t SendPayassetTx(const std::string &private_key, const std::string &source_address, const std::string &dest_address, const Param &param);
	int32_t SendIssueassetTx(const std::string &private_key, const std::string &source_address, const std::string &dest_address, const Param &param);

	void Assert(bool result);

	int32_t result_;
	std::string test_project_path_;
	CtestConfigure config_;

	std::string last_tx_;
	std::string contract_address_;
	std::string last_nonce_;
};

}


