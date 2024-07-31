项目整体为普通页面导入的项目，下载后需要执行
npm install 
项目需要使用puppeteer，请先了解puppeteer的使用方法

项目目录下，执行 node index.js 启用服务，监听 8703 端口，接口调用参考案例nid：#11639564

项目目录下/app是核心处理逻辑，walkTreeApp4.mjs是服务器调用puppeteer的代码

项目目录下/script是处理页面的爬取数据的核心脚本逻辑，并且该目录同时可以作为chrome浏览器插件，在浏览器中以解压版插件运行