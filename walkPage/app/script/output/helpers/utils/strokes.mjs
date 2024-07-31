import { calcFillColor } from './color.mjs'
// const { calcFillColor } = require('./color')

function processStrokes({ strokes }) {
    let ret = {}
    if (Array.isArray(strokes) && strokes.length > 0) {
        strokes.forEach(stroke => {
            if (stroke.visible === false) return
            ret.opacity = stroke.opacity || 0
            switch (stroke.type) {
                case 'SOLID':
                    ret = Object.assign(ret, {
                        solidColor: calcFillColor(stroke)
                    })
                    break
                default:
                    break
            }
        })
    }
    return ret
}

export { processStrokes }
// module.exports = {
//     processStrokes,
// };