一、运行backend

1. cd robot/backend

2. 安装 node@20	

   1. 访问 Node.js 下载页面：https://nodejs.org/en/download

   2. 选择 v20.18.3 版本下载安装

   3. 验证安装：

      在终端运行

      ```bash
      node -v
      npm -v
      ```

3. 安装pm2

   ```
   npm install pm2 -g
   ```

4. 安装插件

   ```
   npm i
   ```

5. 运行服务

   ```
   npm run start
   ```

   1.如果提示”Failed to connect to Binance servers.“，需要配置终端代理然后重新运行npm run start.
      命令行终端连上VPN：启动你的VPN应用，获取端口(复制终端代理命令)，并执行命令：（端口7890改为你自己VPN的端口）      export https_proxy=http://127.0.0.1:7890/ http_proxy=http://127.0.0.1:7890/ all_proxy=socks5://127.0.0.1:7890

6. 停止服务: 

   ```
   pm2 kill
   ```

   

注：backend程序默认使用26535端口，如果提示26535已被占用

1. 检查哪个程序正在使用该端口
   在Windows上可以使用以下命令：netstat -ano | findstr : 26535
   mac或者Linux：lsof -i:26535
2. 然后使用以下命令来终止进程
   在Windows:  taskkill /PID pid /F
   mac或者Linux: kill -9 pid
   例如：kill -9 1234

二、运行frontend

1. 双击在浏览器中打开frontend_dist文件夹里的index.html

   

三、更新项目

1. 如果Robot程序正在运行，需要先全部停止。运行 pm2 kill

2. 覆盖robot文件夹里的backend、frontend和frontend_dist文件夹，粘贴选择全部替换

3. 如果更新前backend处于运行状态，需要先停止运行，在终端中运行 pm2 kill

4. 在backend下安装插件

   ```
   npm i
   ```

5. 重新运行backend: 

   ```
   npm run start
   ```

6. 重新打开frontendDist文件夹里的index.html
