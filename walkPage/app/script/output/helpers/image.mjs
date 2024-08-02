import { processFills } from './utils/fills.mjs';
import { convertBaseProps } from './utils/baseProps.mjs';

// 生成图片节点
function genImageNode({ node, env, parent }) {
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
  processFills({ fills: node.fills, target });
  if (node.type === 'ELLIPSE') {
    target.props.borderRadius = Math.max(node.width, node.height) / 2;
  }

  return target;
}

export { genImageNode };
