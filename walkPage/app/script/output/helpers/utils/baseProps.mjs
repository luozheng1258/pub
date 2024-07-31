import { processEffects } from './effects.mjs';
import { processStrokes } from './strokes.mjs';
import { processFills } from './fills.mjs';
// const { processEffects } = require('./effects')
// const { processStrokes } = require('./strokes')
// const { processFills } = require('./fills')

function convertBaseProps({ target, node, env, parent }) {
  let flexStyle = {
    enable: false,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  };
  let figmaSize = {};

  target.props.x = node.hasOwnProperty('x')
    ? node.x
    : node.relativeTransform[0][2];
  target.props.y = node.hasOwnProperty('y')
    ? node.y
    : node.relativeTransform[1][2];
  // if (node.relativeTransform[0][1] != 0) {
  //   debugger
  // }
  if (
    !node.hasOwnProperty('x') &&
    parent &&
    parent.absoluteBoundingBox &&
    node.absoluteBoundingBox
  ) {
    target.props.x = node.absoluteBoundingBox.x - parent.absoluteBoundingBox.x;
    target.props.y = node.absoluteBoundingBox.y - parent.absoluteBoundingBox.y;
  }
  // target.props.width = node.width
  // target.props.height = node.height
  target.props.width = node.hasOwnProperty('width') ? node.width : node.size?.x;
  target.props.height = node.hasOwnProperty('height')
    ? node.height
    : node.size?.y;

  if (
    !node.hasOwnProperty('x') &&
    node.isSVG &&
    node.type === 'ELLIPSE' &&
    parent &&
    parent.absoluteBoundingBox &&
    node.absoluteRenderBounds
  ) {
    target.props.x = node.absoluteRenderBounds.x - parent.absoluteBoundingBox.x;
    target.props.y = node.absoluteRenderBounds.y - parent.absoluteBoundingBox.y;
    target.props.width = node.absoluteRenderBounds.width;
    target.props.height = node.absoluteRenderBounds.height;
  }
  figmaSize.width = target.props.width;
  figmaSize.height = target.props.height;
  target.props.visible = node.visible === false ? false : true;
  target.props.opacity = node.opacity;
  // 旋转
  if (!node.hasOwnProperty('x')) {
    target.props.rotate = Math.round((node.rotation * 180) / Math.PI);
    if (node.isSVG) {
      target.props.width = node.absoluteRenderBounds.width;
      target.props.height = node.absoluteRenderBounds.height;
      delete target.props.rotate;
    }
  } else {
    target.props.rotate = node.rotation;
  }
  // 处理边框圆角
  if (node.cornerRadius && node.cornerRadius != 'figma.mixed') {
    target.props.borderRadius = node.cornerRadius;
  } else if (node.cornerRadius == 'figma.mixed') {
    let radius = 0;
    let cornerCnt = 0;
    if (node.topLeftRadius) {
      radius = node.topLeftRadius;
      cornerCnt += 1;
    }
    if (node.topRightRadius) {
      radius = node.topRightRadius;
      cornerCnt += 2;
    }
    if (node.bottomRightRadius) {
      radius = node.bottomRightRadius;
      cornerCnt += 4;
    }
    if (node.bottomLeftRadius) {
      radius = node.bottomLeftRadius;
      cornerCnt += 8;
    }
    target.props.borderRadius = radius;
    target.props.borderRadiusPos = cornerCnt;
  } else if (node.rectangleCornerRadii) {
    let radius = 0;
    let cornerCnt = 0;
    if (node.rectangleCornerRadii[0]) {
      radius = node.rectangleCornerRadii[0];
      cornerCnt += 1;
    }
    if (node.rectangleCornerRadii[1]) {
      radius = node.rectangleCornerRadii[1];
      cornerCnt += 2;
    }
    if (node.rectangleCornerRadii[2]) {
      radius = node.rectangleCornerRadii[2];
      cornerCnt += 4;
    }
    if (node.rectangleCornerRadii[3]) {
      radius = node.rectangleCornerRadii[3];
      cornerCnt += 8;
    }
    target.props.borderRadius = radius;
    target.props.borderRadiusPos = cornerCnt;
  }

  // default broderRadius 0
  if (!target.props.borderRadius) {
    target.props.borderRadius = 0;
  }

  if (!Array.isArray(target.styleList)) {
    target.styleList = [];
  }

  // 处理mixBlendMode样式
  if (node.blendMode && node.blendMode !== 'PASS_THROUGH' && !node.isSVG) {
    var arr = node.blendMode.split('_');
    if (arr.length == 2) {
      target.styleList.push({
        name: 'mixBlendMode',
        value: arr[0].toLowerCase() + '-' + arr[1].toLowerCase(),
      });
    } else {
      target.styleList.push({
        name: 'mixBlendMode',
        value: node.blendMode.toLowerCase(),
      });
    }
  }
  // 相对定位
  if (['HORIZONTAL', 'VERTICAL'].includes(node.layoutMode) && !node.isSVG) {
    // 处理itemSpacing
    if (node.itemSpacing && node.primaryAxisAlignItems !== 'SPACE_BETWEEN') {
      target.styleList.push({
        name: 'gap',
        value: node.itemSpacing + 'px',
      });
    }

    // 处理padding (css中设置padding时会影响宽高，但figma中不会)
    let {
      paddingLeft = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingTop = 0,
    } = node;
    if (paddingLeft + paddingRight < figmaSize.width) {
      if (node.paddingLeft) {
        target.props.paddingLeft = node.paddingLeft;
      }
      if (node.paddingRight) {
        target.props.paddingRight = node.paddingRight;
      }
    }
    if (paddingBottom + paddingTop < figmaSize.height) {
      if (node.paddingBottom) {
        target.props.paddingBottom = node.paddingBottom;
      }
      if (node.paddingTop) {
        target.props.paddingTop = node.paddingTop;
      }
    }

    // 处理换行问题
    if (node.layoutWrap === 'WRAP') {
      target.props.flexWrap = true;
    }
  }

  // 处理effects
  target.props = Object.assign(
    {},
    target.props,
    processEffects({ effects: node.effects })
  );

  // 处理strokes
  // default clear borderWidth
  if (node.strokes && !node.isSVG) {
    let { solidColor } = processStrokes({ strokes: node.strokes });
    if (solidColor) {
      target.props.borderColor = solidColor;
    }
    if (node.strokeWeight != 'figma.mixed') {
      if (node.individualStrokeWeights) {
        let borderPos = 0;
        let borderWidth = 0;
        if (node.individualStrokeWeights.top) {
          borderPos += 1;
          borderWidth = node.individualStrokeWeights.top;
        }
        if (node.individualStrokeWeights.right) {
          borderPos += 2;
          borderWidth = node.individualStrokeWeights.right;
        }
        if (node.individualStrokeWeights.bottom) {
          borderPos += 4;
          borderWidth = node.individualStrokeWeights.bottom;
        }
        if (node.individualStrokeWeights.left) {
          borderPos += 8;
          borderWidth = node.individualStrokeWeights.left;
        }
        target.props.borderWidth = borderWidth;
        target.props.borderPos = borderPos;
      } else {
        target.props.borderWidth = node.strokeWeight || 0;
        if (node.strokes.length == 0) {
          target.props.borderWidth = 0;
        }
      }
    } else {
      let borderPos = 0;
      let borderWidth = 0;
      if (node.strokeTopWeight) {
        borderPos += 1;
        borderWidth = node.strokeTopWeight;
      }
      if (node.strokeRightWeight) {
        borderPos += 2;
        borderWidth = node.strokeRightWeight;
      }
      if (node.strokeBottomWeight) {
        borderPos += 4;
        borderWidth = node.strokeBottomWeight;
      }
      if (node.strokeLeftWeight) {
        borderPos += 8;
        borderWidth = node.strokeLeftWeight;
      }
      target.props.borderWidth = borderWidth;
      target.props.borderPos = borderPos;
    }
  }

  // 处理fills
  if (Array.isArray(node.fills) && node.fills.length > 0 && !node.isSVG) {
    let ret = processFills({ fills: node.fills, target });
    if (ret.solidColor || ret.linearGradient) {
      if (target.type === 'ih5-text') {
        target.props.fontColor = ret.linearGradient || ret.solidColor;
      } else {
        target.props.bgColor = ret.linearGradient || ret.solidColor;
      }
    }
  }

  if (
    target.type !== 'ih5-image' &&
    node.backgroundStyles &&
    node.backgroundStyles.length > 0
  ) {
    if (!target.styleList) {
      target.styleList = [];
    }
    target.styleList = target.styleList.concat(node.backgroundStyles);
  }

  // 判断是否启用自定义flex
  if (flexStyle.enable) {
    let { flexGrow, flexShrink, flexBasis } = flexStyle;
    target.styleList = target.styleList.concat({
      name: 'flex',
      value: `${flexGrow} ${flexShrink} ${flexBasis}`,
    });
  }

  // 判断是否有zIndex
  if (node.zIndex) {
    target.props.zIndex = node.zIndex;
  }

  // uis中记录额外样式信息
  if (node._extraStyle) {
    target.uis._extraStyle = node._extraStyle;
  }
}

export { convertBaseProps };
// module.exports = {
//     convertBaseProps,
// };
