/**
 * Permissions are stored in the backend as a map of key value pairs
 * where the key is the permission and the value is a boolean
 *
 * Schema:
 * `resource:action => true/false`
 *
 * Example:
 * `dashboard:edit => true`
 * */
export type Permission = {
  name: string;
  group: string;
  status: boolean;
};

export type PermissionGroup = {
  [action: string]: any;
  id: number;
};
