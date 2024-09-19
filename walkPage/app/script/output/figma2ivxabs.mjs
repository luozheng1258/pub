import { genContainerNode } from './helpers/container.mjs';
import { genSvgNodeV2, genSvgNodeV3 } from './helpers/svg.mjs';
import { genTextNode } from './helpers/text.mjs';
import { genInputNode } from './helpers/input.mjs';
import { genRectNode } from './helpers/rect.mjs';
import { genGroupNode } from './helpers/group.mjs';
import { genButtonNode, genSubmitButtonNode } from './helpers/button.mjs';
import { isImageNode } from './helpers/utils/index.mjs';
import { genIframeNode } from './helpers/iframe.mjs';

// abs positon version
class Figma2IvxAbs {
  constructor(props) {
    this.figmaNodes = props.figmaNodes || [];
    this.windowBoundInfo = props.windowBoundInfo;
    this.ivxNodes = [];

    this.exec = this.exec.bind(this);
    this.fontFamilyMap = {}; // 案例里面字体记录表
  }

  exec({ env }) {
    const { figmaNodes, ivxNodes } = this;
    let ivxFigmaData = {};
    let caseData = genCaseData({
      windowBoundInfo: this.windowBoundInfo,
    });
    let pageContainer = caseData.stage.children[1];
    figmaNodes.forEach((node) => {
      switch (node.type) {
        case 'FRAME':
        case 'GROUP':
          {
            this.removeEmptyChild({ node });
            ivxFigmaData = this.genIvxData(node, env || 'rel');
            if (node.isFixed) {
              this.addBannerWrap({ node, ivxFigmaData, ivxNodes });
            } else {
              if (ivxFigmaData) {
                this.walkIvxNode(ivxFigmaData);
                ivxNodes.push(ivxFigmaData);
              }
            }
          }
          break;
        case 'BODY':
          {
            const { backgroundColor } = node._extraStyle || {};
            pageContainer.props.bgColor = backgroundColor;
          }
          break;
      }
    });
    pageContainer.children = ivxNodes;
    this.addFontFamilyToPage({ pageNode: pageContainer });
    this.delUselessPointerEvents({ nodes: ivxNodes });
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
      } else if (this.checkIsButton({ node, pNode: parent })) {
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
            this.recordFontFamily({ node });
            objData = genTextNode({ node, env, parent });
            break;
          case 'INPUT':
            if (node.inputType === 'submit') {
              objData = genSubmitButtonNode({ node, env, parent });
            } else {
              objData = genInputNode({ node, env, parent });
            }

            break;
          case 'GROUP':
            objData = genGroupNode({ node, env, parent });
            break;
          case 'RECTANGLE':
          case 'ELLIPSE':
            objData = genRectNode({ node, env, parent });
            break;
          case 'IFRAME':
            objData = genIframeNode({ node, env, parent });
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
        node.type != 'TEXT' &&
        node.type != 'IFRAME'
      ) {
        if (node.backgroundStyles) {
          return false;
        }
        // 如果当前node为父节点唯一子节点，且子节点为图片或者无填充，就删除
        // fix fill中type为SOILD，opacity不为0的情况下，节点被删除问题
        if (
          lastChild &&
          (node.fills.length == 0 ||
            (node.fills[0].type != 'IMAGE' && node.fills[0].opacity == 0))
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

    // 处理display:contents的情况
    this.processDisplayContents({ node });
  };
  mergeExtraStyle = ({ source, target }) => {
    const {
      position,
      float,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      pointerEvents,
    } = source || {};
    return target
      ? {
          ...target,
          position,
          float,
          paddingTop,
          paddingRight,
          paddingBottom,
          paddingLeft,
          pointerEvents,
        }
      : target;
  };
  // 处理display:contents的情况：将内部的子节点提升到父节点的层级
  processDisplayContents = ({ node }) => {
    let { children } = node || {};
    // 处理children中display:contents的情况
    let newChildren = [];
    let hasDisplayContents = false;

    let getDisplayContentsNodeChildren = ({ node }) => {
      let { children, _extraStyle } = node || {};
      if (_extraStyle?.display === 'contents') {
        // 剔除其中的windowButtonW属性，因为在父节点display:contents的情况下，子节点始终计算结果都是100%
        children.forEach((child) => {
          let { uis } = child || {};
          if (uis?.windowButtonW) {
            delete uis.windowButtonW;
          }
        });
        return children.reduce((prev, cur, index) => {
          return prev.concat(getDisplayContentsNodeChildren({ node: cur }));
        }, []);
      }
      return [node];
    };

    for (let i = 0, l = children.length; i < l; i++) {
      let childNode = children[i];
      if (childNode._extraStyle?.display === 'contents') {
        newChildren.push(
          ...getDisplayContentsNodeChildren({ node: childNode })
        );
        hasDisplayContents = true;
      } else {
        newChildren.push(childNode);
      }
    }
    if (hasDisplayContents) node.children = newChildren;
  };

  checkCanMerge = ({ node, pNode }) => {
    // return;
    let canMergeChild = null;
    let canReplaceChild = null;
    if (
      this.checkIsButton({ node, pNode }) ||
      this.checkIsImage(node) ||
      node.isSVG ||
      node.visible === false ||
      this.checkIsGridItem({ pNode })
    ) {
      return false;
    }
    checkChild.call(this, node);
    if (canMergeChild) {
      node.children = canMergeChild.children;
      // position，float 属性是当前节点的布局属性，不需要继承子节点的布局属性
      node._extraStyle = this.mergeExtraStyle({
        source: node._extraStyle,
        target: canMergeChild._extraStyle,
      });
      // 合并时如果当前没有zInde,合并对象存在，则记录下zIndex
      if (node.zIndex == undefined && canMergeChild.zIndex) {
        node.zIndex = canMergeChild.zIndex;
      }
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
      if (this.checkIsButton({ node, pNode })) return;
      // 如果合并后的节点没有溢出且当前节点没有剪切，就替换
      if (isRectOverFlow(node, canReplaceChild) || node.clipsContent) return;
      // 如果父节点有多个子节点，且子节点宽高和替换节点不一样，就不替换
      if (pNode && pNode?.children?.length > 1) {
        let { width, height } = node;
        let { width: rw, height: rh } = canReplaceChild;
        if (
          !this.isEqualXYWH({ source: width, target: rw, gap: 0.5 }) ||
          !this.isEqualXYWH({ source: height, target: rh, gap: 0.5 })
        ) {
          return;
        }
      }

      for (let key in canReplaceChild) {
        if (!['parent', 'isInline', 'zIndex'].includes(key)) {
          if (key === '_extraStyle') {
            canReplaceChild[key] = this.mergeExtraStyle({
              source: node[key],
              target: canReplaceChild[key],
            });
          }
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
          this.checkIsButton({ node: childNode }) ||
          this.checkIsImage(childNode) ||
          this.checkIsGridWrap({ node: childNode }) ||
          childNode.isSVG
        ) {
          canReplaceChild = childNode;
          return false;
        }

        // 如果节点存在gap属性，就不合并
        let { gap } = node?._extraStyle || {};
        if (gap) {
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
  // 判断是否是grid容器
  checkIsGridWrap = ({ node }) => {
    let { children } = node || {};
    if (!(Array.isArray(children) && children.length > 3)) return;
    let cloneChildren = [...children];
    // 按x和y排序
    cloneChildren.sort((a, b) => {
      let { x: x1, y: y1 } = a || {};
      let { x: x2, y: y2 } = b || {};
      if (this.isEqualXYWH({ source: y1, target: y2 })) {
        return x1 - x2;
      }
      return y1 - y2;
    });
    // 确定行的高度和列的高度
    const rowHeight = new Set();
    const colWidth = new Set();
    const rows = [[]];
    let currentRowY = cloneChildren[0]?.y;
    // 收集行
    for (const child of cloneChildren) {
      let { x, y, width, height } = child || {};
      rowHeight.add(width);
      colWidth.add(height);
      if (!this.isEqualXYWH({ source: currentRowY, target: y })) {
        currentRowY = y;
        rows.push([]);
      }
      rows[rows.length - 1].push(child);
    }
    let gridLayout = false;
    if (rowHeight.size === 1 && colWidth.size === 1) {
      gridLayout = true;
    }
    return gridLayout;
  };
  isEqualXYWH = ({ source, target, gap = 2 }) => {
    let detla = Math.abs(source - target);
    return detla <= gap;
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
            !node.children[index].backgroundStyles &&
            (!node.children[index].effects ||
              node.children[index].effects.length == 0)
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
  checkIsButton = ({ node, pNode }) => {
    let hasBorder = ({ node }) => {
      return (
        node.strokes &&
        node.strokes.length > 0 &&
        Object.keys(node.individualStrokes || {}).length == 4
      );
    };
    let hasBg = ({ node }) => {
      return (
        node.backgroundStyles ||
        (Array.isArray(node.fills) &&
          node.fills.filter((fill) => {
            return fill.opacity != 0;
          }).length > 0 &&
          !node.isSVG)
      );
    };
    switch (node.type) {
      case 'INSTANCE':
      case 'FRAME':
      case 'COMPONENT_SET':
      case 'COMPONENT':
        let isButton = false;
        if (
          hasBorder({ node }) || // 4边有边框
          hasBg({ node }) // 有背景填充
          // node.cornerRadius || // 有圆角的，需要有边框或背景填充
        ) {
          if (node.children?.length > 2) {
            return false;
          }
          let hasText = 0,
            hasIcon = 0,
            hasOther = 0;
          let child;
          node.children?.forEach((childNode) => {
            if (childNode.isSVG) {
              hasIcon += 1;
              child = childNode;
            } else if (childNode.type === 'TEXT') {
              hasText += 1;
              child = childNode;
            } else {
              hasOther += 1;
            }
          });
          if (hasText === 1 && hasIcon <= 0 && hasOther === 0) {
            // 文本按钮, 文本需要居中
            isButton = this.isCenterChild({ node: child, pNode: node });
          }
          if (hasText === 0 && hasIcon == 1 && hasOther === 0) {
            // 图标按钮，图标需要居中
            isButton = this.isCenterChild({ node: child, pNode: node });
          }
        }
        return isButton;
      default:
        return false;
    }
  };
  isCenterChild = ({ node, pNode }) => {
    let { x, y, width, height } = node || {};
    let { x: px, y: py, width: pw, height: ph } = pNode || {};
    let deltaLeft = Math.abs(x - px);
    let deltaRight = Math.abs(pw - deltaLeft - width);
    let deltaTop = Math.abs(y - py);
    let deltaBottom = Math.abs(ph - deltaTop - height);
    return !(
      Math.abs(deltaTop - deltaBottom) > 5 ||
      Math.abs(deltaLeft - deltaRight) > 5
    );
  };

  checkIsImage = (node) => {
    switch (node.type) {
      case 'INSTANCE':
      case 'FRAME':
      case 'COMPONENT_SET':
      case 'COMPONENT':
      case 'RECTANGLE':
      case 'ELLIPSE':
        return isImageNode({ node });
      default:
        break;
    }
    return false;
  };
  checkIsGridItem = ({ pNode }) => {
    let { display } = pNode?._extraStyle || {};
    return display === 'grid';
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
  recordFontFamily = ({ node }) => {
    const { fontFamily } = node || {};
    if (fontFamily) {
      this.fontFamilyMap[fontFamily] = this.fontFamilyMap[fontFamily] || 0;
      this.fontFamilyMap[fontFamily] += 1;
    }
  };
  addFontFamilyToPage = ({ pageNode }) => {
    let fontFamily;
    let counter = 0;
    for (let key in this.fontFamilyMap) {
      if (this.fontFamilyMap[key] > counter) {
        counter = this.fontFamilyMap[key];
        fontFamily = key;
        break;
      }
    }
    if (!fontFamily) return;
    pageNode.styleList = pageNode.styleList || [];
    pageNode.styleList.push({
      name: 'fontFamily',
      value: fontFamily,
    });
  };
  // 递归遍历删除无效的pointerEvents
  delUselessPointerEvents = ({ nodes }) => {
    if (!Array.isArray(nodes)) return;
    let walkNode = ({ ctx = {}, node }) => {
      let { customPointerEvents, bgClip } = ctx;
      let {
        children,
        uis: { _extraStyle = {} },
      } = node || {};
      let { pointerEvents, position } = _extraStyle || {};
      // 如果祖先节点设置了pointerEvents
      if (customPointerEvents) {
        if (pointerEvents === customPointerEvents) {
          delete _extraStyle.pointerEvents;
        } else if (pointerEvents) {
          ctx.customPointerEvents = pointerEvents;
          node.styleList = node.styleList || [];
          node.styleList.push({
            name: 'pointerEvents',
            value: pointerEvents,
          });
        }
      } else {
        if (pointerEvents === 'auto') {
          delete _extraStyle.pointerEvents;
        } else if (pointerEvents) {
          ctx.customPointerEvents = pointerEvents;
          node.styleList = node.styleList || [];
          node.styleList.push({
            name: 'pointerEvents',
            value: pointerEvents,
          });
        }
      }

      // 如果祖先节点设置了backgroundClip
      if (bgClip) {
        if (bgClip === 'text' && position === 'static') {
          node.styleList.push({
            name: 'position',
            value: 'static',
          });
        }
      } else {
        if (_extraStyle.backgroundClip === 'text') {
          ctx.bgClip = _extraStyle.backgroundClip;
        }
      }

      if (!Array.isArray(children)) return;
      children.forEach((child) => {
        walkNode({
          ctx: {
            customPointerEvents: ctx.customPointerEvents,
            bgClip: ctx.bgClip,
          },
          node: child,
        });
      });
    };
    nodes.forEach((node) => walkNode({ node }));
  };
  // 添加固定横幅
  addBannerWrap = ({ node, ivxFigmaData, ivxNodes }) => {
    const { name, zIndex } = node || {};
    let fixedWrap = {
      type: 'ih5-abs-banner',
      props: {
        width: 0,
        height: 0,
      },
      uis: { name },
      children: [ivxFigmaData],
      envs: ['abs'],
      styleList: [{ name: 'position', value: 'fixed' }],
    };
    if (zIndex) {
      // 给横幅添加层级
      fixedWrap.props.zIndex = zIndex;
    }
    this.getBannerLayout({ ivxFigmaData, fixedWrap });
    if (ivxFigmaData) {
      this.walkIvxNode(fixedWrap);
      ivxNodes.push(fixedWrap);
    }
  };
  // 获取横幅布局
  getBannerLayout = ({ ivxFigmaData, fixedWrap }) => {
    let { windowBoundW, windowBoundH } = this.windowBoundInfo || {};
    if (!windowBoundH || !windowBoundW) return;
    let centerPos = { x: windowBoundW / 2, y: windowBoundH / 2 };
    let { props } = ivxFigmaData || {};
    let { x, y } = props || {};
    let { props: fixedWrapProps } = fixedWrap || {};
    if (x < centerPos.x) {
      if (y < centerPos.y) {
        // 左上
        fixedWrapProps.layout = 'topLeft';
        fixedWrapProps.y = y;
      } else {
        // 左下
        fixedWrapProps.layout = 'bottomLeft';
        fixedWrapProps.y = y - windowBoundH;
      }
      fixedWrapProps.x = x;
    } else {
      if (y < centerPos.y) {
        // 右上
        fixedWrapProps.layout = 'topRight';
        fixedWrapProps.y = y;
      } else {
        // 右下
        fixedWrapProps.layout = 'bottomRight';
        fixedWrapProps.y = y - windowBoundH;
      }
      fixedWrapProps.x = x - windowBoundW; // 负数
    }
    props.x = 0;
    props.y = 0;
  };
}
// 生成案例数据
function genCaseData({ windowBoundInfo }) {
  let { windowBoundH } = windowBoundInfo || {};
  return {
    case: {
      id: '',
      type: 'ih5-case',
      uis: {
        name: 'testImport',
        expand: true,
        hLines: [],
        vLines: [],
        zoom: 40,
        width: 1920,
        height: windowBoundH,
        cover: '0d56ddc1f0cf0205d7bbe06c41bf99b8_10540.svg',
        deviceName: 'custom',
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
        hideScrollBar: true,
        cut: 'hidden', // 前台使用隐藏，页面使用scrollY
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
          uis: {
            name: '页面1',
            windowBoundInfo,
          },
          props: { width: '100%', height: '100%', bgColor: '', cut: 'scrollY' },
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
export default Figma2IvxAbs;
