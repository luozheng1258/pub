import fs from 'fs';
import path from 'path';
import url from 'url';
import Figma2IvxAbs from '../../app/script/output/figma2ivxabs.mjs';

// 获取当前模块的 URL
const __filename = url.fileURLToPath(import.meta.url);
// 从模块 URL 中提取目录路径
const __dirname = path.dirname(__filename);
var data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../layerTreeOrigin/tree_1920.json'), {
    encoding: 'utf8',
  })
);

let figma2ivxabs = new Figma2IvxAbs({ figmaNodes: data });
let result = figma2ivxabs.exec({ env: 'abs' });
let u = '../layerTree/result' + Date.now() + '.json';
fs.writeFileSync(path.join(__dirname, u), JSON.stringify(result, null, 2));
