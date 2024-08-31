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
const windowBoundW1 = 1750;
const windowBoundW2 = 1600;

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
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  // 设置视口宽度
  await page.setViewport({ width: defaultWindowBoundW, height: 800 });

  page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );

  let loadCnt = 0;

  // 设置 HTTP 头，确保使用 UTF-8 编码
  // 设置超时为 90 秒
  await page.goto(recvUrl, { timeout: 90000, waitUntil: 'networkidle2' });

  let processLoaded = async () => {
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

      let matchs = recvUrl.match(/^https?:\/\/(.*?)(\/?)$/);
      let name = matchs ? matchs[1].replaceAll('.', '_') : 'example';
      // 截图并保存为example.png
      // await page.screenshot({ path: `output/layerTreeOrigin/${name}.jpeg` });

      const dateTime = Date.now();

      const getIvxCase = async ({
        outputFigmaJSON,
        windowBoundW = defaultWindowBoundW,
      }) => {
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
      const getIvxCaseBySetWindowBounds = async ({
        client,
        windowBoundW,
        sourceIvxCase,
        page,
      }) => {
        await client.send('Browser.setWindowBounds', {
          windowId: (await client.send('Browser.getWindowForTarget')).windowId,
          bounds: { width: windowBoundW, height: 1080 },
        });
        await page.setViewport({ width: windowBoundW, height: 800 });
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
        sourceIvxCase: result,
        page,
      });
      await getIvxCaseBySetWindowBounds({
        client,
        windowBoundW: windowBoundW2,
        sourceIvxCase: result,
        page,
      });

      let url = 'output/layerTree/result' + dateTime + '.json';
      writeJSON({ jsonStr: JSON.stringify(result), url: url });
      // url = 'output/layerTree/result' + dateTime + 'abs.json';
      // writeJSON({ jsonStr: JSON.stringify(rs), url: url });

      console.log('write json done:' + url);

      setTimeout(async () => {
        await browser.close();
      }, 1000);
    }, 2000);
  };
  processLoaded();
})();

function recordNodeW({ source, target, windowBoundW }) {
  let { stage } = source || {};
  let { stage: targetStage } = target || {};

  let recordWindowBoundW = ({ node1, pNode1, node2, pNode2 }) => {
    let { props, uis, children } = node1 || {};
    let { props: targetProps, children: targetChildren } = node2 || {};
    let { width } = props || {};
    let { width: targetWidth } = targetProps || {};
    let { _extraStyle } = uis || {};

    if (width && targetWidth && width !== targetWidth && _extraStyle) {
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
