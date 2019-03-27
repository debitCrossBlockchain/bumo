#include "ctest.h"
#include "gtest/gtest.h"

class ContractCreate : public testing::Test{
protected:
	void test();
	bumo::CTest ctest_;
};

TEST_F(ContractCreate, test){ test(); }

void ContractCreate::test(){
	std::string contract_address_0;
	std::string contract_address_1;
	std::string contract_address_2;
	std::string contract_address_3;

	bumo::CTest::Param param;
	param.balance = "10000000000";
	param.fee_limit = "20000000000";
	param.gas_price = "1000";
	param.input = "'use ';function init(input){return input;} function main(input){return input;} function query(input){return input;} ";

	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);
	EXPECT_EQ(ctest_.Paycoin(param, contract_address_0), 152);


	param.input = "'use strict';function init(input){Chain.store('child',Chain.thisAddress);return input;} function main(input){ return input; } function query(input){ return Chain.load('child'); } ";

	EXPECT_EQ(ctest_.Create(__FILE__, param), 0);
	EXPECT_EQ(ctest_.Paycoin(param, contract_address_0), 0);
	EXPECT_EQ(ctest_.Load("address"), ctest_.Load("address_2"));
}
