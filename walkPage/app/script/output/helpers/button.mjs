import { processFills } from './utils/fills.mjs';
import { convertBaseProps } from './utils/baseProps.mjs';
import { getIvxFontWeight } from './utils/index.mjs';

function genBaseBtnJson() {
  return {
    type: 'ih5-button',
    props: {},
    uis: {
      name: '',
    },
    children: [],
    envs: ['abs'],
    styleList: [
      {
        name: 'whiteSpace',
        value: 'nowrap',
      },
    ], // 添加默认内容不换行样式
  };
}

// 生成button节点
function genButtonNode({ node, env, parent }) {
  let childNodes = node.children;
  let textVal = '',
    textNode = null;
  let svgNode = null;

  childNodes.forEach((childNode) => {
    if (childNode.type === 'TEXT') {
      textVal = childNode.characters;
      textNode = childNode;
    } else if (childNode.isSVG) {
      svgNode = childNode;
    }
  });
  const target = genBaseBtnJson();

  convertBaseProps({ target, node, env, parent });

  if (textNode) {
    processFontSetting({ textNode, target });

    target.styleList.push({
      name: 'letterSpacing',
      value: -1 + 'px',
    });

    //lineHeight属性在ih5-text中处理比较特殊，因此使用自定义属性覆盖
    let tempLineHiehgt = '';
    if (textNode.hasOwnProperty('lineHeight')) {
      if (textNode.lineHeight && textNode.lineHeight.value) {
        let lineHeightObj = {
          name: 'lineHeight',
          value:
            textNode.lineHeight.value +
            (textNode.lineHeight.unit === 'PERCENT' ? '%' : 'px'),
        };
        target.styleList.push(lineHeightObj);
        tempLineHiehgt = lineHeightObj.value;
      }
    } else {
      if (textNode.style?.lineHeightPx || textNode.style?.lineHeightPercent) {
        let lineHeightObj = {
          name: 'lineHeight',
          value:
            textNode.style?.lineHeightUnit === 'PIXELS'
              ? textNode.style?.lineHeightPx.toFixed(2) + 'px'
              : textNode.style?.lineHeightPercent != 100
              ? textNode.style?.lineHeightPercent + '%'
              : textNode.style?.lineHeightPx.toFixed(2) + 'px',
        };
        target.styleList.push(lineHeightObj);
        tempLineHiehgt = lineHeightObj.value;
      }
    }
  }

  if (!target.props.bgColor) {
    target.props.bgColor = 'rgba(0,0,0,0)';
  } else if (target.props.bgColor === 'rgba(255,255,255,0)') {
    target.props.bgColor = 'rgba(0,0,0,0)';
  }

  if (textVal) {
    target.props.text = textVal;
    target.uis.name = textVal;
  } else {
    target.props.text = '';
  }

  // debugger
  if (node.type === 'ELLIPSE') {
    target.props.borderRadius = Math.max(node.width, node.height) / 2;
  }

  if (svgNode) {
    target.props.showIcon = true;
    target.props.originalColor = true;
    target.props.iconType = {
      name: svgNode.name,
      url: svgNode.rawSvg || svgNode.svg,
    };
    target.props.iconSize = svgNode.height || svgNode.size?.y;
  }
  return target;
}

// 有input的submit类型，转为button类型
function genSubmitButtonNode({ node, env, parent }) {
  const target = genBaseBtnJson();
  convertBaseProps({ target, node, env, parent });
  // 按钮文字
  target.props.text = node.value;
  processFontSetting({
    textNode: node,
    target,
    fontColorField: 'fontColorFills',
  });
  return target;
}

// 处理字体设置
function processFontSetting({ textNode, target, fontColorField = 'fills' }) {
  // 字体颜色
  const fills = textNode[fontColorField];
  if (Array.isArray(fills) && fills.length > 0) {
    let ret = processFills({ fills: fills, target });
    if (ret.solidColor || ret.linearGradient) {
      target.props.fontColor = ret.linearGradient || ret.solidColor;
    }
  }
  // 文字大小
  if (textNode.fontSize !== 'figma.mixed') {
    target.props.fontSize = textNode.hasOwnProperty('fontSize')
      ? textNode.fontSize
      : textNode.style?.fontSize;
  }
  // 处理字体样式
  let textDecoration = textNode.hasOwnProperty('textDecoration')
    ? textNode.textDecoration
    : textNode.style?.textDecoration;
  target.props.textDecoration =
    textDecoration === 'UNDERLINE'
      ? 'underline'
      : textDecoration === 'STRIKETHROUGH'
      ? 'line-through'
      : '';
  let fontWeight = getIvxFontWeight({ textNode });
  if (fontWeight === 'bold') {
    target.props.fontWeight = fontWeight;
    target.props.textStyle = (target.props.textStyle || 0) | 4;
  } else if (fontWeight) {
    target.styleList.push({
      name: 'fontWeight',
      value: fontWeight,
    });
  }
}

export { genButtonNode, genSubmitButtonNode };
