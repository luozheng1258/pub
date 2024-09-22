项目整体为普通页面导入的项目，下载后需要执行
npm install 
项目需要使用puppeteer，请先了解puppeteer的使用方法

项目目录下，执行 node index.js 启用服务，监听 8703 端口，接口调用参考案例nid：#11639564

项目目录下/app是核心处理逻辑，walkTreeApp4.mjs是服务器调用puppeteer的代码

项目目录下/script是处理页面的爬取数据的核心脚本逻辑，并且该目录同时可以作为chrome浏览器插件，在浏览器中以解压版插件运行


# linux中安装
## Oracle Linux Server 8.9 系统
libatk-1.0.so.0 是 ATK (Accessibility Toolkit) 库的一部分，通常可以通过安装 atk 包来解决
- 如果 Chromium 启动时还缺少其他依赖库
sudo dnf install \
  libX11 \
  libXcomposite \
  libXdamage \
  libXrandr \
  libXScrnSaver \
  libXtst \
  nss \
  gtk3 \
  libgbm \
  libdrm \
  alsa-lib \
  atk

# zip 部署到lambda
zip -r walkPage_test.zip .