require('./rich-text-editor.css');

import { filterIcon } from './icons/icons';
import { templatingPlugin } from './plugins';
import { config } from 'app/core/config';

const templatingVariables = () => {
  return {
    reportName: 'Report name',
    description: 'Description ',
    currentDate: 'Current date',
    startsFrom: 'Start date',
    endsAt: 'End date',
  };
};

const templatingDashboardVariables = (filters?: any[]) => {
  let templateList = {};
  if (filters) {
    var filterMap = filters
      .map((e: any) => {
        var key = e.label;
        var value = e.value;
        return { key, value };
      })
      .reduce((map: any, obj: any) => {
        map[obj.value] = obj.key;
        return map;
      }, {});
    templateList = {
      ...filterMap,
    };
  }
  return templateList;
};

export const subjectEditorConfig = (defaultOptions: any, filters?: any[]): any => {
  const { theme } = config;
  const currentTheme = theme.isDark ? 'dark' : 'default';
  return {
    ...defaultOptions,
    theme: currentTheme,
    showTooltip: true,
    spellcheck: false,
    dialog: {
      theme: currentTheme,
    },
    limitChars: 60,
    extraButtons: [
      templatingPlugin(templatingVariables(), 'templating', 'Templating', 'source'),
      templatingPlugin(
        templatingDashboardVariables(filters),
        'variables',
        'Dashboard variables',
        undefined,
        filterIcon
      ),
    ],
    buttons: [],
    removeButtons: ['source', 'ordered-list'],
    disablePlugins: [
      'add-new-line',
      'about',
      'autofocus',
      'class-span',
      'delete',
      'bold',
      'clean-html',
      'wrap-text-nodes',
      'copy-format',
      'clipboard',
      'paste',
      'paste-storage',
      'color',
      'fullsize',
      'format-block',
      'font',
      'error-messages',
      'enter',
      'drag-and-drop-element',
      'drag-and-drop',
      'hotkeys',
      'iframe',
      'link',
      'justify',
      'inline-popup',
      'hr',
      'indent',
      'symbols',
      'sticky',
      'source',
      'resize-handler',
      'size',
      'search',
      'resizer',
      'redo-undo',
      'placeholder',
      'mobile',
      'xpath',
      'image-properties',
      'image-processor',
      'image',
      'media',
      'video',
      'file',
      'select-cells',
      'resize-cells',
      'table-keyboard-navigation',
      'table',
      'preview',
      'print',
      'ordered-list',
      'powered-by-jodit',
    ],
  };
};

export const messageEditorConfig = (defaultOptions: any, filters?: any[]) => {
  const { theme } = config;
  const currentTheme = theme.isDark ? 'dark' : 'default';
  return {
    ...defaultOptions,
    theme: currentTheme,
    showTooltip: true,
    spellcheck: false,
    dialog: {
      theme: currentTheme,
    },
    limitChars: 8192,
    uploader: {
      ...defaultOptions.uploader,
      insertImageAsBase64URI: true,
    },
    extraButtons: [
      templatingPlugin(templatingVariables(), 'templating', 'Templating', 'source'),
      templatingPlugin(
        templatingDashboardVariables(filters),
        'variables',
        'Dashboard variables',
        undefined,
        filterIcon
      ),
    ],
    removeButtons: ['source'],
    toolbarAdaptive: false,
    buttons: [
      'bold',
      'strikethrough',
      'underline',
      'italic',
      '|',
      'ul',
      'ol',
      '|',
      'outdent',
      'indent',
      '|',
      'font',
      'fontsize',
      'brush',
      'paragraph',
      '|',
      'image',
      'table',
      'link',
      '|',
      'align',
      'undo',
      'redo',
      '|',
      'hr',
      'eraser',
      'copyformat',
      '|',
      'fullsize',
      'print',
      '|',
    ],
    buttonsXS: [
      'bold',
      'strikethrough',
      'underline',
      'italic',
      '|',
      'ul',
      'ol',
      '|',
      'brush',
      'paragraph',
      '|',
      'align',
      '|',
      'undo',
      'redo',
      '|',
      'eraser',
      'dots',
    ],
    disablePlugins: ['source', 'about', 'search', 'symbols', 'media', 'video', 'file', 'powered-by-jodit'],
  };
};
