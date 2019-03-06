- [Bumo DEX1.0 标准](#bumo-DEX1.0-标准)
    - [简介](#简介)
    - [目标](#目标)
    - [规则](#规则)
    - [DEX 属性](#DEX-属性)
    - [功能函数](#功能函数)
         - [makeOrder](#makeOrder)
         - [cancelOrder](#cancelOrder)
         - [takeOrder](#takeOrder)
         - [updateFeeRate](#updateFeeRate)
         - [updateOwner](#updateOwner)
         - [clearExpiredOrder](#clearExpiredOrder)
         - [withdrawFee](#withdrawFee)
         - [dexInfo](#dexInfo)
         - [getOrder](#getOrder)
         - [getOrderInterval](#getValidOrderInterval)
         
    - [合约入口](#合约入口)
        - [init](#init)
        - [main](#main)
        - [query](#query)


# Bumo DEX1.0 Token 标准

## 简介

Bumo DEX 1.0(Decentralized exchange) 是基于 BUMO 智能合约制定的去中心化资产兑换协议。该协议为基于Bumo发行的各类资产提供去中心化自由兑换的能力。

## 目标

基于这套标准接口实现的去中心化资产兑换合约，可以让发行在 Bumo 上的各类资产安全快速的在链上自由兑换，而不必依赖中心化的交易所，而且，可以被其他应用程序和第三方快速对接和使用。

## 规则

Bumo 智能合约由 JavaScript 语言实现, 包含初始化函数 init 和两个入口函数 main、query 。init 函数用于合约创建时初始化; main 函数主要负责数据写入，query 函数负责数据查询。

DEX 1.0 协议支持 ATP token（详见 atp.md） 或 CTP token（详见 ctp.md）与 BU 之间的自由兑换，兑换的服务费以 BU 收取。资产兑换时，支付BU的一方，需要在计划兑换的额度外，按服务费比率另外支付服务费，类似计税方式中的价外税，即服务费不含在兑换额度内。支付 atp 或 ctp token 的一方，从成交后收到的 BU 中，按服务费比率支付服务费，类似计税方式中的价内税，即服务费含在兑换额度内。服务费与交易额的比率， DEX 合约可自行设置。

## DEX 属性

DEX 属性可以通过合约的 `dexInfo` 功能函数查询到，存储在智能合约的账号里。包含以下内容

| 变量         | 描述                     |  
| :----------- | --------------------------- |
|owner         | DEX 合约的拥有者             |
|feeRate       | 服务费比率                   |
|version       | Decentralized exchange 版本 |

注意：
- owner：如果创建 DEX 合约时，没有给出默认值，那么默认 DEX 合约的创建者。
- feeRate: 单位为 1/(10^8)，例如 feeRate 的值为 50000，那么服务费率是 50000/(10^8) = 5/10000。
- version：DEX 的版本。如 1.0

## 功能函数

### makeOrder

- 发布 ATP token 或 CTP token 与 BU 兑换的订单，支持 ATP 兑换 BU，CTP 兑换 BU，BU 兑换 ATP，BU 兑换 CTP 。
- ATP token 兑换时，使用 issuer(发行者地址)、code(资产代码) 和 value(兑换数量) 标注；
- CTP token 兑换时，使用 issuer(CTP合约地址) 和 value(兑换数量) 标注；
- BU 为 Bumo 内置原生 token ，不需要标识，兑换时只需要给出 value(数量) 即可；
- 如果订单的兑出 token 为 CTP 资产，发布订单之前，订单用户需先在对应的 CTP 合约内授信 DEX 合约，授信额度为兑出 token 的额度；
- 如果订单的兑出 token 为 ATP 资产，发布订单时，需用 payAsset(转移资产) 操作触发，转移的资产内容和数额为兑出资产的内容和数额；
- 如果订单的兑出 token 为 BU，发布订单时，需用 payCoin(转账) 操作触发，转账的数额为兑出 BU 的数额加兑换服务费；
- 入口函数 main。

- 参数 json 结构:
```json
{  
    'method':'makeOrder',
    'params':{
        'own':{ //ATP token
            'issuer':buQxxx',
            'code':'EUR',
            'value':10000,
        },
       'target':{ //BU
           'value':1000,
        },
       'fee':5,
       'expiration':'2018...'
    }
}
```
参数：own 订单兑出的 token 信息，包括 issuer(发行地址)、code(资产代码) 和 value(兑换数量)，其中 CTP token 无 code，BU 无 issuer 和 code。

参数：target 订单兑入的token，包括 issuer(发行地址)、code(资产代码) 和 value(兑换数量)，其中 CTP token 无 code，BU 无 issuer 和 code。

参数：fee 挂单账户支付给 DEX 合约的服务费，以兑出资产计数，如果兑出的 token 非 BU，结算时 DEX 合约会按照兑换比从兑换后的 BU 中扣除。

参数：expiration 订单的截止日期，过期后订单无效。

- 函数：function makeOrder(own, target, fee, expiration);
- 返回值：true或者抛异常。

### cancelOrder

- 挂单账户取消订单。
- 入口函数 main。

参数json结构:
```json
{
    'method':'cancelOrder',
    'params':{
        'order':'order_1'
    }
}

```
参数：order 取消的订单号；

- 函数：function cancelOrder(order)
- 返回值：true 或者抛异常

### takeOrder

- 对订单填单或者局部填单，如果该订单已完成或者已过期，该函数应该被 throw。
- 如果填单的兑出 token 为 CTP 资产，填单之前，填单用户需先在对应的 CTP 合约内授信 DEX 合约，授信额度为兑出 token 的额度；
- 如果填单的兑出 token 为 ATP 资产，填单时，需用 payAsset(转移资产) 操作触发，转移的资产内容和数额为兑出资产的内容和数额；
- 如果填单的兑出 token 为 BU，填单时，需用 payCoin(转账) 操作触发，转账的数额为兑出 BU 的数额加兑换服务费；
- 入口函数 main。

参数json结构:
```json
{
    'method':'takeOrder',
    'params':{
      'order':'order_1',
      'fee':5,
    }
}

```
参数：order 填单或局部填单的订单号；

参数：fee 填单账户支付给 DEX 合约的服务费，以兑出资产计数，如果兑出的 token 非 BU，结算时 DEX 合约会按照兑换比从兑换后的 BU 中扣除；

- 函数：function takeOrder(order)
- 返回值：true或者抛异常

### updateFeeRate

- 更改 DEX 合约的服务费比率，如果非合约拥有者调用，该函数应该被 throw。
- 入口函数 main。

- 参数json结构:
```json
{
    'method' : 'updateFeeRate',
    'params' : {
         'rate' : '50000' //单位为 1/(10^8)
    }
}
```
参数：rate 服务费与 token 兑换额的比率。

- 函数：function updateFeeRate(rate)
- 返回值：true或者抛异常

### updateOwner

- 更改 DEX 合约的拥有者，更改后，原合约拥有者将失去 DEX 合约的控制权，如果非合约拥有者调用，该函数应该被 throw。
- 入口函数 main。

- 参数json结构:
```json
{
    'method' : 'updateOwner',
    'params' : {
         'address' : 'buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj'
    }
}
```
参数：address DEX 合约新拥有者的地址。

- 函数：function updateOwner(address)
- 返回值：true或者抛异常

### clearExpiredOrder

- 清除 DEX 合约中未完成但已过期的订单，如果非合约拥有者调用，该函数应该被 throw。
- 入口函数 main。

- 参数json结构:
```json
{
    'method' : 'clearExpiredOrder',
}
```
- 函数：function clearExpiredOrder()
- 返回值：true或者抛异常

### withdrawFee

- 从 DEX 合约中提现服务费，如果非合约拥有者调用，该函数应该被 throw。
- 入口函数 main。

- 参数json结构:
```json
{
    'method' : 'withdrawFee',
    'params' : {
         'value': 10000
    }
}
```
参数：value 提现的数额；

- 函数：function withdrawFee(value)
- 返回值：true或者抛异常

### dexInfo

- 返回 DEX 合约的基本信息。
- 入口函数 query。

- 参数json结构:
```json
{
    'method':'dexInfo'
}
```
- 函数：function dexInfo()
- 返回值：
```json
{
    'result':{
        'type': 'string',
        'value': {
            'dexInfo': {
                'owner': 'buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj',
                'feeRate': 50000, //单位为 1/(10^8)
                'version': '1.0'
            }
        }
    }
} 
```

### getOrder

- 根据订单号获取订单详细信息。
- 入口函数 query。

- 参数json结构:
```json
{
    'method':'getOrder',
    'params' : {
         'order': 'order_1'
    }
}
```
参数：order 订单号；

- 函数：function getOrder(order)
- 返回值：
```json
{  
    'order_1':{
        'own':{ //ATP token
            'issuer':buQxxx',
            'code':'EUR',
            'value':10000,
        },
       'target':{ //BU
           'value':1000,
        },
       'fee':5,
       'expiration':'2018...'
    }
}
```

### getOrderInterval

- 获取订单号的有效区间。
- 入口函数 query。

- 参数json结构:
```json
{
    'method':'getOrderInterval',
}
```

- 函数：function getOrderInterval()
- 返回值：
```json
{  
    'orderInterval':[9, 1000]
}
```

## 合约入口

### init

```js
function init(input_str){
}

```

创建合约时候，触发合约 `init` 入口函数，传递 `JSON` 参数格式如下：

```json
{
    'params':{
        'owner':'buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj',
        'feeRate':'50000',
        'version': '1.0'
    }
}
```
- owner：如果创建 DEX 合约时，没有给出默认值，那么默认 DEX 合约的创建者。
- feeRate: 单位为 1/(10^8)，例如 feeRate 的值为 50000，那么服务费率是 50000/(10^8) = 5/10000。
- version：DEX 的版本。如 1.0

入口函数的返回值：true或者抛异常

### main

```js
function main(input_str){
    let input = JSON.parse(input_str);

    if(input.method === 'makeOrder'){
        makeOrder(input.params.own, input.params.target, input.params.fee, input.params.expiration);
    }
    else if(input.method === 'cancelOrder'){
        cancelOrder(input.params.order);
    }
    else if(input.method === 'takeOrder'){
        takeOrder(input.params.order);
    }
    else if(input.method === 'updateFeeRate'){
        updateFeeRate(input.params.rate);
    }
    else if(input.method === 'updateOwner'){
        updateOwner(input.params.owner);
    }
    else if(input.method === 'clearExpiredOrder'){
        clearExpiredOrder();
    }
    else if(input.method === 'withdrawFee'){
        withdrawFee(input.params.value);
    }
    else{
        throw '<Main interface passes an invalid operation type>';
    }
}
```

### query

```js
function query(input_str){

    let result = {};
    let input  = JSON.parse(input_str);

    if(input.method === 'dexInfo'){
        result.dexInfo = dexInfo();
    }
    else if(input.method === 'getOrder'){
        result.order = getOrder(input.params.order);
    }
    else if(input.method === 'getOrderInterval'){
        result.interval = getOrderInterval();
    }
    else{
       	throw '<Query interface passes an invalid operation type>';
    }
    return JSON.stringify(result);
}
```
