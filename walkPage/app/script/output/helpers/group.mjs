import { processEffects } from './utils/effects.mjs';
import { convertBaseProps } from './utils/baseProps.mjs';
import { isEmptyContainer } from './utils/index.mjs';

// 生成group容器节点
function genGroupNode({ node, env, parent }) {
  const absTemp = {
    type: 'ih5-container-flex',
    props: {},
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['abs'],
  };
  let target = {};
  target = absTemp;
  if (env === 'abs') {
    target.type = 'ih5-container';
  }

  // 默认背景颜色为透明
  target.props.bgColor = 'rgba(255,255,255,0)';
  convertBaseProps({ target, node, env, parent });

  if (isEmptyContainer({ node, target, parent })) {
    return null;
  }

  return target;
}

export { genGroupNode };
