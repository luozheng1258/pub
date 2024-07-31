import { genContainerNode } from './helpers/container.mjs';
import { genSvgNodeV2, genSvgNodeV3 } from './helpers/svg.mjs';
import { genTextNode } from './helpers/text.mjs';
import { genInputNode } from './helpers/input.mjs';
import { genRectNode } from './helpers/rect.mjs';
import { genGroupNode } from './helpers/group.mjs';
import { genButtonNode } from './helpers/button.mjs';

function genCaseData() {
  return {
    case: {
      id: '',
      type: 'ih5-case',
      uis: {
        name: 'testImport',
        expand: true,
        hLines: [],
        vLines: [],
        zoom: 100,
        width: 375,
        height: 667,
        cover: '0d56ddc1f0cf0205d7bbe06c41bf99b8_10540.svg',
        deviceName: 'iPhone6/7/8',
        app_safeArea_topInsetHeight: 0,
        app_safeArea_bottomInsetHeight: 0,
      },
      props: {},
      binds: {},
      field: {},
      children: [],
      recordDevTime: true,
    },
    stage: {
      id: 'csb8y6grp9pg000bqn0g',
      type: 'ih5-stage-abs',
      uis: { name: '前台', expand: true },
      props: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        swipeFlipPage: 'none',
        fonts: {},
        pageCustomIdList: [null],
        classStyles: {},
      },
      binds: {},
      field: {},
      children: [
        {
          id: 'csb8y6grp9pg000bqn00',
          type: 'ih5-system',
          uis: { name: '应用系统', expand: true, unsuppressible: true },
          props: {},
          binds: {},
          children: [],
          field: {},
        },
        {
          type: 'ih5-page',
          id: 'csb9sd5rp9pg000qbh40',
          uis: { name: '页面1' },
          props: { width: '100%', height: '100%' },
          binds: {},
          field: {},
          children: [],
          timeRecord: 1716952244295,
        },
      ],
      record: {},
      serverMap: {},
      customWidgetList: {},
    },
    server: {
      id: 'csb8y6grp9pg000bqn10',
      type: 'data-server',
      uis: { name: '后台', expand: true },
      props: { name: '后台', v2: 1 },
      binds: {},
      field: {},
      children: [],
      record: {},
      sockets: [],
      lives: [],
    },
  };
}
// abs positon version
class Figma2IvxAbs {
  constructor(props) {
    this.figmaNodes = props.figmaNodes || [];
    this.ivxNodes = [];

    this.exec = this.exec.bind(this);
  }

  exec({ env }) {
    const { figmaNodes, ivxNodes } = this;
    let ivxFigmaData = {};
    let caseData = genCaseData();
    let container = caseData.stage.children[1];
    figmaNodes.forEach((node) => {
      // console.log('debug selected pluginData', node, node.fills)
      if (node.type === 'FRAME' || node.type === 'GROUP') {
        this.removeEmptyChild({ node });
        ivxFigmaData = this.genIvxData(node, env || 'rel');
        if (node.isFixed) {
          let fixedWrap = {
            type: 'ih5-abs-banner',
            props: {
              width: 0,
              height: 0,
            },
            uis: {
              name: node.name,
            },
            children: [ivxFigmaData],
            envs: ['abs'],
          };
          if (ivxFigmaData) {
            this.walkIvxNode(fixedWrap);
            ivxNodes.push(fixedWrap);
          }
        } else {
          if (ivxFigmaData) {
            this.walkIvxNode(ivxFigmaData);
            ivxNodes.push(ivxFigmaData);
          }
        }
      }
    });
    container.children = ivxNodes;
    return caseData;
  }

  genIvxData = (node, env, parent) => {
    env = 'abs';
    const { genIvxData } = this;
    let skip = false;
    let objData = null;

    // 压缩节点
    this.compressLayer({ node, pNode: parent });

    if (objData) {
      skip = true;
    } else {
      if (node.isSVG) {
        objData = genSvgNodeV3({ node, env, parent });
        skip = true;
      } else if (this.checkIsButton(node)) {
        objData = genButtonNode({ node, env, parent });
        skip = true;
      } else {
        switch (node.type) {
          case 'INSTANCE':
          case 'FRAME':
          case 'COMPONENT_SET':
          case 'COMPONENT':
            objData = genContainerNode({ node, env, parent });
            break;
          case 'VECTOR':
          case 'POLYGON':
            objData = genSvgNodeV2({ node, env, parent });
            break;
          case 'TEXT':
            objData = genTextNode({ node, env, parent });
            break;
          case 'INPUT':
            objData = genInputNode({ node, env, parent });
            break;
          case 'GROUP':
            objData = genGroupNode({ node, env, parent });
            break;
          case 'RECTANGLE':
          case 'ELLIPSE':
            objData = genRectNode({ node, env, parent });
            break;
          default:
            break;
        }
      }
    }
    if (!objData) {
      return null;
    }
    // if (parent && parent.type === 'GROUP' && node.hasOwnProperty('x')) {
    if (parent && node.hasOwnProperty('x')) {
      objData.props.x -= parent.x || 0;
      objData.props.y -= parent.y || 0;
      // delete objData.props.rotate
    }
    if (node.children && !skip) {
      env = ['ih5-container-flex', 'ih5-container'].includes(objData.type)
        ? 'abs'
        : 'rel';
      objData.children = node.children
        .map((childNode) => {
          return genIvxData(childNode, env, node);
        })
        .filter((child) => !!child);
    }
    return objData;
  };
  // 去除空节点
  removeEmptyChild = ({ node, lastChild }) => {
    let { children } = node;
    let isLastChild = ({ node, pNode, index }) => {
      let { x, y } = node || {};
      let { position } = node?._extraStyle || {};
      if (position === 'absolute') return true;
      let { children, _extraStyle } = pNode || {};
      let { display, flexDirection, flexWrap } = _extraStyle || {};
      if (display === 'flex') {
        if (flexDirection === 'row') {
          if (flexWrap === 'wrap') {
            return false;
          }
          return children.every((child) => child.x <= x);
        } else if (flexDirection === 'column') {
          return children.every((child) => child.y <= y);
        }
      }
      return index === children.length - 1;
    };
    if (children?.length > 0) {
      for (let index = children.length - 1; index >= 0; index--) {
        if (
          this.removeEmptyChild({
            node: children[index],
            lastChild: isLastChild({
              node: children[index],
              pNode: node,
              index,
            }),
          })
        ) {
          children.splice(index, 1);
        }
      }

      if (children.length == 0) {
        return this.removeEmptyChild({ node, lastChild });
      } else {
        return false;
      }
    } else {
      if (
        node.strokeWeight == 0 &&
        node.type != 'INPUT' &&
        node.type != 'TEXT'
      ) {
        if (node.backgroundStyles) {
          return false;
        }
        // 如果当前node为父节点唯一子节点，且子节点为图片或者无填充，就删除
        if (
          lastChild &&
          (node.fills.length == 0 ||
            node.fills[0].type != 'IMAGE' ||
            node.fills[0].opacity == 0)
        ) {
          return true;
        }

        if (node.width == 0 || node.height == 0) {
          return true;
        }
      }
      return false;
    }
  };
  // 压缩节点
  compressLayer = ({ node, pNode }) => {
    const { type, children } = node || {};
    if (!Array.isArray(children) || children.length === 0) return;
    switch (type) {
      case 'FRAME':
      case 'GROUP':
      case 'INSTANCE':
        if (children.length === 1) {
          this.checkCanMerge({ node, pNode });
        }
        if (children.length > 0) {
          // 检查组件下的文本节点是否有范围重叠的情况，如果有，则是行内文本的情况，需要将文本节点进行合并
          this.checkTextChild({ node });
          if (children.length === 1) {
            this.checkCanMerge({ node, pNode });
          }
        }
        break;
      default:
        break;
    }
  };

  checkCanMerge = ({ node, pNode }) => {
    // return;
    let canMergeChild = null;
    let canReplaceChild = null;
    if (
      this.checkIsButton(node) ||
      this.checkIsImage(node) ||
      node.isSVG ||
      node.visible === false
    ) {
      return false;
    }

    checkChild.call(this, node);
    if (canMergeChild) {
      node.children = canMergeChild.children;
      node._extraStyle = canMergeChild._extraStyle;
    }

    // 节点有背景色，有边框的情况，就先行保留
    if (node.strokes && node.strokes.length > 0) {
      return false;
    }
    if (
      node.fills &&
      node.fills.filter((fill) => {
        return fill.type != 'SOLID' || fill.alpha != 0;
      }).length > 0
    ) {
      return false;
    }
    if (node.backgroundStyles) {
      return false;
    }

    if (canReplaceChild) {
      // merge之后形成按钮结构的，就不再进行replace
      if (this.checkIsButton(node)) return;
      // 如果合并后的节点没有溢出且当前节点没有剪切，就替换
      if (isRectOverFlow(node, canReplaceChild) || node.clipsContent) return;
      // 如果父节点有多个子节点，且子节点宽高和替换节点不一样，就不替换
      if (pNode && pNode?.children?.length > 1) {
        let { width, height } = node;
        let { width: rw, height: rh } = canReplaceChild;
        if (width !== rw || height !== rh) return;
      }

      for (let key in canReplaceChild) {
        if (key !== 'parent' && key !== 'isInline') {
          node[key] = canReplaceChild[key];
        }
      }
    }
    // abspos ver
    function checkChild(node) {
      if (node.children && node.children.length === 1) {
        let childNode = node.children[0];
        // 合并只检测FRAME和GROUP
        if (childNode.type !== 'FRAME' && childNode.type !== 'GROUP') {
          canReplaceChild = childNode;
          return false;
        }
        // 如果子节点是按钮，图片，svg，就不合并，使用节点替换
        if (
          this.checkIsButton(childNode) ||
          this.checkIsImage(childNode) ||
          childNode.isSVG
        ) {
          canReplaceChild = childNode;
          return false;
        }

        // 如果节点存在gap属性，就不合并
        if (node?._extraStyle?.gap) {
          return false;
        }

        // 子节点有剪切效果的，保留子节点作为剪切容器
        if (childNode.clipsContent) {
          // 父节点有背景的情况，就同时保留父子节点
          if (
            node.fills &&
            node.fills.filter((fill) => {
              return fill.type != 'SOLID' || fill.alpha != 0;
            }).length > 0
          ) {
            return false;
          } else if (node.backgroundStyles) {
            return false;
          } else {
            // 父节点没有背景的，就直接替换
            canReplaceChild = childNode;
            return false;
          }
        }

        canMergeChild = childNode;
        if (childNode.visible === false) {
          node.visible = false;
        }
        if (
          childNode.fills &&
          childNode.fills.filter((fill) => {
            return fill.type != 'SOLID' || fill.alpha != 0;
          }).length > 0
        ) {
          canMergeChild = null;
          canReplaceChild = childNode;
          return;
        }
        if (childNode.backgroundStyles) {
          canMergeChild = null;
          canReplaceChild = childNode;
          return;
        }
        if (childNode.strokes && childNode.strokes.length > 0) {
          canMergeChild = null;
          canReplaceChild = childNode;
          return;
        }
        checkChild.call(this, childNode);
      } else {
        return false;
      }
    }
    function isRectOverFlow(rect1, rect2) {
      const { x: x1, y: y1, width: w1, height: h1 } = rect1;
      const { x: x2, y: y2, width: w2, height: h2 } = rect2;

      const isIntersect =
        x1 > x2 || y1 > y2 || x1 + w1 < x2 + w2 || y1 + h1 < y2 + h2;
      return isIntersect;
    }
  };
  checkTextChild = ({ node }) => {
    if (node.children.length > 0) {
      let dealChildren = [];
      let newChildrenList = [];
      let needMergeText = false;
      let mergeTextList = null;
      let textSize = 0;
      for (let index = 0; index < node.children.length; index++) {
        if (node.children[index].type !== 'TEXT') {
          if (
            node.children[index].isInline &&
            (!node.children[index].fills ||
              node.children[index].fills.length == 0) &&
            !node.children[index].backgroundStyles
          ) {
            let notAllText = 0;
            node.children[index].children?.forEach((childNode) => {
              if (childNode.type != 'TEXT') {
                notAllText = 2;
              }
              if (childNode.type == 'TEXT' && notAllText != 2) {
                notAllText = 1;
              }
            });
            if (notAllText != 1) {
              newChildrenList.push(node.children[index]);
              mergeTextList = null;
              textSize = 0;
            } else {
              needMergeText = true;
              if (!mergeTextList) {
                let canMerge = true;
                node.children[index].children.forEach((childNode) => {
                  if (!textSize) {
                    textSize = childNode.fontSize;
                  } else {
                    if (childNode.fontSize != textSize) {
                      canMerge = false;
                    }
                  }
                });
                if (canMerge) {
                  mergeTextList = node.children[index].children;
                  // newChildrenList[index] = mergeTextList
                  newChildrenList.push(mergeTextList);
                } else {
                  newChildrenList.push(node.children[index]);
                  mergeTextList = null;
                  textSize = 0;
                }
              } else {
                let canMerge = true;
                node.children[index].children.forEach((childNode) => {
                  if (!textSize) {
                    textSize = childNode.fontSize;
                  } else {
                    if (childNode.fontSize != textSize) {
                      canMerge = false;
                    }
                  }
                });
                if (canMerge) {
                  node.children[index].children.forEach((childNode) => {
                    mergeTextList.push(childNode);
                  });
                } else {
                  newChildrenList.push(node.children[index]);
                  mergeTextList = null;
                  textSize = 0;
                }
              }
            }
          } else {
            newChildrenList.push(node.children[index]);
            mergeTextList = null;
            textSize = 0;
          }
        } else {
          needMergeText = true;
          if (!mergeTextList) {
            mergeTextList = [node.children[index]];
            textSize = node.children[index].fontSize;
            // newChildrenList[index] = mergeTextList
            newChildrenList.push(mergeTextList);
          } else {
            if (textSize != node.children[index].fontSize) {
              mergeTextList = null;
              mergeTextList = [node.children[index]];
              textSize = node.children[index].fontSize;
              // newChildrenList[index] = mergeTextList
              newChildrenList.push(mergeTextList);
            } else {
              mergeTextList.push(node.children[index]);
            }
          }
        }
      }
      if (needMergeText) {
        newChildrenList.forEach((childData) => {
          if (childData) {
            if (Array.isArray(childData)) {
              let newChildData;
              let realNeedMerge = false;
              for (let i = 0, l = childData.length; i < l - 1; i++) {
                for (let j = i + 1; j < l; j++) {
                  if (
                    Math.abs(childData[i].height - childData[j].height) > 10
                  ) {
                    realNeedMerge = true;
                  }
                }
              }
              if (realNeedMerge) {
                childData.forEach((childNode) => {
                  if (!newChildData) {
                    newChildData = childNode;
                  } else {
                    newChildData.characters += childNode.characters;
                    newChildData.x = Math.min(newChildData.x, childNode.x);
                    newChildData.y = Math.min(newChildData.y, childNode.y);
                    newChildData.width = Math.max(
                      newChildData.width,
                      childNode.width
                    );
                    newChildData.height = Math.max(
                      newChildData.height,
                      childNode.height
                    );
                  }
                });
                dealChildren.push(newChildData);
              } else {
                childData.forEach((childNode) => {
                  dealChildren.push(childNode);
                });
              }
            } else {
              dealChildren.push(childData);
            }
          }
        });
        node.children = dealChildren;
      }
    }
  };
  checkIsButton = (node) => {
    switch (node.type) {
      case 'INSTANCE':
      case 'FRAME':
      case 'COMPONENT_SET':
      case 'COMPONENT':
        let isButton = false;
        if (
          // 有边框
          // (node.strokes && node.strokes.length > 0 && !node.individualStrokeWeights) ||
          (node.strokes && node.strokes.length > 0) ||
          // 有圆角
          node.rectangleCornerRadii ||
          node.cornerRadius ||
          // 有背景填充
          node.backgroundStyles ||
          (Array.isArray(node.fills) &&
            node.fills.filter((fill) => {
              return fill.type != 'SOLID' || fill.alpha != 0;
            }).length > 0 &&
            !node.isSVG)
        ) {
          if (node.children?.length > 2) {
            return false;
          }
          let hasText = 0,
            hasIcon = 0,
            hasOther = 0;
          node.children?.forEach((childNode) => {
            if (childNode.isSVG) {
              hasIcon += 1;
            } else if (childNode.type === 'TEXT') {
              hasText += 1;
            } else {
              hasOther += 1;
            }
          });
          if (hasText === 1 && hasIcon <= 0 && hasOther === 0) {
            isButton = true;
          }
          if (hasText === 0 && hasIcon == 1 && hasOther === 0) {
            isButton = true;
          }
        }
        return isButton;
      default:
        return false;
    }
  };

  checkIsImage = (node) => {
    switch (node.type) {
      case 'INSTANCE':
      case 'FRAME':
      case 'COMPONENT_SET':
      case 'COMPONENT':
      case 'RECTANGLE':
      case 'ELLIPSE':
        const { fills } = node;
        let isImage = false;
        if (Array.isArray(fills) && fills.length > 0) {
          for (const paint of fills) {
            if (
              paint.type === 'IMAGE' &&
              (paint.visible || !paint.hasOwnProperty('visible')) &&
              paint.opacity !== 0
            ) {
              isImage = true;
            }
          }
        }
        // if (isImage && node.children?.length == 0) {
        if (isImage) {
          return true;
        }
        break;
      default:
        break;
    }
    return false;
  };
  walkIvxNode(ivxNode) {
    if (!ivxNode) {
      return;
    }
    if (ivxNode.children?.length > 0) {
      for (let i = 0, l = ivxNode.children.length; i < l; i++) {
        this.walkIvxNode(ivxNode.children[i]);
      }
    } else {
      if (
        ivxNode.type === 'ih5-container' &&
        (ivxNode.props.width <= 2 || ivxNode.props.height <= 2) &&
        !ivxNode.props.bgImage
      ) {
        ivxNode.type = 'ih5-divider';
        if (!ivxNode.props.bgColor.match(/rgba\(.*,0\)/)) {
          ivxNode.props.borderColor = ivxNode.props.bgColor;
        }
      }
      return;
    }
  }
}
export default Figma2IvxAbs;
