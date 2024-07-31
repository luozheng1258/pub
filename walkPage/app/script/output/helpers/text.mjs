import { calcFillColor } from './utils/color.mjs'
import { convertBaseProps } from './utils/baseProps.mjs'
// const { calcFillColor } = require('./utils/color')
// const { convertBaseProps } = require('./utils/baseProps')

// 生成文本节点
function genTextNode({ node, env, parent }) {
    const textTemp = {
        type: 'ih5-text',
        props: {
            shadowType: 'box',
            value: 'Text',
            allowSelect: true,
            fontSize: 14,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            letterSpacing: -1,
            textOverflow: 'unset'
        },
        id: '',
        uis: {
            name: '文本1'
        },
        binds: {},
        field: {},
        children: [],
        envs: ['abs'],
        styleList: []
    }

    convertBaseProps({ target: textTemp, node, env, parent })

    if (node.fontSize !== 'figma.mixed') {
        textTemp.props.fontSize = node.hasOwnProperty('fontSize')
            ? node.fontSize
            : node.style?.fontSize
    }
    // 避免偶发的因为字体大小不符导致的单行元素意外换行的情况
    if (textTemp.props.height - textTemp.props.fontSize * 1.8 < 0) {
        textTemp.props.isNewLine = false
    } else {
        textTemp.props.isNewLine = true
    }
    // textcontent
    textTemp.props.value = node.characters
    textTemp.uis.name = node.characters

    // 处理字体布局
    let textAlignHorizontal = node.hasOwnProperty('textAlignHorizontal')
        ? node.textAlignHorizontal
        : node.style?.textAlignHorizontal
    switch (textAlignHorizontal) {
        case 'LEFT':
            textTemp.props.justifyContent = 'flex-start'
            break
        case 'CENTER':
            textTemp.props.justifyContent = 'center'
            break
        case 'RIGHT':
            textTemp.props.justifyContent = 'flex-end'
            break
        default:
            break
    }
    let textAlignVertical = node.hasOwnProperty('textAlignVertical')
        ? node.textAlignVertical
        : node.style?.textAlignVertical
    switch (textAlignVertical) {
        case 'TOP':
            textTemp.props.alignItems = 'flex-start'
            break
        case 'BOTTOM':
            textTemp.props.alignItems = 'flex-end'
            break
        case 'CENTER':
            textTemp.props.alignItems = 'center'
            break
        default:
            break
    }

    // 处理字体样式
    let textDecoration = node.hasOwnProperty('textDecoration')
        ? node.textDecoration
        : node.style?.textDecoration
    textTemp.props.textDecoration =
        textDecoration === 'UNDERLINE'
            ? 'underline'
            : textDecoration === 'STRIKETHROUGH'
                ? 'line-through'
                : ''

    let fontWeight = node.hasOwnProperty('textDecoratfontWeightion')
        ? node.fontWeight
        : node.style?.fontWeight
    if (fontWeight) {
        textTemp.props.fontWeight = fontWeight
        // textTemp.styleList.push({ name: 'fontWeight', value: node.fontWeight })
    }

    //lineHeight属性在ih5-text中处理比较特殊，因此使用自定义属性覆盖
    let tempLineHiehgt = ''
    if (node.hasOwnProperty('lineHeight')) {
        if (node.lineHeight && node.lineHeight.value) {
            let lineHeightObj = {
                name: 'lineHeight',
                value:
                    node.lineHeight.value +
                    (node.lineHeight.unit === 'PERCENT' ? '%' : 'px')
            }
            textTemp.styleList.push(lineHeightObj)
            tempLineHiehgt = lineHeightObj.value
        }
    } else {
        if (node.style?.lineHeightPx || node.style?.lineHeightPercent) {
            let lineHeightObj = {
                name: 'lineHeight',
                value:
                    node.style?.lineHeightUnit === 'PIXELS'
                        ? node.style?.lineHeightPx.toFixed(2) + 'px'
                        : node.style?.lineHeightPercent != 100
                            ? node.style?.lineHeightPercent + '%'
                            : node.style?.lineHeightPx.toFixed(2) + 'px'
            }
            textTemp.styleList.push(lineHeightObj)
            tempLineHiehgt = lineHeightObj.value
        }
    }

    // textAutoResize

    if (node.style?.textAutoResize) {
        if (node.style?.textAutoResize.match(/WIDTH/)) {
            textTemp.props.width = ''
        }
        if (node.style?.textAutoResize.match(/HEIGHT/)) {
            textTemp.props.height = ''
        }
    }



    return textTemp
}

export { genTextNode }
// module.exports = {
//     genTextNode,
// };