// 计算颜色工具函数rgba
function calcFillColor(colorObj) {
    let r
    let g
    let b
    let a = colorObj.color.a !== undefined ? colorObj.color.a : 1
    a = a * (colorObj.opacity === undefined ? 1 : colorObj.opacity)

    r = Math.floor(colorObj.color.r * 255)
    g = Math.floor(colorObj.color.g * 255)
    b = Math.floor(colorObj.color.b * 255)
    return `rgba(${r},${g},${b},${a})`
}
// 计算颜色工具函数rgb
function calcFillColorRGB(colorObj) {
    let r
    let g
    let b
    r = Math.floor(colorObj.color.r * 255)
    g = Math.floor(colorObj.color.g * 255)
    b = Math.floor(colorObj.color.b * 255)
    return `rgb(${r},${g},${b})`
}
// 计算颜色工具函数rgba
function calcShadowColor(colorObj) {
    let r
    let g
    let b
    let a = 0
    r = Math.floor(colorObj.color.r * 255)
    g = Math.floor(colorObj.color.g * 255)
    b = Math.floor(colorObj.color.b * 255)
    a = colorObj.color.a
    return `rgba(${r},${g},${b},${a})`
}
// 计算渐变背景颜色
function calcLinearGradient({ gradientStops, gradientTransform }) {
    let linearGradient = ''
    let linearGradientAngle = 0
    let linearGradientPoints = []
    let linearGradientColors = []
    if (Array.isArray(gradientTransform) && gradientTransform.length > 1) {
        // 根据变换矩阵计算出角度
        linearGradientAngle =
            90 -
            Math.round(
                Math.atan2(gradientTransform[1][0], gradientTransform[0][0]) *
                (180 / Math.PI)
            )
    }
    if (Array.isArray(gradientStops) && gradientStops.length > 0) {
        gradientStops.forEach(item => {
            let temp = calcFillColor({ color: item.color })
            linearGradientColors.push(temp)
            if (item.position && item.position < 1) {
                temp += ' ' + item.position * 100 + '%'
            }
            linearGradientPoints.push(temp)
        })
    }
    if (linearGradientPoints.length > 0) {
        linearGradient =
            'linear-gradient(' +
            linearGradientAngle +
            'deg, ' +
            linearGradientPoints.join(',') +
            ')'
    }
    return { linearGradient, linearGradientAngle, linearGradientColors }
}

  export { calcFillColor, calcFillColorRGB, calcShadowColor, calcLinearGradient }
// module.exports = {
//     calcFillColor, calcFillColorRGB, calcShadowColor, calcLinearGradient
// };