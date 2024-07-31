import { calcFillColor, calcLinearGradient } from './color.mjs'
// const { calcFillColor, calcLinearGradient } = require('./color')

function processFills({ fills, target }) {
    let ret = {}
    if (Array.isArray(fills) && fills.length > 0) {
        fills.forEach(fill => {
            if (fill.visible === false) return
            ret.opacity = fill.opacity || 0
            switch (fill.type) {
                case 'SOLID': //处理普通背景颜色
                    ret = Object.assign(ret, {
                        solidColor: calcFillColor(fill)
                    })
                    break
                case 'GRADIENT_LINEAR': // 处理渐变背景颜色
                    ret = Object.assign(ret, calcLinearGradient(fill))
                    break
                case 'IMAGE':
                    if (target.type === 'ih5-image') {
                        handleImg({ fill, target })
                    } else {
                        // 背景图片
                        target.props.bgImage = fill.src || fill.url
                    }
                    break
                default:
                    break
            }
        })
    }
    return ret
}

function handleImg({ fill, target }) {
    let { src, url, originalWidth, originalHeight, scaleMode } = fill
    target.props.src = src || url
    const nodeAspect = target.props.width / target.props.height
    // fit：等比放缩，长边为主
    // fill：等比放缩，短边为主
    const imageAspect = originalWidth / originalHeight
    if (imageAspect < 1 && nodeAspect / imageAspect < 1) {
        switch (scaleMode) {
            case 'FIT':
                target.props.mode = 'aspectFill'
                break
            case 'FILL':
            default:
                target.props.mode = 'aspectFit'
                break
        }
    } else {
        switch (scaleMode) {
            case 'FIT':
                target.props.mode = 'aspectFit'
                break
            case 'FILL':
            default:
                target.props.mode = 'aspectFill'
                break
        }
    }
}

export { processFills }
// module.exports = {
//     processFills,
// };