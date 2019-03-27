#include "ctest.h"
#include "gtest/gtest.h"

class UtilsAPI : public testing::Test{
protected:
	void test();
	bumo::CTest ctest_;
};

TEST_F(UtilsAPI, test){ test(); }

void UtilsAPI::test(){
	//create contract
	bumo::CTest::Param param;
	param.balance = "10000000000";
	param.fee_limit = "20000000000";
	param.gas_price = "1000";
	param.input = "init";
	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);

	//log
	param.input = "log";
	EXPECT_EQ(ctest_.Paycoin(param), 0);

	//stoI64Check
	param.input = "stoI64Check";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("stoI64Check-0"), "true");
	EXPECT_EQ(ctest_.Load("stoI64Check-1"), "false");

	//stoI64Check
	param.input = "int64Add-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("int64Add-0"), "5000");
	param.input = "int64Add-1";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//int64Sub
	param.input = "int64Sub-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("int64Sub-0"), "5000");
	param.input = "int64Sub-1";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//int64Sub
	param.input = "int64Mul-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("int64Mul-0"), "5000");
	param.input = "int64Mul-1";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//int64Mod
	param.input = "int64Mod-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("int64Mod-0"), "5000");
	param.input = "int64Mod-1";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//int64Div
	param.input = "int64Div-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("int64Div-0"), "5000");
	param.input = "int64Div-1";
	EXPECT_EQ(ctest_.Paycoin(param), 151);
	param.input = "int64Div-2";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//int64Div
	param.input = "int64Div-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("int64Div-0"), "5000");
	param.input = "int64Div-1";
	EXPECT_EQ(ctest_.Paycoin(param), 151);
	param.input = "int64Div-2";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//int64Compare
	param.input = "int64Compare-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("int64Compare-0"), "1");
	param.input = "int64Compare-1";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//assert
	param.input = "assert";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//int64Compare
	param.input = "sha256-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("sha256-0"), "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589");
	param.input = "sha256-1";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("sha256-1"), "false");

	//ecVerify
	param.input = "ecVerify-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("ecVerify-0"), "true");
	param.input = "ecVerify-1";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("ecVerify-1"), "false");

	//toBaseUnit
	param.input = "toBaseUnit-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("toBaseUnit-0"), "100000000");
	param.input = "toBaseUnit-1";
	EXPECT_EQ(ctest_.Paycoin(param), 151);

	//toBaseUnit
	param.input = "addressCheck-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("addressCheck-0"), "true");
	param.input = "addressCheck-1";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("addressCheck-1"), "false");

	//toBaseUnit
	param.input = "toAddress-0";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("toAddress-0"), "buQi6f36idrKiGrno3RcdjUjGAibUC37FJK6");
	param.input = "toAddress-1";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("toAddress-1"), "false");
}
