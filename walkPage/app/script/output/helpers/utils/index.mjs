function isEmptyContainer({ node, target, parent }) {
  const { children, _extraStyle } = node || {};
  const { children: parentChildren } = parent || {};
  const { styleList } = target || {};
  const { borderWidth, bgColor, width, height } = target?.props || {};
  // 排除自定义样式中存在背景图片的情况
  let existBgImg = styleList?.find((item) => item.name === 'backgroundImage');
  if (existBgImg) {
    return false;
  }

  // 检查是否为空容器，如果是空容器则进行移除
  // 条件1 没有子节点
  let index = parentChildren?.findIndex((item) => item === node);
  if (
    children?.length == 0 &&
    (index === parentChildren?.length - 1 ||
      _extraStyle.position === 'absolute')
  ) {
    // 条件2 没有边框宽度
    if (borderWidth == 0) {
      // 条件3 没有背景色
      if (!bgColor) {
        return true;
      }
      // 或者背景色为透明
      if (bgColor.match(/rgba\(.*?,0\)/)) {
        return true;
      }
      // 或者宽度为0 , 或者高度为0
      if (width == 0 || height == 0) {
        return true;
      }
    }
  }
}

export { isEmptyContainer };
