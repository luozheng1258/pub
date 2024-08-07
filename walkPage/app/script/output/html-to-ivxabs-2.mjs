export default function walkPage(paramArg) {
  function htmlToFigma(
    selector = document.body,
    useFrames = false,
    time = false,
    includeMetadata = false
  ) {
    !window.domCnt && (window.domCnt = {});
    let bodyDeltaY = document.body.getBoundingClientRect().y;
    // function getDirectionMostOfElements(direction, elements) {
    //     if (elements.length === 1) {
    //         return elements[0];
    //     }
    //     return elements.reduce((memo, value) => {
    //         if (!memo) {
    //             return value;
    //         }
    //         if (direction === "left" || direction === "top") {
    //             if (
    //                 getBoundingClientRect(value)[direction] <
    //                 getBoundingClientRect(memo)[direction]
    //             ) {
    //                 return value;
    //             }
    //         } else {
    //             if (
    //                 getBoundingClientRect(value)[direction] >
    //                 getBoundingClientRect(memo)[direction]
    //             ) {
    //                 return value;
    //             }
    //         }
    //         return memo;
    //     }, null);
    // }

    // function getAggregateRectOfElements(elements) {
    //     if (!elements.length) {
    //         return null;
    //     }
    //     const top = getBoundingClientRect(
    //         getDirectionMostOfElements("top", elements)
    //     ).top;
    //     const left = getBoundingClientRect(
    //         getDirectionMostOfElements("left", elements)
    //     ).left;
    //     const bottom = getBoundingClientRect(
    //         getDirectionMostOfElements("bottom", elements)
    //     ).bottom;
    //     const right = getBoundingClientRect(
    //         getDirectionMostOfElements("right", elements)
    //     ).right;
    //     const width = right - left;
    //     const height = bottom - top;
    //     return {
    //         top,
    //         left,
    //         bottom,
    //         right,
    //         width,
    //         height,
    //     };
    // }

    function getBoundingClientRect(el) {
      // 因为读取的全是绝对定位位置，所以目前不需要对inline模式做额外区分
      // const computed = getComputedStyle(el);
      // const display = computed.display;
      // if (display && display.includes("inline") && el.children.length) {
      //     const elRect = el.getBoundingClientRect();
      //     const aggregateRect = getAggregateRectOfElements(Array.from(el.children));
      //     if (
      //         elRect.width > aggregateRect.width ||
      //         elRect.height > aggregateRect.height
      //     ) {
      //         return Object.assign(Object.assign({}, aggregateRect), {
      //             width: elRect.width,
      //             left: elRect.left,
      //             right: elRect.right,
      //         });
      //     }
      //     return aggregateRect;
      // }
      let rect = el.getBoundingClientRect();
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

    function size(obj) {
      // return Object.keys(obj).length;
      // 保留所有层div等容器，不再根据默认样式进行过滤
      return true;
    }
    const layers = [];

    const ivxLayers = [];
    const el =
      selector instanceof HTMLElement
        ? selector
        : document.querySelector(selector || 'body');

    function textNodesUnder(el) {
      let n = null;
      const a = [];
      const walk = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      while ((n = walk.nextNode())) {
        a.push(n);
      }
      return a;
    }
    const getUrl = (url) => {
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
    const parseUnits = (str) => {
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
    };

    function isHidden(element) {
      let el = element;
      let elType = el.tagName;
      let computedElStyle = getComputedStyle(el);
      let bgCOlor = computedElStyle.backgroundColor;
      let borderWidth = computedElStyle.borderWidth;
      // 检查元素自身，如果是透明的div而且不需要记录绑定事件的,那就不用将其记录
      // if (el.dataset.events) {
      //   return false;
      // }
      // if (
      //   elType === "DIV" &&
      //   bgCOlor === "rgba(0, 0, 0, 0)" &&
      //   borderWidth === "0px"
      // ) {
      //   return true;
      // }
      ///////////////////////////////////////////////////////////////////
      do {
        const computed = getComputedStyle(el);
        if (
          // open opacity for hidden check
          computed.opacity == '0' ||
          computed.display === 'none' ||
          computed.visibility === 'hidden'
        ) {
          return true;
        }
        // Some sites hide things by having overflow: hidden and height: 0, e.g. dropdown menus that animate height in
        if (
          computed.overflow !== 'visible' &&
          el.getBoundingClientRect().height < 1
        ) {
          return true;
        }
      } while ((el = el.parentElement));
      return false;
    }

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
      const getShadowEls = (el) => {
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
      };
      const els = Array.from(el.querySelectorAll('*')).reduce((memo, el) => {
        memo.push(el);
        memo.push(...getShadowEls(el));
        return memo;
      }, []);

      if (els) {
        Array.from(els).forEach((el) => {
          // if (isHidden(el)) {
          //   return;
          // }
          if (el instanceof SVGSVGElement) {
            const rect = getBoundingClientRect(el);

            // rect.top = rect.top - bodyDeltaY

            // TODO: pull in CSS/computed styles
            // TODO: may need to pull in layer styles too like shadow, bg color, etc
            layers.push({
              type: 'SVG',
              ref: el,
              svg: el.outerHTML,
              isSVG: true,
              isRawSVG: true,
              x: parseFloat(rect.left),
              y: parseFloat(rect.top),
              width: parseFloat(rect.width),
              height: parseFloat(rect.height),
            });

            // todo ivxLayers
            return;
          }
          // Sub SVG Eleemnt
          else if (el instanceof SVGElement) {
            return;
          }
          if (
            el.parentElement &&
            el.parentElement instanceof HTMLPictureElement
          ) {
            return;
          }
          const appliedStyles = getAppliedComputedStyles(el);
          const computedStyle = getComputedStyle(el);
          if (
            size(appliedStyles) ||
            el instanceof HTMLImageElement ||
            el instanceof HTMLPictureElement ||
            el instanceof HTMLVideoElement
          ) {
            const rect = getBoundingClientRect(el);
            if (rect.width >= 0 && rect.height >= 0) {
              const fills = [];
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
              if (el.className && el.className.split(' ')[0] === 'ace-btn') {
                debugger;
              }

              if (includeMetadata) {
                rectNode.meta = { originalStyles: appliedStyles };
              }

              // if (computedStyle.border) {
              //     const parsed = computedStyle.border.match(
              //         /^([\d\.]+)px\s*(\w+)\s*(.*)$/
              //     );
              //     if (parsed) {
              //         let [_match, width, type, color] = parsed;
              //         if (width && width !== "0" && type !== "none" && color) {
              //             const rgb = getRgb(color);
              //             if (rgb) {
              //                 rectNode.strokes = [
              //                     {
              //                         type: "SOLID",
              //                         color: { r: rgb.r, b: rgb.b, g: rgb.g },
              //                         opacity: rgb.a || 1,
              //                     },
              //                 ];
              //                 rectNode.strokeWeight = parseFloat(parseFloat(width));
              //             }
              //         }
              //     }
              // }
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
                      rectNode.strokeRightWeight = parseFloat(
                        parseFloat(width)
                      );
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
                      rectNode.strokeBottomWeight = parseFloat(
                        parseFloat(width)
                      );
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

              if (
                computedStyle.backgroundImage &&
                computedStyle.backgroundImage !== 'none'
              ) {
                const urlMatch = computedStyle.backgroundImage.match(
                  /url\(['"]?(.*?)['"]?\)/
                );
                const url = urlMatch && urlMatch[1];
                if (url) {
                  fills.push({
                    url,
                    type: 'IMAGE',
                    // TODO: backround size, position
                    scaleMode:
                      computedStyle.backgroundSize === 'contain'
                        ? 'FIT'
                        : 'FILL',
                    imageHash: null,
                  });
                  rectNode.backgroundStyles = [];
                  if (
                    computedStyle.backgroundPosition &&
                    computedStyle.backgroundPosition !== '50% 50%'
                  ) {
                    rectNode.backgroundStyles.push({
                      name: 'backgroundPosition',
                      value: computedStyle.backgroundPosition,
                    });
                  }
                  if (
                    computedStyle.backgroundSize &&
                    computedStyle.backgroundSize !== 'cover'
                  ) {
                    rectNode.backgroundStyles.push({
                      name: 'backgroundSize',
                      value: computedStyle.backgroundSize,
                    });
                  }
                  if (
                    computedStyle.backgroundOrigin &&
                    computedStyle.backgroundOrigin !== 'padding-box'
                  ) {
                    rectNode.backgroundStyles.push({
                      name: 'backgroundOrigin',
                      value: computedStyle.backgroundOrigin,
                    });
                  }
                  if (
                    computedStyle.backgroundRepeat &&
                    computedStyle.backgroundRepeat !== 'no-repeat'
                  ) {
                    rectNode.backgroundStyles.push({
                      name: 'backgroundRepeat',
                      value: computedStyle.backgroundRepeat,
                    });
                  }
                } else {
                  const gradientMatch =
                    computedStyle.backgroundImage.match(/gradient/);
                  if (gradientMatch) {
                    rectNode.backgroundStyles = [];
                    rectNode.backgroundStyles.push({
                      name: 'backgroundImage',
                      value: computedStyle.backgroundImage,
                    });
                  }
                }
              }
              if (el instanceof SVGSVGElement) {
                const url = `data:image/svg+xml,${encodeURIComponent(
                  el.outerHTML.replace(/\s+/g, ' ')
                )}`;
                if (url) {
                  fills.push({
                    url,
                    type: 'IMAGE',
                    // TODO: object fit, position
                    scaleMode: 'FILL',
                    imageHash: null,
                  });
                }
              }
              if (el instanceof HTMLImageElement) {
                const url = el.src;
                if (url) {
                  fills.push({
                    url,
                    type: 'IMAGE',
                    // TODO: object fit, position
                    scaleMode:
                      computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
                    imageHash: null,
                    isImage: true,
                  });
                }
              }
              if (el instanceof HTMLPictureElement) {
                const firstSource = el.querySelector('source');
                if (firstSource) {
                  const src = getUrl(firstSource.srcset.split(/[,\s]+/g)[0]);
                  // TODO: if not absolute
                  if (src) {
                    fills.push({
                      url: src,
                      type: 'IMAGE',
                      // TODO: object fit, position
                      scaleMode:
                        computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
                      imageHash: null,
                      isImage: true,
                    });
                  }
                }
              }
              if (el instanceof HTMLVideoElement) {
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
              }
              if (
                computedStyle.boxShadow &&
                computedStyle.boxShadow !== 'none'
              ) {
                const LENGTH_REG = /^[0-9]+[a-zA-Z%]+?$/;
                const toNum = (v) => {
                  // if (!/px$/.test(v) && v !== '0') return v;
                  if (!/px$/.test(v) && v !== '0') return 0;
                  const n = parseFloat(v);
                  // return !isNaN(n) ? n : v;
                  return !isNaN(n) ? n : 0;
                };
                const isLength = (v) => v === '0' || LENGTH_REG.test(v);
                const parseValue = (str) => {
                  // TODO: this is broken for multiple box shadows
                  if (str.startsWith('rgb')) {
                    // Werid computed style thing that puts the color in the front not back
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
              }
              const borderTopLeftRadius = parseUnits(
                computedStyle.borderTopLeftRadius
              );
              if (borderTopLeftRadius && borderTopLeftRadius.value) {
                rectNode.cornerRadius = 'figma.mixed';
                rectNode.topLeftRadius = borderTopLeftRadius.value;
              }
              const borderTopRightRadius = parseUnits(
                computedStyle.borderTopRightRadius
              );
              if (borderTopRightRadius && borderTopRightRadius.value) {
                rectNode.cornerRadius = 'figma.mixed';
                rectNode.topRightRadius = borderTopRightRadius.value;
              }
              const borderBottomRightRadius = parseUnits(
                computedStyle.borderBottomRightRadius
              );
              if (borderBottomRightRadius && borderBottomRightRadius.value) {
                rectNode.cornerRadius = 'figma.mixed';
                rectNode.bottomRightRadius = borderBottomRightRadius.value;
              }
              const borderBottomLeftRadius = parseUnits(
                computedStyle.borderBottomLeftRadius
              );
              if (borderBottomLeftRadius && borderBottomLeftRadius.value) {
                rectNode.cornerRadius = 'figma.mixed';
                rectNode.bottomLeftRadius = borderBottomLeftRadius.value;
              }
              layers.push(rectNode);
            }
          }
        });
      }
      const textNodes = textNodesUnder(el);

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
      const fastClone = (data) =>
        typeof data === 'symbol' ? null : JSON.parse(JSON.stringify(data));
      for (const node of textNodes) {
        // debugger;
        if (node.textContent && node.textContent.trim().length) {
          const parent = node.parentElement;
          if (parent) {
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
            if (lineHeight && rect.height < lineHeight.value) {
              const delta = lineHeight.value - rect.height;
              rect.top -= delta / 2;
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
            }
            if (fills.length) {
              textNode.fills = fills;
            }
            const letterSpacing = parseUnits(computedStyles.letterSpacing);
            if (letterSpacing) {
              textNode.letterSpacing = letterSpacing;
            }
            if (lineHeight) {
              textNode.lineHeight = lineHeight;
            }
            const { textTransform } = computedStyles;
            switch (textTransform) {
              case 'uppercase': {
                textNode.textCase = 'UPPER';
                break;
              }
              case 'lowercase': {
                textNode.textCase = 'LOWER';
                break;
              }
              case 'capitalize': {
                textNode.textCase = 'TITLE';
                break;
              }
            }
            const fontSize = parseUnits(computedStyles.fontSize);
            if (fontSize) {
              textNode.fontSize = parseFloat(fontSize.value);
            }
            if (computedStyles.fontFamily) {
              // const font = computedStyles.fontFamily.split(/\s*,\s*/);
              textNode.fontFamily = computedStyles.fontFamily;
            }
            if (computedStyles.textDecoration) {
              if (
                computedStyles.textDecoration === 'underline' ||
                computedStyles.textDecoration === 'strikethrough'
              ) {
                textNode.textDecoration =
                  computedStyles.textDecoration.toUpperCase();
              }
            }
            if (computedStyles.textAlign) {
              if (
                ['left', 'center', 'right', 'justified'].includes(
                  computedStyles.textAlign
                )
              ) {
                textNode.textAlignHorizontal =
                  computedStyles.textAlign.toUpperCase();
              }
            }
            layers.push(textNode);
          }
        }
      }
    }
    // TODO: send frame: { children: []}
    const root = {
      type: 'FRAME',
      width: parseFloat(window.innerWidth),
      height: parseFloat(document.documentElement.scrollHeight),
      x: 0,
      y: 0,
      ref: document.body,
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

        if (layerComputedStyle.position === 'fixed') {
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
        // 增加记录selenium 节点id
        // let id = layer.ref.dataset && layer.ref.dataset.__webdriver_id;
        let id = layer.ref.dataset && layer.ref.dataset.__dom_id;
        let parent_id = id;
        if (!id) {
          // if (!domCnt[layer.ref.tagName]) {
          //   domCnt[layer.ref.tagName] = 1;
          // } else {
          //   domCnt[layer.ref.tagName]++;
          // }
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
            while (parentNode.tagName !== 'BODY' && !findParent) {
              if (parentNode.dataset && parentNode.dataset.__dom_id) {
                layer.ref.dataset.__parent_id = parentNode.dataset.__dom_id;
                parent_id = parentNode.dataset.__dom_id;
                findParent = true;
              } else {
                parentNode = parentNode.parentElement;
              }
            }
          }

          // id = layer.ref.tagName + "_" + domCnt[layer.ref.tagName];
          // layer.ref.dataset.__dom_id = id;
        }
        // sel_id可能先用来找触发事件的obj,整个页面描述处理完成后再递归遍历删除
        targetObj.sel_id = id;
        targetObj.cnt_id = id;
        targetObj.parent_id = parent_id;

        layer.parent_id = parent_id.toString();
        layer.cnt_id = id.toString();
        layer.isInline = layerComputedStyle.display.includes('inline');
        // 横向或者纵向为hidden的，才确定为需要剪切内容
        layer.clipsContent =
          layerComputedStyle.overflowX == 'hidden' ||
          layerComputedStyle.overflowY == 'hidden';
        // 记录仅X轴滚动或者仅Y轴滚动
        layer.clipsContentScrollX = layerComputedStyle.overflowX === 'scroll';
        layer.clipsContentScrollY = layerComputedStyle.overflowY === 'scroll';

        recordExtraStyle({ layer, computedStyle: layerComputedStyle });

        if (layer.ref.tagName === 'INPUT') {
          layer.type = 'INPUT';
          if (layer.ref.placeholder) {
            layer.placeholder = layer.ref.placeholder;
          }
          if (layer.ref.value) {
            layer.value = layer.ref.value;
          }
          if (layerComputedStyle.color) {
            const rgb = getRgb(layerComputedStyle.color);
            if (rgb) {
              layer.fontColorFills = [
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
        }
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
          // if (!domCnt[parentRef.tagName]) {
          //   domCnt[parentRef.tagName] = 1;
          // } else {
          //   domCnt[parentRef.tagName]++;
          // }
          // // id = Math.random().toString(36).substring(2) + Date.now().toString(36);
          // id = parentRef.tagName + "_" + domCnt[parentRef.tagName];
          // parentRef.dataset.__dom_id = id;
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
      }
      simpleStage.push(targetObj);
    }
    return simpleStage;
  }

  // 记录额外的style信息，方便编辑器中转相对定位时使用
  function recordExtraStyle({ layer, computedStyle }) {
    const {
      textAlign,
      whiteSpace,
      display,
      position,
      flex,
      float,
      pointerEvents,
    } = computedStyle || {};
    let extraStyle = {
      textAlign,
      whiteSpace,
      display,
      position,
      flex,
    };
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
    if (pointerEvents !== 'auto') {
      extraStyle.pointerEvents = pointerEvents;
    }

    recordExtraStyle.getPadding({ extraStyle, computedStyle });
    recordExtraStyle.getMargin({ extraStyle, computedStyle });

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

  return htmlToFigma(paramArg || document.body);
}
