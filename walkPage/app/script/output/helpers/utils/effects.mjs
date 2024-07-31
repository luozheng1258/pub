import { calcShadowColor } from './color.mjs'
// const { calcShadowColor } = require( './color')

function processEffects({ effects }) {
  let ret = {}
  if (Array.isArray(effects) && effects.length > 0) {
    effects.forEach(effect => {
      switch (effect.type) {
        case 'DROP_SHADOW':
          let temp = {
            shadowType: 'drop',
            dropShadowColor: calcShadowColor(effect),
            dropShadowOffY: 0,
            dropShadowOffX: 0
          }
          if (effect.radius) {
            temp.dropShadowBlur = effect.radius
          }
          if (effect.offset.x) {
            temp.dropShadowOffX = effect.offset.x
          }
          if (effect.offset.y) {
            temp.dropShadowOffY = effect.offset.y
          }
          ret = Object.assign(ret, temp)
          break
        case 'BOX_SHADOW':
          let boxTemp = {
            shadowType: 'box',
            dropShadowColor: calcShadowColor(effect),
            dropShadowOffY: 0,
            dropShadowOffX: 0
          }
          if (effect.radius) {
            boxTemp.dropShadowBlur = effect.radius
          }
          if (effect.offset.x) {
            boxTemp.dropShadowOffX = effect.offset.x
          }
          if (effect.offset.y) {
            boxTemp.dropShadowOffY = effect.offset.y
          }
          ret = Object.assign(ret, boxTemp)
          break

        default:
          break
      }
    })
  }
  return ret
}

export { processEffects }
// module.exports = {
//     processEffects,
// };