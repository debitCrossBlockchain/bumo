# BUMO 智能合约开发

- [智能合约](#智能合约)
    - [DEMO](#demo)
    - [接口对象](#接口对象)
        - [使用方法](#使用方法)
        - [读写权限](#读写权限) 
        - [返回值介绍](#返回值介绍)
    - [Chain 对象方法](#chain-对象方法)
        - [Chain.load](#获取合约账号的metadata信息)
        - [Chain.store](#存储合约账号的metadata信息)
        - [Chain.del](#删除合约账号的metadata信息)
        - [Chain.getBlockHash](#获取区块信息)
        - [Chain.tlog](#输出交易日志)
        - [Chain.getAccountMetadata](#获取指定账号的metadata)
        - [Chain.getBalance](#获取账号coin-amount)
        - [Chain.getAccountAsset](#获取某个账号的资产信息)
        - [Chain.getContractProperty](#获取合约账号属性)
        - [Chain.payCoin](#转账)
        - [Chain.issueAsset](#发行资产)
        - [Chain.payAsset](#转移资产)
        - [Chain.delegateCall](#委托调用)
        - [Chain.delegateQuery](#委托查询)
        - [Chain.contractCall](#调用合约)
        - [Chain.contractQuery](#查询合约)
        - [Chain.contractCreate](#创建合约)
        
    - [Chain 对象变量](#chain-对象变量)
        - [Chain.block](#区块信息-chainblock)
            - [Chain.block.timestamp](#当前区块时间戳)
            - [Chain.block.number](#当前区块高度)
        - [Chain.tx](#交易-chaintx)
            - [Chain.tx.initiator](#交易的发起者)
            - [Chain.tx.sender](#交易的触发者)
            - [Chain.tx.gasPrice](#交易的gas价格)
            - [Chain.tx.hash](#交易的哈希值)
            - [Chain.tx.feeLimit](#交易的限制费用)

        - [Chain.msg](#消息-chainmsg)
            - [Chain.msg.initiator](#消息的发起者)
            - [Chain.msg.sender](#消息的触发者)
            - [Chain.msg.coinAmount](#本次支付操作的-bu-coin)
            - [Chain.msg.asset](#本次支付操作的资产)
            - [Chain.msg.nonce](#本次交易里的发起者的nonce值)
            - [Chain.msg.operationIndex](#触发本次合约调用的操作的序号)
        - [Chain.thisAddress](#当前合约账号的地址)
    - [Utils 对象方法](#utils-对象方法)
        - [Utils.log](#输出日志)
        - [Utils.stoI64Check](#字符串数字合法性检查)
        - [Utils.int64Add](#64位加法)
        - [Utils.int64Sub](#64位减法)
        - [Utils.int64Mul](#64位乘法)
        - [Utils.int64Mod](#64位取模)
        - [Utils.int64Div](#64位除法)
        - [Utils.int64Compare](#64位比较)
        - [Utils.assert](#断言)
        - [Utils.sha256](#sha256计算)
        - [Utils.ecVerify](#校验签名是否合法)
        - [Utils.toBaseUnit](#变换单位)
        - [Utils.addressCheck](#地址合法性检查)
        - [Utils.toAddress](#公钥转地址)
        
    - [异常处理](#异常处理)


## DEMO

BUMO 智能合约是一段`JavaScript`代码,标准(ECMAScript as specified in ECMA-262)。合约的初始化函数是 `init`, 执行的入口函数是 `main `函数，查询接口是 `query`。这些函数的参数字符串 `input`，是调用该合约的时候指定的。
下面是一个简单的例子

```javascript
"use strict";
function init(input)
{
  /*init whatever you want*/
  return;
}

function main(input)
{
  let para = JSON.parse(input);
  if (para.do_foo)
  {
    let x = {
      'hello' : 'world'
    };
  }
}

function query(input)
{ 
  return input;
}
```

## 接口对象
BUMO 智能合约内提供了全局对象 `Chain` 和 `Utils`, 这两个对象提供了多样的方法和变量，可以获取区块链的一些信息，也可驱动账号发起所有交易，除了设置门限和权重这两种类型的操作。

**注意，自定义的变量不要与内置对象重复，否则会造成不可控的数据错误。**

### 使用方法
对象.方法(变量)

- 获取账号余额：	`Chain.getBalance('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY');`
- 打印日志		    	`Utils.log('hello');`
- 当前区块号：		`Chain.block.number;`

### 读写权限
对象里的每个函数都有固定的**只读**或者**可写**权限

只读权限是指**不会写数据到区块链**的接口函数，比如获取余额 `Chain.getBalance`

可写权限是指**会写数据到区块链**的接口函数，比如转账 `Chain.payCoin`

在编写智能合约的时候，需要注意的是不同的入口函数拥有不同的调用权限

`init` 和 `main` 能调用所有的内置函数

`query`  只能调用只读权限的函数，否则在调试或者执行过程中会提示接口未定义


### 返回值介绍
   所有内部函数的调用，如果失败则返回 false 或者直接抛出异常执行终止，成功则为其他对象。如果遇到参数错误，会在错误描述中提示参数位置出错，这里的位置指参数的索引号，即从 __0__ 开始计数。例如 `parameter 1` 表示第 __2__ 个参数错误。如下例子：
```
Chain.issueAsset("CNY", 10000);
/*
    错误描述：
    Contract execute error,issueAsset parameter 1 should be a string

    指第 2 个参数应该为字符串
*/
```

## Chain 对象方法
- ### 获取合约账号的metadata信息
  `Chain.load(metadata_key);`
  - metadata_key: metadata的key
  ```javascript
  let value = Chain.load('abc');
  /*
    权限：只读
    返回：成功返回字符串，如 'values', 失败返回false
  */

  ```
  即可得到本合约账号中自定数据的abc的值


- ### 存储合约账号的metadata信息
  `Chain.store(metadata_key, metadata_value);`
  - metadata_key: metadata 的 key
  - metadata_key: metadata 的 value

  ```javascript
  Chain.store('abc', 'values');
  /*
    权限：可写
    返回：成功返回true, 失败抛异常
  */

  ```

- ### 删除合约账号的metadata信息
  `Chain.del(metadata_key);`
  - metadata_key: metadata的key
  ```javascript
  Chain.del('abc');
  /*
    权限：可写
    返回：成功返回true, 失败抛异常
  */

  ```
  即可删除本合约账号中自定数据的abc的值

- ### 获取区块信息

    `Chain.getBlockHash(offset_seq);`
    - offset_seq: 距离最后一个区块的偏移量，范围：[0,1024)

    例如
    ```javascript
    let ledger = Chain.getBlockHash(4);
    /*
      权限：只读
      返回：成功返回字符串，如 'c2f6892eb934d56076a49f8b01aeb3f635df3d51aaed04ca521da3494451afb3'，失败返回 false
    */

    ```

- ### 输出交易日志

    `Chain.tlog(topic,args...);`
     - tlog会产生一笔交易写在区块上
     - topic: 日志主题，必须为字符串类型,参数长度(0,128]
     - args...: 最多可以包含5个参数，参数类型可以是字符串、数值或者布尔类型,每个参数长度(0,1024]

    例如
    ```javascript
    Chain.tlog('transfer',sender +' transfer 1000',true);
    /*
      权限：可写
      返回：成功返回 true，失败抛异常
    */

- ### 获取指定账号的metadata

    `Chain.getAccountMetadata(account_address, metadata_key);`

    - account_address: 账号地址
    - metadata_key: metadata的key 

    例如
    ```javascript
    let value = Chain.getAccountMetadata('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY', 'abc');

    /*
      权限：只读
      返回：成功返回字符串，如 'values', 失败返回false
    */
    ```
- ### 获取账号coin amount

    `Chain.getBalance(address);`
    - address: 账号地址

    例如
    ```javascript
    let balance = Chain.getBalance('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY');
    /*
      权限：只读
      返回：字符串格式数字 '9999111100000'
    */
    ```


- ### 获取某个账号的资产信息

    `Chain.getAccountAsset(account_address, asset_key);`

    - account_address: 账号地址
    - asset_key: 资产属性

    例如
    ```javascript
    let asset_key =
    {
      'issuer' : 'buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY',
      'code' : 'CNY'
    };
    let bar = Chain.getAccountAsset('buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY', asset_key);

    /*
      权限：只读
      返回：成功返回资产数字如'10000'，失败返回 false
    */
    ```
- ### 获取合约账号属性
    
    `Chain.getContractProperty(contract_address);`

    - contract_address: 合约地址

    例如
    ```javascript
    let value = Chain.getContractProperty('buQcFSxQP6RV9vnFagZ31SEGh55YMkakBSGW');

    /*
      权限：只读
      返回：成功返回JSON对象，如 {"type":0, "length" : 416},  type 指合约类型， length 指合约代码长度，如果该账户不是合约则，length 为0.
      失败返回false
    */
    ```

- ### 转账

    `Chain.payCoin(address, amount[, input], [, metadata]);`
     - address: 发送BU的目标地址
     - amount: 发送BU的数量
     - input: 可选，合约参数，如果用户未填入，默认为空字符串
     - metadata: 可选，转账备注，调用`GET /getTransactionHistory`方法查询交易结果时，显示为十六进制字符串，需要转换为明文。

     注意，如果提供metadata参数，那么也必须提供input参数，否则内置接口无法区分该参数是谁，因为两者都是可选的。如果没有input，可以传入空字符串""占位,以防止内置接口将metadata参数误认为inut参数。

    例如
    ```javascript
    Chain.payCoin("buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY", "10000", "", "vote reward");
    /*
      权限：可写
      返回：成功返回 true，失败抛异常  
    */
    ```

- ### 发行资产

    `Chain.issueAsset(code, amount);`
     - code: 资产代码
     - amount: 发行资产数量

    例如
    ```javascript
    Chain.issueAsset("CNY", "10000");
    /*
      权限：可写
      返回：成功返回 true，失败抛异常  
    */


- ### 转移资产

    `Chain.payAsset(address, issuer, code, amount[, input]);`
     - address: 转移资产的目标地址
     - issuer: 资产发行方
     - code: 资产代码
     - amount: 转移资产的数量
     - input: 可选，合约参数，如果用户未填入，默认为空字符串
     - metadata: 可选，转账备注，调用`GET /getTransactionHistory`方法查询交易结果时，显示为十六进制字符串，需要转换为明文。

     注意，如果提供metadata参数，那么也必须提供input参数，否则内置接口无法区分该参数是谁，因为两者都是可选的。如果不需要input，可以传入空字符串""占位,以防止内置接口将metadata参数误认为inut参数。

    例如
    ```javascript
    Chain.payAsset("buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY", "buQgmhhxLwhdUvcWijzxumUHaNqZtJpWvNsf", "CNY", "10000", "", "Trading certificate");
    /*
      权限：可写
      返回：成功返回 true，失败抛异常    
    */
    ```

- ### 委托调用
    `Chain.delegateCall(contractAddress, input);`

    - contractAddress: 被调用的合约地址。
    - input：调用参数。
    
    Chain.delegateCall 函数会触发被调用的合约main函数入口，并且把当前合约的执行环境赋予被调用的合约。如合约A委托调用合约B，即执行B(main入口)的代码，读写A的数据。
    
    例如
    ```javascript
    let ret = Chain.delegateCall('buQBwe7LZYCYHfxiEGb1RE9XC9kN2qrGXWCY'，'{}');
    /*
      权限：可写
      返回：成功会返回被委托者合约main函数执行的结果，失败抛出异常
    */

    ```

- ### 委托查询
    `Chain.delegateQuery(contractAddress, input);`

    - contractAddress: 被调用的合约地址。
    - input：调用参数。
    
    Chain.delegateQuery 函数会触发被调用的合约query函数入口，且把当前合约的执行环境赋予被调用的合约。如合约A委托查询合约B，即执行B(query入口)的代码，读取A的数据。
    
    例如
    ```javascript
    let ret = Chain.delegateQuery('buQBwe7LZYCYHfxiEGb1RE9XC9kN2qrGXWCY'，"");
    /*
      权限：只读
      返回：调用成功则返回JSON对象 {"result":"4"}，其中 result 字段的值即查询的具体结果，调用失败返回JSON对象 {"error":true} 。
    */

    ```


- ### 调用合约
    `Chain.contractCall(contractAddress, asset, amount, input);`

    - contractAddress: 被调用的合约地址。
    - asset : 资产类别，true代表BU，对象{"issue": buxxx, "code" : USDT} 代表资产。
    - amount: 资产数量。
    - input：调用参数。
    
    Chain.contractCall 函数会触发被调用的合约main函数入口。
    
    例如
    ```javascript
    let ret = Chain.contractCall('buQBwe7LZYCYHfxiEGb1RE9XC9kN2qrGXWCY'，true, toBaseUnit("10"), "");
    /*
      权限：可写
      返回：如果目标账户为普通账户，则返回true，如果目标账户为合约，成功会返回被委托者合约main函数执行的结果，调用失败则抛出异常
    */

    ```


- ### 查询合约

    `Chain.contractQuery(contractAddress, input);`

    - contractAddress: 被调用的合约地址。
    - input：调用参数。
    
    Chain.contractQuery 会调用合约的查询接口
    
    例如
    ```javascript
    let ret = Chain.contractQuery('buQBwe7LZYCYHfxiEGb1RE9XC9kN2qrGXWCY'，"");
    /*
      权限：只读
      返回：调用成功则返回JSON对象 {"result":"xxx"}，其中 result 字段的值即查询的具体结果，调用失败返回JSON对象 {"error":true}。
    */

    ```

- ### 创建合约
    `Chain.contractCreate(balance, type, code, input);`

    - balance: 字符串类型，转移给被创建的合约的资产。
    - type : 整型，0代表javascript。
    - code: 字符串类型， 合约代码。
    - input：init函数初始化参数。
    
    Chain.contractCreate 创建合约。
    
    例如
    ```javascript
    let ret = Chain.contractCreate(toBaseUnit("10"), 0, "'use strict';function init(input){return input;} function main(input){return input;} function query(input){return input;} ", "");
    /*
      权限：可写
      返回：创建成功返回合约地址字符串，失败则抛出异常
    */

    ```


## Chain 对象变量

### 区块信息 Chain.block
- #### 当前区块时间戳
    `Chain.block.timestamp`
    当前交易执行时候所在的区块时间戳。

- #### 当前区块高度
    `Chain.block.number`
    当前交易执行时候所在的区块高度。

### 交易 Chain.tx
交易是用户签名的那笔交易信息。

- #### 交易的发起者
   `Chain.tx.initiator`
    交易最原始的发起者，即交易的费用付款者。

- #### 交易的触发者
    `Chain.tx.sender`
    交易最原始的触发者，即交易里触发合约执行的操作的账户。
    例如某账号发起了一笔交易，该交易中有个操作是调用合约Y（该操作的source_address是x），那么合约Y执行过程中，sender的值就是x账号的地址。
    
    ```javascript
    let bar = Chain.tx.sender;
    /*
    那么bar的值是x的账号地址。
    */
    ```

- #### 交易的gas价格
    `Chain.tx.gasPrice`
    交易签名里的gas价格。

- #### 交易的哈希值
    `Chain.tx.hash`
    交易的hash值
    
- #### 交易的限制费用
    `Chain.tx.feeLimit`

### 消息 Chain.msg
消息是在交易里触发智能合约执行产生的信息。在触发的合约执行的过程中，交易信息不会被改变，消息会发生变化。例如在合约中调用`contractCall`，`contractQuery`的时候，消息会变化。

- #### 消息的发起者
    `Chain.msg.initiator`
    本消息的原始的发起者账号。

- #### 消息的触发者
    `Chain.msg.sender`
    本次消息的触发者账号。

    例如某账号发起了一笔交易，该交易中有个操作是调用合约Y（该操作的source_address是x），那么合约Y执行过程中，sender的值就是x账号的地址。

    ```javascript
    let bar = Chain.msg.sender;
    /*
    那么bar的值是x的账号地址。
    */
    ```

- #### 本次支付操作的 BU coin
    `Chain.msg.coinAmount`

- #### 本次支付操作的资产
    `Chain.msg.asset`
    为对象类型{"amount": 1000, "key" : {"issuer": "buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY", "code":"CNY"}}。

- #### 本次交易里的发起者的nonce值
    `Chain.msg.nonce`。即`Chain.msg.initiator`账号的 nonce值。

- #### 触发本次合约调用的操作的序号
    `Chain.msg.operationIndex`

    该值等于触发本次合约的操作的序号。

    例如某账号A发起了一笔交易tx0，tx0中第0（从0开始计数）个操作是给某个合约账户转移资产(调用合约), 那么`Chain.msg.operationIndex`的值就是0。

    ```javascript
    let bar = Chain.msg.operationIndex;
    /* bar 是一个非负整数*/
    ```

### 当前合约账号的地址
    `Chain.thisAddress`

    该值等于该合约账号的地址。

    例如账号x发起了一笔交易调用合约Y，本次执行过程中，该值就是Y合约账号的地址。

    ```text
    let bar = Chain.msg.thisAddress;
    /*
    bar的值是Y合约的账号地址。
    */
    ```

## Utils 对象方法

- ### 输出日志

    `Utils.log(info);`
    - info: 日志内容

    例如
    ```javascript
    let ret = Utils.log('hello');
    /*
      权限：只读
      返回：成功无返回值，会在对应的合约执行进程里，输出一段Trace级别的日志，如 V8contract log[buQsZNDpqHJZ4g5hz47CqVMk5154w1bHKsHY:hello]；失败返回 false。
    */
    ```
- ### 字符串数字合法性检查

    `Utils.stoI64Check(strNumber);`
    - strNumber：字符串数字参数

    例如
    ```javascript
    let ret = Utils.stoI64Check('12345678912345');
    /*
      权限：只读
      返回：成功返回 true，失败返回 false
    */

    ```

- ### 64位加法

    `Utils.int64Add(left_value, right_value);`
    - left_value: 左值
    - right_value：右值

    例如
    ```javascript
    let ret = Utils.int64Add('12345678912345', 1);
    /*
      权限：只读
      返回：成功返回字符串 '12345678912346', 失败抛异常
    */

    ```

- ### 64位减法

    `Utils.int64Sub(left_value, right_value);`
    - left_value: 左值
    - right_value：右值

    例如
    ```javascript
    let ret = Utils.int64Sub('12345678912345', 1);
    /*
      权限：只读
      返回：成功返回字符串 '123456789123464'，失败抛异常
    */

    ```

- ### 64位乘法

    `Utils.int64Mul(left_value, right_value);`
    - left_value: 左值
    - right_value：右值

    例如
    ```javascript
    let ret = Utils.int64Mul('12345678912345', 2);
    /*
      权限：只读
      返回：成功返回字符串 '24691357824690'，失败抛异常
    */

    ```

- ### 64位取模

    `Utils.int64Mod(left_value, right_value);`
    - left_value: 左值
    - right_value：右值

    例如
    ```javascript
    let ret = Utils.int64Mod('12345678912345', 2);
    /*
      权限：只读
      返回：成功返回字符串 '1'，失败抛异常
    */

    ```

- ### 64位除法

    `Utils.int64Div(left_value, right_value);`
    - left_value: 左值
    - right_value：右值

    例如
    ```javascript
    let ret = Utils.int64Div('12345678912345', 2);
    /*
      权限：只读
      返回：成功返回 '6172839456172'，失败抛异常
    */

    ```

- ### 64位比较
    `Utils.int64Compare(left_value, right_value);`

    - 返回值 1：左值大于右值，0：等于，-1 ：小于
    - left_value: 左值
    - right_value：右值

    例如
    ```javascript
    let ret = Utils.int64Compare('12345678912345', 2);
    /*
      权限：只读
      返回：成功返回数字 1（左值大于右值），失败抛异常
    */

    ```
      

- ### 断言

    `Utils.assert(condition[, message]);`
     - condition: 断言变量
     - message: 可选，失败时抛出异常的消息

    例如
    ```javascript
    Utils.assert(1===1, "Not valid");
    /*
      权限：只读
      返回：成功返回 true，失败抛异常  
    */
    ```


- ### sha256计算
    `Utils.sha256(data[, dataType]);`

    - data: 待计算hash的原始数据，根据dataType不同，填不同格式的数据。
    - dataType：data 的数据类型，整数，可选字段，默认为0。0：base16编码后的字符串，如"61626364"；1：普通原始字符串，如"abcd"；2：base64编码后的字符串,如"YWJjZA=="。如果对二进制数据hash计算，建议使用base16或者base64编码。
    - 返回值: 成功会hash之后的base16编码后的字符串，失败会返回 false

    例如
    ```javascript
    let ret = Utils.sha256('61626364');
    /*
      权限：只读
      功能：对
      返回：成功返回64个字节的base16格式字符串 '88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589'，失败返回false
    */

    ```

          
- ### 校验签名是否合法
    `Utils.ecVerify(signedData, publicKey,blobData [, blobDataType]);`

    - signedData: 签名数据，base16编码的字符串。
    - publicKey：公钥，base16编码的字符串。
    - blobData：原始数据，根据blobDataType，填不同格式的数据。
    - blobDataType：blobData的数据类型，整数，可选字段，默认为0。0：base16编码后的字符串，如"61626364"；1：普通原始字符串，如"abcd"；2：base64编码后的字符串,如"YWJjZA=="。如果对二进制数据校验，建议使用base16或者base64编码。
    - 返回值: 成功会返回true，失败会返回 false

    例如
    ```javascript
    let ret = Utils.ecVerify('3471aceac411975bb83a22d7a0f0499b4bfcb504e937d29bb11ea263b5f657badb40714850a1209a0940d1ccbcfc095c4b2d38a7160a824a6f9ba11f743ad80a', 'b0014e28b305b56ae3062b2cee32ea5b9f3eccd6d738262c656b56af14a3823b76c2a4adda3c', 'abcd', 1);
    /*
      权限：只读
      返回：成功会返回true，失败会返回 false
    */

    ```

          
- ### 变换单位
    `Utils.toBaseUnit(value);`

    - 返回值: 成功会返回乘以 10^8 的字符串，失败会返回 false
    - value: 被转换的数字，只能传入字符串，可以包含小数点，且小数点之后最多保留 8 位数字

    例如
    ```javascript
    let ret = Utils.toBaseUnit('12345678912');
    /*
      权限：只读
      返回：成功返回字符串 '1234567891200000000'，失败抛异常
    */

    ```
          

- ### 地址合法性检查

    `Utils.addressCheck(address);`
    - address 地址参数，字符串

    例如
    ```javascript
    let ret = Utils.addressCheck('buQgmhhxLwhdUvcWijzxumUHaNqZtJpWvNsf');
    /*
      权限：只读
      返回：成功返回 true，失败返回 false
    */

    ```
  
- ### 公钥转地址

    `Utils.toAddress(public_key);`
    - public_key 公钥，base16编码的字符串
    - 成功，返回账号地址；失败返回false

    例如
    ```javascript
    let ret = Utils.toAddress('b0016ebe6191f2eb73a4f62880b2874cae1191183f50e1b18b23fcf40b75b7cd5745d671d1c8');
    /*
      权限：只读
      返回：成功返回 "buQi6f36idrKiGrno3RcdjUjGAibUC37FJK6"，失败返回false
    */

    ```

## 异常处理

- JavaScript异常

  当合约运行中出现未捕获的JavaScript异常时，处理规定：

  1. 本次合约执行失败，合约中做的所有交易都不会生效。
  1. 触发本次合约的这笔交易为失败。错误代码为`151`。

- 执行交易失败
  <font color=red>合约中可以执行多个交易，只要有一个交易失败，就会抛出异常，导致整个交易失败</font>

