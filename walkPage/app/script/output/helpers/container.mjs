import { calcFillColor } from './utils/color.mjs';
import { genImageNode } from './image.mjs';
import { convertBaseProps } from './utils/baseProps.mjs';
import { isEmptyContainer } from './utils/index.mjs';

// 生成容器节点
function genContainerNode({ node, env, parent }) {
  const { fills } = node;
  let isImage = false;
  if (Array.isArray(fills) && fills.length > 0) {
    for (const paint of fills) {
      if (
        paint.type === 'IMAGE' &&
        (paint.visible || !paint.hasOwnProperty('visible')) &&
        paint.opacity !== 0
      ) {
        isImage = true;
      }
    }
  }
  if (isImage && node.children?.length == 0) {
    return genImageNode({ node, env, parent });
  }

  const absTemp = {
    type: 'ih5-container-flex',
    props: {},
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['abs'],
  };
  const colTemp = {
    type: 'ih5-layoutcol',
    props: {},
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['rel'],
  };
  const rowTemp = {
    type: 'ih5-layoutrow',
    props: {
      flexWrap: false,
    },
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['rel'],
  };
  let target = {};
  // if (node.layoutMode === 'HORIZONTAL') {
  //   target = rowTemp
  //   const vDict = {
  //     MIN: 'top',
  //     CENTER: 'center',
  //     MAX: 'bottom',
  //     BASELINE: 'bottom'
  //   }
  //   const hDict = {
  //     MIN: 'left',
  //     CENTER: 'center',
  //     MAX: 'right',
  //     SPACE_BETWEEN: 'space-between'
  //   }
  //   target.props.vertical = vDict[node.counterAxisAlignItems]
  //   target.props.horizon = hDict[node.primaryAxisAlignItems]
  // } else if (node.layoutMode === 'VERTICAL') {
  //   target = colTemp
  //   const vDict = {
  //     MIN: 'top',
  //     CENTER: 'center',
  //     MAX: 'bottom',
  //     SPACE_BETWEEN: 'space-between'
  //   }
  //   const hDict = {
  //     MIN: 'left',
  //     CENTER: 'center',
  //     MAX: 'right',
  //     BASELINE: 'left'
  //   }
  //   target.props.vertical = vDict[node.primaryAxisAlignItems]
  //   target.props.horizon = hDict[node.counterAxisAlignItems]
  // } else if (node.layoutMode === 'NONE' || !node.layoutMode) {
  target = absTemp;
  if (env === 'abs') {
    target.type = 'ih5-container';
  }
  // }
  // 默认背景颜色为透明
  target.props.bgColor = 'rgba(255,255,255,0)';
  convertBaseProps({ target, node, env, parent });

  if (node.clipsContent) {
    if (node.layoutMode === 'NONE' || !node.layoutMode) {
      target.props.overflow = 'hidden';
      // 补充仅X轴滚动和仅Y轴滚动
      if (node.clipsContentScrollX) {
        target.props.overflow = 'scrollX';
      }
      if (node.clipsContentScrollY) {
        target.props.overflow = 'scrollY';
      }
    } else {
      target.props.cut = 'hidden';
    }
  }

  if (isEmptyContainer({ node, target, parent })) {
    return null;
  }

  return target;
}

export { genContainerNode };
