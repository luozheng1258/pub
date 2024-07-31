import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import walkPage from './script/output/html-to-ivxabs-2.mjs';
import Figma2IvxAbs from './script/output/figma2ivxabs.mjs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      '--window-size=1920,1080',
    ],
  };
  if (os.type() !== 'Windows_NT') {
    // 非windows系统,使用chrome的执行路径
    opts.executablePath = '/usr/bin/google-chrome';
  }
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();

  page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );

  let loadCnt = 0;

  let imgDict = {};

  // page.on('request', request => {
  //     if (request.resourceType() === 'image') {
  //         const imageUrl = request.url();
  //         const fileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
  //         const savePath = `images/${fileName}`;
  //         request.
  //         //   request.buffer().then(buffer => fs.writeFileSync(savePath, buffer));
  //         console.log("debug imgUrls:", imageUrl)
  //         if (!imageUrl.startsWith("data")) {
  //             imgDict[imageUrl] = {
  //                 done: false,
  //                 ivxUrl: ""
  //             }
  //         }
  //     }
  // });

  page.on('domcontentloaded', async () => {
    loadCnt++;
    if (loadCnt > 1) {
      return;
    }
    console.log('DOM加载完成，但可能还有资源没加载');
    setTimeout(async () => {
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

      const dateTime = Date.now();

      const getIvxCase = async ({ outputFigmaJSON, windowBoundW = 1920 }) => {
        const figmaJSON = await page.evaluate(walkPage);
        if (os.type() == 'Windows_NT' && outputFigmaJSON) {
          writeJSON({
            jsonStr: JSON.stringify(figmaJSON.layerTree),
            url: 'output/layerTreeOrigin/tree_' + windowBoundW + '.json',
          });
        }
        let figma2ivxabs = new Figma2IvxAbs({
          figmaNodes: figmaJSON.layerTree,
        });
        return figma2ivxabs.exec({ env: 'abs' });
      };
      let result = await getIvxCase({ outputFigmaJSON: true });

      // 使用 DevTools 协议动态调整浏览器窗口大小1820
      const client = await page.target().createCDPSession();
      let windowBoundW = 1820;
      await client.send('Browser.setWindowBounds', {
        windowId: (await client.send('Browser.getWindowForTarget')).windowId,
        bounds: { width: windowBoundW, height: 1080 },
      });
      let rs = await getIvxCase({ outputFigmaJSON: false, windowBoundW });

      recordNodeW({ source: result, target: rs, windowBoundW });

      let url = 'output/layerTree/result' + dateTime + '.json';
      writeJSON({ jsonStr: JSON.stringify(result), url: url });
      // url = 'output/layerTree/result' + dateTime + 'abs.json';
      // writeJSON({ jsonStr: JSON.stringify(rs), url: url });

      console.log('write json done:' + url);

      setTimeout(async () => {
        await browser.close();
      }, 1000);
    }, 4000);
  });
  // 设置超时为 90 秒
  await page.goto(recvUrl, { timeout: 90000 });
})();

function recordNodeW({ source, target, windowBoundW }) {
  let { stage } = source || {};
  let { stage: targetStage } = target || {};

  let recordWindowBoundW = ({ node1, node2 }) => {
    let { props, uis, children } = node1 || {};
    let { props: targetProps, children: targetChildren } = node2 || {};
    let { width } = props || {};
    let { width: targetWidth } = targetProps || {};
    let { _extraStyle } = uis || {};

    if (width !== targetWidth && _extraStyle) {
      _extraStyle.windowBoundW = { [windowBoundW]: targetWidth, 1920: width };
    }

    if (Array.isArray(children) && Array.isArray(targetChildren)) {
      children.forEach((child, index) => {
        recordWindowBoundW({ node1: child, node2: targetChildren[index] });
      });
    }
  };
  recordWindowBoundW({ node1: stage, node2: targetStage });
}
