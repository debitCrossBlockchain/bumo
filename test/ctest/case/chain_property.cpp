#include "ctest.h"
#include "gtest/gtest.h"

class ChainProperty : public testing::Test{
protected:
	void test();
	bumo::CTest ctest_;
};

TEST_F(ChainProperty, test){ test(); }

void ChainProperty::test(){
	//create contract
	bumo::CTest::Param param;
	param.balance = "10000000000";
	param.fee_limit = "20000000000";
	param.gas_price = "1000";
	param.input = "init";
	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);
	EXPECT_EQ(ctest_.Load("input_str-init"), param.input);
	EXPECT_GT(utils::String::Stoi64(ctest_.Load("Chain.block.timestamp-init")), 111111);
	EXPECT_GT(utils::String::Stoi64(ctest_.Load("Chain.block.number-init")), 1);
	EXPECT_EQ(ctest_.Load("Chain.tx.initiator-init"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.tx.sender-init"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.tx.gasPrice-init"), param.gas_price);
	EXPECT_EQ(ctest_.Load("Chain.tx.hash-init"), ctest_.GetLastHash());
	EXPECT_EQ(ctest_.Load("Chain.tx.feeLimit-init"), param.fee_limit);
	EXPECT_EQ(ctest_.Load("Chain.msg.initiator-init"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.msg.sender-init"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.msg.coinAmount-init"), param.balance);
	EXPECT_EQ(ctest_.Load("Chain.msg.nonce-init"), ctest_.GetLastNonce());
	EXPECT_EQ(ctest_.Load("Chain.msg.operationIndex-init"), "0");
	EXPECT_EQ(ctest_.Load("Chain.thisAddress-init"), ctest_.GetContractAddress());

	//pay coin
	param.input = "paycoin";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("input_str-main"), param.input);
	EXPECT_GT(utils::String::Stoi64(ctest_.Load("Chain.block.timestamp-main")), 111111);
	EXPECT_GT(utils::String::Stoi64(ctest_.Load("Chain.block.number-main")), 1);
	EXPECT_EQ(ctest_.Load("Chain.tx.initiator-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.tx.sender-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.tx.gasPrice-main"), param.gas_price);
	EXPECT_EQ(ctest_.Load("Chain.tx.hash-main"), ctest_.GetLastHash());
	EXPECT_EQ(ctest_.Load("Chain.tx.feeLimit-main"), param.fee_limit);
	EXPECT_EQ(ctest_.Load("Chain.msg.initiator-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.msg.sender-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.msg.coinAmount-main"), param.balance);
	EXPECT_EQ(ctest_.Load("Chain.msg.nonce-main"), ctest_.GetLastNonce());
	EXPECT_EQ(ctest_.Load("Chain.msg.operationIndex-main"), "0");
	EXPECT_EQ(ctest_.Load("Chain.thisAddress-main"), ctest_.GetContractAddress());

	//pay asset
	param.input = "payasset";
	param.asset_key = "bucoin";
	param.asset_issuer = ctest_.GetConfig().address_;
	EXPECT_EQ(ctest_.Payasset(param), 0);
	EXPECT_EQ(ctest_.Load("input_str-main"), param.input);
	EXPECT_GT(utils::String::Stoi64(ctest_.Load("Chain.block.timestamp-main")), 111111);
	EXPECT_GT(utils::String::Stoi64(ctest_.Load("Chain.block.number-main")), 1);
	EXPECT_EQ(ctest_.Load("Chain.tx.initiator-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.tx.sender-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.tx.gasPrice-main"), param.gas_price);
	EXPECT_EQ(ctest_.Load("Chain.tx.hash-main"), ctest_.GetLastHash());
	EXPECT_EQ(ctest_.Load("Chain.tx.feeLimit-main"), param.fee_limit);
	EXPECT_EQ(ctest_.Load("Chain.msg.initiator-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.msg.sender-main"), ctest_.GetSender());
	EXPECT_EQ(ctest_.Load("Chain.msg.coinAmount-main"), "0");
	EXPECT_EQ(ctest_.Load("Chain.msg.nonce-main"), ctest_.GetLastNonce());
	EXPECT_EQ(ctest_.Load("Chain.msg.operationIndex-main"), "0");
	std::string asset_main = "{\"amount\":\"10000000000\",\"key\":{\"issuer\":\"{address}\",\"code\":\"bucoin\"}}";
	utils::String::Replace(asset_main, "{address}", ctest_.GetConfig().address_);
	EXPECT_EQ(ctest_.Load("Chain.msg.asset-main"), asset_main);
	EXPECT_EQ(ctest_.Load("Chain.thisAddress-main"), ctest_.GetContractAddress());
}
