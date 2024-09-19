import { calcFillColor } from './utils/color.mjs';
import { genImageNode } from './image.mjs';
import { convertBaseProps } from './utils/baseProps.mjs';
import { isEmptyContainer, isImageNode } from './utils/index.mjs';

// 生成容器节点
function genContainerNode({ node, env, parent }) {
  if (isImageNode({ node }) && node.children?.length == 0) {
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
