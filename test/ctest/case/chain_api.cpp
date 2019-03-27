#include "ctest.h"
#include "gtest/gtest.h"

class ChainAPI : public testing::Test{
protected:
	void test();
	bumo::CTest ctest_;
};

TEST_F(ChainAPI, test){ test(); }

void ChainAPI::test(){
	//issue asset
	bumo::CTest::Param param;
	param.balance = "1000000000000000000";
	param.fee_limit = "20000000000";
	param.gas_price = "1000";
	param.input = "init";

	param.asset_key = "bucoin";
	param.asset_issuer = ctest_.GetConfig().address_;
	EXPECT_EQ(ctest_.Issueasset(param), 0);

	param.balance = "10000000000";
	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);

	//getAccountMetadata
	param.input = "getBalance";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	ASSERT_EQ(ctest_.Load("getBalance-0"), "0");
	ASSERT_EQ(ctest_.Load("getBalance-1"), "20000000000");

	//load
	param.input = "load";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("init-main-0"), "init");
	EXPECT_EQ(ctest_.Load("init-main-1"), "false");

	//del
	param.input = "del";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("init-main-0"), "");
	EXPECT_EQ(ctest_.Load("init-main-1"), "");

	//getBlockHash
	param.input = "getBlockHash";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	ASSERT_NE(ctest_.Load("getBlockHash"), "");

	//tlog
	param.input = "tlog";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	ASSERT_EQ(ctest_.Load("tlog"), "true");
	
	//getValidators
	param.input = "getValidators";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	ASSERT_NE(ctest_.Load("getValidators"), "");

	//getAccountMetadata
	param.input = "getAccountMetadata";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	ASSERT_EQ(ctest_.Load("getAccountMetadata-0"), "false");
	ASSERT_EQ(ctest_.Load("getAccountMetadata-1"), "init");

	//getAccountAsset
	param.input = "payasset";
	param.asset_key = "bucoin";
	param.asset_issuer = ctest_.GetConfig().address_;
	EXPECT_EQ(ctest_.Payasset(param), 0);
	param.input = "getAccountAsset";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	ASSERT_EQ(ctest_.Load("getAccountAsset-0"), "false");
	ASSERT_EQ(ctest_.Load("getAccountAsset-1"), "false");
	ASSERT_EQ(ctest_.Load("getAccountAsset-2"), param.balance);

	//configFee
	param.input = "configFee";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//setValidators
	param.input = "setValidators";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//payCoin
	param.input = "payCoin";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	ASSERT_EQ(ctest_.Load("getBalance-3"), param.balance);

	//payAsset
	param.input = "payAsset";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	ASSERT_EQ(ctest_.Load("payAsset"), "20000000");

	//Write in the inter_call file
	//delegateCall£¬delegateQuery
	//contractCall,contractQuery
}
