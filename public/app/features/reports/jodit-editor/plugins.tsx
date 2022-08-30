export const templatingPlugin = (params: any, name: string, tooltip: string, icon?: string, template?: string): any => {
  return {
    name,
    tooltip,
    icon,
    exec: (jodit: any, _: any, options: any) => {
      if (options?.control?.args) {
        var key = options.control.args[0];
        jodit.s.insertNode(jodit.c.text(`{${key}}`));
      }
    },
    list: params,
    ...(template
      ? {
          template: (_: any, __: any) => {
            return `<div> ${template} </div>`;
          },
        }
      : {}),
  };
};
