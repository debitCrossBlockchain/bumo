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
  - [追加押金](#追加押金)
  - [设置节点地址](#设置节点地址)
  - [设置投票奖励](#设置投票奖励)
  - [转让份额](#转让份额)
  - [接收转让](#接收转让)
  - [提取奖励](#提取奖励)
  - [退出参选](#退出参选)
  - [公投退出](#公投退出)
  - [收回押金](#收回押金)
  - [操作反馈](#操作反馈)
- [查询接口](#查询接口)
  - [查询配置信息](#查询配置信息)
  - [查询共建状态](#查询共建状态)
  - [查询转让信息](#查询转让信息)
  - [查询退出详情](#查询退出详情)
  - [查询共建者集合详情](#查询共建者集合详情)

## 简介

当用户参与 BuChain 超级节点竞选时，可以单独申请；如果资金实力不足，也可以发起节点共建计划，由众多用户共同认购共建资金，一起申请。co-build 是 BuChain 为用户发起节点共建提供的合约模板，任意用户可以使用 co-build 创建自己的共建合约，发起超级节点共建计划，发起共建的用户称为共建**发起者**。

在共建计划中，参选超级节点所需的质押金将被划分为等额的若干份，称为**共建目标总份额**。每份所需的 BU 数，称为**共建单位**。任何用户可认购一份或多份，参与认购的用户称为**共建者**。认购额达到或超过参选超级节点所需的质押金后，发起者可以**以共建合约地址为参选地址，申请成为超级节点**。

参选成功后，超级节点可以获取 BuChain 分配的区块奖励。发起者必须将部分或全部的区块奖励，分配给共建者，分配的程度称为**区块奖励分配比率**。分给创建者们的奖励，合约将按照每个共建者认购的份额在申请质押总份额内的占比，分给每个共建者。如果奖励分配比率为 100%，那么发起者也被视为共建者之一，所有的区块奖励都将按认购份额占比来分配。

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
        'initiator'   : Chain.tx.sender,   /*发起者*/
        'rewardRatio' : 80,                /*区块奖励分配比率*/
        'unit'        : 1000000000000,     /*共建单位*/
        'raiseShares' : 500                /*共建目标总份额*/
    };
```
注：本文档接下来的所有示例，都是以此配置值为标准来演示。

### 状态

共建的状态包括是否已参选超级节点、参选的角色、共建者总认购份额和参选后质押的份额，总认购份额和质押份额可以超过目标总份额。

```
    states = {
       'applied' : true,     /*是否已申请成为超级节点*/
       'role: 'kol',         /*申请的超级节点角色*/
       'allShares' : 700,    /*总认购份数*/
       'pledgedShares' : 500 /*参选后质押在DPOS合约内的份额*/
    };
```

## 功能接口
共建合约模板为普通用户参与超级节点共建提供了丰富的接口，使用户既可以发起超级节点共建，也可以参与由别人发起的共建。

### 认购共建
用户调用认购接口`subscribe`可以认购指定的共建份额参与超级节点共建。
- 共建者向共建合约转移一笔 BU （详见开发文档‘[转移BU资产](#转移bu资产)’）作为认购共建资金，转账额必须是共建单位的整数倍。
- [转移BU资产](#转移bu资产)操作的 input 字段填入`{ "method" : "subscribe", "params":{"shares":“此处填入认购份额数”}}`作为参数，注意使用转义字符。
- 共建者可以随时再调用`subscribe`接口追加共建份额，追加额必须是共建单位的整数倍。
- 共建合约参选超级节点后，共建者认购或追加的份额，不能获得区块奖励分配，除非共建合约向DPOS合约再次追加质押金。
- 只要共建者认购的份额未参与超级节点竞选质押，就可以随时撤出认购资金，详见[取消认购](#取消认购)。

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
如果共建者认购的份额未参与超级节点竞选质押，可以随时调用`revoke`接口撤出自己的全部认购资金。接口调用成功后，合约将共建者的共建资金返还原账户，并在合约内删除共建者的认购信息。
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

### 追加押金
当共建合约已经申请超级节点后，如果仍有新的共建者认购共建份额，那么，发起者可以调用`append`接口， 向DPOS合约转账新增的认购BU，来为超级节点竞选追加质押金，以提高共建合约地址的权益排名。
- 发起者向共建合约转移 0 BU 用于触发共建合约。
- 转账操作的 input 字段填入`{ "method" : "append"}`作为参数。
- 调用`append`接口不需要指定参数。

>例
```json
  "payCoin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":"{\"method\":\"append\"}"
  }
```
### 设置节点地址
共建合约参选超级节点竞选后，可以调用`setNodeAddress`接口设置或更改物理节点地址。

- 发起者向共建合约转账 0 BU。
- ‘转移货币’操作的 input 字段填入`{ "method" : "setNodeAddress", "params" : {  "address" : "此处填入新节点地址"} }`，注意使用转义字符。
|参数|描述
|:--- | ---
|address | 新节点地址，用于代替当前执行出块任务的节点。

>例

```json
  "pay_coin" :
  {
    "dest_address" : "buQo8w52g2nQgxnfKWovUUEFQzMCTX5TRpZD",
    "amount" :0,
    "input":
    "{
      \"method\":\"setNodeAddress\",
      \"params\":
      {
        \"address\":\"buQop4UtJJNPKSHNCt9LKYs1kDNQ4Bdz52a3\"
      }
    }"
  }
```

### 设置投票奖励

共建合约参选超级节点竞选后，调用此接口，可更改共建节点的投票奖励分配地址和比率。
- 发起者向共建合约转账 0 BU。
- ‘转移货币’操作的 input 字段填入`{ "method" : "setVoteDividend", "params":{"pool":"此字段填入投票奖励分配地址", "ratio":"此字段填入投票奖励分配比率"}}`,注意使用转义字符。

|参数|描述
|:--- | ---
|pool | 投票奖励分配地址。
|ratio | 投票奖励分配比率，值为百分数的分子，比如80，表示区块奖励的80%将转入pool参数指定的地址，再由pool地址分配给当前节点的支持者。

>例

```json
  "pay_coin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :10000000000000,
    "input":
    "{
      \"method\":\"setVoteDividend\",
      \"params\":{
        \"pool\":\"buQhqMoJziz27DdrS4DaFjeUSspxetAfvpzu\",
        \"ratio\":90
      }
    }"
  }
```

### 转让份额
如果共建者认购的共建份额参与了超级节点竞选的质押，将不能随意撤出认购，除非发起者触发[退出参选](#退出参选)操作，或共建者发起[公投退出](#公投退出)操作且公投退出成功。但共建者可以通过调用`transfer`接口将共建份额转让给他人，当接收者调用`accept`接口（详见[接收转让](#接收转让)）接受转让的份额后，发起转让的共建者就可以收回认购的共建资金。
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
如果共建合约申请超级节点成功，将会获得区块奖励。参与竞选质押的共建者可以随时调用`extract`提取分得的区块奖励，提取的数量为自上次提取后累计至本次提取所积累的所有奖励，如果是初次提取，则提取自申请超级节点成功后，累计至本次提取所积累的所有奖励。
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
共建者可以绕开发起者，通过调用`poll`接口发起退出超级节点公投，追随的共建者同样通过调用`poll`接口支持退出，如果认购份额超过质押总份额1/2的共建者投票支持退出，则共建合约将向DPOS合约发起退出申请。退出后质押金将被DPOS合约锁定15个工作日。锁定期满后，任意共建者可以调用`takeback`接口（详见[收回押金](#收回押金)）收回质押的共建资金。
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

### 操作反馈
用户触发共建合约时，如果产生重要事件，共建合约将触发tlog交易，向用户反馈合约执行的结果。tlog交易会按顺序打印多个输出，其中第一个输出为事件名称，后面的输出为该事件的关键信息列表。

|事件     |输出                          |说明 |
| :----- | ---------------------------- | -------------- |
|subscribe   |`认购者`、`认购份额`、 `认购花费BU数`       |用户认购共建份额参与节点共建时触发的事件。|
|revoke|`撤销认购者`、`撤销认购的份额`、`收回的BU数`|共建着退出认购时触发的事件。|
|apply|`质押额`、`投票奖励分配地址`、`投票奖励分配比率`|共建发起者向DPOS合约发起超级节点申请时触发的事件。|
|append|`追加额`|发起者将后续的认购份额追加到DPOS合约时触发的事件。|
|deal  |`转让者地址`、`接收者地址`、`成交份额`、`成交BU数`|共建者转让已参与质押的认购份额成功时触发的事件。|
|extract|`奖励提取者`、`提取BU数`|共建者提取奖励时触发的事件。|
|withdraw|`共建发起者`|共建发起人发起退出超级节点参选时触发的事件。|
|votePassed|`支持退出的份额数`|共建者发起退出超级节点投票，投票获得通过时触发的事件。|
|receivedPledge|`收回的质押金数额`|退出锁定期结束触发的事件。|

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

>查询结果
```
  "result": {
    "type": "string",
    "value": "{
      \"cfg\":{
        \"initiator\":\"buQhqMoJziz27DdrS4DaFjeUSspxetAfvpzu\",
        \"rewardRatio\":80,
        \"unit\":100000000000000,
        \"raiseShares\":5
      }
    }"
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

>查询结果
```json
  "result": {
    "type": "string",
    "value": "{
      \"states\":{
        \"applied\":true,
        \"allShares\":\"10\",
        \"pledgedShares\":\"7\",
        \"role\":\"kol\"
      }
    }"
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
        \"method\": \"getTransferInfo\"，
        \"params\":{
          \"from\":\"buQaKYwkqP4vq4Up6nqjfukBFYUWPCkAD84F\",
          \"to\":\"buQop4UtJJNPKSHNCt9LKYs1kDNQ4Bdz52a3\"  
      }
    }",
    "opt_type" : 2,
    "source_address" : ""
  }
```
>查询结果
```json
  "result": {
      "type": "string",
      "value": "{\"transferShares\":\"1\"}"
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

>查询结果
```json
  "result": {
    "type": "string",
    "value": "{
      \"withdrawInfo\":{
        \"withdrawed\":true,
        \"expiration\":1555149123775492,
        \"sum\":\"6\",
        \"ballot\":{
          \"buQmziFKwWTvJe5hBCFa6e3FdPDPorht3wCB\":2,
          \"buQnP4jueoC37fP2VxKpsZSTNjgFHpA442jy\":1,
          \"buQjxgZsG3B24PNzKzpTiwrRR3z6ok46izuR\":3
        }
      }
    }"
  }
```

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

>查询结果
```json
  "result": {
    "type": "string",
    "value": "{
      \"cobuilders\":{
        \"buQhqMoJziz27DdrS4DaFjeUSspxetAfvpzu\":{\"share\":1,\"pledged\":true,\"award\":\"0\"},
        \"buQmziFKwWTvJe5hBCFa6e3FdPDPorht3wCB\":{\"share\":2,\"pledged\":true,\"award\":\"0\"},
        \"buQnP4jueoC37fP2VxKpsZSTNjgFHpA442jy\":{\"share\":1,\"pledged\":true,\"award\":\"0\"},
        \"buQjxgZsG3B24PNzKzpTiwrRR3z6ok46izuR\":{\"share\":3,\"pledged\":true,\"award\":\"0\"},
        \"buQhtTjDmmquE4PTAKSzx4CqL7Z5LKLVG8SZ\":{\"share\":1,\"pledged\":false,\"award\":\"0\"},
        \"buQnr9bGeyv8f3nxwyhfHvQPNpnLbGVwHF64\":{\"share\":1,\"pledged\":false,\"award\":\"0\"},
        \"buQcP4FfV9REoHrpCyQmR3fvdkhGnN3Lwoa1\":{\"share\":1,\"pledged\":false,\"award\":\"0\"}
      }
    }"
  }
```
