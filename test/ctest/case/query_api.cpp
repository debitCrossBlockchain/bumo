#include "ctest.h"
#include "gtest/gtest.h"

class QueryAPI : public testing::Test{
protected:
	void test();
	bumo::CTest ctest_;
};

TEST_F(QueryAPI, test){ test(); }

void QueryAPI::test(){
	//create contract
	bumo::CTest::Param param;
	param.balance = "10000000000";
	param.fee_limit = "20000000000";
	param.gas_price = "1000";
	param.input = "init";
	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);

	param.input = "load";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("load"), "{\"result\":\"init\"}");

	param.input = "store";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("store"), "{\"error\":true}");

	param.input = "del";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("del"), "{\"error\":true}");

	param.input = "getBlockHash";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_NE(ctest_.Load("getBlockHash"), "");
	EXPECT_NE(ctest_.Load("getBlockHash"), "{\"error\":true}");

	param.input = "tlog";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("tlog"), "{\"error\":true}");

	param.input = "getValidators";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_NE(ctest_.Load("getValidators"), "");
	EXPECT_NE(ctest_.Load("getValidators"), "{\"error\":true}");

	param.input = "getAccountMetadata";
	EXPECT_EQ(ctest_.Paycoin(param), 0);
	EXPECT_EQ(ctest_.Load("getAccountMetadata"), "{\"result\":\"init\"}");
}
