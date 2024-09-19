export default walkPage;

function walkPage(paramArg) {
  function htmlToFigma(
    selector = document.body,
    useFrames = false,
    time = false,
    includeMetadata = false
  ) {
    !window.domCnt && (window.domCnt = {});
    let bodyDeltaY = document.body.getBoundingClientRect().y;

    function getBoundingClientRect(el) {
      let rect = el.getBoundingClientRect();
      // Shadow DOM节点无法获取矩形信息，需要处理为空的情况
      if (!rect) return {};
      rect.y = rect.y - bodyDeltaY;
      rect.top = rect.top - bodyDeltaY;
      return rect;
    }
    if (time) {
      console.time('Parse dom');
    }

    function getAppliedComputedStyles(element, pseudo) {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
        return {};
      }
      const styles = getComputedStyle(element, pseudo);
      const list = [
        'opacity',
        'backgroundColor',
        'border',
        'borderTop',
        'borderLeft',
        'borderRight',
        'borderBottom',
        'borderRadius',
        'backgroundImage',
        'borderColor',
        'boxShadow',
      ];
      const color = styles.color;
      const defaults = {
        transform: 'none',
        opacity: '1',
        borderRadius: '0px',
        backgroundImage: 'none',
        backgroundPosition: '0% 0%',
        backgroundSize: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        backgroundAttachment: 'scroll',
        border: '0px none ' + color,
        borderTop: '0px none ' + color,
        borderBottom: '0px none ' + color,
        borderLeft: '0px none ' + color,
        borderRight: '0px none ' + color,
        borderWidth: '0px',
        borderColor: color,
        borderStyle: 'none',
        boxShadow: 'none',
        fontWeight: '400',
        textAlign: 'start',
        justifyContent: 'normal',
        alignItems: 'normal',
        alignSelf: 'auto',
        flexGrow: '0',
        textDecoration: 'none solid ' + color,
        lineHeight: 'normal',
        letterSpacing: 'normal',
        backgroundRepeat: 'repeat',
        zIndex: 'auto',
      };

      function pick(object, paths) {
        const newObject = {};
        paths.forEach((path) => {
          if (object[path]) {
            if (object[path] !== defaults[path]) {
              newObject[path] = object[path];
            }
          }
        });
        return newObject;
      }
      return pick(styles, list);
    }

    const layers = [];

    const el =
      selector instanceof HTMLElement
        ? selector
        : document.querySelector(selector || 'body');

    if (el) {
      // Process SVG <use> elements
      for (const use of Array.from(el.querySelectorAll('use'))) {
        try {
          const symbolSelector = use.href.baseVal;
          const symbol = document.querySelector(symbolSelector);
          if (symbol) {
            use.outerHTML = symbol.innerHTML;
          }
        } catch (err) {
          console.warn('Error querying <use> tag href', err);
        }
      }
      // 获取el下的所有shadow dom元素
      const els = Array.from(el.querySelectorAll('*')).reduce((memo, el) => {
        memo.push(el);
        memo.push(...getShadowEls(el));
        return memo;
      }, []);

      if (els) {
        // 待处理的元素
        let todoList = [];
        Array.from(els).forEach((el) => {
          if (el instanceof SVGSVGElement) {
            handleSvgNode({ el, layers, getBoundingClientRect });
            return;
          } else if (el instanceof SVGElement) {
            // Sub SVG Eleemnt
            return;
          }
          // 对于父元素为Picture的元素，不进行处理
          if (
            el.parentElement &&
            el.parentElement instanceof HTMLPictureElement
          ) {
            let i = todoList.indexOf(el);
            if (i > -1) {
              todoList.splice(i, 1);
            } else {
              return;
            }
          }
          const appliedStyles = getAppliedComputedStyles(el);
          const computedStyle = getComputedStyle(el);
          const rect = getBoundingClientRect(el);

          if (rect.width >= 0 && rect.height >= 0) {
            const fills = [];
            // 背景颜色
            const color = getRgb(computedStyle.backgroundColor);
            if (color) {
              fills.push({
                type: 'SOLID',
                color: {
                  r: color.r,
                  g: color.g,
                  b: color.b,
                },
                opacity: color.a || 1,
              });
            }
            const rectNode = {
              type: 'RECTANGLE',
              ref: el,
              x: parseFloat(rect.left),
              y: parseFloat(rect.top),
              width: parseFloat(rect.width),
              height: parseFloat(rect.height),
              fills: fills,
            };

            if (includeMetadata) {
              rectNode.meta = { originalStyles: appliedStyles };
            }
            // 透明度
            if (computedStyle.opacity && computedStyle.opacity !== '1') {
              rectNode.opacity = parseFloat(computedStyle.opacity);
            }

            // 边框改为四边分开记录
            if (computedStyle.borderTop) {
              const parsed = computedStyle.borderTop.match(
                /^([\d\.]+)px\s*(\w+)\s*(.*)$/
              );
              if (parsed) {
                let [_match, width, type, color] = parsed;
                if (width && width !== '0' && type !== 'none' && color) {
                  const rgb = getRgb(color);
                  if (rgb) {
                    rectNode.strokes = [
                      {
                        type: 'SOLID',
                        color: { r: rgb.r, b: rgb.b, g: rgb.g },
                        opacity: rgb.a || 1,
                      },
                    ];
                    rectNode.strokeWeight = 'figma.mixed';
                    if (!rectNode.individualStrokes) {
                      rectNode.individualStrokes = {};
                    }
                    rectNode.individualStrokes.top = {
                      type: 'SOLID',
                      color: { r: rgb.r, b: rgb.b, g: rgb.g },
                      opacity: rgb.a || 1,
                    };
                    rectNode.strokeTopWeight = parseFloat(parseFloat(width));
                  }
                }
              }
            }
            if (computedStyle.borderRight) {
              const parsed = computedStyle.borderRight.match(
                /^([\d\.]+)px\s*(\w+)\s*(.*)$/
              );
              if (parsed) {
                let [_match, width, type, color] = parsed;
                if (width && width !== '0' && type !== 'none' && color) {
                  const rgb = getRgb(color);
                  if (rgb) {
                    rectNode.strokes = [
                      {
                        type: 'SOLID',
                        color: { r: rgb.r, b: rgb.b, g: rgb.g },
                        opacity: rgb.a || 1,
                      },
                    ];
                    rectNode.strokeWeight = 'figma.mixed';
                    if (!rectNode.individualStrokes) {
                      rectNode.individualStrokes = {};
                    }

                    rectNode.individualStrokes.right = {
                      type: 'SOLID',
                      color: { r: rgb.r, b: rgb.b, g: rgb.g },
                      opacity: rgb.a || 1,
                    };
                    rectNode.strokeRightWeight = parseFloat(parseFloat(width));
                  }
                }
              }
            }
            if (computedStyle.borderBottom) {
              const parsed = computedStyle.borderBottom.match(
                /^([\d\.]+)px\s*(\w+)\s*(.*)$/
              );
              if (parsed) {
                let [_match, width, type, color] = parsed;
                if (width && width !== '0' && type !== 'none' && color) {
                  const rgb = getRgb(color);
                  if (rgb) {
                    rectNode.strokes = [
                      {
                        type: 'SOLID',
                        color: { r: rgb.r, b: rgb.b, g: rgb.g },
                        opacity: rgb.a || 1,
                      },
                    ];
                    rectNode.strokeWeight = 'figma.mixed';
                    if (!rectNode.individualStrokes) {
                      rectNode.individualStrokes = {};
                    }
                    rectNode.individualStrokes.bottom = {
                      type: 'SOLID',
                      color: { r: rgb.r, b: rgb.b, g: rgb.g },
                      opacity: rgb.a || 1,
                    };
                    rectNode.strokeBottomWeight = parseFloat(parseFloat(width));
                  }
                }
              }
            }
            if (computedStyle.borderLeft) {
              const parsed = computedStyle.borderLeft.match(
                /^([\d\.]+)px\s*(\w+)\s*(.*)$/
              );
              if (parsed) {
                let [_match, width, type, color] = parsed;
                if (width && width !== '0' && type !== 'none' && color) {
                  const rgb = getRgb(color);
                  if (rgb) {
                    rectNode.strokes = [
                      {
                        type: 'SOLID',
                        color: { r: rgb.r, b: rgb.b, g: rgb.g },
                        opacity: rgb.a || 1,
                      },
                    ];
                    rectNode.strokeWeight = 'figma.mixed';
                    if (!rectNode.individualStrokes) {
                      rectNode.individualStrokes = {};
                    }

                    rectNode.individualStrokes.left = {
                      type: 'SOLID',
                      color: { r: rgb.r, b: rgb.b, g: rgb.g },
                      opacity: rgb.a || 1,
                    };
                    rectNode.strokeLeftWeight = parseFloat(parseFloat(width));
                  }
                }
              }
            }
            if (!rectNode.strokes) {
              rectNode.strokes = [];
              rectNode.strokeWeight = 0;
            }

            if (computedStyle?.backgroundImage !== 'none') {
              handleComputedStyle.processBackgroundImage({
                rectNode,
                computedStyle,
              });
            } else if (computedStyle?.content !== 'normal') {
              handleComputedStyle.processContent({
                content: computedStyle.content,
                fills,
              });
            }

            if (el instanceof HTMLImageElement) {
              handleImageNode({ el, computedStyle, rectNode });
            } else if (el instanceof HTMLPictureElement) {
              handlePictureNode({ el, fills, todoList, computedStyle });
            } else if (el instanceof HTMLVideoElement) {
              const url = el.poster;
              if (url) {
                fills.push({
                  url,
                  type: 'IMAGE',
                  // TODO: object fit, position
                  scaleMode:
                    computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
                  imageHash: null,
                  isVideo: true,
                });
              }
            } else if (el instanceof HTMLInputElement) {
              handleInputNode({ el, rectNode, computedStyle });
            } else if (el instanceof HTMLSelectElement) {
              handleSelectNode({ el, rectNode, computedStyle });
            } else if (el instanceof HTMLIFrameElement) {
              handleIframeNode({ el, rectNode, computedStyle });
            }
            if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
              handleComputedStyle.processBoxShadow({
                rectNode,
                computedStyle,
                el,
              });
            }
            // 处理圆角
            handleComputedStyle.processBorderRadius({
              rectNode,
              computedStyle,
            });
            layers.push(rectNode);
          }
        });
      }
      const textNodes = textNodesUnder(el);

      const fastClone = (data) =>
        typeof data === 'symbol' ? null : JSON.parse(JSON.stringify(data));
      for (const node of textNodes) {
        if (node.textContent && node.textContent.trim().length) {
          const parent = node.parentElement;
          if (!parent) continue;

          if (isHidden(parent)) {
            continue;
          }

          const computedStyles = getComputedStyle(parent);
          // fix 文本宽高
          const range = document.createRange();
          range.selectNode(node);

          const rect = fastClone(range.getBoundingClientRect());

          rect.y = rect.y - bodyDeltaY;
          rect.top = rect.top - bodyDeltaY;
          //   const rect = fastClone(parent.getBoundingClientRect());
          const lineHeight = parseUnits(computedStyles.lineHeight);
          range.detach();
          // fix TextNode节点通过选取区域计算出来的高度和实际位于父节点上的高度不一致问题
          // 由于存在文本换行问题，故比较偏差值小于6px的情况下，将文本节点的高度设置为lineHeight的值
          if (
            lineHeight &&
            (rect.height < lineHeight.value ||
              Math.abs(rect.height - lineHeight.value) < 10)
          ) {
            const delta = rect.height - lineHeight.value;
            rect.top += delta / 2;
            rect.height = lineHeight.value;
          }
          if (rect.height < 1 || rect.width < 1) {
            continue;
          }
          const textNode = {
            x: parseFloat(rect.left),
            ref: node,
            y: parseFloat(rect.top),
            width: parseFloat(rect.width),
            height: parseFloat(rect.height),
            type: 'TEXT',
            characters: node.textContent.trim().replace(/\s+/g, ' ') || '',
          };
          const fills = [];
          const rgb = getRgb(computedStyles.color);
          if (rgb) {
            fills.push({
              type: 'SOLID',
              color: {
                r: rgb.r,
                g: rgb.g,
                b: rgb.b,
              },
              opacity: rgb.a || 1,
            });
          } else {
            // 文字记录下透明颜色
            fills.push({
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0 },
              opacity: 0,
            });
          }
          if (fills.length) {
            textNode.fills = fills;
          }
          if (lineHeight) {
            textNode.lineHeight = lineHeight;
          }
          handleComputedStyle.processLetterSpacing({
            rectNode: textNode,
            computedStyle: computedStyles,
          });
          handleComputedStyle.processTextTransform({
            rectNode: textNode,
            computedStyle: computedStyles,
          });
          handleComputedStyle.processFont({
            rectNode: textNode,
            computedStyle: computedStyles,
          });
          layers.push(textNode);
        }
      }
    }
    // TODO: send frame: { children: []}
    const root = {
      type: 'BODY',
      width: parseFloat(window.innerWidth),
      height: parseFloat(document.documentElement.scrollHeight),
      x: 0,
      y: 0,
      ref: document.body,
      _extraStyle: {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      },
    };
    layers.unshift(root);
    const hasChildren = (node) => node && Array.isArray(node.children);

    function traverse(layer, cb, parent) {
      if (layer) {
        cb(layer, parent);
        if (hasChildren(layer)) {
          layer.children.forEach((child) => traverse(child, cb, layer));
        }
      }
    }

    function makeTree() {
      function getParent(layer) {
        let response = null;
        try {
          traverse(root, (child) => {
            if (child && child.children && child.children.includes(layer)) {
              response = child;
              // Deep traverse short circuit hack
              throw 'DONE';
            }
          });
        } catch (err) {
          if (err === 'DONE') {
            // Do nothing
          } else {
            console.error(err.message);
          }
        }
        return response;
      }
      const refMap = new WeakMap();
      layers.forEach((layer) => {
        if (layer.ref) {
          refMap.set(layer.ref, layer);
        }
      });
      let updated = true;
      let iterations = 0;
      while (updated) {
        updated = false;
        if (iterations++ > 10000) {
          console.error('Too many tree iterations 1');
          break;
        }
        traverse(root, (layer, originalParent) => {
          // const node = layer.ref!;
          const node = layer.ref;
          let parentElement = (node && node.parentElement) || null;
          do {
            if (parentElement === document.body) {
              break;
            }
            if (parentElement && parentElement !== document.body) {
              // Get least common demoninator shared parent and make a group
              const parentLayer = refMap.get(parentElement);
              if (parentLayer === originalParent) {
                break;
              }
              if (parentLayer && parentLayer !== root) {
                if (hasChildren(parentLayer)) {
                  if (originalParent) {
                    const index = originalParent.children.indexOf(layer);
                    originalParent.children.splice(index, 1);
                    parentLayer.children.push(layer);
                    updated = true;
                    return;
                  }
                } else {
                  let parentRef = parentLayer.ref;
                  if (
                    parentRef &&
                    parentRef instanceof Node &&
                    parentRef.nodeType === Node.TEXT_NODE
                  ) {
                    parentRef = parentRef.parentElement;
                  }
                  const overflowHidden =
                    parentRef instanceof Element &&
                    getComputedStyle(parentRef).overflow !== 'visible';
                  const newParent = {
                    type: 'FRAME',
                    clipsContent: !!overflowHidden,
                    // type: 'GROUP',
                    x: parentLayer.x,
                    y: parentLayer.y,
                    width: parentLayer.width,
                    height: parentLayer.height,
                    ref: parentLayer.ref,
                    backgrounds: [],
                    children: [parentLayer, layer],
                  };
                  const parent = getParent(parentLayer);
                  if (!parent) {
                    console.warn(
                      '\n\nCANT FIND PARENT\n',
                      JSON.stringify(
                        Object.assign(Object.assign({}, parentLayer), {
                          ref: null,
                        })
                      )
                    );
                    continue;
                  }
                  if (originalParent) {
                    const index = originalParent.children.indexOf(layer);
                    originalParent.children.splice(index, 1);
                  }
                  delete parentLayer.ref;
                  const newIndex = parent.children.indexOf(parentLayer);
                  refMap.set(parentElement, newParent);
                  parent.children.splice(newIndex, 1, newParent);
                  updated = true;
                  return;
                }
              }
            }
          } while (
            parentElement &&
            (parentElement = parentElement.parentElement)
          );
        });
      }
      // Collect tree of depeest common parents and make groups
      let secondUpdate = true;
      let secondIterations = 0;
      while (secondUpdate) {
        if (secondIterations++ > 10000) {
          console.error('Too many tree iterations 2');
          break;
        }
        secondUpdate = false;

        function getParents(node) {
          let el =
            node instanceof Node && node.nodeType === Node.TEXT_NODE
              ? node.parentElement
              : node;
          let parents = [];
          while (el && (el = el.parentElement)) {
            parents.push(el);
          }
          return parents;
        }

        function getDepth(node) {
          return getParents(node).length;
        }
        traverse(root, (layer, parent) => {
          if (secondUpdate) {
            return;
          }
          if (layer.type === 'FRAME') {
            // Final all child elements with layers, and add groups around  any with a shared parent not shared by another
            const ref = layer.ref;
            if (layer.children && layer.children.length > 2) {
              const childRefs =
                layer.children && layer.children.map((child) => child.ref);
              let lowestCommonDenominator = layer.ref;
              let lowestCommonDenominatorDepth = getDepth(
                lowestCommonDenominator
              );
              // Find lowest common demoninator with greatest depth
              for (const childRef of childRefs) {
                const otherChildRefs = childRefs.filter(
                  (item) => item !== childRef
                );
                const childParents = getParents(childRef);
                for (const otherChildRef of otherChildRefs) {
                  const otherParents = getParents(otherChildRef);
                  for (const parent of otherParents) {
                    if (
                      childParents.includes(parent) &&
                      layer.ref.contains(parent)
                    ) {
                      const depth = getDepth(parent);
                      if (depth > lowestCommonDenominatorDepth) {
                        lowestCommonDenominator = parent;
                        lowestCommonDenominatorDepth = depth;
                      }
                    }
                  }
                }
              }
              if (
                lowestCommonDenominator &&
                lowestCommonDenominator !== layer.ref
              ) {
                // Make a group around all children elements
                const newChildren = layer.children.filter((item) =>
                  lowestCommonDenominator.contains(item.ref)
                );
                if (newChildren.length !== layer.children.length) {
                  const lcdRect = getBoundingClientRect(
                    lowestCommonDenominator
                  );
                  const overflowHidden =
                    lowestCommonDenominator instanceof Element &&
                    getComputedStyle(lowestCommonDenominator).overflow !==
                      'visible';
                  const newParent = {
                    type: 'FRAME',
                    clipsContent: !!overflowHidden,
                    ref: lowestCommonDenominator,
                    x: lcdRect.left,
                    y: lcdRect.top,
                    width: lcdRect.width,
                    height: lcdRect.height,
                    backgrounds: [],
                    children: newChildren,
                  };
                  refMap.set(lowestCommonDenominator, ref);
                  let firstIndex = layer.children.length - 1;
                  for (const child of newChildren) {
                    const childIndex = layer.children.indexOf(child);
                    if (childIndex > -1 && childIndex < firstIndex) {
                      firstIndex = childIndex;
                    }
                  }
                  layer.children.splice(firstIndex, 0, newParent);
                  for (const child of newChildren) {
                    const index = layer.children.indexOf(child);
                    if (index > -1) {
                      layer.children.splice(index, 1);
                    }
                  }
                  secondUpdate = true;
                }
              }
            }
          }
        });
      }
      // Update all positions
      traverse(root, (layer) => {
        if (layer.type === 'FRAME' || layer.type === 'GROUP') {
          const { x, y } = layer;
          if (x || y) {
            traverse(layer, (child) => {
              if (child === layer) {
                return;
              }
              child.x = child.x - x;
              child.y = child.y - y;
            });
          }
        }
      });
    }

    function removeRefs(layers) {
      layers.concat([root]).forEach((layer) => {
        traverse(layer, (child) => {
          delete child.ref;
        });
      });
    }

    function addConstraints(layers) {
      layers.forEach((layer) => {
        traverse(layer, (child) => {
          if (child.type === 'SVG') {
            child.constraints = {
              horizontal: 'CENTER',
              vertical: 'MIN',
            };
          } else {
            const ref = child.ref;
            if (ref) {
              const el = ref instanceof HTMLElement ? ref : ref.parentElement;
              const parent = el && el.parentElement;
              if (el && parent) {
                const currentDisplay = el.style.display;
                el.style.setProperty('display', 'none', '!important');
                let computed = getComputedStyle(el);
                const hasFixedWidth =
                  computed.width && computed.width.trim().endsWith('px');
                const hasFixedHeight =
                  computed.height && computed.height.trim().endsWith('px');
                el.style.display = currentDisplay;
                const parentStyle = getComputedStyle(parent);
                let hasAutoMarginLeft = computed.marginLeft === 'auto';
                let hasAutoMarginRight = computed.marginRight === 'auto';
                let hasAutoMarginTop = computed.marginTop === 'auto';
                let hasAutoMarginBottom = computed.marginBottom === 'auto';
                computed = getComputedStyle(el);

                function setData(node, key, value) {
                  if (!node.data) {
                    node.data = {};
                  }
                  node.data[key] = value;
                }
                if (['absolute', 'fixed'].includes(computed.position)) {
                  setData(child, 'position', computed.position);
                }
                if (hasFixedHeight) {
                  setData(child, 'heightType', 'fixed');
                }
                if (hasFixedWidth) {
                  setData(child, 'widthType', 'fixed');
                }
                const isInline =
                  computed.display && computed.display.includes('inline');
                if (isInline) {
                  const parentTextAlign = parentStyle.textAlign;
                  if (parentTextAlign === 'center') {
                    hasAutoMarginLeft = true;
                    hasAutoMarginRight = true;
                  } else if (parentTextAlign === 'right') {
                    hasAutoMarginLeft = true;
                  }
                  if (computed.verticalAlign === 'middle') {
                    hasAutoMarginTop = true;
                    hasAutoMarginBottom = true;
                  } else if (computed.verticalAlign === 'bottom') {
                    hasAutoMarginTop = true;
                    hasAutoMarginBottom = false;
                  }
                  setData(child, 'widthType', 'shrink');
                }
                const parentJustifyContent =
                  parentStyle.display === 'flex' &&
                  ((parentStyle.flexDirection === 'row' &&
                    parentStyle.justifyContent) ||
                    (parentStyle.flexDirection === 'column' &&
                      parentStyle.alignItems));
                if (parentJustifyContent === 'center') {
                  hasAutoMarginLeft = true;
                  hasAutoMarginRight = true;
                } else if (
                  parentJustifyContent &&
                  (parentJustifyContent.includes('end') ||
                    parentJustifyContent.includes('right'))
                ) {
                  hasAutoMarginLeft = true;
                  hasAutoMarginRight = false;
                }
                const parentAlignItems =
                  parentStyle.display === 'flex' &&
                  ((parentStyle.flexDirection === 'column' &&
                    parentStyle.justifyContent) ||
                    (parentStyle.flexDirection === 'row' &&
                      parentStyle.alignItems));
                if (parentAlignItems === 'center') {
                  hasAutoMarginTop = true;
                  hasAutoMarginBottom = true;
                } else if (
                  parentAlignItems &&
                  (parentAlignItems.includes('end') ||
                    parentAlignItems.includes('bottom'))
                ) {
                  hasAutoMarginTop = true;
                  hasAutoMarginBottom = false;
                }
                if (child.type === 'TEXT') {
                  if (computed.textAlign === 'center') {
                    hasAutoMarginLeft = true;
                    hasAutoMarginRight = true;
                  } else if (computed.textAlign === 'right') {
                    hasAutoMarginLeft = true;
                    hasAutoMarginRight = false;
                  }
                }
                child.constraints = {
                  horizontal:
                    hasAutoMarginLeft && hasAutoMarginRight
                      ? 'CENTER'
                      : hasAutoMarginLeft
                      ? 'MAX'
                      : 'SCALE',
                  vertical:
                    hasAutoMarginBottom && hasAutoMarginTop
                      ? 'CENTER'
                      : hasAutoMarginTop
                      ? 'MAX'
                      : 'MIN',
                };
              }
            } else {
              child.constraints = {
                horizontal: 'SCALE',
                vertical: 'MIN',
              };
            }
          }
        });
      });
    }
    // TODO: arg can be passed in
    const MAKE_TREE = useFrames;
    if (MAKE_TREE) {
      root.children = layers.slice(1);
      makeTree();
      addConstraints([root]);
      removeRefs([root]);
      if (time) {
        console.info('\n');
        console.timeEnd('Parse dom');
      }
      return [root];
    }

    let absObj = layersToAbsObj(layers);
    // console.log('debug layers', layers);
    let layerTree = layerMakeTree(layers);
    // debugger
    removeRefs(layers);
    if (time) {
      console.info('\n');
      console.timeEnd('Parse dom');
    }
    return { layers, absObj, layerTree, title: document.title };
  }

  // 将layers进行树形排列，方便后续树形数据生成
  function layerMakeTree(layers) {
    let layerTree = [];
    let layerDict = {};
    for (let layer of layers) {
      if (!layer.cnt_id) {
        if (layer.type === 'BODY') {
          layerTree.push(layer);
        }
        continue;
      }
      layerDict[layer.cnt_id] = layer;
      layer.children = [];
      //  isAbs的元素不脱离文档流
      if (layer.cnt_id === layer.parent_id || layer.isFixed) {
        // 不可见的组件不加入组件节点树内
        if (layer.visible !== false) {
          layerTree.push(layer);
        }
      } else {
        if (layerDict[layer.parent_id]) {
          layerDict[layer.parent_id].type = 'FRAME';
          // 不可见的组件不加入组件节点树内
          if (layer.visible !== false) {
            layerDict[layer.parent_id].children.push(layer);
          }
        }
      }
    }

    for (let layer of layers) {
      if (layer.ref && layer.ref.dataset) {
        delete layer.ref.dataset.__parent_id;
        delete layer.ref.dataset.__dom_id;
      }
    }
    return layerTree;
  }

  // 接近原生的absObj
  function layersToAbsObj(layers) {
    // console.log('debug layers', layers);
    let simpleStage = [];
    for (let layer of layers) {
      if (layer.ref.tagName === 'BODY') {
        continue;
      }
      var targetObj = {
        // 移除可能不必要的 type
        // type: layer.type,
        width: layer.width,
        height: layer.height,
        x: layer.x,
        y: layer.y,
      };
      if (layer.type !== 'TEXT') {
        targetObj.css = layer.ref.getAttribute('style');
        // targetObj.className = layer.ref.className;
        targetObj.tagName = layer.ref.tagName;
        // if (layer.ref.dataset && layer.ref.dataset.events) {
        //   targetObj.events = layer.ref.dataset.events;
        // }
        // 填充原生属性
        // 图片因为都是占位图，所以不用填充记录src
        // if (layer.ref.tagName !== "IMG") {
        // 暂时还是先记录img的src from 2023/11/07
        layer.ref.getAttribute('src') &&
          (targetObj.src = layer.ref.getAttribute('src').split('?')[0]);

        // // 超过两百个字符的src地址就更换为占位符
        // if (targetObj.src && targetObj.src.length > 200) {
        //     delete targetObj.src;
        // }
        // }
        layer.ref.getAttribute('value') &&
          (targetObj.value = layer.ref.getAttribute('value'));
        layer.ref.getAttribute('href') &&
          (targetObj.href = layer.ref.getAttribute('href'));
        layer.ref.getAttribute('title') &&
          (targetObj.title = layer.ref.getAttribute('title'));
        layer.ref.getAttribute('id') &&
          (targetObj.id = layer.ref.getAttribute('id'));

        // 记录bgColor,bgUrl和border radius
        let layerComputedStyle = getComputedStyle(layer.ref);
        if (layerComputedStyle.backgroundColor) {
          targetObj.backgroundColor = layerComputedStyle.backgroundColor;
        }
        if (layerComputedStyle.backgroundImage) {
          targetObj.backgroundImage = layerComputedStyle.backgroundImage;
        }
        if (layerComputedStyle.borderWidth) {
          targetObj.borderWidth = layerComputedStyle.borderWidth;
        }
        if (layerComputedStyle.borderTopLeftRadius) {
          targetObj.borderTopLeftRadius = Math.round(
            layerComputedStyle.borderTopLeftRadius.replace(/px/, '')
          );
          // layer.cornerRadius = 'figma.mixed'
          // layer.topLeftRadius = targetObj.borderTopLeftRadius
        }
        if (layerComputedStyle.borderTopRightRadius) {
          targetObj.borderTopRightRadius = Math.round(
            layerComputedStyle.borderTopRightRadius.replace(/px/, '')
          );
          // layer.cornerRadius = 'figma.mixed'
          // layer.topRightRadius = targetObj.borderTopRightRadius
        }
        if (layerComputedStyle.borderBottomLeftRadius) {
          targetObj.borderBottomLeftRadius = Math.round(
            layerComputedStyle.borderBottomLeftRadius.replace(/px/, '')
          );
          // layer.cornerRadius = 'figma.mixed'
          // layer.bottomLeftRadius = targetObj.borderBottomLeftRadius
        }
        if (layerComputedStyle.borderBottomRightRadius) {
          targetObj.borderBottomRightRadius = Math.round(
            layerComputedStyle.borderBottomRightRadius.replace(/px/, '')
          );
          // layer.cornerRadius = 'figma.mixed'
          // layer.bottomRightRadius = targetObj.borderBottomRightRadius
        }

        if (layerComputedStyle.borderBottomColor) {
          targetObj.borderBottomColor = layerComputedStyle.borderBottomColor;
        }

        if (['fixed'].includes(layerComputedStyle.position)) {
          layer.isFixed = true;
        }
        // zIndex 大于10的绝对定位元素认为是弹窗
        if (
          layerComputedStyle.position === 'absolute' &&
          layerComputedStyle.zIndex > 10
        ) {
          layer.isAbs = true;
        }
        if (layerComputedStyle.zIndex != 'auto') {
          layer.zIndex = layerComputedStyle.zIndex;
        }

        // 不可见元素属性设置
        if (
          layerComputedStyle.opacity == '0' ||
          layerComputedStyle.visibility == 'hidden' ||
          layerComputedStyle.display == 'none'
        ) {
          layer.visible = false;
        }
        if (
          layer.clipsContent &&
          (layer.ref.getBoundingClientRect().height < 1 ||
            layer.ref.getBoundingClientRect().width < 1)
        ) {
          layer.visible = false;
        }

        let id = layer.ref.dataset && layer.ref.dataset.__dom_id;
        let parent_id = id;
        if (!id) {
          if (!domCnt['cnt']) {
            domCnt['cnt'] = 1;
          } else {
            domCnt['cnt']++;
          }
          id = domCnt['cnt'];
          layer.ref.dataset.__dom_id = id;
          parent_id = id;
          if (layer.ref.tagName !== 'BODY') {
            let parentNode = layer.ref.parentElement;
            let findParent = false;
            while (parentNode && parentNode.tagName !== 'BODY' && !findParent) {
              if (parentNode.dataset && parentNode.dataset.__dom_id) {
                layer.ref.dataset.__parent_id = parentNode.dataset.__dom_id;
                parent_id = parentNode.dataset.__dom_id;
                findParent = true;
              } else {
                parentNode = parentNode.parentElement;
              }
            }
          }
        }
        // sel_id可能先用来找触发事件的obj,整个页面描述处理完成后再递归遍历删除
        targetObj.sel_id = id;
        targetObj.cnt_id = id;
        targetObj.parent_id = parent_id;

        layer.parent_id = parent_id.toString();
        layer.cnt_id = id.toString();
        layer.isInline = layerComputedStyle.display.includes('inline');

        handleComputedStyle.processOverflow({
          layer,
          computedStyle: layerComputedStyle,
        });

        recordExtraStyle({
          layer,
          computedStyle: layerComputedStyle,
          el: layer.ref,
        });

        if (layer.type == 'SVG') {
          // console.log("debug svg layer", layer);
          targetObj.svg = layer.svg;
        }
      } else {
        let parentRef = layer.ref.parentElement;
        // 增加记录selenium 节点id
        let id = parentRef.dataset && parentRef.dataset.__dom_id;
        let text_id = 0;
        let parent_id = 0;
        if (!id) {
          if (!domCnt['cnt']) {
            domCnt['cnt'] = 1;
          } else {
            domCnt['cnt']++;
          }
          id = domCnt['cnt'];
          text_id = domCnt['cnt'];
          parentRef.dataset.__dom_id = id;
          parent_id = id;
          if (parentRef.tagName !== 'BODY') {
            let parentNode = parentRef.parentElement;
            let findParent = false;
            while (parentNode.tagName !== 'BODY' && !findParent) {
              if (parentNode.dataset && parentNode.dataset.__dom_id) {
                parentRef.dataset.__parent_id = parentNode.dataset.__dom_id;
                parent_id = parentNode.dataset.__dom_id;
                findParent = true;
              } else {
                parentNode = parentNode.parentElement;
              }
            }
          }
        } else {
          domCnt['cnt']++;
          parent_id = id;
          text_id = domCnt['cnt'];
        }
        // sel_id可能先用来找触发事件的obj
        targetObj.sel_id = id;
        targetObj.cnt_id = text_id;
        targetObj.parent_id = parent_id;

        layer.parent_id = parent_id.toString();
        layer.cnt_id = text_id.toString();

        let computedStyles = getComputedStyle(parentRef, null);
        targetObj.fontSize = layer.fontSize;
        targetObj.fontFamily = layer.fontFamily;
        targetObj.characters = layer.characters;
        targetObj.textAlign = computedStyles.textAlign;
        targetObj.lineHeight = computedStyles.lineHeight;
        targetObj.fontColor = computedStyles.color;

        targetObj.css = parentRef.getAttribute('style');

        // 记录layer的textAlign属性
        layer.textAlign = computedStyles.textAlign;
        layer.whiteSpace = computedStyles.whiteSpace;

        // 不可见元素属性设置
        if (
          computedStyles.opacity == '0' ||
          computedStyles.visibility == 'hidden' ||
          computedStyles.display == 'none'
        ) {
          layer.visible = false;
        }
        // targetObj.className = parentRef.className;
        recordExtraStyle({
          layer,
          computedStyle: computedStyles,
          el: layer.ref,
        });
      }
      simpleStage.push(targetObj);
    }
    return simpleStage;
  }

  // 记录额外的style信息，方便编辑器中转相对定位时使用
  function recordExtraStyle({ layer, computedStyle, el }) {
    const {
      textAlign,
      whiteSpace,
      display,
      position,
      flex,
      float,
      boxShadow,
      lineHeight,
    } = computedStyle || {};
    let extraStyle = {
      textAlign,
      lineHeight,
      whiteSpace,
      display,
      position,
      flex,
    };
    // debug 字段（可删除）
    if (true) {
      let { tagName, className, id } = el || {};
      Object.assign(extraStyle, {
        tagName,
        ...(typeof id === 'string' && id ? { id } : { className }),
      });
    }

    switch (display) {
      case 'flex':
      case 'inline-flex':
        recordExtraStyle.getFlex({ extraStyle, computedStyle });
        break;
      case 'grid':
      case 'inline-grid':
        recordExtraStyle.getGrid({ extraStyle, computedStyle });
        break;
    }
    if (float !== 'none') {
      extraStyle.float = float;
    }
    if (boxShadow && boxShadow !== 'none') {
      extraStyle.boxShadow = boxShadow;
    }

    recordExtraStyle.getPointerEvents({ extraStyle, computedStyle });
    recordExtraStyle.getPadding({ extraStyle, computedStyle });
    recordExtraStyle.getMargin({ extraStyle, computedStyle });
    recordExtraStyle.getStickyPos({ extraStyle, computedStyle });
    recordExtraStyle.getBackgroundClip({ extraStyle, computedStyle });

    layer._extraStyle = extraStyle;
  }
  recordExtraStyle.getLayoutDirection = ({ computedStyle }) => {
    const { display, flexDirection, gridAutoFlow } = computedStyle;
    switch (display) {
      case 'flex':
      case 'inline-flex':
        return flexDirection;
      case 'grid':
      case 'inline-grid':
        return gridAutoFlow;
      default:
        return undefined;
    }
  };
  recordExtraStyle.getPadding = ({ extraStyle, computedStyle }) => {
    const { paddingTop, paddingRight, paddingBottom, paddingLeft } =
      computedStyle;
    if (paddingTop !== '0px') {
      extraStyle.paddingTop = paddingTop;
    }
    if (paddingRight !== '0px') {
      extraStyle.paddingRight = paddingRight;
    }
    if (paddingBottom !== '0px') {
      extraStyle.paddingBottom = paddingBottom;
    }
    if (paddingLeft !== '0px') {
      extraStyle.paddingLeft = paddingLeft;
    }
  };
  recordExtraStyle.getMargin = ({ extraStyle, computedStyle }) => {
    const { marginTop, marginRight, marginBottom, marginLeft } = computedStyle;
    if (marginTop !== '0px') {
      extraStyle.marginTop = marginTop;
    }
    if (marginRight !== '0px') {
      extraStyle.marginRight = marginRight;
    }
    if (marginBottom !== '0px') {
      extraStyle.marginBottom = marginBottom;
    }
    if (marginLeft !== '0px') {
      extraStyle.marginLeft = marginLeft;
    }
  };
  recordExtraStyle.getFlex = ({ extraStyle, computedStyle }) => {
    const {
      display,
      flexDirection,
      flexWrap,
      justifyContent,
      alignItems,
      alignContent,
      gap,
    } = computedStyle;

    extraStyle.flexDirection = flexDirection;
    extraStyle.flexWrap = flexWrap;

    if (justifyContent !== 'normal') {
      extraStyle.justifyContent = justifyContent;
    }
    if (alignItems !== 'normal') {
      extraStyle.alignItems = alignItems;
    }
    if (alignContent !== 'normal') {
      extraStyle.alignContent = alignContent;
    }
    if (gap !== 'normal') {
      extraStyle.gap = gap;
    }
  };
  recordExtraStyle.getGrid = ({ extraStyle, computedStyle }) => {
    const { display, gridTemplateColumns, gridTemplateRows, gridGap } =
      computedStyle;
    if (display === 'grid' || display === 'inline-grid') {
      extraStyle.gridTemplateColumns = gridTemplateColumns;
      extraStyle.gridTemplateRows = gridTemplateRows;
      extraStyle.gridAutoFlow = computedStyle.gridAutoFlow;
      extraStyle.gridGap = gridGap;
    }
  };
  recordExtraStyle.getPointerEvents = ({ extraStyle, computedStyle }) => {
    const { pointerEvents } = computedStyle;
    extraStyle.pointerEvents = pointerEvents;
  };
  recordExtraStyle.getStickyPos = ({ extraStyle, computedStyle }) => {
    const { position, top, left, right, bottom } = computedStyle;
    if (position === 'sticky') {
      if (top !== 'auto') {
        extraStyle.top = top;
      }
      if (left !== 'auto') {
        extraStyle.left = left;
      }
      if (right !== 'auto') {
        extraStyle.right = right;
      }
      if (bottom !== 'auto') {
        extraStyle.bottom = bottom;
      }
      // zIndex之前已经处理了，不需要通过额外样式记录
    }
  };
  recordExtraStyle.getBackgroundClip = ({ extraStyle, computedStyle }) => {
    const { backgroundClip } = computedStyle;
    if (backgroundClip === 'text') {
      extraStyle.backgroundClip = backgroundClip;
    }
  };
  // 文件节点遍历器：指定遍历的起始节点、节点类型过滤器
  function textNodesUnder(el) {
    let n = null;
    const a = [];
    const walk = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT, // 只显示文本节点
      null,
      false
    );
    while ((n = walk.nextNode())) {
      a.push(n);
    }
    return a;
  }
  // 判断节点是否隐藏
  function isHidden(element) {
    let el = element;
    let hasFixedPos = false;
    do {
      const computed = getComputedStyle(el);
      // contents布局跳过检测
      if (computed.display === 'contents') continue;

      if (computed.position === 'fixed') hasFixedPos = true;

      if (
        // open opacity for hidden check
        computed.opacity == '0' ||
        computed.display === 'none' ||
        computed.visibility === 'hidden'
      ) {
        return true;
      }
      // Some sites hide things by having overflow: hidden and height: 0, e.g. dropdown menus that animate height in
      // fixed 定位的节点下不会受到祖先节点的overflow:hidden的影响
      // static定位方式的节点overflow:hidden且高度为0的节点不会隐藏内部的节点内容
      if (
        !hasFixedPos &&
        computed.position !== 'static' &&
        computed.overflow !== 'visible' &&
        el.getBoundingClientRect().height < 1
      ) {
        return true;
      }
    } while ((el = el.parentElement));
    return false;
  }
  // 处理Picture节点
  function handlePictureNode({ el, fills, todoList, computedStyle }) {
    let { url, todoNode } = handlePictureNode.getSrc({ el }) || {};
    if (todoNode) todoList.push(todoNode);
    if (url) {
      fills.push({
        url,
        type: 'IMAGE',
        scaleMode: computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
        imageHash: null,
        isImage: true,
      });
    }
  }
  handlePictureNode.getUrl = ({ url }) => {
    if (!url) {
      return '';
    }
    let final = url.trim();
    if (final.startsWith('//')) {
      final = 'https:' + final;
    }
    if (final.startsWith('/')) {
      final = 'https://' + location.host + final;
    }
    return final;
  };
  handlePictureNode.getSrc = ({ el }) => {
    let url = null;
    let node;
    // 先获取source节点的图片，由第一个source节点大多数情况下是页面宽度最大情况下的图片
    const firstSource = el.querySelector('source');
    if (firstSource) {
      if (firstSource) {
        url = handlePictureNode.getUrl({
          url: handlePictureNode.getUrlFromSrcset({
            srcset: firstSource.srcset,
          }),
        });
        node = firstSource;
      }
    }
    if (!url) {
      const img = el.querySelector('img');
      // 获取图片的src
      let u = handleImageNode.getUrl({ el: img });
      url = handlePictureNode.getUrl({ url: u });
      node = img;
    }

    if (url) {
      if (handlePictureNode.canMergePictureChild({ child: node, el })) {
        return { url };
      } else {
        return { todoNode: node };
      }
    }
    return {};
  };
  handlePictureNode.canMergePictureChild = ({ el, child }) => {
    let computedStyle = getComputedStyle(child);
    let { position } = computedStyle || {};
    let abs = ['fixed', 'absolute'].includes(position);
    if (abs) return false;
    let cRect = child.getBoundingClientRect();
    let eRect = el.getBoundingClientRect();
    // 如果图片节点的宽高和picture父节点的宽高不一致，就不合并
    return !(
      cRect.width &&
      cRect.height &&
      (cRect.width != eRect.width || cRect.height != eRect.height)
    );
  };
  handlePictureNode.getUrlFromSrcset = ({ srcset }) => {
    return srcset.split(/\s.*?[,]+\s/g)[0];
  };
  // 处理SVG节点
  function handleSvgNode({ el, layers, getBoundingClientRect }) {
    const rect = getBoundingClientRect(el);
    let { left, top, width, height } = rect || {};
    let computedStyle = getComputedStyle(el);
    let { fill, color } = computedStyle || {};
    // TODO: pull in CSS/computed styles
    // TODO: may need to pull in layer styles too like shadow, bg color, etc
    let layer = {
      type: 'SVG',
      ref: el,
      svg: el.outerHTML,
      isSVG: true,
      isRawSVG: true,
      x: parseFloat(left),
      y: parseFloat(top),
      width: parseFloat(width),
      height: parseFloat(height),
    };
    let cloneNode;
    // 设置填充样式
    if (fill && fill !== 'rgb(0, 0, 0)') {
      cloneNode = cloneNode || el.cloneNode(true);
      cloneNode.setAttribute('fill', fill);
    }
    if (color && color !== 'rgb(0, 0, 0)') {
      cloneNode = cloneNode || el.cloneNode(true);
      cloneNode.setAttribute('color', color);
    }
    if (cloneNode) {
      layer.svg = cloneNode.outerHTML;
    }

    layers.push(layer);
  }
  // 处理输入框节点
  function handleInputNode({ el, rectNode, computedStyle }) {
    rectNode.type = 'INPUT';
    if (el.value) rectNode.value = el.value;
    rectNode.inputType = el.type;
    if (el.type === 'submit') {
      handleComputedStyle.processFont({ rectNode, computedStyle });
    }

    // 输入框字体颜色
    if (computedStyle.color) {
      const rgb = getRgb(computedStyle.color);
      if (rgb) {
        rectNode.fontColorFills = [
          {
            type: 'SOLID',
            color: {
              r: rgb.r,
              g: rgb.g,
              b: rgb.b,
            },
            opacity: rgb.a || 1,
          },
        ];
      }
    }
    // placeholder不存在就设置为空
    rectNode.placeholder = el.placeholder ? el.placeholder : '';
    let placeholderComputedStyle = getComputedStyle(el, '::placeholder');
    // placeholder字体颜色
    if (placeholderComputedStyle.color) {
      rectNode.placeholderColor = placeholderComputedStyle.color;
    }
    // Padding
    if (computedStyle.paddingLeft !== '0px') {
      rectNode.paddingLeft = parseUnits(computedStyle.paddingLeft).value || 0;
    }
    if (computedStyle.paddingRight !== '0px') {
      rectNode.paddingRight = parseUnits(computedStyle.paddingRight).value || 0;
    }
    if (computedStyle.paddingTop !== '0px') {
      rectNode.paddingTop = parseUnits(computedStyle.paddingTop).value || 0;
    }
    if (computedStyle.paddingBottom !== '0px') {
      rectNode.paddingBottom =
        parseUnits(computedStyle.paddingBottom).value || 0;
    }
  }
  // 处理Image节点
  function handleImageNode({ el, computedStyle, rectNode }) {
    let { fills, width, height } = rectNode || {};
    const url = handlePictureNode.getUrl({
      url: handleImageNode.getUrl({ el }),
    });
    if (url) {
      let scaleMode;
      switch (computedStyle.objectFit) {
        case 'cover':
          // TODO...
          let aspect = width / height;
          scaleMode = aspect > 1 ? 'FIT' : 'FILL';
          break;
        case 'contain':
          scaleMode = 'FIT';
          break;
        default:
          scaleMode = 'FILL';
          break;
      }

      fills.push({
        url,
        type: 'IMAGE',
        scaleMode,
        imageHash: null,
        isImage: true,
      });
    }
  }
  handleImageNode.getUrl = ({ el }) => {
    return (
      el?.src ||
      (el?.srcset
        ? handlePictureNode.getUrlFromSrcset({
            srcset: el.srcset,
          })
        : '')
    );
  };
  // 处理select节点
  function handleSelectNode({ el, rectNode, computedStyle }) {
    rectNode.type = 'TEXT'; // 显示为一个文本
    rectNode.options = Array.from(el.options).map((option) => {
      return {
        value: option.value,
        label: option.text,
        selected: option.selected,
      };
    });
    rectNode.characters = el.options[el.selectedIndex].text;
    // 字体颜色
    handleComputedStyle.processColor({ rectNode, computedStyle });
    // 字体大小
    handleComputedStyle.processFontSize({ rectNode, computedStyle });
    rectNode.textAlignVertical = 'CENTER'; // 垂直居中
    rectNode.paddingLeft = parseUnits(computedStyle.paddingLeft).value || 0;
    rectNode.layoutMode = 'HORIZONTAL'; // 水平布局
  }
  // 处理IFrame节点
  function handleIframeNode({ el, rectNode, computedStyle }) {
    rectNode.type = 'IFRAME';
    rectNode.src = el.src;
  }

  // 获取rgb颜色值
  function getRgb(colorString) {
    if (!colorString) {
      return null;
    }
    const [_1, r, g, b, _2, a] =
      colorString.match(
        /rgba?\(([\d\.]+), ([\d\.]+), ([\d\.]+)(, ([\d\.]+))?\)/
      ) || [];
    const none = a && parseFloat(a) === 0;
    if (r && g && b && !none) {
      return {
        r: parseInt(r) / 255,
        g: parseInt(g) / 255,
        b: parseInt(b) / 255,
        a: a ? parseFloat(a) : 1,
      };
    }
    return null;
  }
  // 处理计算样式
  function handleComputedStyle({}) {
    // TODO...
  }
  handleComputedStyle.processContent = ({ content, fills }) => {
    const urlMatch = content.match(/url\(['"]?(.*?)['"]?\)/);
    const url = urlMatch && urlMatch[1];
    if (!url) return;
    fills.push({
      url,
      type: 'IMAGE',
      scaleMode: 'FILL',
      imageHash: null,
    });
  };
  handleComputedStyle.processBoxShadow = ({ rectNode, computedStyle, el }) => {
    const LENGTH_REG = /^[0-9]+[a-zA-Z%]+?$/;
    const toNum = (v) => {
      if (!/px$/.test(v) && v !== '0') return 0;
      const n = parseFloat(v);
      return !isNaN(n) ? n : 0;
    };
    const isLength = (v) => v === '0' || LENGTH_REG.test(v);
    const parseValue = (str) => {
      // TODO: this is broken for multiple box shadows
      if (str.startsWith('rgb')) {
        const colorMatch = str.match(/(rgba?\(.+?\))(.+)/);
        if (colorMatch) {
          str = (colorMatch[2] + ' ' + colorMatch[1]).trim();
        }
      }
      const PARTS_REG = /\s(?![^(]*\))/;
      const parts = str.split(PARTS_REG);
      const inset = parts.includes('inset');
      const last = parts.slice(-1)[0];
      const color = !isLength(last) ? last : 'rgba(0, 0, 0, 1)';
      const nums = parts
        .filter((n) => n !== 'inset')
        .filter((n) => n !== color)
        .map(toNum);
      const [offsetX, offsetY, blurRadius, spreadRadius] = nums;
      return {
        inset,
        offsetX,
        offsetY,
        blurRadius,
        spreadRadius,
        color,
      };
    };
    const parsed = parseValue(computedStyle.boxShadow);
    const color = getRgb(parsed.color);
    if (color) {
      rectNode.effects = [
        {
          color,
          type: 'BOX_SHADOW',
          radius: parsed.blurRadius,
          blendMode: 'NORMAL',
          visible: true,
          offset: {
            x: parsed.offsetX,
            y: parsed.offsetY,
          },
        },
      ];
    }
  };
  handleComputedStyle.processColor = ({ rectNode, computedStyle }) => {
    const color = getRgb(computedStyle.color);
    if (color) {
      rectNode.fills = [
        {
          type: 'SOLID',
          color,
          opacity: color.a || 1,
        },
      ];
    }
  };
  handleComputedStyle.processFontSize = ({ rectNode, computedStyle }) => {
    const fontSize = parseUnits(computedStyle.fontSize);
    if (fontSize) {
      rectNode.fontSize = parseFloat(fontSize.value);
    }
  };
  handleComputedStyle.processFont = ({ rectNode, computedStyle }) => {
    const { fontSize, fontFamily, fontWeight, textDecoration, textAlign } =
      computedStyle;
    handleComputedStyle.processFontSize({ rectNode, computedStyle });
    if (fontWeight) {
      rectNode.fontWeight = fontWeight;
    }
    if (fontFamily) {
      rectNode.fontFamily = fontFamily;
    }
    if (['underline', 'strikethrough'].includes(textDecoration)) {
      rectNode.textDecoration = textDecoration.toUpperCase();
    }
    if (['left', 'center', 'right', 'justified'].includes(textAlign)) {
      rectNode.textAlignHorizontal = textAlign.toUpperCase();
    }
  };
  handleComputedStyle.processLetterSpacing = ({ rectNode, computedStyle }) => {
    const letterSpacing = parseUnits(computedStyle.letterSpacing);
    if (letterSpacing) {
      rectNode.letterSpacing = letterSpacing;
    }
  };
  handleComputedStyle.processTextTransform = ({ rectNode, computedStyle }) => {
    const { textTransform } = computedStyle;
    switch (textTransform) {
      case 'uppercase': {
        rectNode.textCase = 'UPPER';
        break;
      }
      case 'lowercase': {
        rectNode.textCase = 'LOWER';
        break;
      }
      case 'capitalize': {
        rectNode.textCase = 'TITLE';
        break;
      }
    }
  };
  handleComputedStyle.processOverflow = ({ layer, computedStyle }) => {
    let { overflowX, overflowY } = computedStyle || {};
    // 横向或者纵向为hidden的，才确定为需要剪切内容
    layer.clipsContent =
      ['hidden', 'scroll', 'auto'].includes(overflowX) ||
      ['hidden', 'scroll', 'auto'].includes(overflowY);
    // 记录仅X轴滚动或者仅Y轴滚动
    layer.clipsContentScrollX = overflowX === 'scroll';
    layer.clipsContentScrollY = ['scroll', 'auto'].includes(overflowY);
  };
  handleComputedStyle.processBackgroundImage = ({
    rectNode,
    computedStyle,
  }) => {
    const {
      backgroundImage,
      backgroundSize,
      backgroundPosition,
      backgroundOrigin,
      backgroundRepeat,
      backgroundClip,
    } = computedStyle || {};
    const { fills } = rectNode;
    const urlMatch = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
    const url = urlMatch && urlMatch[1];
    rectNode.backgroundStyles = [];
    if (backgroundClip && backgroundClip !== 'border-box') {
      rectNode.backgroundStyles.push({
        name: 'backgroundClip',
        value: backgroundClip,
      });
      // TODO: 对于text类型，需要设置color为透明
      // if (backgroundClip === 'text') {
      //   rectNode.backgroundStyles.push({
      //     name: 'color',
      //     value: 'rgba(0,0,0,0) !important',
      //   });
      // }
    }
    if (url) {
      fills.push({
        url,
        type: 'IMAGE',
        scaleMode: backgroundSize === 'contain' ? 'FIT' : 'FILL',
        imageHash: null,
      });
      if (backgroundPosition && backgroundPosition !== '50% 50%') {
        rectNode.backgroundStyles.push({
          name: 'backgroundPosition',
          value: backgroundPosition,
        });
      }
      if (backgroundSize && backgroundSize !== 'cover') {
        rectNode.backgroundStyles.push({
          name: 'backgroundSize',
          value: backgroundSize,
        });
      }
      if (backgroundOrigin && backgroundOrigin !== 'padding-box') {
        rectNode.backgroundStyles.push({
          name: 'backgroundOrigin',
          value: backgroundOrigin,
        });
      }
      if (backgroundRepeat && backgroundRepeat !== 'no-repeat') {
        rectNode.backgroundStyles.push({
          name: 'backgroundRepeat',
          value: backgroundRepeat,
        });
      }
    } else {
      const gradientMatch = backgroundImage.match(/gradient/);
      if (gradientMatch) {
        rectNode.backgroundStyles.push({
          name: 'backgroundImage',
          value: backgroundImage,
        });
      }
    }
  };
  handleComputedStyle.processBorderRadius = ({ rectNode, computedStyle }) => {
    const borderTopLeftRadius = getCornerRadius({
      radius: computedStyle.borderTopLeftRadius,
    });
    if (borderTopLeftRadius && borderTopLeftRadius.value) {
      rectNode.cornerRadius = 'figma.mixed';
      rectNode.topLeftRadius = borderTopLeftRadius.value;
    }
    const borderTopRightRadius = getCornerRadius({
      radius: computedStyle.borderTopRightRadius,
    });
    if (borderTopRightRadius && borderTopRightRadius.value) {
      rectNode.cornerRadius = 'figma.mixed';
      rectNode.topRightRadius = borderTopRightRadius.value;
    }
    const borderBottomRightRadius = getCornerRadius({
      radius: computedStyle.borderBottomRightRadius,
    });
    if (borderBottomRightRadius && borderBottomRightRadius.value) {
      rectNode.cornerRadius = 'figma.mixed';
      rectNode.bottomRightRadius = borderBottomRightRadius.value;
    }
    const borderBottomLeftRadius = getCornerRadius({
      radius: computedStyle.borderBottomLeftRadius,
    });
    if (borderBottomLeftRadius && borderBottomLeftRadius.value) {
      rectNode.cornerRadius = 'figma.mixed';
      rectNode.bottomLeftRadius = borderBottomLeftRadius.value;
    }
  };

  // 像素位置转换
  function parseUnits(str) {
    if (!str) {
      return null;
    }
    const match = str.match(/([\d\.]+)px/);
    const val = match && match[1];
    if (val) {
      return {
        unit: 'PIXELS',
        value: parseFloat(val),
      };
    }
    return null;
  }
  // 获取边框圆角
  function getCornerRadius({ radius }) {
    let v = parseUnits(radius);
    if (!v) {
      const match = radius.match(/([\d\.]+)%/);
      if (match) {
        v = {
          unit: 'PERCENT',
          value: radius,
        };
      }
    }
    return v;
  }

  // 从当前元素开始，递归地寻找所有 Shadow DOM 内的元素
  function getShadowEls(el) {
    var _a;
    return Array.from(
      ((_a = el.shadowRoot) === null || _a === void 0
        ? void 0
        : _a.querySelectorAll('*')) || []
    ).reduce((memo, el) => {
      memo.push(el);
      memo.push(...getShadowEls(el));
      return memo;
    }, []);
  }

  return htmlToFigma(paramArg || document.body);
}
