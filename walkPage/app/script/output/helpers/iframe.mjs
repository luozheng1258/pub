import { convertBaseProps } from './utils/baseProps.mjs';

function genIframeNode({ node, env, parent }) {
  const target = {
    type: 'ih5-web-view',
    props: {
      src: node.src,
    },
    uis: {
      name: node.name,
    },
    children: [],
    envs: ['abs'],
  };

  convertBaseProps({ target, node, env, parent });

  return target;
}

export { genIframeNode };
