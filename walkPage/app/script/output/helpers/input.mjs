import { processFills } from './utils/fills.mjs'
import { convertBaseProps } from './utils/baseProps.mjs'

// const { processFills } = require('./utils/fills')
// const { convertBaseProps } = require('./utils/baseProps')

// 生成输入框节点
function genInputNode({ node, env, parent }) {

    const inputTemp = {
        type: 'ih5-input',
        props: {},
        uis: {
            name: node.name
        },
        children: [],
        envs: ['abs']
    }
    const target = inputTemp

    convertBaseProps({ target, node, env, parent })
    if (node.placeholder) {
        target.props.placeholder = node.placeholder
    }
    if (node.value) {
        target.props.value = node.value
    }
    if (node.fontColorFills) {
        let ret = processFills({ fills: node.fontColorFills, target })
        if (ret.solidColor || ret.linearGradient) {
            target.props.fontColor = ret.linearGradient || ret.solidColor
        }
    }

    return target
}

export { genInputNode }
// module.exports = {
//     genButtonNode,
// };
