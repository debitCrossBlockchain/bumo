#include "ctest.h"
#include "gtest/gtest.h"

class This : public testing::Test{
protected:
	void test();
	bumo::CTest ctest_;
};

TEST_F(This, test){ test(); }

void This::test(){
	//create contract
	bumo::CTest::Param param;
	param.balance = "10000000000";
	param.fee_limit = "20000000000";
	param.gas_price = "1000";
	param.input = "init";

	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);

	Json::Value result;
	result.fromString(ctest_.Load("this-init"));
	EXPECT_EQ(result["sender"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["thisAddress"].asString(), ctest_.GetContractAddress());
	EXPECT_EQ(result["triggerIndex"].asString(), "0");
	EXPECT_EQ(result["thisPayCoinAmount"].asString(), param.balance);
	EXPECT_EQ(result["Chain"]["tx"]["initiator"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["tx"]["gasPrice"].asString(), param.gas_price);
	EXPECT_EQ(result["Chain"]["tx"]["feeLimit"].asString(), param.fee_limit);
	EXPECT_EQ(result["Chain"]["tx"]["hash"].asString(), ctest_.GetLastHash());

	EXPECT_EQ(result["Chain"]["msg"]["initiator"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["msg"]["sender"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["msg"]["nonce"].asString(), ctest_.GetLastNonce());
	EXPECT_EQ(result["Chain"]["msg"]["operationIndex"].asString(), "0");
	EXPECT_EQ(result["Chain"]["msg"]["coinAmount"].asString(), param.balance);


	//pay coin
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	//Json::Value result;
	result.fromString(ctest_.Load("this-main"));
	EXPECT_EQ(result["sender"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["thisAddress"].asString(), ctest_.GetContractAddress());
	EXPECT_EQ(result["triggerIndex"].asString(), "0");
	EXPECT_EQ(result["thisPayCoinAmount"].asString(), param.balance);
	EXPECT_EQ(result["Chain"]["tx"]["initiator"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["tx"]["gasPrice"].asString(), param.gas_price);
	EXPECT_EQ(result["Chain"]["tx"]["feeLimit"].asString(), param.fee_limit);
	EXPECT_EQ(result["Chain"]["tx"]["hash"].asString(), ctest_.GetLastHash());

	EXPECT_EQ(result["Chain"]["msg"]["initiator"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["msg"]["sender"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["msg"]["nonce"].asString(), ctest_.GetLastNonce());
	EXPECT_EQ(result["Chain"]["msg"]["operationIndex"].asString(), "0");
	EXPECT_EQ(result["Chain"]["msg"]["coinAmount"].asString(), param.balance);

	////pay asset
	param.input = "payasset";
	param.asset_key = "bucoin";
	param.asset_issuer = ctest_.GetConfig().address_;
	EXPECT_EQ(ctest_.Payasset(param), 0);
	result.fromString(ctest_.Load("this-main"));
	EXPECT_EQ(result["sender"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["thisAddress"].asString(), ctest_.GetContractAddress());
	EXPECT_EQ(result["triggerIndex"].asString(), "0");
	EXPECT_EQ(result["thisPayCoinAmount"].asString(), "0");
	EXPECT_EQ(result["Chain"]["tx"]["initiator"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["tx"]["gasPrice"].asString(), param.gas_price);
	EXPECT_EQ(result["Chain"]["tx"]["feeLimit"].asString(), param.fee_limit);
	EXPECT_EQ(result["Chain"]["tx"]["hash"].asString(), ctest_.GetLastHash());

	EXPECT_EQ(result["Chain"]["msg"]["initiator"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["msg"]["sender"].asString(), ctest_.GetSender());
	EXPECT_EQ(result["Chain"]["msg"]["nonce"].asString(), ctest_.GetLastNonce());
	EXPECT_EQ(result["Chain"]["msg"]["operationIndex"].asString(), "0");
	EXPECT_EQ(result["Chain"]["msg"]["coinAmount"].asString(), "0");
	EXPECT_EQ(result["Chain"]["msg"]["asset"]["amount"].asString(), param.balance);
	EXPECT_EQ(result["Chain"]["msg"]["asset"]["key"]["issuer"].asString(), param.asset_issuer);
	EXPECT_EQ(result["Chain"]["msg"]["asset"]["key"]["code"].asString(), param.asset_key);
}
