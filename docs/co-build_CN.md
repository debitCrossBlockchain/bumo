# 超级节点共建接口

[English](co-build.md) | 中文

- [简介](#简介)
    - [初始化](#初始化)
    - [配置](#配置)
    - [状态](#状态)
- [功能接口](#功能接口)
  - [认购共建](#认购共建)
  - [取消认购](#取消认购)
  - [申请参选](#申请参选)
  - [转让份额](#转让份额)
  - [接收转让](#接收转让)
  - [提取奖励](#提取奖励)
  - [退出参选](#退出参选)
  - [公投退出](#公投退出)
  - [收回押金](#收回押金)
- [查询接口](#查询接口)
  - [查询配置信息](#查询配置信息)
  - [查询共建状态](#查询共建状态)
  - [查询转让信息](#查询转让信息)
  - [查询退出详情](#查询退出详情)
  - [查询共建者集合详情](#查询共建者集合详情)

## 简介

当用户参与 BuChain 超级节点竞选时，可以单独申请；如果资金实力不足，也可以发起节点共建计划，由众多用户共同认购共建资金，一起申请。co-build 是 BuChain 为用户发起节点共建提供的合约模板，任意用户可以使用 co-build 创建自己的共建合约，发起超级节点共建计划，发起共建的用户称为共建**发起者**。

在共建计划中，参选超级节点所需的质押金将被划分为等额的若干份，称为**共建目标总份额**。每份所需的 BU 数，称为**共建单位**。任何用户可认购一份或多份，参与认购的用户称为**共建者**。认购额达到或超过参选超级节点所需的质押金后，发起者可以**以共建合约地址为参选地址，申请成为超级节点**。

参选成功后，超级节点可以获取 BuChain 分配的区块奖励。发起者必须将部分或全部的区块奖励，分配给共建者，分配的程度称为**区块奖励分配比率**。分给创建者们的奖励，合约将按照每个共建者认购的份额在共建总份额内的占比，分给每个创建者。如果奖励分配比率为 100%，那么发起者也被视为共建者之一，所有的区块奖励都将按认购份额占比来分配。

### 初始化
发起共建计划，必须事先约定每份共建单位的BU数、共建目标总份额和分给共建者们的区块奖励在总奖励中的比率，并以[配置](#配置)的方式写入合约代码。所以，发起者在创建共建合约的时候，必须将这些配置值以参数的形式提供给合约的初始化接口，由初始化接口以此创建共建合约。初始化接口的参数包括：

| 参数         | 描述                                           |
| :-----------| ---------------------------------------------- |
| ratio       | 区块奖励分配比率，值为百分数的分子，比如80，表示80%，必填|
| unit        | 共建单位，值为BU数，比如10000，表示每份1万BU，必填|
| shares      | 共建目标总份额，共建单位乘以目标总份额，就是共建所需的目标资金总数，必填|

>例

```json
    "create_account" : {
        "init_balance":1000000,
        "init_input" : "{
            \"params\":{
                \"ratio\" :80, 
                \"unit\"  :1000000000000,
                \"shares\":500
            }
        }",
        "contract" :{
            "payload" : .../*将共建合约代码拷贝到此字段*/
        },
        "priv":{
            "master_weight" :0,
            "thresholds":{
                "tx_threshold":1
            }
        }
    }
```

### 配置

共建的发起者、共建单位、共建总份额和奖励分配比率，被统称为共建的配置，在共建合约被创建时，通过初始化参数指定，且合约一经创建不可更改。
```
    cfg = {
        'initiator'   : privbz886shHrgVS8c2k8NVpGtYKiJL3T52oML8RgTQM5w8LYRHKejcn, /*发起者*/
        'rewardRatio' : 80,                /*区块奖励分配比率*/
        'unit'        : 1000000000000,     /*共建单位*/
        'raiseShares' : 500                /*共建目标总份额*/
    };
```
注：本文档接下来的所有示例，都是以此配置值为标准来演示。

### 状态

共建的状态包括实际认购数和是否已经参选超级节点，实际认购数可以超过共建目标总份额。

```
    states = {
       'applied' : false,       /*是否已申请成为超级节点*/
       'realShares' : initShare /*实际认购份数*/
    };
```

## 功能接口
共建合约模板为普通用户参与超级节点共建提供了丰富的接口，使用户既可以发起超级节点共建，也可以参与由别人发起的共建。

### 认购共建
用户调用认购接口`subscribe`可以认购指定的共建份额参与超级节点共建。
- 共建者向共建合约转移一笔 BU （详见开发文档‘[转移BU资产](#转移bu资产)’）作为认购共建资金，转账额必须是共建单位的整数倍。
- [转移BU资产](#转移bu资产)操作的 input 字段填入`{ "method" : "subscribe", "params":{"shares":“此处填入认购份额数”}}`作为参数，注意使用转义字符。
- 在发起者申请超级节点之前，共建者可以随时追加资金，追加额必须是共建单位的整数倍。
- 在发起者申请超级节点之前，共建者可以随时撤出自己的全部认购资金，详见[取消认购](#取消认购)。

|参数|描述
|:--- | ---
|shares | 认购份额，共建单位和认购份额之积必须等于调用此接口时转账的BU数。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :5000000000000, /*5 0000 0000 0000, 5万BU*/
    "input":
    "{
      \"method\":\"subscribe\",
      \"params\":{\"shares\":5}
    }"
  }
```


### 取消认购
在发起者申请超级节点之前，共建者可以随时调用`revoke`接口撤出自己的全部认购资金。接口调用成功后，合约将共建者的共建资金返还原账户，并在合约内删除共建者的认购信息。
- 共建者向共建合约转移 0 BU 用于触发共建合约。
- 调用`revoke`接口时不需要指定参数。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":"{\"method\":\"revoke\"}"
  }
```


### 申请参选
当共建合约内认购的总金额达到申请超级节点所需的最低质押金后，发起者可以调用`apply`接口参选超级节点。申请时，共建合约的地址将作为参选的节点地址，共建合约内的所有共建资金将全部被转移到DPOS合约作为参选质押金。
- 发起者向共建合约转移 0 BU 用于触发共建合约。
- 转账操作的 input 字段填入`{ "method" : "apply", "params":{"role":"此处填入申请的超级节点角色","node":"此处填入共识节点的物理节点地址" }}`作为参数。
- 发起者可以调用通过[退出参选](#退出参选)操作退出超级节点竞选并收回质押金，普通共建者也可以通过[公投退出](#公投退出)操作发起退出超级节点竞选公投，并收回全部质押的共建资金。

|参数|描述
|:--- | ---
|role | 申请的角色，超级节点只有`validator`和`kol`两种角色。
|node | 共识节点的物理节点地址，如果角色是`kol`，则不需要提供`node`参数。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":
    "{
      \"method\":\"apply\",
      \"params\":{
          \"role\":\"validator\",
          \"node\":\"buQop4UtJJNPKSHNCt9LKYs1kDNQ4Bdz52a3\"
      }
    }"
  }
```

### 转让份额
如果共建合约已经申请了超级节点竞选，共建者将不能随意撤出认购，除非发起者触发[退出参选](#退出参选)操作，或共建者发起[公投退出](#公投退出)操作且公投退出成功。但共建者可以通过调用`transfer`接口将共建份额转让给他人，当接收者调用`accept`接口（详见[接收转让](#接收转让)）接受转让的份额后，发起转让的共建者就可以收回认购的共建资金。
- 共建者向共建合约转移 0 BU 用于触发共建合约。
- 转账操作的 input 字段填入`{ "method" : "transfer", "params":{"to":"此处填入接收份额转让者的地址","shares":"此处填入转让份额" }}`作为参数。
- 针对同一接收者重复调用`transfer`接口，转让份额的当前值将覆盖前值，转让者可以调用此接口将转让份额设为0来取消转让。

|参数|描述
|:--- | ---
|to   | 接收份额转让者的地址。
|shares | 待转让的份额，该份额可以少于转出者持有的份额，即转让者可以部分转让，但不得超过持有份额。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":
    "{
      \"method\":\"transfer\",
      \"params\":{
          \"to\":\"buQop4UtJJNPKSHNCt9LKYs1kDNQ4Bdz52a3\",
          \"shares\":5
      }
    }"
  }
```

### 接收转让
如果有共建者发起了转让共建份额操作，被指定的接收者可以调用`accept`接口接收该份额，但要支付认购该共建份额所需的BU数。
- 共建者向共建合约转账指定的BU数，该BU数等于共建单位乘以待转让份额。
- 转账操作的 input 字段填入`{ "method" : "accept", "params":{"transferor":"此处填入转让者的地址"}}`作为参数。
- 接收转让者只承购转让者的共建份额，并不包括转让者已经获得的区块奖励，但接收转让后，将可以按照共建份额获得新的区块奖励。
- 对于转让出的份额，转让者不再享有任何区块奖励。

|参数|描述
|:--- | ---
|transferor | 转让者的地址。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :5000000000000,
    "input":
    "{
      \"method\":\"accept\",
      \"params\":{
          \"transferor\":\"buQaKYwkqP4vq4Up6nqjfukBFYUWPCkAD84F\"
      }
    }"
  }
```

### 提取奖励
如果共建合约申请超级节点成功，将会获得区块奖励。共建者可以随时调用`extract`提取分得的区块奖励，提取的数量为自上次提取后累计至本次提取所积累的所有奖励，如果是初次提取，则提取自申请超级节点成功后，累计至本次提取所积累的所有奖励。
- 共建者向共建合约转移 0 BU 用于触发共建合约。
- 转账操作的 input 字段填入`{ "method" : "extract"}}`作为参数。
- 调用`extract`接口时不需要指定参数。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":"{\"method\":\"extract\"}"
  }
```

### 退出参选
发起者可以调用`withdraw`接口退出超级节点参选，退出后质押金将被DPOS合约锁定15个工作日。锁定期满后，发起者或任意共建者可以调用`takeback`接口（详见[收回押金](#收回押金)）收回质押的共建资金。
- 发起者向共建合约转移 0 BU 用于触发共建合约；
- 转账操作的 input 字段填入`{ "method" : "withdraw"}}`作为参数。
- 调用`withdraw`接口时不需要指定参数。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":"{\"method\":\"withdraw\"}"
  }
```

### 公投退出
共建者可以绕开发起者，通过调用`poll`接口发起退出超级节点公投，追随的共建者同样通过调用`poll`接口支持退出，如果认购份额超过总份额1/2的共建者投票支持退出，则共建合约将向DPOS合约发起退出申请。退出后质押金将被DPOS合约锁定15个工作日。锁定期满后，任意共建者可以调用`takeback`接口（详见[收回押金](#收回押金)）收回质押的共建资金。
- 共建者向共建合约转移 0 BU 用于触发共建合约；
- 转账操作的 input 字段填入`{ "method" : "poll"}}`作为参数。
- 调用`poll`接口时不需要指定参数。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":"{\"method\":\"poll\"}"
  }
```

### 收回押金
申请退出超级节点满15天后，质押金锁定期结束，发起者或任意共建者可以调用`takeback`接口（详见[收回押金](#收回押金)）收回质押的共建资金。
- 共建者或发起者向共建合约转移 0 BU 用于触发共建合约；
- 转账操作的 input 字段填入`{ "method" : "takeback"}}`作为参数。
- 调用`takeback`接口时不需要指定参数。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":"{\"method\":\"takeback\"}"
  }
```

## 查询接口
co-build 为发起者和共建者提供了多项查询接口，供用户查询共建相关内容。

### 查询配置信息
调用`getConfiguration`接口可以查询共建合约所有的配置项和配置值。
- 共建者或发起者向共建合约转移 0 BU 用于触发共建合约；
- 转账操作的 input 字段填入`{ "method" : "getConfiguration"}}`作为参数。
- 调用`getConfiguration`接口时不需要指定参数。

>例
```json
  {
    "contract_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "code" : "",
    "input" : "{\"method\": \"getConfiguration\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```

### 查询共建状态
调用`getStatus`接口可以查询共建合约所有的状态内容。
- 共建者或发起者向共建合约转移 0 BU 用于触发共建合约；
- 转账操作的 input 字段填入`{ "method" : "getStatus"}}`作为参数。
- 调用`getStatus`接口时不需要指定参数。

>例
```json
  {
    "contract_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "code" : "",
    "input" : "{\"method\": \"getStatus\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```

### 查询转让信息
调用`getTransferInfo`接口可以查询指定的共建份额转让信息。
- 共建者或发起者向共建合约转移 0 BU 用于触发共建合约；
- 转账操作的 input 字段填入`{ "method" : "getTransferInfo", "params":{"form":"此处填入转让者的地址", "to":"此处填入接收转让者的地址"}}`作为参数。


|参数|描述
|:--- | ---
|from | 转让者的地址。
|to   | 接收转让者的地址。

>例
```json
  {
    "contract_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "code" : "",
    "input" : "{
        \"method\": \"getStatus\"，
        \"params\":{
          \"from\":\"buQaKYwkqP4vq4Up6nqjfukBFYUWPCkAD84F\",
          \"to\":\"buQop4UtJJNPKSHNCt9LKYs1kDNQ4Bdz52a3\"  
      }
    }",
    "opt_type" : 2,
    "source_address" : ""
  }
```

### 查询退出详情
调用`getWithdrawInfo`接口可以查询发起者发起的，或共建者公投的退出提案。
- 共建者或发起者向共建合约转移 0 BU 用于触发共建合约；
- 转账操作的 input 字段填入`{ "method" : "getWithdrawInfo"}}`作为参数。
- 调用`getWithdrawInfo`接口时不需要指定参数。

>例
```json
  {
    "contract_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "code" : "",
    "input" : "{\"method\": \"getWithdrawInfo\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```
注：如果是发起者发起的退出提案，则没投票者列表。

### 查询共建者集合详情
调用`getCobuilders`接口可以获取包括发起者在内的所有共建者的认购份额和未分配区块奖励信息。
- 共建者或发起者向共建合约转移 0 BU 用于触发共建合约；
- 转账操作的 input 字段填入`{ "method" : "getCobuilders"}}`作为参数。
- 调用`getCobuilders`接口时不需要指定参数。

>例
```json
  {
    "contract_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "code" : "",
    "input" : "{\"method\": \"getCobuilders\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```
