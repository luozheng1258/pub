import { processFills } from './utils/fills.mjs';
import { convertBaseProps, processPadding } from './utils/baseProps.mjs';

// const { processFills } = require('./utils/fills')
// const { convertBaseProps } = require('./utils/baseProps')

// 生成输入框节点
function genInputNode({ node, env, parent }) {
  const inputTemp = {
    type: 'ih5-input',
    props: { focusColor: '' },
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['abs'],
  };
  const target = inputTemp;

  convertBaseProps({ target, node, env, parent });
  processPadding({ target, node });
  if (node.placeholder !== undefined) {
    target.props.placeholder = node.placeholder;
    if (node.placeholderColor) {
      target.props.placeholderColor = node.placeholderColor;
    }
  }
  if (node.value) {
    target.props.value = node.value;
  }
  if (node.fontColorFills) {
    let ret = processFills({ fills: node.fontColorFills, target });
    if (ret.solidColor || ret.linearGradient) {
      target.props.fontColor = ret.linearGradient || ret.solidColor;
    }
  }

  return target;
}

export { genInputNode };
// module.exports = {
//     genButtonNode,
// };
