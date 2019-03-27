#include "ctest.h"
#include "gtest/gtest.h"

class ContractCall : public testing::Test{
protected:
	void test();
	bumo::CTest ctest_;
};

TEST_F(ContractCall, test){ test(); }

void ContractCall::test(){
	std::string contract_address_0;
	std::string contract_address_1;
	std::string contract_address_2;
	std::string contract_address_3;

	bumo::CTest::Param param;
	param.balance = "10000000000";
	param.fee_limit = "20000000000";
	param.gas_price = "1000";
	param.input = "init";

	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);
	contract_address_0 = ctest_.GetContractAddress();

	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);
	contract_address_1 = ctest_.GetContractAddress();

	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);
	contract_address_2 = ctest_.GetContractAddress();

	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);
	contract_address_3 = ctest_.GetContractAddress();

	//dep 3
	param.input = "1," + contract_address_1 + "," + contract_address_2 + "," + contract_address_3 + ",error";
	EXPECT_EQ(ctest_.Paycoin(param, contract_address_0), 153);


	param.input = "1," + contract_address_1 + "," + contract_address_2 + "," + contract_address_3;
	EXPECT_EQ(ctest_.Paycoin(param, contract_address_0), 0);

	EXPECT_GT(utils::String::Stoi64(ctest_.Load("Chain.block.timestamp-main", contract_address_2)), 111111);
	EXPECT_GT(utils::String::Stoi64(ctest_.Load("Chain.block.number-main")), 1);
	EXPECT_EQ(ctest_.Load("Chain.tx.initiator-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.tx.sender-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.tx.gasPrice-main"), param.gas_price);
	EXPECT_EQ(ctest_.Load("Chain.tx.hash-main"), ctest_.GetLastHash());
	EXPECT_EQ(ctest_.Load("Chain.tx.feeLimit-main"), param.fee_limit);
	EXPECT_EQ(ctest_.Load("Chain.msg.initiator-main"), contract_address_1);
	EXPECT_EQ(ctest_.Load("Chain.msg.sender-main"), contract_address_1);
	EXPECT_EQ(ctest_.Load("Chain.msg.coinAmount-main"), "123");
	EXPECT_EQ(ctest_.Load("Chain.msg.nonce-main"), "3");
	EXPECT_EQ(ctest_.Load("Chain.msg.operationIndex-main"), "0");
	EXPECT_EQ(ctest_.Load("Chain.thisAddress-main"), ctest_.GetContractAddress());
	EXPECT_EQ(ctest_.Load("Chain.msg.asset-main"), "");
}
