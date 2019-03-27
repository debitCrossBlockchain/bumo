# 合约接口用例工具
## 文件说明
- case 测试用例文件夹
- common 配置目录，基本依赖目录
- template 交易模板配置

## 使用说明

在`common/config.json`里配置如下参数
``` java
{
    "ctest": {
        "address": "buQnZpHB7sSW2hTG9eFefYpeCVDufMdmmsBF", //普通账号地址，要保值里面有足够的金额
		"private_key": "privbvXRgFQScNP29tW9yQoMvqH5DHVV877ZHPmMohidSaFQ5nksSv9c", //普通账号的私钥
        "chain_address": "127.0.0.1:36002"  //目标测试节点的http接口地址
    }
}
```

