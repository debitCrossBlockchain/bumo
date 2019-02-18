# dpos接口详细

[English](dpos.md) | 中文

<!-- TOC -->

- [验证者节点选举](#验证者节点选举)
  - [创建选举合约账户](#创建选举合约账户)
    - [选举合约升级](#选举合约升级)
    - [选举参数初始化](#选举参数初始化)
  - [角色和动作类型](#角色和动作类型)
  - [申请成为候选节点](#申请成为候选节点)
  - [为候选节点投票](#为候选节点投票)
  - [减少投票](#减少投票)
  - [候选节点退出](#候选节点退出)
  - [收回押金](#收回押金)
  - [废止恶意验证节点提案](#废止恶意验证节点提案)
  - [撤销废止恶意验证节点提案](#撤销废止恶意验证节点提案)
  - [对废止恶意验证节点提案投票](#对废止恶意验证节点提案投票)
  - [查询功能](#查询功能)
    - [查询当前验证节点集合](#查询当前验证节点集合)
    - [查询候选节点集合信息](#查询候选节点集合信息)
    - [查询用户的验证节点投票信息](#查询用户的验证节点投票信息)
    - [查询验证节点申请信息](#查询验证节点申请信息)
    - [查询指定的废止恶意节点提案的信息](#查询指定的废止恶意节点提案的信息)
- [委员会](#委员会)
  - [委员会成员初始化设置](#委员会成员初始化设置)
  - [委员会选举](#委员会选举)
    - [申请加入委员会](#申请加入委员会)
    - [委员会批准投票](#委员会批准投票)
    - [委员会成员退出](#委员会成员退出)
    - [委员会成员申请](#委员会成员申请)
  - [委员会查询](#委员会查询)
  - [选举配置更新](#验证节点选举配置更新)
    - [选举配置结构](#选举配置结构)
    - [选举配置更新提案](#选举配置更新提案)
    - [查询选举配置信息](#查询选举配置信息)
      - [获取当前验证节点选举配置信息](#获取当前验证节点选举配置信息)
      - [获取验证节点选举配置提案信息](#获取验证节点选举配置提案信息)
- [社区激励](#社区激励)
  - [KOL申请](#KOL申请)
  - [查询KOL申请信息](#查询KOL申请信息)
  - [KOL退出](#KOL退出)
  - [KOL投票和取消投票](#KOL投票和取消投票)
  - [查询用户的KOL投票信息](#查询用户的KOL投票信息)
  - [查询当前KOL信息](#查询当前KOL信息)
  - [收益模型](#收益模型)
  - [奖励和质押金提取](#奖励和质押金提取)

<!-- /TOC -->

## 验证者节点选举

### 创建选举合约账户

dpos 合约账户创建成功后，才可以进行后续的操作，且该账户是全局唯一的, 不能重复创建。

#### 选举合约升级

- 由于 dpos 合约已经存在于区块链系统中，而合约创建后无法更改，所以需要通过版本升级的方式更新。Bumo v1.2.0 之后的版本自动使用新合约地址，老合约地址(buQtxgoaDrVJGtoPT66YnA2S84yE8FbBqQDJ)将废弃不用。
- 为方便dpos合约后续升级，避免每次都借助版本升级功能，新版 dpos 合约以 delegateCall 机制实现。入口合约（假设为合约 A ）使用delegateCall将调用委托给逻辑合约（假设为合约 B ）执行，delegateCall 可以指定逻辑合约的地址。所以，合约升级时，只需要创建一个新的逻辑合约，然后将入口合约中存储的逻辑合约地址更改为新地址即可，是否更新由 [委员会](#委员会) 投票决定。
- 由于合约创建时需要进行调用测试，所以，创建逻辑合约后，才能创建入口合约。
- 创建 dpos 逻辑合约时无需指定合约地址，由系统自动生成。创建 dpos 入口合约时则需要指定合约地址为：buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss，并且在入口合约中指定已经创建好的逻辑合约的地址。

- 创建逻辑合约：将 src\ledger\dpos.js 文件中的源码全部拷贝作为账户中 payload 字段的值。

>例

```json
  "contract" :
  {
    "payload" : "拷贝 src\ledger\dpos.js 中全部代码至此处"
  },
```

- 创建入口合约A：先获取到逻辑合约B的地址，然后修改合约A中的参数：

```js
  cfg.logic_contract = '此处填入逻辑合约B的地址'
```

- 然后将 dpos_delegate.js 文件中的源码全部拷贝作为账户中的 payload 字段的值。

```json
  "dest_address": "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
  "contract" :
  {
    "payload" : "拷贝 src\ledger\dpos_delegate.js 中全部代码至此处"
  },
```

#### 选举参数初始化

 在 dpos.js 的合约代码中, 以下配置可根据需要通过 [选举配置更新](#选举配置更新) 流程来修改。

 ```json
{
  'committee_size'           : 100,
  'kol_size'                 : 30,
  'kol_candidate_size'       : 300,
  'kol_min_pledge'           : 5000000000000,  /* 5 0000 0000 0000 */
  'validator_size'           : 30,
  'validator_candidate_size' : 300,
  'validator_min_pledge'     : 500000000000000,/* 500 0000 0000 0000 */
  'in_pass_rate'             : 0.5,
  'out_pass_rate'            : 0.7,
  'valid_period'             : 1296000000000,  /* 15 * 24 * 60 * 60 * 1000 * 1000 */
  'fee_allocation_share'     : '70:20:10',     /* DAPP_70% : blockReward_20% : creator_10% */
  'reward_allocation_share'  : '50:40:10',      /* validator_50% : validatorCandidate_40% : kol_10% */
  'logic_contract'           : params.logic_contract
    };
```

|   参数  |    说明          | 默认值                                         |
| :----- | ------------------ | -------------------------------------------- |
| committee_size              | 委员会成员数目            |100|
| kol_size                    | KOL成员集合数目           |30|
| kol_candidate_size          | KOL候选人集合数目         |300|
| kol_min_pledge              | KOL候选人最小质押金额     |5000000000000|
| validator_size              | 验证节点集合数目          |30|
| validator_candidate_size    | 验证节点候选人集合数目     |300|
| validator_min_pledge        | 验证节点候选人最小质押金额  |500000000000000|
| in_pass_rate                | 进入审核投票通过率，当节点或账户参选验证节点或 kol 时，委员会的投票审核需要超过此投票率，申请者才能获得候选者资格，配置更新的审核也是适用此投票率。投票数 > 四舍五入( 节点总数 * in_pass_rate ) 则投票通过，例如，假设总共有4个节点，4 * 0.5 = 2, 投票数 > 2，那么至少要有3个投票才能通过。|0.5|
| out_pass_rate               | 废止审核投票通过率，当提案废止某个验证节点或 kol 时，委员会的投票审核需要超过此投票率，被提案者才能被废除。投票数 >= 四舍五入( 节点总数 * out_pass_rate ) 则投票通过，例如，假设总共有 4 个节点，那么 4 * 0.7 = 2.8，四舍五入后为 3，那么投票数必须 >= 3 才能通过, 如果总共有 6 个节点，那么 6 * 0.7 = 4.2，四舍五入后为 4，投票数必须 >= 4 才能通过，废止验证节点投票和选举配置更新都采用此通过率;|0.7|
| valid_period                | 有效期，单位为微秒，应用在投票有效期以及退出锁定期|1296000000000|
| fee_allocation_share        | 交易费用分配比例，70:20:10代表如果交易来自DAPP，则DAPP获得70%（否则该部分计入区块奖励block reward），20%置入区块奖励，10%分配给交易源账户的创建者|"70:20:10"|
| reward_allocation_share     |区块奖励的分配比例，50:40:10 代表验证节点集合平分区块奖励的 50%，验证节点的候选节点集合（包括验证节点集合）平分区块奖励的 40%，kol 集合平分区块奖励的 10%。|"50:40:10" |
|logic_contract |dpos的逻辑合约地址| "${logic_address}"|

### 角色和动作类型

任意 BuChain 账户可以申请成为委员会委员或候选KOL(Key Opinion Leader)，拥有节点的账户还可以申请成为候选节点，所以，对BuChain账户来说，有以下可申请的类型。

```js
const role  = {
    'COMMITTEE' : 'committee',
    'VALIDATOR' : 'validator',
    'KOL'       : 'kol'
};
```

任意BuChain账户可以执行apply动作，申请成为某一种角色；abolish动作只有同类型的成员间可以执行，比如只有验证节点才能提议废止验证节点；任意角色都可以执行withdraw操作主动退出集合；委员会成员可以执行config动作提议更改配置。

```js
const motion = {
    'APPLY'   : 'apply',
    'ABOLISH' : 'abolish',
    'WITHDRAW': 'withdraw',
    'CONFIG'  : 'config'
};
```

### 申请成为候选节点

任意一个拥有网络节点的账户可以通过向DPOS合约转移一笔 BU 作为押金，申请成为候选节点。经委员会投票审核（参考[委员会新成员批准投票](#委员会新成员批准投票)）通过后，可成为正式的候选节点。但能否成为验证节点，是根据一定周期内获得的总票数决定的。

- 申请者向DPOS合约转移一笔 BU 作为押金（参见开发文档‘[转移BU资产](#转移bu资产)’），该押金可通过 ‘[收回押金](#收回押金)’ 操作收回。
- ‘转移货币’操作的 input 字段填入`{ "method" : "apply", "params":{"role":"validator"}}`,注意使用转义字符。
- 候选节点可以多次质押，增加质押金额，提高自己的排名。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :10000000000000,
    "input":
    "{
      \"method\":\"apply\",
      \"params\":
      {
        {\"role\":\"validator\"}
      }
    }"
  }
```

申请成功后可以通过[查询功能](#查询功能)，查询候选节点信息。

注意：申请成为候选节点的账户必须拥有节点，且节点地址和账户地址相同。

### 为候选节点投票

- 任意用户向DPOS合约转账一笔BU，转账额视为用户的投票数，在转账参数中提供的地址，视为投票支持的候选节点。
- 候选节点的得票总数为自身质押额与得票数之和，候选节点增加质押额相当于给自己投票。
- 用户可以为多个候选地址投票，可投票的候选节点个数，取决于候选节点集合大小和用户的账户余额。
- 对同一地址重复投票，视为增加投票。
- ‘转移货币’操作的 input 字段填入`{ "method" : "vote", "params" : { {"role":"validator"}, "address" : "填入候选节点地址"} }`，注意使用转义字符。

>例：对指定候选节点投票

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :100000000000, /*投票1000BU*/
    "input":
    "{
        \"method\":\"vote\",
        \"params\":
        {
          {\"role\":\"validator\"},
          \"address\":\"buQtZrMdBQqYzfxvqKX3M8qLZD3LNAuoSKj4\",
        }
    }"
  }
```

### 减少投票

- 向DPOS合约转账 0 BU。
- ‘转移货币’操作的 input 字段填入`{ "method" : "unVote", "params" : { {"role":"validator"}, "address" : "填入候选节点地址", "amount": 50000000000} }`，注意使用转义字符。
- 减少投票的金额不得大于已投票的金额。 投票信息记录在合约中，可以通过获取投票信息接口getVoteInfo查询。

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":
    "{
        \"method\":\"unVote\",
        \"params\":
        {
          {\"role\":\"validator\"},
          \"address\":\"buQtZrMdBQqYzfxvqKX3M8qLZD3LNAuoSKj4\",
          \"amount\":50000000000 /*减少500BU投票*/
        }
    }"
  }
```

### 候选节点退出

- 候选节点可通过此操作退出候选节点并收回全部押金。退出流程分两步：
  - 第一步是申请退出，申请成功后进入退出锁定期，锁定期为15天。
  - 锁定期结束后进入第二步，可以再次发送退出申请，此时锁定期已过，DPOS合约账户会将所有押金退回原账户，如果当前节点是验证节点，将触发验证节点集合更新。

- 向DPOS合约转账 0 BU。
- ‘转移资产’或‘转移货币’操作的 input 字段填入 `{ "method":"withdraw", "params" : {"role":"validator"} }`，注意使用转义字符。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":
    "{
      \"method\":\"withdraw\",
      \"params\":{
        {\"role\":\"validator\"}
      }
    }"
  }
```

### 收回押金

候选节点可通过此操作收回部分押金，当候选节点押金数额超过最低质押金额时，候选节点可从质押金中收回一部分。

- 向DPOS合约转账 0 BU。
- ‘转移资产’或‘转移货币’操作的 input 字段填入 `{ "method":"takeback", "params" : {{"role":"validator"}, "amount": "1000000000000"}}`，注意使用转义字符。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":
    "{
      \"method\":\"takeback\",
      \"params\":{
        {\"role\":\"validator\"},
        \"amount\": \"1000000000000\"
      }
    }"
  }
```

操作成功后，DPOS合约账户会将数额为amount值的押金退回原账户，收回部分押金后，剩余押金不得低于最低质押金额。

### 废止恶意验证节点提案

如果某验证节点发现有另一个验证节点为恶意节点，或者不再适合作为验证节点，可以申请废止该恶意节点。发起‘废止恶意节点’提案后，需要由委员会投票决定是否执行废止操作。

- 废止者向DPOS合约转账 0 BU。
- ‘转移资产’或‘转移货币’操作的 input 字段填入 `{ "method" : "abolish",  "params" : { {"role":"validator"}, "address" : "此处填入恶意验证节点地址", "proof" : "此处填入废止该验证节点的原因"} }`，注意使用转义字符。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":
    "{
      \"method\":\"abolish\",
      \"params\":
      {
        {\"role\":\"validator\"},
        \"address\":\"buQmvKW11Xy1GL9RUXJKrydWuNykfaQr9SKE\"，
        \"proof\":\"I_saw_it_uncomfotable.\"
      }
    }"
  }
```

注意：申请废止者和被废止者必须都是验证者节点。

### 撤销废止恶意验证节点提案

如果发起废止操作的验证节点后来发现被废止节点并非恶意节点，可以取消废止操作。但如果该废止操作已经被其他验证节点投票通过，则无法取消。

- 废止者向DPOS合约转账 0 BU。
- ‘转移资产’或‘转移货币’操作的 input 字段填入`{ "method" : "quitAbolish",  "params" : {{"role":"validator"}, "address" : "此处填入恶意验证节点地址" } }`。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":
    "{ 
      \"method\":\"quitAbolish\",
      \"params\":
      { 
        {\"role\":\"validator\"},
        \"address\":\"buQmvKW11Xy1GL9RUXJKrydWuNykfaQr9SKE\"
      }
    }"
  }
```

注意：只有申请废止者才可以取消，其他节点和验证者节点无权取消。

### 查询功能

用户通过向查询接口（即 query 接口）提供指定参数，可以查看相关信息, 调用查询接口当前只能通过 callContract, contract_address 字段填入DPOS合约账户地址。

#### 查询当前验证节点集合

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" : "{\"method\": \"getValidators\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```

#### 查询候选节点集合信息

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" : "{\"method\": \"getCandidates\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```

#### 查询用户的验证节点投票信息

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" :
    "{
      \"method\": \"getVoterInfo\",
      \"params\":
      {
         \"address\":\"buQrVDKPCVE6LfCf8TyZEaiZ8R99NrSn4Fuz\",
         \"role\": \"validator\",
         \"vote_for\": \"buQmvKW11Xy1GL9RUXJKrydWuNykfaQr9SKE\"
      }
    }",
    "opt_type" : 2,
    "source_address" : ""
  }
```

#### 查询验证节点申请信息

input 中的 address 字段填入申请者地址。

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" :
    "{
      \"method\": \"getProposal\",
      \"params\":
      {
        {
          \"operate\": \"apply\",
          \"item\":\"validator\"},
          \"address\":\"buQmvKW11Xy1GL9RUXJKrydWuNykfaQr9SKE\"
      }
    }",
    "opt_type" : 2,
    "source_address" : ""
  }
```

#### 查询指定的废止恶意节点提案的信息

input 中的 address 字段填入指定的恶意节点地址。

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" :
    "{
      \"method\": \"getProposal\",
      \"params\":
      {
        {
          \"operate\": \"abolish\",
          \"item\":\"validator\"},
          \"address\":\"buQmvKW11Xy1GL9RUXJKrydWuNykfaQr9SKE\"
      }
    }",
    "opt_type" : 2,
    "source_address" : ""
  }
```

## 委员会

委员会是独立于候选节点和验证节点之外的决策层，不参与奖励分配，没有利益驱动，成员主要来自于基金会和核心开发者，选举和创建时指定一个委员会集合，之后新成员的加入和退出需要其他委员会成员的投票决定。

目前主要功能有：

- 选举配置更新，如果有委员成员觉得当前选举配置不合理，可以提出选举配置更新提案，在有效期内委员会成员投票通过之后，下一轮区块打包时则使用新的选举配置。
- 候选节点审核，普通节点申请成为候选节点时，由委员会成员审核其是否具备成为候选节点的条件，包括物理节点配置，个人或者组织认证信息，信用程度等。
- KOL成员的审核，普通用户申请成为KOL时，由委员会审核其是否具备成为KOL的条件，包括公众影响力，社区贡献，以及个人或者组织认证信息，信用程度等。
- dpos逻辑功能合约更新。

### 委员会成员初始化设置

委员会成员初始化操作在合约创建时在入口函数init()中完成。
初始化之前需要将委员会成员在社区公示，以接受用户的监督，提高公信力。

### 委员会选举

#### 申请加入委员会

- 用户向DPOS合约转账 0 BU，申请成为新委员。成为新得委员需获得委员会1/2以上的成员同意。
- ‘转移货币’操作的 input 字段填入 { "method" : "apply", "params" : {"role":"committee"}}，注意使用转义字符。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":
    "{
      \"method\":\"apply\"，
      \"params\" : {
        \"role\": \"committee\"
      }
    }"
  }
```

申请成功后可以通过[查询当前委员会信息](#查询当前委员会信息)，查询候选节点信息。

注意：申请成为候选节点的账户必须拥有节点，且节点地址和账户地址相同。

### 委员会批准投票

- 需要经过委员会的审核和批准的提案包含：候选节点，候选KOL以及委员会新成员的加入/退出（主动退出除外），以及配置更新， 半数以上委员会成员批准通过后提案才会执行。根据需要批准的类型，指定operate。
- 委员会成员向DPOS合约转账 0 BU。
- ‘转移货币’操作的 input 字段填入 { "method":"approve", "params" : {"role": "committee", "address": "此处填入新成员地址", "operate": "此处填入提案类型"} }，注意使用转义字符。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":"{
      \"method\":\"approve\",
      \"params\" : {
        \"role\":\"committee\",
        \"address\": \"buQZoJk8bq6A1AtsmfRw3rYJ79eMHUyct9i2\"
      }
    }"
  }
```

#### 委员会成员退出

- 向DPOS合约转账 0 BU。
- ‘转移资产’或‘转移货币’操作的 input 字段填入 `{ "method":"withdraw", "params" : {"role":"committee"} }`，注意使用转义字符。
- 委员会成员主动退出无需其他成员批准。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":"{
      \"method\":\"withdraw\",
      \"params\" : {
        \"role\":\"committee\"
      }
    }"
  }
```

### 查询当前委员会信息

用户通过向查询接口（即 query 接口）提供指定参数，可以查看相关信息, 调用查询接口当前只能通过 callContract, contract_address 字段填入DPOS合约账户地址。

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" : "{\"method\": \"getCommittee\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```

### 选举配置更新

- DPOS合约不仅支持选举功能，也支持选举配置的更新，选举配置更新需要委员会投票确认。在有效期内确认完成后，将触发选举配置的更新，从下一区块开始采用新的配置。

#### 选举配置结构

- 选举配置中，部分配置为系统配置，区块链底层将会使用到，在更新时需要通过合约内置接口（setSystemCfg）设置到底层。目前只有费用分配比例（fee_allocation_share）为系统配置，区块链底层在分配交易费时将读取改配置。选举配置项参考：[选举参数初始化](#选举参数初始化)

#### 选举配置更新提案

- 委员会成员向DPOS合约转账 0 BU。
- 候选节点可以提议更新某一个参数，也可以同时更新多个参数，只需要在配置中填入需要更新的参数即可。
- ‘转移资产’或‘转移货币’操作的 input 字段填入 { "method" : "configure",  "params" : { "item" :"kol_min_pledge", "value": "此处填入KOL最低质押金额"} }，注意使用转义字符。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":
    "{
      \"method\":\"configure\",
      \"params\":
      {
        \"item\": \"kol_min_pledge\",
        \"value\": 2000000000000
      }
    }"
  }
```

注意：只有委员会成员拥有投票权。若有效期内该配置更新提案未投票通过，则提案作废，选举配置保持不变。

### 查询选举配置信息

用户通过向查询接口（即 query 接口）提供指定参数，可以查看相关信息, 调用查询接口当前只能通过 callContract, contract_address 字段填入DPOS合约账户地址。

#### 获取当前验证节点选举配置信息

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input":"{\"method\": \"getConfiguration\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```

#### 获取验证节点选举配置提案信息

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" : "{\"method\": \"getProposal\", \"params\": {\"operate\": \"config\", \"item\": \"kol_min_pledge\", \"address\": \"buQmvKW11Xy1GL9RUXJKrydWuNykfaQr9SKE\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```

## 社区激励

公链生态的发展离不开社区的活跃，对Key Opinion Leader进行奖励是一个提升公链知名度，提升关注度，增加社区成员的办法。

### KOL申请

任意一个用户账户可以通过向DPOS合约转移一笔 BU 作为押金，申请成为候选KOL，只有在有效期内获得半数以上的委员会成员通过才能加入候选KOL列表，参考[委员会新成员批准投票](#委员会新成员批准投票)。能否成为正式KOL，是根据一定周期内获得的用户投票总票数决定的。

- 申请者向DPOS合约转移一笔 BU 作为押金（参见开发文档‘[转移BU资产](#转移bu资产)’），该押金可通过 ‘[收回押金](#收回押金)’ 操作收回。
- ‘转移货币’操作的 input 字段填入 `{ "method" : "apply", "params" : {"role":"kol"} }`，注意使用转义字符。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :1000000000000,
    "input":"{
      \"method\":\"apply\",
      \"params\" : {
        \"role\":\"kol\"
      }
    }"
  }
```

申请成功后可以通过[查询当前KOL信息](#查询当前KOL信息)接口，查询候选KOL信息。

#### 查询KOL申请信息

input 中的 address 字段填入申请者地址。

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" :
    "{
      \"method\": \"getProposal\",
      \"params\":
      {
        {
          \"operate\": \"apply\",
          \"item\":\"kol\"},
          \"address\":\"buQmvKW11Xy1GL9RUXJKrydWuNykfaQr9SKE\"
      }
    }",
    "opt_type" : 2,
    "source_address" : ""
  }
```

### KOL退出

- KOL可通过此操作收回全部押金。退出流程分两步：
  - 第一步是申请退出，申请成功后进入退出锁定期，锁定期为15天。
  - 锁定期结束后进入第二步，可以再次发送退出申请，此时锁定期已过，DPOS合约账户会将所有押金退回原账户，如果当前节点是KOL，将触发KOL集合更新。
- 向DPOS合约转账 0 BU。
- ‘转移资产’或‘转移货币’操作的 input 字段填入 `{ "method":"withdraw", "params" : {"role":"kol"}}`，注意使用转义字符。

>例

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":"{
      \"method\":\"withdraw\",
      \"params\" : {
        \"role\":\"kol\"
      }
    }"
  }
```

操作成功后，DPOS合约账户会将数额为amount值的押金退回原账户，收回部分押金后，剩余押金不得低于最低质押金额。

### KOL投票和取消投票

- 所有用户均可向DPOS合约转移一笔BU投票支持某个候选KOL。
- 用户可以为多个候选KOL投票，可投票的候选KOL个数，取决于候选KOL集合大小和用户的账户余额。
- 对同一地址重复投票，后值将覆盖前值。后值大，则视为增加投票，后值小，则视为减少投票，地址参数不能省略。
- 如果投票额为0，视为用户撤销对该候选KOL的投票，地址参数不能省略，参考[为候选节点投票和取消投票](#为候选节点投票和取消投票)。
- ‘转移货币’操作的 input 字段填入 `{ "method":"vote", "params" : {"role":"kol", "address": "此处填入候选KOL的地址"}}`，注意使用转义字符。

>投票

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :100000000,
    "input":"{
      \"method\":\"vote\",
      \"params\" : {
        \"role\":\"kol\",
        \"address\": \"buQYKj4TTJPVDPXCLWeBZMoCr1JPhq9Z2tJm\"
      }
    }"
  }
```

>取消投票

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":"{
      \"method\":\"unVote\",
      \"params\" : {
        \"role\":\"kol\",
        \"address\": \"buQYKj4TTJPVDPXCLWeBZMoCr1JPhq9Z2tJm\"
        \"coin_amount\": 50000000
      }
    }"
  }
```

coin_amount为减少投票的代币金额。

### 查询用户的KOL投票信息

- params内address为投票用户地址

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" :
    "{
      \"method\": \"getVoterInfo\",
      \"params\":
      {
         \"address\":\"buQrVDKPCVE6LfCf8TyZEaiZ8R99NrSn4Fuz\",
         \"role\": \"kol\",
         \"vote_for\": \"buQmvKW11Xy1GL9RUXJKrydWuNykfaQr9SKE\"
      }
    }",
    "opt_type" : 2,
    "source_address" : ""
  }
```

### 查询当前KOL信息

用户通过向查询接口（即 query 接口）提供指定参数，可以查看相关信息, 调用查询接口当前只能通过 callContract, contract_address 字段填入DPOS合约账户地址。

>例

```json
  {
    "contract_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "code" : "",
    "input" : "{\"method\": \"getKols\"}",
    "opt_type" : 2,
    "source_address" : ""
  }
```

### 奖励和质押金提取

- 验证节点，候选节点，KOL获得的奖励数额都记录在合约中，达到一定数额时，用户可以主动发起取现请求进行奖励取现。
- 候选节点或者候选KOL主动退出集合时，冻结期满后可以再次请求退出，触发集合更新以及将质押金转移到取现记录中等待取现。此时用户可以发起取现请求将质押金取现(为简化质押金取现操作，可以冻结期满后的withdraw请求和取现请求合并到一个交易内提交)。
- 向DPOS合约转账0BU。
- ‘转移资产’或‘转移货币’操作的 input 字段填入 `{ "method":"extract"}`，注意使用转义字符。

>奖励取现

```json
  "payCoin" :
  {
    "dest_address" : "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
    "amount" :0,
    "input":"{
      \"method\":\"extract\",
    }"
  }
```

>质押金取现

```json
"operations" :
[
  {
    "type": 7,
    "pay_coin":
    {
      "dest_address": "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
      "amount": 0,
      "input":
      "{
        \"method\":\"withdraw\",
        \"params\":{
          {\"role\":\"validator\"}
        }
      }"
    }
  },
  {
    "type": 7,
    "pay_coin":
    {
      "dest_address": "buQqzdS9YSnokDjvzg4YaNatcFQfkgXqk6ss",
      "amount": 0,
      "input":"{
        \"method\":\"extract\",
      }"
    }
  }
]
```

### 收益模型

阿里云

- 8核，32G，900G本地ssd， 120G系统盘，16480/年
- 16核，64G，1788G本地ssd，120G系统盘，31525/年

以8核32G机器为例，当前币价约￥0.3（2019-1-13）：

- 一年总收益：8640* 8* 0.3* 365/天 = ￥7568640
- 30个验证节点：￥7568640* 0.7 / 30 = ￥176601.6，质押500w BU* 0.3 = ￥150w, ￥16w左右收益，平均年收益率约10.6%（日交易量100w左右，费用激励可忽略）
- 10个候选节点：￥7568640* 0.2 / 10 = ￥151372，质押500w BU* 0.3 = ￥150w, ￥13.5万左右收益，平均年收益率约8%（候选节点越多，收益越低，参选节点维持在40-50个较为合适）
- 50个KOL： ￥7568640* 10% = 756864 / 50 = ￥15137, 质押50w BU* 0.3 = ￥15w, ￥15137收益，平均年收益率约10%
- DAPP：100w tx* 0.0025* 0.3* 0.7 = 525， 100w交易获得￥525的返现。
- 验证节点和候选节点的数目比应等于两者区块奖励份额比乘以两者收益率比。
- 为保证收益率一致，变更区块奖励份额比例同时应变更节点数目比例。
