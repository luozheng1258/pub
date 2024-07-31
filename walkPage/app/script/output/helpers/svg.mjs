import { processFills } from './utils/fills.mjs';
import { processEffects } from './utils/effects.mjs';
import { processStrokes } from './utils/strokes.mjs';
import { convertBaseProps } from './utils/baseProps.mjs';

let svgDefsCount = 0; // 统计svg下defs下的id
const SVG_NS = 'http://www.w3.org/2000/svg';

// 合并路径生成svg节点
function genSvgNodeV2({ node, env, parent }) {
  const imgTemp = {
    type: 'ih5-image',
    props: {},
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['abs'],
  };
  const target = imgTemp;

  convertBaseProps({ target, node, env, parent });

  const pathArr = [];
  const defs = [];

  switch (node.type) {
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
      pathArr.push(genSvgPath({ node, defs }));
      break;
    case 'FRAME':
      node.children.forEach((child) => {
        pathArr.push(genSvgPath({ node: child, parent: node, defs }));
      });
      break;
  }

  let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${node.width}" height="${node.height}">`;
  if (defs.length > 0) {
    svgStr += '<defs>' + defs.join('') + '</defs>';
  }
  svgStr += pathArr.join('');
  svgStr += '</svg>';
  target.props.rawSvg = svgStr;
  return target;
}

function genSvgPath({ node, parent, preClipPath, defs }) {
  let path = '';
  let pathArr = [];
  let { x = 0, y = 0 } = node;
  let svgFilter = '';
  let svgFill = '';
  let svgFillOpacity = 0;
  let svgStrokeColor = '';
  let svgStrokeOpacity = 0;
  // 注意 group的定位比较特殊，是相对于最上层的节点
  if (parent && ['BOOLEAN_OPERATION', 'GROUP'].includes(parent.type)) {
    x -= parent.x;
    y -= parent.y;
    delete node.rotation;
  }
  let transformVal = getTransformValue({ x, y, angle: node.rotation || 0 });

  // 处理effects
  if (Array.isArray(node.effects) && node.effects.length > 0) {
    let {
      shadowType,
      dropShadowColor,
      dropShadowOffX,
      dropShadowOffY,
      dropShadowBlur,
    } = processEffects({ effects: node.effects });
    if (shadowType) {
      svgDefsCount++;
      let filterId = 'filter_' + svgDefsCount;
      defs.push(
        createSVGFilter({
          id: filterId,
          shadowColor: dropShadowColor,
          blurRadius: dropShadowBlur,
          offsetX: dropShadowOffX,
          offsetY: dropShadowOffY,
        })
      );
      svgFilter = `url(#${filterId})`;
    }
  }
  // 处理fills
  if (Array.isArray(node.fills) && node.fills.length > 0) {
    let { solidColor, opacity, linearGradientAngle, linearGradientColors } =
      processFills({
        fills: node.fills,
      });
    svgFill = solidColor;
    opacity && (svgFillOpacity = opacity);
    if (linearGradientColors && linearGradientColors.length > 0) {
      svgDefsCount++;
      let id = 'linear_' + svgDefsCount;
      let SVGLinearGradient = createSVGLinearGradient({
        angle: linearGradientAngle,
        colors: linearGradientColors,
        id,
      });
      defs.push(SVGLinearGradient);
      svgFill = `url(#${id})`;
    }
  }
  // 处理strokes
  if (Array.isArray(node.strokes) && node.strokes.length > 0) {
    let { solidColor, opacity } = processStrokes({ strokes: node.strokes });
    opacity && (svgStrokeOpacity = opacity);
    svgStrokeColor = solidColor;
  }

  switch (node.type) {
    case 'VECTOR':
      if (svgFill && node.fillGeometry && node.fillGeometry[0]) {
        node.fillGeometry.forEach((geometry) => {
          pathArr.push(
            createSVGPath({
              pathData: geometry.data,
              transform: transformVal,
              opacity: svgFillOpacity || 0,
              fill: svgFill,
              stroke: svgStrokeColor || undefined,
              strokeWidth: node.strokeWeight,
            })
          );
        });
      } else if (
        svgStrokeColor &&
        node.strokeGeometry &&
        node.strokeGeometry[0]
      ) {
        node.strokeGeometry.forEach((geometry) => {
          pathArr.push(
            createSVGPath({
              pathData: geometry.data,
              transform: transformVal,
              opacity: svgStrokeOpacity || 0,
              stroke: svgStrokeColor,
              strokeWidth: 0,
            })
          );
        });
      }
      path = pathArr.join('');
      break;
    case 'BOOLEAN_OPERATION':
      path = handleBOOLEAN_OPERATION({
        node,
        defs,
        svgFill,
        transformVal,
        svgFillOpacity,
        svgStrokeColor,
        svgStrokeOpacity,
      });
      break;
    case 'GROUP':
      if (node.children.length > 0) {
        let preClipPath = false; // 前一个节点是否为遮罩节点
        node.children.forEach((child) => {
          let p = genSvgPath({
            node: child,
            preClipPath,
            parent: node,
            defs,
          });
          preClipPath = /^<clipPath/.test(p);
          pathArr.push(p);
        });
      }
      if (pathArr.length > 0) {
        if (node.isMask) {
          svgDefsCount++;
          path = createSVGClipPath({
            id: `_clip${svgDefsCount}`,
            transform: transformVal,
            innerHTML: pathArr.join(''),
          });
        } else {
          path = createSVGG({
            clipPath: preClipPath ? `url(#_clip${svgDefsCount})` : '',
            filter: svgFilter,
            transform: transformVal,
            innerHTML: pathArr.join(''),
          });
        }
      }
      break;
  }
  return path;
}

function genPath({
  node,
  svgFill,
  transformVal,
  svgFillOpacity,
  svgStrokeColor,
  svgStrokeOpacity,
  svgMask,
}) {
  let pathArr = [];
  if (svgFill && node.fillGeometry && node.fillGeometry[0]) {
    node.fillGeometry.forEach((geometry) => {
      pathArr.push(
        createSVGPath({
          pathData: geometry.data,
          transform: transformVal,
          opacity: svgFillOpacity || 0,
          fill: svgFill,
          stroke: svgStrokeColor || undefined,
          strokeWidth: node.strokeWeight,
          mask: svgMask,
        })
      );
    });
  } else if (svgStrokeColor && node.strokeGeometry && node.strokeGeometry[0]) {
    node.strokeGeometry.forEach((geometry) => {
      pathArr.push(
        createSVGPath({
          pathData: geometry.data,
          transform: transformVal,
          opacity: svgStrokeOpacity || 0,
          stroke: svgStrokeColor,
          strokeWidth: 0,
        })
      );
    });
  }
  return pathArr.join('');
}
function handleBOOLEAN_OPERATION({
  node,
  defs,
  svgFill,
  transformVal,
  svgFillOpacity,
  svgStrokeColor,
  svgStrokeOpacity,
}) {
  let svgMask = '';
  let path = '';
  switch (node.booleanOperation) {
    case 'SUBTRACT':
      if (Array.isArray(node.children)) {
        svgDefsCount++;
        defs.push(
          createSVGMask({
            id: 'mask' + svgDefsCount,
            innerHTML: node.children
              .map((child) => genSvgPath({ node: child, parent: node, defs }))
              .join(''),
          })
        );
        svgMask = `url(#mask${svgDefsCount})`;
      }
      break;
  }
  if (svgMask) {
    path = genPath({
      node,
      svgFill,
      transformVal,
      svgFillOpacity,
      svgStrokeColor,
      svgStrokeOpacity,
      svgMask: svgMask,
    });
  }
  return path;
}

function createSVGLinearGradient({ angle, colors, id }) {
  // 创建svg线性渐变元素
  let linearGradient = `<linearGradient id="${id}" gradientTransform="rotate(${
    90 - angle
  })" >`;
  let stop = [];
  colors.forEach((color, index) => {
    stop.push(
      `<stop offset="${
        (index * 100) / (colors.length - 1)
      }%" stop-color="${color}" ></stop>`
    );
  });
  linearGradient += stop.join('');
  linearGradient += '</linearGradient>';
  return linearGradient;
}
function createSVGFilter({ id, shadowColor, blurRadius, offsetX, offsetY }) {
  // 创建svg遮罩滤镜元素
  let filter = `<filter id="${id}"><feDropShadow in="SourceGraphic" dx="${offsetX}" dy="${offsetY}" stdDeviation="${blurRadius}" flood-color="${shadowColor}" /></filter>`;
  return filter;
}

function createSVGPath({
  pathData,
  opacity,
  transform,
  fill,
  stroke,
  strokeWidth,
  mask,
}) {
  let path = `<path d="${pathData}" transform="${transform}"`;
  if (fill !== undefined) {
    path += ` fill="${fill}"`;
  }
  if (stroke !== undefined) {
    path += ` stroke="${stroke}"`;
  }
  if (strokeWidth !== undefined) {
    path += ` stroke-width="${strokeWidth}"`;
  }
  if (mask !== undefined) {
    path += ` mask="${mask}"`;
  }
  path += '></path>';
  return path;
}

function createSVGClipPath({ id, transform, innerHTML }) {
  return `<clipPath id="${id}" transform="${transform}">${innerHTML}</clipPath>`;
}

function createSVGG({ clipPath, transform, filter, innerHTML }) {
  let g = `<g transform="${transform}"`;
  if (clipPath) {
    g += ` clip-path="${clipPath}"`;
  }
  if (filter) {
    g += ` filter="${filter}"`;
  }
  g += `>${innerHTML}</g>`;
  return g;
}
function createSVGMask({ id, innerHTML }) {
  var mask = document.createElementNS(SVG_NS, 'mask');
  mask.setAttribute('id', id);
  mask.innerHTML = innerHTML;
  return mask.outerHTML;
}

function getTransformValue({ x, y, angle }) {
  let ret = `translate(${x},${y})`;
  if (angle) {
    ret += ` rotate(${angle})`;
  }
  return ret;
}
// imgComp
function genSvgNodeV3_bak({ node, env }) {
  const imgTemp = {
    type: 'ih5-image',
    props: {},
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['abs'],
  };
  const target = imgTemp;

  convertBaseProps({ target, node, env });

  target.props.src = node.rawSvg;

  return target;
}
// svgComp
function genSvgNodeV3({ node, env, parent }) {
  const imgTemp = {
    type: 'ih5-icon',
    props: { noColor: true },
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['abs'],
  };
  const target = imgTemp;

  convertBaseProps({ target, node, env, parent });
  if (node.isRawSVG) {
    target.props.rawSvg = node.svg;
  } else {
    target.props.iconType = { name: node.name, url: node.rawSvg || node.svg };
  }
  return target;
}

export { genSvgNodeV2, genSvgNodeV3 };
// module.exports = {
//     genSvgNodeV2, genSvgNodeV3
// };
