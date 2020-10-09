# Node版 三国杀 服务器程序

# 前言:

多年不玩三国杀,才发现国战模式,觉得很不错
然而凉企黑心将牌需要氪金,同时人在国外延迟问题太过严重
想要开免费私人cloud server自己host,才发现太阳神啥的都是windows版本
愤而写下这个node web版本,以便和朋友们在疫情期间也可以爽玩

一毛不拔的我,怎么可能花钱?

云端开设服务器教程:

1. 找个oracle cloud free tier linux云端服务器. 下面这个链接是用作minecraft的, 三国杀需要的系统资源更少, 用free tier绰绰有余
    https://blogs.oracle.com/developers/how-to-setup-and-run-a-free-minecraft-server-in-the-cloud

2. 额外需要的一些command:
    ```sudo yum install git                        #install git 然后 clone 这个 repo. 你要scp进去也成```
    ```sudo yum install rh-nodejs12                #安装nodeJS ```
    ```scl enable rh-nodejs12 bash                 #开通node command```
    ```node <your path>/resources/server.js                  #开启服务器! ```
    游戏设置位于:  ```./resources/config-server.json``` (需要在此设置玩家数量)

3. 浏览器作为游玩客户端(推荐Chrome)

4. Dev 安装
```cmd
    npm install
    cd ./resources
    node server.js #可以直接用repo的开始游玩
```

### 游戏截图

![游戏截图](https://github.com/Iceberglet/sanguosha/blob/master/screenshot-1.PNG?raw=true)
![游戏截图](https://github.com/Iceberglet/sanguosha/blob/master/screenshot-2.PNG?raw=true)

### 须知

- 当前仅支持国战模式
- 无AI
- 暂时最多八人游戏

### Todo:
- 无懈可击·国对势力的使用
- 阵法技和阵法召唤
- 身份局模式
- 国战武将(现有71个 @2020-10-04)

### License
- 资源都是网上找的所以你懂的,仅限学习交流