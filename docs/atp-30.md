# BUMO ATP 30 协议



[Bumo ATP 30 Token 标准](#bumo-atp-30-协议)

- [简介](#简介)

- [标准](#标准)
  - [NTF ID](#ntf-id)

- [事件](#事件)

- [功能函数](#功能函数)

  - [totalSupply](#totalsupply)
  - [balanceOf](#balanceof)
  - [ownerOf](#ownerof)
  - [approve](#approve)
  - [transfer](#transfer)
  - [transferFrom](#transferfrom)
  - [tokensOfOwner](#tokensofowner)
  - [tokenInfo](#tokeninfo)
  - [name](#name)
  - [symbol](#symbol)

- [合约入口](#合约入口)

  - [init](#init)
  - [main](#main)
  - [query](#query)



## 简介

ATP 30是“Non-Fungible Tokens”，英文简写为”NFT”，可以翻译为不可互换的Tokens。简单地说，就是每个Token都是独一无二的，是不能互换的；

```
在合约范围内tokenId是唯一的
tokenId只能被一个owner(i.e. address) 所拥有
一个owner可以拥有多个NFTs，它的balance只记数量
ATP 30提供approve, transfer, transferFrom 接口用于所属权转移
```



## 标准



### NTF ID

### 

```
NTF ID，即tokenId，在合约中用唯一标识符，每个NFT的ID在智能合约的生命周期内不允许改变。推荐的实现方式有：从0开始，每新加一个NFT，NTF ID加1
```

---



## 事件



​       函数transfer，approve，transferFrom会触发事件，事件是调用tlog接口，在区块链上记录一条交易日志，该日志记录了函数调用详情，方便用户阅读。

​       tlog定义如下:

```
tlog(topic,args...);
```

- tlog会产生一笔交易写在区块上
- topic: 日志主题，必须为字符串类型,参数长度(0,128]
- args...: 最多可以包含5个参数，参数类型可以是字符串、数值或者布尔类型,每个参数长度(0,1024]





## 功能函数

#### totalSupply

> 发行的token总数

```javascript
// 在query()函数中调用
totalSupply() {

}
```



#### balanceOf

> 查询一个地址所拥有的token数量

##### 传入参数

| 参数    | 类型     | 描述   |
| ----- | ------ | ---- |
| owner | String | 账户地址 |

##### 返回值：number类型

```javascript
// 在query()函数中调用
balanceOf(owner) {

}
```



#### ownerOf

> 查询tokenId的拥有者

##### 传入参数：

| 参数      | 类型     | 描述      |
| ------- | ------ | ------- |
| tokenId | Number | tokenId |

##### 返回值: number类型

##### 调用方式:

```javascript
// 在query()函数中调用
function ownerOf(tokenId) {

}
```



#### approve

> 批准地址to具有转移tokenId的能力, 只有token的拥有者才可以调用

##### 传入参数

| 参数      | 类型     | 描述          |
| ------- | ------ | ----------- |
| to      | String | 接受token的地址  |
| tokenId | Number | 待转移的tokenId |

```javascript
// 在main() 函数中调用
approve(to, tokenId) {

}
```

##### 事件：

```javascript
  tlog('approve', sender, to, tokenId);
```

​           topic: 方法名，这里是'approve'

​           sender:  合约调用账户地址

​           To: 被授权账户地址

​           tokenId: 转移的tokenId



#### transfer

> 转移token，只有token的拥有者才可以调用

##### 传入参数:

| 参数      | 类型     | 描述          |
| ------- | ------ | ----------- |
| to      | String | 接受token的地址  |
| tokenId | Number | 待转移的tokenId |

```javascript
// 在main() 函数中调用
function transfer(to, tokenId) {

}
```

##### 事件：
```javascript
tlog('transfer', sender, to, tokenId);
```

​       topic: 方法名，这里是'transfer'

​       sender:  合约调用账户地址

​       to: 目标账户地址

​       tokenId: 转移的tokenId



#### transferFrom

> 转移token,  只有token的授权地址才可以调用

##### 传入参数:

| 参数      | 类型     | 描述           |
| ------- | ------ | ------------ |
| from    | String | tokenId的授权地址 |
| to      | String | 接受token的地址   |
| tokenId | Number | 待转移的tokenId  |

```javascript
// 在main() 函数中调用
transferFrom(from, to, tokenId) {

}
```

##### 事件：

```javascript
tlog('transferFrom', sender, from, to, tokenId);
```

​      topic: 方法名，这里是'transferFrom'

​      sender:  合约调用账户地址

​      from: 源账户地址

​      to: 目标账户地址

​      tokenId: 转移的tokenId



#### tokensOfOwner

> 返回地址owner的所有token

##### 传入参数:

| 参数    | 类型     | 描述          |
| ----- | ------ | ----------- |
| owner | String | token拥有者的地址 |

##### 返回值：Array

```javascript
// 在main() 函数中调用
function tokensOfOwner(owner) {
 }
```



#### tokenInfo

> 通过tokenId查询token信息

传入参数:

| 参数      | 类型     | 描述       |
| ------- | ------ | -------- |
| tokenId | Number | token id |

返回值: Object

```javascript
function tokenInfo(tokenId) {

}
```



#### name

> 返回本合约token的名称

```javascript
name() {

}
```



#### symbol

> 返回本合约token的符号

```javascript
symbol() {

}
```

---



## 合约入口

#### init

> 合约的初始化函数，创建合约时调用

```javascript
function init(arg) {
	
}
```



#### main

> 合约执行的入口函数

```javascript
function main(arg) {
	
}
```



#### query

> 执行查询操作

```javascript
function query(arg) {
	
}
```

------

# 