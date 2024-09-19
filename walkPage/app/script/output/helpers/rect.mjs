import { genImageNode } from './image.mjs';
import { convertBaseProps } from './utils/baseProps.mjs';
import { isEmptyContainer, isImageNode } from './utils/index.mjs';

function genRectNode({ node, env, parent }) {
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
  const target = absTemp;
  if (env === 'abs') {
    target.type = 'ih5-container';
  }
  // 默认背景颜色为透明
  target.props.bgColor = 'rgba(255,255,255,0)';
  convertBaseProps({ target, node, env, parent });

  if (node.type === 'ELLIPSE') {
    let nodeWidth = node.width || node.size?.x;
    let nodeHeight = node.height || node.size?.y;
    target.props.borderRadius = Math.max(nodeWidth, nodeHeight) / 2;
  }

  if (isEmptyContainer({ node, target, parent })) {
    return null;
  }

  return target;
}

export { genRectNode };
