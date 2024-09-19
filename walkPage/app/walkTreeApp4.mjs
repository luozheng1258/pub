import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import walkPage from './script/output/html-to-ivxabs-2.mjs';
import Figma2IvxAbs from './script/output/figma2ivxabs.mjs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultWindowBoundW = 1890;
const defaultWindowBoundH = 900;
const windowBoundW1 = 1750;
const windowBoundH1 = 900;
const windowBoundW2 = 1600;
const windowBoundH2 = 900;

async function writeJSON({ jsonStr, url }) {
  fs.writeFileSync(url, jsonStr, 'utf-8');
}
(async () => {
  let recvUrl = '';
  recvUrl = process.argv[2];
  console.log('debug get param', recvUrl);
  if (!recvUrl) {
    console.log('err no url');
    return;
  }

  let opts = {
    headless: 'new', // 无头模式
    ignoreHTTPSErrors: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=${defaultWindowBoundW},1080`,
    ],
  };
  if (os.type() !== 'Windows_NT') {
    // 非windows系统,使用chrome的执行路径
    // opts.executablePath = '/usr/bin/google-chrome';
  }
  console.log('Chrome executable path:', puppeteer.executablePath());
  const browser = await puppeteer.launch(opts);
  console.log('browser launched');
  const page = await browser.newPage();
  console.log('page created');
  // 设置视口宽度
  await page.setViewport({
    width: defaultWindowBoundW,
    height: defaultWindowBoundH,
  });
  page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );
  console.log("page's user agent set");
  let loadCnt = 0;
  try {
    await page.goto(recvUrl, { timeout: 30000, waitUntil: 'networkidle2' });
    // await page.goto(recvUrl, {
    //   timeout: 30000,
    //   waitUntil: 'domcontentloaded',
    // });
    // 等待网络连接几乎空闲，最多只有2个请求正在进行
    // await page.waitForNetworkIdle({
    //   idleTime: 1000, // 网络闲置时间，单位是毫秒
    //   timeout: 30000, // 如果在指定的时间内网络没有达到空闲状态，会抛出一个超时错误
    //   concurrency: 2, // 页面的并发网络请求数，当页面的并发网络请求数降到此值或更低时，Puppeteer 会认为页面处于“空闲”状态，并继续执行后续操作
    // });
    // console.log('networkidle2');
  } catch (e) {
    console.log(`${recvUrl} navigation err:`, e);
  }

  let processLoaded = async () => {
    loadCnt++;
    if (loadCnt > 1) {
      return;
    }
    console.log('DOM加载完成，但可能还有资源没加载');

    // 滑动到页面底部的函数
    async function scrollToBottom() {
      await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
          var totalHeight = 0;
          var distance = 500; // 每次向下滚动的距离
          var timer = setInterval(() => {
            let scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight || totalHeight > 20000) {
              clearInterval(timer);
              resolve();
            }
          }, 200);
        });
      });
    }
    // 调用滑动到页面底部的函数
    await scrollToBottom();
    // 滑动回最顶部
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        window.scrollTo(0, 0);
        var timer = setTimeout(() => {
          window.scrollTo(0, 0);
          resolve();
        }, 500);
      });
    });
    console.log(`scroll end`);

    // 等待500ms，等动效完成(部分网站滚动到顶部会有动效)
    await new Promise((resolve) => setTimeout(resolve, 500));
    // 截图
    await screenshot({ recvUrl, page });

    const dateTime = Date.now();
    // 生成案例数据
    const getIvxCase = async ({
      outputFigmaJSON,
      windowBoundW = defaultWindowBoundW,
    }) => {
      const figmaJSON = await page.evaluate(walkPage);
      if (os.type() == 'Windows_NT' && outputFigmaJSON) {
        writeJSON({
          jsonStr: JSON.stringify(figmaJSON.layerTree),
          url: path.resolve(
            __dirname,
            '../output/layerTreeOrigin/tree_' + windowBoundW + '.json'
          ),
        });
      }
      let figma2ivxabs = new Figma2IvxAbs({
        figmaNodes: figmaJSON.layerTree,
        windowBoundInfo: {
          windowBoundW: defaultWindowBoundW,
          windowBoundH: defaultWindowBoundH,
          windowBoundW1: windowBoundW1,
          windowBoundH1: windowBoundH1,
          windowBoundW2: windowBoundW2,
          windowBoundH2: windowBoundH2,
        },
      });
      return figma2ivxabs.exec({ env: 'abs' });
    };
    // 调整浏览器窗口大小，获取不同窗口大小下的案例数据
    const getIvxCaseBySetWindowBounds = async ({
      client,
      windowBoundW,
      windowBoundH,
      sourceIvxCase,
      page,
    }) => {
      await client.send('Browser.setWindowBounds', {
        windowId: (await client.send('Browser.getWindowForTarget')).windowId,
        bounds: { width: windowBoundW, height: 1080 },
      });
      await page.setViewport({ width: windowBoundW, height: windowBoundH });
      let rs = await getIvxCase({
        outputFigmaJSON: true,
        windowBoundW,
      });
      recordNodeW({ source: sourceIvxCase, target: rs, windowBoundW });
    };

    let result = await getIvxCase({
      outputFigmaJSON: true,
      windowBoundW: defaultWindowBoundW,
    });

    // 使用 DevTools 协议动态调整浏览器窗口大小
    const client = await page.target().createCDPSession();
    await getIvxCaseBySetWindowBounds({
      client,
      windowBoundW: windowBoundW1,
      windowBoundH: windowBoundH1,
      sourceIvxCase: result,
      page,
    });
    await getIvxCaseBySetWindowBounds({
      client,
      windowBoundW: windowBoundW2,
      windowBoundH: windowBoundH2,
      sourceIvxCase: result,
      page,
    });

    let url =
      path.resolve(__dirname, '../output/layerTree/result') +
      dateTime +
      '.json';
    writeJSON({ jsonStr: JSON.stringify(result), url: url });

    console.log('write json done:' + url);

    setTimeout(async () => {
      await browser.close(); // 关闭浏览器
    }, 1000);
  };
  processLoaded();
})();

function recordNodeW({ source, target, windowBoundW }) {
  let { stage } = source || {};
  let { stage: targetStage } = target || {};

  let recordWindowBoundW = ({ node1, pNode1, node2, pNode2 }) => {
    let { props, uis, children } = node1 || {};
    let {
      props: targetProps,
      children: targetChildren,
      uis: targetUis,
    } = node2 || {};
    let { width } = props || {};
    let { width: targetWidth } = targetProps || {};
    let { _extraStyle } = uis || {};
    let { _extraStyle: targetExtraStyle } = targetUis || {};

    if (
      width &&
      targetWidth &&
      width !== targetWidth &&
      _extraStyle &&
      _extraStyle.className === targetExtraStyle?.className
    ) {
      const { width: pW1 = 1 } = pNode1?.props || {};
      const { width: pW2 = 1 } = pNode2?.props || {};
      _extraStyle.windowBoundW = Object.assign(_extraStyle.windowBoundW || {}, {
        [windowBoundW]: { w: targetWidth, per: targetWidth / pW2 },
        [defaultWindowBoundW]: { w: width, per: width / pW1 },
      });
    }

    if (Array.isArray(children) && Array.isArray(targetChildren)) {
      children.forEach((child, index) => {
        recordWindowBoundW({
          node1: child,
          pNode1: node1,
          node2: targetChildren[index],
          pNode2: node2,
        });
      });
    }
  };
  recordWindowBoundW({ node1: stage, node2: targetStage });
}
// 截图
async function screenshot({ recvUrl, page }) {
  let matchs = recvUrl.match(/^https?:\/\/(.*?)(\/?)$/);
  let name = matchs
    ? matchs[1].replaceAll('.', '_').replaceAll('/', '_')
    : 'example';
  // 截图并保存为example.png
  try {
    await page.screenshot({
      path: path.resolve(__dirname, `../output/layerTreeOrigin/${name}.jpeg`),
    });
  } catch (e) {}
}
