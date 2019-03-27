#include "ctest.h"
#include "gtest/gtest.h"

class InterDelegateCall : public testing::Test{
protected:
	void test();
	bumo::CTest ctest_;
};

TEST_F(InterDelegateCall, test){ test(); }

void InterDelegateCall::test(){
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

	//dep 4
	param.input = "1," + contract_address_1 + "," + contract_address_2 + "," + contract_address_3 + ",error";
	EXPECT_EQ(ctest_.Paycoin(param, contract_address_0), 0);
	EXPECT_EQ(ctest_.Load("main"), "{\"result\":false}");

	//dep 3
	param.input = "1," + contract_address_1 + "," + contract_address_2 + "," + contract_address_3;
	EXPECT_EQ(ctest_.Paycoin(param, contract_address_0), 0);
	EXPECT_NE(ctest_.Load("main"), "{\"result\":\"4\"}");
	EXPECT_NE(ctest_.Load("main"), "");

	//dep 2
	Json::Value result;
	param.input = "1," + contract_address_1 + "," + contract_address_2;
	EXPECT_EQ(ctest_.Paycoin(param, contract_address_0), 0);
	result.fromString(ctest_.Load("main"));
	EXPECT_EQ(result["result"].asString(), contract_address_0);
}
