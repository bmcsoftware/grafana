import { Permission, PermissionGroup } from './types';
const PermissionsOrderWeight = [
  'dashboards',
  'folders',
  'teams',
  'users',
  'datasources',
  'preferences',
  'roles',
  'reports',
  'reports.settings',
  'reports.history',
];

export const rawToPermissionGroup = (permissions: Permission[]): PermissionGroup => {
  const group: PermissionGroup = permissions.reduce((acc: any, perm) => {
    const [resource, action] = perm.name.split(':');
    return {
      ...acc,
      [resource]: {
        ...acc[resource],
        displayName: perm.group,
        [action]: {
          name: perm.name,
          status: perm.status,
        },
      },
    };
  }, {});

  return group;
};

export const orderPermissionsResources = (groups: PermissionGroup): string[] => {
  return Object.keys(groups).sort((a, b) => PermissionsOrderWeight.indexOf(a) - PermissionsOrderWeight.indexOf(b));
};

const order = ['read', 'write', 'create', 'delete'];
export const orderActions = (permissions: any): string[] => {
  return Object.keys(permissions).sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex === -1 && bIndex === -1) {
      return 0;
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });
};
