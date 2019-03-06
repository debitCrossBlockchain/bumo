# Bumo STO 10 协议



[Bumo STO 10 协议](#bumo-sto-10-协议)

- [简介](#简介)
- [目标](#目标)
- [规则](#规则)
- [Metadata 存储](#metadata-存储)
  - [Token 基本信息](#token-基本信息)
  - [Tranche 属性及限制](#tranche-属性及限制)
  - [所有 tranche 余额总和](#所有-tranche-余额总和)
  - [Tranche 余额](#tranche-余额)
  - [操作者](#操作者)
  - [控制者](#控制者)
  - [授权](#授权)
  - [文档](#文档)
- [事件](#事件)
- [功能函数](#功能函数)
  - [tokenInfo](#tokeninfo)
  - [setDocument](#setdocument)
  - [getDocument](#getdocument)
  - [createTranche](#createtranche)
  - [balanceOf](#balanceof)
  - [balanceOfTranche](#balanceoftranche)
  - [tranchesOf](#tranchesof)
  - [transferWithData](#transferwithdata)
  - [transferFromToTranche](#transferfromtotranche)
  - [transferTranche](#transfertranche)
  - [transferToTranche](#transfertotranche)
  - [transfersToTranche](#transferstotranche)
  - [isControllable](#iscontrollable)
  - [controllerTransfer](#controllertransfer)
  - [controllerRedeem](#controllerredeem)
  - [authorizeOperator](#authorizeoperator)
  - [revokeOperator](#revokeoperator)
  - [authorizeOperatorForTranche](#authorizeoperatorfortranche)
  - [revokeOperatorForTranche](#revokeOperatorfortranche)
  - [isOperator](#isoperator)
  - [isOperatorForTranche](#isoperatorfortranche)
  - [operatorTransferTranche](#operatortransfertranche)
  - [operatorRedeemTranche](#operatorredeemtranche)
  - [isIssuable](#isissuable)
  - [issue](#issue)
  - [issueToTranche](#issuetotranche)
  - [redeem](#redeem)
  - [redeemFrom](#redeemfrom)
  - [redeemTranche](#redeemtranche)
  - [redeemFromTranche](#redeemfromtranche)
  - [canTransfer](#cantransfer)
  - [canTransferTranche](#cantransfertranche)
  - [canTransferToTranche](#cantransfertotranche)
  - [transfer](#transfer)
  - [transferFrom](#transferfrom)
  - [approve](#approve)
  - [approveTranche](#approvetranche)
  - [allowance](#allowance)
- [合约入口](#合约入口)
  - [init](#init)
  - [main](#main)
  - [query](#query)





## 简介



STO 10(Security Token Standard)是指基于BUMO智能合约发行证券型Token的标准协议。该标准在CTP 10的基础上制定了增发Token，销毁Token，存储相关法律文件，将Token进行分片(tranche)，为tranche设置锁定期等约束条件，允许将指定tranche的Token授权给第三方操作人，添加控制者(如监控部门)的相关功能。





## 目标



基于该协议标准发行的Token，能够在任何司法管辖区内发行和管理，并能够符合相关的监管限制。





## 规则



Bumo 智能合约由 JavaScript 语言实现, 包含初始化函数 init 和两个入口函数 main、query 。init 函数用于合约创建时初始化，main 函数主要负责数据写入，query 函数负责数据查询。





## Metadata 存储



### Token 基本信息



```
key: global_attribute
value: {
    "version": "1.0",
    "name": "Security Token",
    "symbol": "STO",
    "decimals": 8,
    "totalSupply": "100000",
    "scheduledTotalSupply":"100000",
    "owner":""
}
```
- version: 版本
- name: Token名称
- symbol: Token符号
- decimals: Token精度
- totalSupply: Token已发行总量，其值等于10^decimals*已发行量。假如当前已发行总量是10000, 精度为8的Token，totalSupply = 10 ^ 8 * 10000, 结果是1000000000000。
- scheduledTotalSupply: Token计划发行的总量, 0表示不限制发行量， 大于0表示限制发行总量。其值等于10^decimals*计划发行量。假如计划要发行总量是10000, 精度为8的Token，scheduledTotalSuppl = 10 ^ 8 * 10000, 结果是1000000000000。
- owner: Token所有权拥有者



### Tranche 属性及限制



```
key: tranche_attribute_id
value: {
    "description": "private",
    "limits": [{
        "name": "lockupPeriod",
        "value": "1517470155872949",
    },
    ……
    ]
}
```
- id: tranche的id
- description: tranche的描述信息
- limits: 约束
- name: 约束名称
- value: 约束内容



### 所有 tranche 余额总和



```
key: balance_tokenHolder
value: {
	"value": "100000000", 
	"tranches": ["0", "1",……]
}
```
- tokenHolder: Token持有人
- value: 余额总数
- tranches: trancheid列表





### Tranche 余额



```
key: tranche_tokenHolder_id
value: "10000"
```
- tokenHolder: Token持有人
- id: trancheid
- value: tranche余额总量



### 操作者



```
key: operator_tokenHolder_operatorAddress
value: ["0", "1", ……]
```
- tokenHolder: Token持有人
- operatorAddress: 操作者地址
- tranches: trancheid列表, 空列表表示授权所有分片，非空列表表示授权到指定的分片





### 控制者



```
key: global_controller
value: [address1, addres2, ...]
```
- controllers: 控制者列表
- address: 控制者地址



### 授权



```
key: allowance_tokenHolder_tranche_spenderAddress
value: "1000"
```
- tokenHolder: Token持有人
- tranche: 指定trancheid
- spenderAddress: 被授权的账户地址
- value: 授权数量



### 文档



```
key: document_documentName
value: {
	"url": "https://bumo.io/BUMO-Technology-White-Paper-cn",
    "hashType": "sha256",
    "documentHash": "ad67d57ae19de8068dbcd47282146bd553fe9f684c57c8c114453863ee41abc3",
    "provider": "buQXRbzyDaVpX3JT3Wd2gj2U2ZzVWZRpwcng",
    "date": 1544595438978280
}

```
- documentName: 文档名称
- url: 文档链接地址
- hashType: 哈希类型
- documentHash: 哈希的16进制字符串
- provider: 文档提供者
- data: 提供日期



## 事件

​       函数setDocument，createTranche，transferWithData，transferFromWithData，transferFromToTranche，transferTranche，transferToTranche，transfersToTranche，controllerTransfer，controllerRedeem，authorizeOperator，revokeOperator，authorizeOperatorForTranche，revokeOperatorForTranche，operatorTransferTranche，operatorRedeemTranche，issue，issueToTranche，redeemFrom，redeemTranche，redeemFromTranche，transfer，approve，transferFrom会触发事件，事件是调用tlog接口，在区块链上记录一条交易日志，该日志记录了函数调用详情，方便用户阅读。

​       tlog定义如下:

```
tlog(topic,args...);

```

- tlog会产生一笔交易写在区块上
- topic: 日志主题，必须为字符串类型,参数长度(0,128]
- args...: 最多可以包含5个参数，参数类型可以是字符串、数值或者布尔类型,每个参数长度(0,1024]



## 功能函数



### tranchesOfTokenInfo



- 描述

> 查询Token详情。

- 入口函数

> query

- 参数

```json
{
    "method": "tokenInfo
}
```

- 返回值

```json
{
    "result":{
        "type": "string",
        "value": {
            "tokenInfo": {
                "name": "DemoToken",
                "symbol": "STP",
                "decimals": 8,
                "totalSupply": "10000000",
                "scheduledTotalSupply": "10000000",
                "owner": "buQXRbzyDaVpX3JT3Wd2gj2U2ZzVWZRpwcng",
                "version": "1.0"
            }
        }
    }
} 
```



### setDocument

​	仅限于Token的所有权拥有人和控制者使用。

-   描述

> 设置法律文件或其他参考资料

-   入口函数

> main

-   参数

```json
{
    "method":"setDocument",
    "params":{
        "name": "BUMO-Technology-White-Paper-cn",
        "url": "https://bumo.io/BUMO-Technology-White-Paper-cn",
        "hashType": "sha256",
        "documentHash": "ad67d57ae19de8068dbcd47282146bd553fe9f684c57c8c114453863ee41abc3"
    }
}
- name: 文档名称，长度范围[1,256]
- url: 文档在线链接地址，长度范围[10,128k]
- hashType: 计算文档哈希的类型，长度范围[1,16]
- documentHash: 文档哈希的16进制字符串
```

-   返回值

> 成功：true
>
> 失败：抛出异常

- 事件

```javascript
  tlog('setDocument', sender, name, url, hashType, documentHash);
```

​           topic: 方法名，这里是'setDocument'

​           sender:  合约调用账户地址

​           name: 文档名称

​           url: 文档在线链接地址

​           hashType: 哈希类型

​           documentHash: 哈希16进制字符串



### getDocument



-   描述

> 查询法律文件或其他参考资料

-   入口函数

> query

-   参数

```json
{
    "method":"getDocument",
    "params":{
        "name": "BUMO-Technology-White-Paper-cn"
    }
}
- name: 文档名称
```

-   返回值
```json
{
	"result": {
        "type": "string",
        "value": {
            "document": {
                "url": "https://bumo.io/BUMO-Technology-White-Paper-cn",
                "hashType": "sha256",
                "documentHash": "ad67d57ae19de8068dbcd47282146bd553fe9f684c57c8c114453863ee41abc3",
                "provider": "buQXRbzyDaVpX3JT3Wd2gj2U2ZzVWZRpwcng",
                "date": 1544595438978280
            }
        }
	}
}
- url: 文档在线链接地址
- hashType: 计算哈希的方式
- documentHash: 哈希的16进制字符串
- provider: 文档提供者
- date: 上传日期
```



### createTranche

​	仅限于Token的所有权拥有者使用。

-   描述

> 创建分支(只允许发行人操作)

-   入口函数

> main

-   参数

```json
{
    "method":"createTranche",
    "params":{
        "tranche":{
            "id": "1",
            "description": "private",
            "limits":[{
                "name":"lockupPeriod",
                "value":"1517470155872949"
            }],
            "tokenHolders":{
                "buQoqGbz7o6RSkDympf8LrqSe8z4QkiBjcHw": "1000",
                ...
            }
        }
    }
}
- id: trancheid，大小范围[1,2^63-1]
- description: tranche描述，长度范围[1,64k]
- limits: 约束条件
- name: 约束名称，长度范围[1,64]
- value: 约束内容，长度范围[1,256]
- tokenHolders: 分发的账户列表，最多支持8个
```
> 注意: 最多只允许分配给8个tokenHolders

-   返回值

> 成功：true
>
> 失败：抛出异常



### balanceOf



- 描述

> 查询指定账户下的所有tranche的Token总和

- 入口函数

> query

- 参数

```json
{
    "method": "balanceOfTranche",
    "params":{
        "address": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj"
    }
}
```

- 返回值

```json
{
    "result": {
    	"type": "string",
    	"value": {
            "balance": "0.01"
    	}
    }
}
```



### balanceOfTranche

-   描述

> 查询指定账户下的指定tranche的Token余额

-   入口函数

> query

-   参数

```json
{
    "method":"balanceOfTranche",
    "params":{
        "tranche": "1",
        "address": "buQZW68otiwmNPgzcBceuQ7NzFLX46FVyh65"
    }
}
```

-   返回值

```json
{
	"result": {
		"type": "string",
		"value": {
            "balance": "1000"
		}
	}
}
```



### tranchesOf



-   描述

> 查询与特定Token持有者地址关联的所有tranche数量

-   入口函数

> query

-   参数

```json
{
    "method":"tranchesOf",
    "params":{
        "address": "buQZW68otiwmNPgzcBceuQ7NzFLX46FVyh65"
    }
}
```

-   返回值

```json
{
	"result": {
		"type": "string",
		"value": {
            "balance": "30000"
		}
	}
}
```



### transferWithData



-   描述

> 将合约触发者的Token转移给目标账户，并允许携带任意数据。

-   入口函数

> main

-   参数

```json
{
    "method": "transferWithData",
    "params":{
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "100",
        "data": ""
    }
}
- to: Token收入方地址
- value: Token数量，大小范围[0,2^63-1]
- data: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是授权传输的签名数据（例如，动态白名单），但是足够灵活以适应其他用例。长度范围[0,128k]
```
-   返回值

> 成功：true
>
> 失败：抛出异常

- 事件

```javascript
  tlog('transferWithData', sender, to, value, data);
```

​          topic: 方法名，这里是'transfer'

​          sender:  合约调用账户地址

​          to: 目标账户地址

​          value: 转移数量(字符串类型)

​          data: 附加信息



### transferFromWithData

-   描述

> 将指定Token持有人的Token转移给目标账户(合约触发者必须被授予足够的份额)，并允许携带任意数据。

-   入口函数

> main

-   参数

```json
{
    "method": "transferFromWithData",
    "params":{
        "from": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "100",
        "data": ""
    }
}
- from: Token支出方地址
- to: Token收入方地址
- value: Token数量，大小范围[0,2^63-1]
- data: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是授权传输的签名数据（例如，动态白名单），但是足够灵活以适应其他用例。长度范围[0,128k]

```
-   返回值

> 成功：true
>
> 失败：抛出异常

- 事件

```javascript
  tlog('transferFromWithData', sender, from, to, value, data);
```

​          topic: 方法名，这里是'transfer'

​          sender:  合约调用账户地址

​          from: Token支出方地址

​          to: 目标账户地址

​          value: 转移数量(字符串类型)

​          data: 附加信息



### transferFromToTranche



-   描述

> 将指定Token持有人的指定tranche的Token转移给目标账户，并允许携带任意数据。

-   入口函数

> main

-   参数

```json
{
    "method": "transferFromToTranche",
    "params":{
    	"from": "buQm44k6VxqyLM8gQ7bJ49tJSjArhFsrVUKY",
    	"fromTranche": "0",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "toTranche": "1",
        "value": "100",
        "data": ""
    }
}
- from: Token支出方地址
- fromTranche: Token支出方tranche的id，大小范围[0,2^63-1]
- to: Token收入方地址
- toTranche: Token收入方tranche的id，大小范围[0,2^63-1]
- value: Token数量，大小范围[0,2^63-1]
- data: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是授权传输的签名数据（例如，动态白名单），但是足够灵活以适应其他用例。长度范围[0,128k]
```
-   返回值

> 成功：true
>
> 失败：抛出异常
> 



### transferTranche



-   描述

> 将合约触发者的指定tranche的Token转移给目标账户的指定tranche，并允许携带任意数据。

-   入口函数

> main

-   参数

```json
{
    "method": "transferTranche",
    "params":{
        "tranche": "0",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "100",
        "data": ""
    }
}
- tranche: Token支出方和收入方tranche的id，大小范围[0,2^63-1]
- to: Token收入方地址
- value: Token数量，大小范围[0,2^63-1]
- data: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是授权传输的签名数据（例如，动态白名单），但是足够灵活以适应其他用例。长度范围[0,128k]
```
-   返回值

> 成功：true
>
> 失败：抛出异常



### transferToTranche



-   描述

> 将合约触发者的指定tranche的Token转移给目标账户的指定tranche，并允许携带任意数据。

-   入口函数

> main

-   参数

```json
{
    "method": "transferToTranche",
    "params":{
        "fromTranche": "0",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "toTranche": "1",
        "value": "100",
        "data": ""
    }
}
- fromTranche: Token支出方tranche的id，大小范围[0,2^63-1]
- to: Token收入方地址
- toTranche: Token收入方tranche的id，大小范围[0,2^63-1]
- value: Token数量，大小范围[0,2^63-1]
- data: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是授权传输的签名数据（例如，动态白名单），但是足够灵活以适应其他用例。长度范围[0,128k]
```
-   返回值

> 成功：true
>
> 失败：抛出异常



### transfersToTranche



-   描述

> 将合约触发者的指定的tranche的Token转移给多个目标账户的某个tranche，并允许携带任意数据。

-   入口函数

> main

-   参数

```json
{
    "method": "transfersToTranche",
    "params":{
        "fromTranche": "0",
        "toTranche": "1",
        "tokenHolders": {
            Address1: value1,
            Address2: value2,
             …
        },
        "data": ""
    }
}
- fromTranche: Token支出方tranche的id，大小范围[0,2^63-1]
- toTranche: Token收入方tranche的id，大小范围[0,2^63-1]
- tokenHolders: Token收入方列表
- Address1/Address2/...: Token收入方地址
- value1/value2/...: Token转出数量，大小范围[0,2^63-1]
- data: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是授权传输的签名数据（例如，动态白名单），但是足够灵活以适应其他用例。长度范围[0,128k]
```
-   返回值

> 成功：返回目标账户的tranche
>
> 失败：抛出异常



### isControllable



-   描述

> 判断当前Token是否是可控制的，是否可由司法/指定账户(不需要授权)控制两个账户之间的流通。

-   入口函数

> query

-   参数

```json
{
    "method": "isControllable"
}
```

> 注意：如果isControllable是true,那么controller在不需要授权的情况下，可以使用operatorTransferTranche和operatorRedeemTranche。

-   返回值

> 成功: true
>
> 失败: false



### controllerTransfer



> 在某些法域中，发行人（或由发行人委托的实体）可能需要保留强制转移Token的能力。这可能是为了解决法律纠纷或法院命令，或补救投资者失去访问他们的私钥。

-   描述

> 允许授权的地址在任何两个令牌持有者之间传递Token。

-   入口函数

> main

-   参数

```json
{
    "method": "controllerTransfer",
    "params":{
        "from": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "fromTranche": "1",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "toTranche": "2",
        "value": "100",
        "data": "",
        "operatorData": ""
    }
}
- from: Token支出方地址
- fromTranche: Token支出方tranche的id，大小范围[0,2^63-1]
- to: Token收入方地址
- toTranche: Token收入方tranche的id，大小范围[0,2^63-1]
- value: Token数量，大小范围[0,2^63-1]
- data: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是授权传输的签名数据（例如，动态白名单），但是足够灵活以适应其他用例。长度范围[0,64k]
- operatorData: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是授权传输的签名数据（例如，动态白名单），但是足够灵活以适应其他用例。长度范围[0,64k]
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### controllerRedeem



> 在某些法域中，发行人（或由发行人委托的实体）可能需要保留强制转移Token的能力。这可能是为了解决法律纠纷或法院命令，或补救投资者失去访问他们的私钥。

-   描述

> 允许授权的地址为任何Token持有者赎回Token。

-   入口函数

> main

-   参数

```json
{
    "method": "controllerRedeem",
    "params":{
        "tokenHolder": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "tranche": "1",
        "value": "100",
        "data": "",
        "operatorData": ""
    }
}
```

> data: 允许随传输一起提交任意数据，以便进行解释或记录。这可以是签名数据（例如，动态白名单），但是足够灵活以适应其他用例。

-   返回值

> 成功: true
>
> 失败: 抛出异常



### authorizeOperator



-   描述

> 对合约触发者的所有tranche授权一个操作者。

-   入口函数

> main

-   参数

```json
{
    "method": "authorizeOperator",
    "params":{
        "operator": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj"
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### revokeOperator



-   描述

> 撤消对之前合约触发者的所有tranche的操作者的授权。

-   入口函数

> main

-   参数

```json
{
    "method": "revokeOperator",
    "params":{
        "operator": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj"
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### authorizeOperatorForTranche



-   描述

> 对合约触发者的指定tranche授权一个操作者。

-   入口函数

> main

-   参数

```json
{
    "method": "authorizeOperatorForTranche",
    "params":{
        "tranche": "1",
        "operator": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj"
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### revokeOperatorForTranche



-   描述

> 撤消对之前合约触发者的指定tranche的操作者的授权。

-   入口函数

> main

-   参数

```json
{
    "method": "revokeOperatorForTranche",
    "params":{
        "tranche": "1",
        "operator": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj"
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### isOperator



-   描述

> 判断是否是Token持有人的所有tranche的操作人。

-   入口函数

> query

-   参数

```json
{
    "method": "isOperator",
    "params":{
        "operator": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "tokenHolder": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV"
    }
}
```

-   返回值

> 成功: true
>
> 失败: false



### isOperatorForTranche



-   描述

> 判断是否是Token持有人的指定tranche的操作人。

-   入口函数

> query

-   参数

```json
{
    "method": "isOperatorForTranche",
    "params":{
        "tranche": "1",
        "operator": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "tokenHolder": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV"
    }
}
```

-   返回值

> 成功: true
>
> 失败: false



### operatorTransferTranche



-   描述

> 允许操作员代表Token持有者在指定分段内转移Token。

-   入口函数

> main

-   参数

```json
{
    "method": "operatorTransferTranche",
    "params":{
        "tranche": "1",
        "from": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "100",
        "data": "",
        "operatorData": ""
    }
}
```

-   返回值

> 成功：true
>
> 失败：抛出异常



### operatorRedeemTranche



-   描述

> 允许操作员代表Token持有者在指定分段内赎回Token（Token总量会减少）。

-   入口函数

> main

-   参数

```json
{
    "method": "operatorRedeemTranche",
    "params":{
        "tranche": "1",
        "tokenHolder": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "100",
        "operatorData": ""
    }
}
```

-   返回值

> 成功：true
>
> 失败：抛出异常



### isIssuable



-   描述

> 证券Token发行者可以指定发行完成了Token（即没有新的Token可以被铸造或发行）。

-   入口函数

> query

-   参数

```json
{
    "method": "isIssuable"
}
```

-   返回值

> 成功: true
>
> 失败: false



### issue



-   描述

> 增加指定Token持有人的总供给量。

-   入口函数

> main

-   参数

```json
{
    "method": "issue",
    "params":{
        "tokenHolder": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "nowSupply": "1000000000000",
        "data": ""
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### issueToTranche



-   描述

> 增加指定Token持有人的指定tranche的供给量。

-   入口函数

> main

-   参数

```json
{
    "method": "issueToTranche",
    "params":{
        "tranche": "",
        "tokenHolder": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "nowSupply": "1000000000000",
        "data": ""
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### redeem



-   描述

> 从合约触发者赎回指定量的Token(总供给量会减少)。

-   入口函数

> main

-   参数

```json
{
    "method": "redeem",
    "params":{
        "value": "1000000000000",
        "data": ""
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### redeemFrom



-   描述

> 从指定的Token持有人中赎回指定量的Token(总供给量会减少)。

-   入口函数

> main

-   参数

```json
{
    "method": "redeemFrom",
    "params":{
        "tokenHolder": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "1000000000000",
        "data": ""
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### redeemTranche



-   描述

> 从合约触发者的指定的tranche赎回指定量的Token(总供给量会减少)。

-   入口函数

> main

-   参数

```json
{
    "method": "redeemTranche",
    "params":{
        "tranche": "1",
        "value": "1000000000000",
        "data": ""
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### redeemFromTranche



-   描述

> 从指定的Token持有人中赎回指定量的Token(总供给量会减少)（必须被授予足够的份额）。

-   入口函数

> main

-   参数

```json
{
    "method": "redeemFromTranche",
    "params":{
        "tranche": "1",
        "tokenHolder": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "1000000000000",
        "data": ""
    }
}
```

-   返回值

> 成功: true
>
> 失败: 抛出异常



### canTransfer



-   描述

> 能否传输成功。

-   入口函数

> main

-   参数

```json
{
    "method": "canTransfer",
    "params":{
        "from": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "100",
        "data": ""
    }
}
```

-   返回值

成功: true
失败: 抛出错误信息



### canTransferTranche



-   描述

> 指定tranche内的Token能否被传输成功。

-   入口函数

> main

-   参数

```json
{
    "method": "canTransferByTranche",
    "params":{
        "tranche": "",
        "from": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        “value”: "100",
        "data": ""
    }
}
```

-   返回值

成功: true
失败: 抛出错误信息



### canTransferToTranche



-   描述

> 指定tranche内的Token转移给目标指定tranche内能否被传输成功。

-   入口函数

> main

-   参数

```json
{
    "method": "canTransferByTranche",
    "params":{
        "from": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "fromTranche": "1",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "toTranche": "2",
        “value”: "100",
        "data": ""
    }
}
```

-   返回值

成功: true
失败: 抛出错误信息



### transfer



-   描述

> 将合约触发者的Token转移给目标账户。

-   入口函数

> main

-   参数

```json
{
    "method": "transfer",
    "params":{
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "100"
    }
}
```

-   返回值

> 成功：true
>
> 失败：抛出异常

- 事件

```javascript
  tlog('transfer', sender, to, value);
```

​          topic: 方法名，这里是'transfer'

​          sender:  合约调用账户地址

​          to: 目标账户地址

​          value: 转移数量(字符串类型)



### transferFrom



-   描述

> 将指定Token持有人的Token转移给目标账户(合约触发者必须被授予足够的份额)。

-   入口函数

> main

-   参数

```json
{
    "method": "transferFrom",
	"params":{
        "from": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "to": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "value": "100"
    }
}
```

-   返回值

> 成功：true
>
> 失败：抛出异常

- 事件

```javascript
tlog('transferFrom', sender, from, to, value);
```

​      topic: 方法名，这里是'transferFrom'

​      sender:  合约调用账户地址

​      from: 源账户地址

​      to: 目标账户地址

​      value: 转移数量（字符串类型）



### approve



-   描述

> 允许指定账户代表Token持有者操作Token。

-   入口函数

> main

-   参数

```json
{
    "method": "approve",
	"params":{
        "spender": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "value": "100"
    }
}
```

-   返回值

> 成功：true
>
> 失败：抛出异常

- 事件

```javascript
  tlog('approve', sender, spender, value);
```

​           topic: 方法名，这里是'approve'

​           sender:  合约调用账户地址

​           spender: 被授权账户地址

​           value: 被授权可转移数量（字符串类型）



### approveTranche



-   描述

> 允许指定账户代表Token持有者操作Token。

-   入口函数

> main

-   参数

```json
{
    "method": "approveTranche",
	"params":{
        "tranche": "1",
        "spender": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj",
        "value": "100"
    }
}
```

-   返回值

> 成功：true
>
> 失败：抛出异常



### allowance



-   描述

> 查询允许指定账户代表Token持有者操作Token数量。

-   入口函数

> query

-   参数

```json
{
    "method": "allowance",
	"params":{
        "owner": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "spender": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj"
    }
}
```

-   返回值

```json
{
	"result": {
		"type": "string",
		"value": {
			"allowance": "10000000"
		}
	}
}
```



### allowanceForTranche



-   描述

> 查询允许指定账户代表Token持有者操作Token数量。

-   入口函数

> query

-   参数

```json
{
    "method": "allowanceForTranche",
	"params":{
	    "tranche": "1",
        "owner": "buQoP2eRymAcUm3uvWgQ8RnjtrSnXBXfAzsV",
        "spender": "buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj"
    }
}
```

-   返回值

```json
{
	"result": {
		"type": "string",
		"value": {
			"allowance": "100000"
		}
	}
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
    "params":{
        "name": "123",
        "symbol": "STP",
        "description": "STP",
        "decimals": 8,
        "nowSupply": "10000000",
        "scheduledTotalSupply": "10000000",
        "icon": "",
        "controllers": ["buQnTmK9iBFHyG2oLce7vcejPQ1g5xLVycsj"]
    }
}
- name: Token名称，长度范围[1,64]
- code: Token符号，长度范围[1,64]
- description: Token描述，长度范围[1,64k]
- decimals: Token符号，即能支持的小数点位置，大小范围[0,8]
- nowSupply: Token当前发行量，大小范围[0,2^63-1]，其值等于10^decimals*发行量。假如当前要发行一笔数量是10000, 精度为8的Token，nowSupply = 10 ^ 8 * 10000, 结果是1000000000000。
- scheduledTotalSuppl: Token计划发行总量，大小范围[0,2^63-1]，0表示不限量发行，大于0表示限量发行，其值等于10^decimals*计划发行量。假如计划要发行总量是10000, 精度为8的Token，scheduledTotalSuppl = 10 ^ 8 * 10000, 结果是1000000000000。
- icon: base64位编码，图标文件大小是32k以内,推荐200*200像素。
- controllers: Token的控制者列表，即监管者列表
```
返回值：

​	成功：无

​	失败：抛出异常


### main

```js
function main(input_str){
    let input = JSON.parse(input_str);

    if (input.method === 'setDocument'){
      setDocument(input.params.name, input.params.url, input.params.hashType, input.params.documentHash);
    }
    else if(input.method === 'createTranche'){
      createTranche(input.params.tranche);
    }
    else if(input.method === 'changeOwnership'){
      changeOwnership(input.params.owner);
    }
    else if(input.method === 'issue'){
      issue(input.params.tokenHolder, input.params.nowSupply, input.params.data);
    }
    else if(input.method === 'issueToTranche'){
      issueToTranche(input.params.tranche, input.params.tokenHolder, input.params.nowSupply, input.params.data);
    }
    else if (input.method === 'approveTranche'){
      approveTranche(input.params.tranche, input.params.spender, input.params.value, input.params.data);
    }
    else if(input.method === 'approve'){
      approve(input.params.spender, input.params.value);
    }
    else if(input.method === 'transfer'){
      transfer(input.params.to, input.params.value);
    }
    else if(input.method === 'transferFrom'){
      transferFrom(input.params.from, input.params.to, input.params.value);
    }
    else if(input.method === 'transferWithData'){
      transferWithData(input.params.to, input.params.value, input.params.data);
    }
    else if(input.method === 'transferFromWithData'){
      transferFromWithData(input.params.from, input.params.to, input.params.value, input.params.data);
    }
    else if(input.method === 'transferTranche'){
      transferTranche(input.params.tranche, input.params.to, input.params.value, input.params.data);
    }
    else if(input.method === 'transferToTranche'){
      transferToTranche(input.params.fromTranche, input.params.to ,input.params.toTranche, input.params.value, input.params.data);
    }
    else if(input.method === 'transfersToTranche'){
      transfersToTranche(input.params.fromTranche, input.params.toTranche, input.params.tokenHolders);
    }
    else if(input.method === 'transferFromToTranche'){
      transferFromToTranche(input.params.from, input.params.fromTranche, input.params.to ,input.params.toTranche, input.params.value, input.params.data);
    }
    else if (input.method === 'controllerTransfer'){
      controllerTransfer(input.params.from, input.params.fromTranche, input.params.to, input.params.toTranche, input.params.value, input.params.data, input.params.operatorData);
    }
    else if(input.method === 'controllerRedeem'){
      controllerRedeem(input.params.tokenHolder, input.params.tranche, input.params.value, input.params.data, input.params.operatorData);
    }
    else if(input.method === 'authorizeOperator'){
      authorizeOperator(input.params.operator);
    }
    else if(input.method === 'authorizeOperatorForTranche'){
      authorizeOperatorForTranche(input.params.tranche, input.params.operator);
    }
    else if(input.method === 'revokeOperator'){
      revokeOperator(input.params.operator);
    }
    else if(input.method === 'revokeOperatorForTranche'){
      revokeOperatorForTranche(input.params.tranche, input.params.operator);
    }
    else if(input.method === 'operatorTransferTranche'){
      operatorTransferTranche(input.params.tranche, input.params.from, input.params.to, input.params.value, input.params.data, input.params.operatorData);
    }
    else if(input.method === 'redeem'){
      redeem(input.params.value, input.params.data);
    }
    else if(input.method === 'redeemFrom'){
      redeemFrom(input.params.tokenHolder, input.params.value, input.params.data);
    }
    else if(input.method === 'redeemTranche'){
      redeemTranche(input.params.tranche, input.params.value, input.params.data);
    }
    else if(input.method === 'operatorRedeemTranche'){
      operatorRedeemTranche(input.params.tranche, input.params.tokenHolder, input.params.value, input.params.operatorData);
    }
    else{
        throw '<unidentified operation type>';
    }
}
```

### query

```js
function query(input_str){
    let result = {};
    let input  = JSON.parse(input_str);

    if(input.method === 'getDocument'){
      result.document = getDocument(input.params.name);
    }
    else if(input.method === 'isIssuable'){
      result.isIssuable = isIssuable();
    }
    else if(input.method === 'tokenInfo'){
      globalAttribute = JSON.parse(storageLoad(globalAttributeKey));
      result.tokenInfo = globalAttribute;
    }
    else if(input.method === 'balanceOf'){
      result.balance = balanceOf(input.params.address);
    }
    else if(input.method === 'tranchesOf'){
      result.tranches = tranchesOf(input.params.address);
    }
    else if(input.method === 'balanceOfTranche'){
      result.balance = balanceOfTranche(input.params.tranche, input.params.address);
    }
    else if(input.method === 'allowance'){
      result.allowance = allowance(input.params.owner, input.params.spender);
    }
    else if (input.method === 'allowanceForTranche'){
      result.allowance = allowanceForTranche(input.params.tranche, input.params.owner, input.params.spender);
    }
    else if(input.method === 'isControllable'){
      result.isControllable = isControllable();
    }
    else if(input.method === 'isOperator'){
      result.isOperator = isOperator(input.params.operator, input.params.tokenHolder);
    }
    else if(input.method === 'isOperatorForTranche'){
      result.isOperator = isOperatorForTranche(input.params.tranche, input.params.operator, input.params.tokenHolder);
    }
    else if(input.method === 'canTransfer'){
      result.canTransfer = canTransfer(input.params.from, input.params.to, input.params.value, input.params.data);
    }
    else if(input.method === 'canTransferTranche'){
      result.canTransfer = canTransferTranche(input.params.from, input.params.to, input.params.tranche, input.params.value, input.params.data);
    }
    else if (input.method === 'canTransferToTranche'){
      result.canTransfer = canTransferToTranche(input.params.from, input.params.fromTranche, input.params.to, input.params.toTranche, input.params.value, input.params.data);
    }
    else{
        throw '<Query interface passes an invalid operation type>';
    }
    return JSON.stringify(result);
}
```